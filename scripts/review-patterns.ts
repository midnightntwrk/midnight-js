// This file is part of midnight-js.
// Copyright (C) 2025-2026 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Analyzes recent PR review comments to find new patterns
// for CLAUDE.md Common Mistakes section.
//
// Prerequisites: gh CLI authenticated, ANTHROPIC_API_KEY env var
//
// Usage:
//   npx tsx scripts/review-patterns.ts           # print report
//   npx tsx scripts/review-patterns.ts --issue    # open GH issue
//   npx tsx scripts/review-patterns.ts --days 60  # custom window

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const REPO = "midnightntwrk/midnight-js";
const DEFAULT_DAYS = 30;
const COMMENT_MAX_CHARS = 500;

interface PR {
  number: number;
  title: string;
  author: { login: string };
}

interface Review {
  body?: string;
  state: string;
  user: { login: string };
}

function parseArgs(): { days: number; openIssue: boolean } {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf("--days");
  return {
    days: daysIdx !== -1 ? Number(args[daysIdx + 1]) : DEFAULT_DAYS,
    openIssue: args.includes("--issue"),
  };
}

function gh(cmd: string): string {
  return execSync(`gh ${cmd}`, {
    encoding: "utf-8",
    timeout: 30_000,
  });
}

function fetchMergedPRs(days: number): PR[] {
  const since = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const json = gh(
    `pr list --repo ${REPO} --state merged --limit 50` +
      ` --search "merged:>=${since}"` +
      ` --json number,title,author`,
  );
  const prs: PR[] = JSON.parse(json);
  return prs.filter((pr) => pr.author.login !== "dependabot[bot]");
}

function fetchReviewComments(prNumber: number): string[] {
  const comments: string[] = [];

  const inline: string[] = JSON.parse(
    gh(
      `api repos/${REPO}/pulls/${prNumber}/comments` +
        ` --jq '[.[] | .body]'`,
    ),
  );
  for (const c of inline) {
    if (c?.trim()) comments.push(c);
  }

  const reviews: Review[] = JSON.parse(
    gh(`api repos/${REPO}/pulls/${prNumber}/reviews`),
  );
  for (const r of reviews) {
    if (r.body?.trim()) comments.push(r.body);
  }

  return comments;
}

function extractCurrentMistakes(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const claudePath = resolve(scriptDir, "..", "CLAUDE.md");
  const claude = readFileSync(claudePath, "utf-8");
  const start = claude.indexOf("## Common Mistakes");
  if (start === -1) return "(no Common Mistakes section found)";
  const end = claude.indexOf("\n## ", start + 1);
  return claude.slice(start, end === -1 ? undefined : end).trim();
}

async function analyze(
  mistakes: string,
  reviewData: string,
  days: number,
): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are analyzing PR review comments from ${REPO} to find recurring patterns that should be documented in CLAUDE.md.

## Current documented mistakes
${mistakes}

## Recent review comments (last ${days} days)
${reviewData}

## Instructions
- Only suggest patterns that appear in 2+ different PRs
- Only suggest patterns NOT already covered by the documented mistakes
- For each suggestion, provide:
  - The mistake (one line, matching existing numbered format)
  - Evidence: PR numbers and brief quote from review comments
  - Confidence: HIGH (3+ PRs) or MEDIUM (2 PRs)
- If no new patterns found, say "No new patterns detected."
- Output as markdown`,
      },
    ],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "(no response)";
}

async function main() {
  const { days, openIssue } = parseArgs();

  console.error(`Fetching merged PRs from last ${days} days...`);
  const prs = fetchMergedPRs(days);
  console.error(`Found ${prs.length} non-dependabot PRs`);

  if (prs.length === 0) {
    console.log("No PRs to analyze.");
    return;
  }

  const reviewData: string[] = [];
  for (const pr of prs) {
    const comments = fetchReviewComments(pr.number);
    if (comments.length > 0) {
      reviewData.push(
        `### PR #${pr.number}: ${pr.title}\n` +
          comments
            .map((c) => `> ${c.slice(0, COMMENT_MAX_CHARS)}`)
            .join("\n\n"),
      );
    }
  }

  if (reviewData.length === 0) {
    console.log("No review comments found in recent PRs.");
    return;
  }

  console.error(
    `Analyzing review comments from ${reviewData.length} PRs...`,
  );
  const mistakes = extractCurrentMistakes();
  const report = await analyze(
    mistakes,
    reviewData.join("\n\n---\n\n"),
    days,
  );

  const date = new Date().toISOString().slice(0, 10);
  const title = `CLAUDE.md: review pattern analysis (${date})`;
  const body =
    `## Review Pattern Analysis\n\n` +
    `**Window:** last ${days} days | ` +
    `**PRs analyzed:** ${prs.length} | ` +
    `**PRs with comments:** ${reviewData.length}\n\n` +
    report;

  if (openIssue) {
    const escaped = body.replace(/"/g, '\\"');
    const issueUrl = gh(
      `issue create --repo ${REPO}` +
        ` --title "${title}"` +
        ` --body "${escaped}"`,
    ).trim();
    console.log(`Issue created: ${issueUrl}`);
  } else {
    console.log(`# ${title}\n\n${body}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
