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

import prompts from 'prompts';

import { type PromptAnswers, type TemplateInfo } from '../domain/types.js';

export interface UserInteractionPort {
  promptProjectDetails(templates: TemplateInfo[], defaultProjectName?: string): Promise<PromptAnswers>;
  promptInstallDependencies(): Promise<boolean>;
  onCancel(): void;
}

export function createUserInteractionAdapter(): UserInteractionPort {
  const handleCancel = () => {
    console.log('\nOperation cancelled.');
    process.exit(0);
  };

  return {
    async promptProjectDetails(
      templates: TemplateInfo[],
      defaultProjectName?: string
    ): Promise<PromptAnswers> {
      const response = await prompts(
        [
          {
            type: 'text',
            name: 'projectName',
            message: 'Project name:',
            initial: defaultProjectName || 'my-midnight-dapp',
            validate: (value: string) =>
              value.trim().length > 0 ? true : 'Project name is required',
          },
          {
            type: 'select',
            name: 'template',
            message: 'Select template:',
            choices: templates.map((t) => ({
              title: t.name,
              description: t.description,
              value: t.name,
            })),
          },
          {
            type: 'confirm',
            name: 'installDependencies',
            message: 'Install dependencies?',
            initial: true,
          },
        ],
        { onCancel: handleCancel }
      );

      return {
        projectName: response.projectName as string,
        template: response.template as string,
        installDependencies: response.installDependencies as boolean,
      };
    },

    async promptInstallDependencies(): Promise<boolean> {
      const response = await prompts(
        {
          type: 'confirm',
          name: 'install',
          message: 'Install dependencies?',
          initial: true,
        },
        { onCancel: handleCancel }
      );
      return response.install as boolean;
    },

    onCancel(): void {
      handleCancel();
    },
  };
}

export const userInteraction = createUserInteractionAdapter();
