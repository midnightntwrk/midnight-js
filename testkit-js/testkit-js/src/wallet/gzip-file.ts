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

import { createGunzip, createGzip } from 'node:zlib';

import { createReadStream, createWriteStream } from 'fs';

/**
 * A class for compressing and decompressing files using gzip.
 */
class GzipFile {
  /** The path to the input file */
  inputFile: string;
  /** The path to the output file */
  outputFile: string;

  /**
   * Creates a new GzipFile instance.
   * @param inputFile - The path to the input file to compress/decompress
   * @param outputFile - The path where the compressed file will be saved
   */
  constructor(inputFile: string, outputFile: string) {
    this.inputFile = inputFile;
    this.outputFile = outputFile;
  }

  /**
   * Compresses the input file using gzip compression.
   * @returns A promise that resolves when compression is complete
   * @throws If there is an error during compression
   */
  compress = () => {
    const gzip = createGzip();
    const source = createReadStream(this.inputFile);
    const destination = createWriteStream(this.outputFile);
    return new Promise<void>((resolve, reject) => {
      source
        .pipe(gzip)
        .pipe(destination)
        .on('finish', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  };

  /**
   * Decompresses the input gzip file and returns its contents as a string.
   * @returns A promise that resolves with the decompressed file contents as a string
   * @throws If there is an error during decompression
   */
  decompress = () => {
    const gunzip = createGunzip();
    const source = createReadStream(this.inputFile);
    return new Promise<string>((resolve, reject) => {
      let data = '';
      source
        .pipe(gunzip)
        .on('data', (chunk) => {
          data += chunk.toString();
        })
        .on('end', () => {
          resolve(data);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  };
}

export { GzipFile };
