#!/usr/bin/env node
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { Command } from 'commander';
import pc from 'picocolors';

import { packageManager } from './adapters/package-manager.js';
import { userInteraction } from './adapters/user-interaction.js';
import { scaffoldProject } from './core/scaffold-project.js';
import { type CliOptions } from './domain/types.js';
import { ScaffoldError } from './errors/scaffold-errors.js';
import { getTemplateNames, templates } from './templates/template-registry.js';
import { logger } from './utils/logger.js';
import { resolveTargetDir } from './utils/path-utils.js';

function printNextSteps(projectPath: string, dependenciesInstalled: boolean): void {
  const pm = packageManager.detect();
  const runCmd = pm === 'npm' ? 'npm run' : pm;

  console.log();
  logger.success('Done!');
  console.log();
  console.log(pc.bold('Next steps:'));
  console.log();
  console.log(`  ${pc.cyan('cd')} ${projectPath}`);

  if (!dependenciesInstalled) {
    if (pm === 'yarn') {
      console.log(`  ${pc.cyan('yarn')}`);
    } else {
      console.log(`  ${pc.cyan(`${pm} install`)}`);
    }
  }

  console.log(`  ${pc.cyan(`${runCmd} dev`)}`);
  console.log();
}

function handleError(error: unknown): void {
  if (error instanceof ScaffoldError) {
    logger.error(error.message);
  } else if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  } else {
    logger.error('An unknown error occurred');
  }
  process.exit(1);
}

async function run(
  projectNameArg: string | undefined,
  options: CliOptions
): Promise<void> {
  console.log();
  console.log(pc.bold(pc.cyan('create-midnight-dapp')));
  console.log();

  let projectName: string;
  let templateName: string;
  let installDependencies: boolean;

  if (projectNameArg && options.template) {
    projectName = projectNameArg;
    templateName = options.template;
    installDependencies = await userInteraction.promptInstallDependencies();
  } else {
    const answers = await userInteraction.promptProjectDetails(
      templates,
      projectNameArg
    );
    projectName = answers.projectName;
    templateName = answers.template;
    installDependencies = answers.installDependencies;
  }

  const result = await scaffoldProject(
    {
      projectName,
      targetDir: resolveTargetDir(projectName),
      templateName,
    },
    installDependencies
  );

  printNextSteps(result.projectPath, installDependencies);
}

const program = new Command();

program
  .name('create-midnight-dapp')
  .description('Create a new Midnight dApp')
  .version('3.2.0-rc.2')
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', `Template to use (${getTemplateNames().join(', ')})`)
  .action(async (projectNameArg: string | undefined, options: CliOptions) => {
    try {
      await run(projectNameArg, options);
    } catch (error) {
      handleError(error);
    }
  });

program.parse();
