/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FileSystem, Path } from '@effect/platform';
import { CompiledContract, type Contract, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import * as Hex from '@midnight-ntwrk/platform-js/effect/Hex'
import { Effect, Either, identity, Layer } from 'effect';
import * as JSON5 from 'json5';
import TS from 'typescript';

import * as CompiledContractReflection from "../CompiledContractReflection.js";

const CONTRACT_FOLDER = 'contract';
const CONTRACT_DECLARATION_FILE = 'index.d.cts';
const TRUE_OR_FALSE_REGEXP = /^true|false$/;

type FileSnapshot = {
  file: TS.IScriptSnapshot;
  version: number;
}

class BasicHost implements TS.LanguageServiceHost {
  #files: Record<string, FileSnapshot>;

  constructor(readonly files: Record<string, FileSnapshot>) {
    this.#files = {...files};
  }

  getCurrentDirectory(): string {
    return '';
  }
  getDefaultLibFileName(_: TS.CompilerOptions): string {
    return 'lib';
  }
  getCompilationSettings(): TS.CompilerOptions {
    return TS.getDefaultCompilerOptions();
  }
  getScriptVersion(fileName: string): string {
    return String(this.files[fileName].version);
  }
  getScriptSnapshot(fileName: string): TS.IScriptSnapshot | undefined {
    return this.files[fileName]?.file;
  }
  getScriptFileNames(): string[] {
    return Object.keys(this.#files);
  }
  fileExists(path: string): boolean {
    return !!this.files[path];
  }
  readFile(path: string): string | undefined {
    const file = this.files[path].file
    return file?.getText(0, file?.getLength())
  }
}

const typeNodeName: (type: TS.TypeNode) => string =
  (type) => {
    if (type.kind === TS.SyntaxKind.NumberKeyword) return 'number';
    if (type.kind === TS.SyntaxKind.BigIntKeyword) return 'bigint';
    if (type.kind === TS.SyntaxKind.StringKeyword) return 'string';
    if (type.kind === TS.SyntaxKind.BooleanKeyword) return 'boolean';
    if (type.kind === TS.SyntaxKind.TupleType) {
      return `[${(type as TS.TupleTypeNode).elements.map((_) => typeNodeName(_ as TS.TypeNode)).join(', ')}]`;
    }
    if (type.kind === TS.SyntaxKind.TypeLiteral) {
      const typeLiteral = type as TS.TypeLiteralNode;
      return `{ ${typeLiteral.members.map((_) => `${(_.name as TS.Identifier).escapedText.toString()}: ${typeNodeName((_ as TS.PropertySignature).type!)}`).join(', ')} }`;
    }
    if (type.kind === TS.SyntaxKind.TypeReference) {
      const typeName = (type as TS.TypeReferenceNode).typeName;
      if (TS.isIdentifier(typeName)) return typeName.escapedText.toString();
    }
    return '<unknown>';
  };

const transformParams: (
  args: string[],
  types: TS.TypeNode[],
  quotedStrings?: boolean
) => Either.Either<any[], ContractRuntimeError.ContractRuntimeError> = // eslint-disable-line @typescript-eslint/no-explicit-any
  (args, types, quotedStrings = false) => {
    if (args.length !== types.length) {
      return Either.left(
        ContractRuntimeError.make(
          `Invalid number of arguments. Expected ${types.length} arguments, but got ${args.length}`
        )
      );
    }
    const transformedArgs: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (let idx = 0; idx < types.length; idx++) {
      const type = types[idx];
      const transformedArg = Either.try({
        try: () => {
          if (type!.kind === TS.SyntaxKind.NumberKeyword) {
            return Number(args[idx]);
          }
          if (type!.kind === TS.SyntaxKind.BigIntKeyword) {
            return BigInt(args[idx]);
          }
          if (type!.kind === TS.SyntaxKind.StringKeyword) {
            return quotedStrings ? args[idx].replaceAll('\'', '') : args[idx];
          }
          if (type!.kind === TS.SyntaxKind.BooleanKeyword) {
            if (!TRUE_OR_FALSE_REGEXP.test(args[idx])) throw new SyntaxError(`Cannot convert ${args[idx]} to a Boolean`);
            return args[idx] === 'true';
          }
          if (type!.kind === TS.SyntaxKind.TupleType) {
            const tupleElems = JSON5.parse(args[idx]);
            return Either.getOrThrowWith(
              transformParams(
                tupleElems.map(JSON5.stringify),
                (type as TS.TupleTypeNode).elements.map((_) => _ as TS.TypeNode),
                true
              ),
              identity // Rethrow the error from `transformParams`.
            );
          }
          if (type!.kind === TS.SyntaxKind.TypeLiteral) {
            const typeLiteral = type as TS.TypeLiteralNode;
            const srcObj = JSON5.parse(args[idx]);
            if (typeof srcObj !== 'object') {
              throw new SyntaxError(`Cannot convert ${args[idx]} to an object literal`);
            }
            for (const member of typeLiteral.members) {
              const propKey = ((member as TS.PropertySignature).name as TS.Identifier).escapedText.toString();
              const propType = (member as TS.PropertySignature).type!;
              const memberValue = Either.getOrThrowWith(
                transformParams([JSON5.stringify(srcObj[propKey])], [propType], true),
                identity // Rethrow the error from `transformParams`.
              );
              srcObj[propKey] = memberValue[0];
            }
            return srcObj;
          }
          if (type!.kind === TS.SyntaxKind.TypeReference) {
            const typeName = (type as TS.TypeReferenceNode).typeName;
            if (TS.isIdentifier(typeName) && typeName.escapedText === 'Uint8Array') {
              return Either.match(Hex.parseHex(quotedStrings ? args[idx].replaceAll('\'', '') : args[idx]), {
                onRight: (parsedHex) => Buffer.from(parsedHex.byteChars, 'hex'),
                onLeft: (parseErr) => { 
                  throw new SyntaxError(`Cannot convert ${args[idx]} to a Uint8Array: ${parseErr.message}`);
                }
              });
            }
          }
        },
        catch: (err) => ContractRuntimeError.make(
          `Failed to parse argument with index ${idx}`,
          ContractRuntimeError.make(
            `Failed to parse string '${args[idx]}' as type of ${typeNodeName(type!)}`,
            err
          )
        )
      });
      if (Either.isLeft(transformedArg)) return transformedArg;
      transformedArgs.push(transformedArg.right);
    }
    return Either.right(transformedArgs);
  };

const makeArgumentParser =
  <C extends Contract.Contract<PS>, PS>(path: Path.Path, fs: FileSystem.FileSystem, baseAssetFolderPath: string) =>
  (compiledContract: CompiledContract.CompiledContract<C, PS>) =>
    Effect.gen(function* () {
      const assetsPath = CompiledContract.getCompiledAssetsPath(compiledContract);
      const tsDeclFilePath = path.join(path.resolve(baseAssetFolderPath, assetsPath), CONTRACT_FOLDER, CONTRACT_DECLARATION_FILE);
      const tsHost = new BasicHost({
        [tsDeclFilePath]: {
          file: TS.ScriptSnapshot.fromString(yield* fs.readFileString(tsDeclFilePath)),
          version: 1
        }
      });
      const tsLangService = TS.createLanguageService(tsHost, TS.createDocumentRegistry());
      const sourceFile = tsLangService.getProgram()!.getSourceFile(tsDeclFilePath);
      const impureCircuitsTypeNode = sourceFile?.statements.find(
        (_) => TS.isTypeAliasDeclaration(_)
          && _.name.escapedText === 'ImpureCircuits'
          && _.type.kind === TS.SyntaxKind.TypeLiteral
      ) as TS.TypeAliasDeclaration;
      const circuitMethodSignatureNodes =
        (impureCircuitsTypeNode.type as TS.TypeLiteralNode).members as TS.NodeArray<TS.MethodSignature>;
      const contractClassNode = sourceFile?.statements.find(
        (_) => TS.isClassDeclaration(_) && _.name!.escapedText === 'Contract'
      ) as TS.ClassDeclaration;
      const initialStateMethodSignatureNode = contractClassNode.members.find(
        (_) => TS.isMethodDeclaration(_)
          && (_.name as TS.Identifier).escapedText === 'initialState'
      );

      return {
        parseInitializationArgs: (args) => transformParams(args, (initialStateMethodSignatureNode as TS.MethodDeclaration).parameters.slice(1).map((_) => _.type!)) as Either.Either<Contract.Contract.InitializeParameters<C>, ContractRuntimeError.ContractRuntimeError>,
        parseCircuitArgs: (circuitId, args) => {
          const circuitNode = circuitMethodSignatureNodes.find((_) => (_.name as TS.Identifier)!.escapedText === circuitId);
          if (!circuitNode) {
            return Either.left(ContractRuntimeError.make(`Circuit '${circuitId}' not found on the Compact generated TypeScript declaration.`))
          }
          return transformParams(args, circuitNode.parameters.slice(1).map((_) => _.type!)) as Either.Either<Contract.Contract.CircuitParameters<C, Contract.ImpureCircuitId>, ContractRuntimeError.ContractRuntimeError>;
        }
      } satisfies CompiledContractReflection.CompiledContractReflection.ArgumentParser<C, PS>;
    });

export const layer = (baseAssetFolderPath = '.') => Layer.effect(
  CompiledContractReflection.CompiledContractReflection,
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;

    return CompiledContractReflection.CompiledContractReflection.of({
      createArgumentParser: makeArgumentParser(path, fs, baseAssetFolderPath)
    })
  })
);
