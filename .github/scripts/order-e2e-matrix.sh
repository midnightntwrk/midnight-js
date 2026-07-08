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

# Orders the e2e test files longest-first using durations from recent successful
# CI runs, so the slowest files start in the first max-parallel wave (LPT
# scheduling). GitHub dispatches matrix jobs in array order, so emitting the
# array longest-first shortens the matrix makespan for free.
#
# Reads candidate filenames (one per line) on stdin; prints them reordered on
# stdout. Files with no history sort first (unknown == assume slow, LPT-safe).
# Exits non-zero on any failure so the caller can fall back to alphabetical.
#
# Env: REPO (owner/repo, required), GH_TOKEN (required by gh),
#      HISTORY_RUNS (optional, default 10).

set -euo pipefail

: "${REPO:?REPO must be set to owner/repo}"
WORKFLOW='ci.yml'
BRANCH='main'
RUNS="${HISTORY_RUNS:-10}"

candidates="$(cat)"
[ -n "$candidates" ] || { echo 'no candidate files on stdin' >&2; exit 1; }

run_ids="$(gh api "repos/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=${BRANCH}&status=success&per_page=${RUNS}" \
  --jq '.workflow_runs[].id')"
[ -n "$run_ids" ] || { echo 'no successful runs found' >&2; exit 1; }

# Collect "<file>\t<duration-seconds>" for every E2E job across those runs.
timings="$(
  for id in $run_ids; do
    gh api "repos/${REPO}/actions/runs/${id}/jobs?per_page=100" \
      --jq '.jobs[]
             | select(.name | test("E2E Tests \\("))
             | [ (.name | capture("E2E Tests \\((?<f>[^)]+)\\)").f),
                 ((.completed_at | fromdate) - (.started_at | fromdate)) ]
             | @tsv' 2>/dev/null || true
  done
)"
[ -n "$timings" ] || { echo 'no e2e job timings found' >&2; exit 1; }

# Average per file, then order candidates by avg duration desc (unknown first).
# First input = timings ("<file>\t<seconds>"), second = candidate filenames.
awk -F '\t' '
  NR == FNR {
    if ($0 == "") next
    sum[$1] += $2; cnt[$1]++; next
  }
  {
    if ($0 == "") next
    if (cnt[$0] > 0) printf "%d\t%s\n", sum[$0] / cnt[$0], $0
    else             printf "%d\t%s\n", 999999, $0
  }
' <(printf '%s\n' "$timings") <(printf '%s\n' "$candidates") \
  | sort -t "$(printf '\t')" -k1,1rn -k2,2 | cut -f2
