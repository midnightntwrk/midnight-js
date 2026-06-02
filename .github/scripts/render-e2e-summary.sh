#!/usr/bin/env bash
# This file is part of midnight-js.
# Copyright (C) 2025-2026 Midnight Foundation
# SPDX-License-Identifier: Apache-2.0
# Licensed under the Apache License, Version 2.0 (the "License");
# You may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Render a markdown summary table for E2E test results to stdout.
# Reads CTRF JSON for pass/fail/duration and testkit-js/env/<env>.env for image versions.
#
# Usage:
#   render-e2e-summary.sh <env> <ctrf-path-or-empty> [<env> <ctrf-path-or-empty> ...]
#
# Pass an empty string as ctrf-path when the artifact is missing (job failed early).

set -euo pipefail

if [ $# -lt 2 ] || [ $(($# % 2)) -ne 0 ]; then
  echo "Usage: $0 <env> <ctrf-path-or-empty> [<env> <ctrf-path-or-empty> ...]" >&2
  exit 1
fi

REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_DIR="$REPO_ROOT/testkit-js/env"

read_env_var() {
  local file="$1" key="$2"
  if [ -f "$file" ]; then
    grep -E "^${key}=" "$file" | head -n1 | cut -d= -f2- || true
  fi
}

format_duration() {
  local ms="$1"
  awk -v ms="$ms" 'BEGIN {
    if (ms <= 0) { print "-"; exit }
    s = int(ms / 1000)
    h = int(s / 3600); s = s % 3600
    m = int(s / 60); s = s % 60
    if (h > 0) printf "%dh%02dm", h, m
    else printf "%dm%02ds", m, s
  }'
}

echo "| Env | Status | Passed | Failed | Skipped | Duration | Proof Server | Indexer | Node |"
echo "|-----|--------|-------:|-------:|--------:|---------:|--------------|---------|------|"

while [ $# -gt 0 ]; do
  env="$1"
  ctrf="$2"
  shift 2

  env_file="$ENV_DIR/$env.env"
  proof=$(read_env_var "$env_file" PROOF_SERVER_VERSION)
  indexer=$(read_env_var "$env_file" INDEXER_VERSION)
  node=$(read_env_var "$env_file" MIDNIGHT_NODE_VERSION)
  proof="${proof:-?}"
  indexer="${indexer:-?}"
  node="${node:-?}"

  if [ -z "$ctrf" ] || [ ! -f "$ctrf" ]; then
    printf "| %s | :warning: no results | - | - | - | - | %s | %s | %s |\n" \
      "$env" "$proof" "$indexer" "$node"
    continue
  fi

  passed=$(jq -r '.results.summary.passed // 0' "$ctrf")
  failed=$(jq -r '.results.summary.failed // 0' "$ctrf")
  skipped=$(jq -r '(.results.summary.skipped // 0) + (.results.summary.pending // 0)' "$ctrf")
  start=$(jq -r '.results.summary.start // 0' "$ctrf")
  stop=$(jq -r '.results.summary.stop // 0' "$ctrf")
  duration=$(format_duration "$((stop - start))")

  if [ "$failed" -gt 0 ]; then
    status=":x:"
  elif [ "$passed" -eq 0 ]; then
    status=":warning:"
  else
    status=":white_check_mark:"
  fi

  printf "| %s | %s | %d | %d | %d | %s | %s | %s | %s |\n" \
    "$env" "$status" "$passed" "$failed" "$skipped" "$duration" "$proof" "$indexer" "$node"
done