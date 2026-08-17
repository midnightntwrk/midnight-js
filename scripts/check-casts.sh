#!/bin/bash
#
# This file is part of midnight-js.
# Copyright (C) Midnight Foundation
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
# No-new-occurrences gate for unsafe `as unknown` / `as any` casts.
#
# `as unknown`/`as any` casts already exist in the codebase (mostly in
# generated GraphQL code and a handful of test-adjacent call sites), so this
# script does not demand zero hits. Instead it compares the current hits
# against a checked-in baseline (scripts/cast-baseline.txt) and fails only
# when a hit appears that isn't already in the baseline. Fixing/removing a
# pre-existing hit is always fine and does not require touching the baseline.
#
# The pattern uses word-boundary guards (`(^|[^A-Za-z0-9_])` / `($|[^A-Za-z0-9_])`)
# instead of `\b`, since `\b` support is inconsistent across grep/BRE/ERE
# implementations (macOS vs GNU). This avoids false positives like the
# word-tail "as" inside "has any" matching the bare `as unknown|as any`
# pattern.
#
# Known bypasses (accepted trade-offs, not fixed by this gate):
#   - Multi-line casts (e.g. the `as` and `any`/`unknown` keywords split
#     across lines) are not matched — the pattern is single-line.
#   - The legacy angle-bracket cast form `<any>x` is not matched.
#   - testkit-js/** is out of scope — the pathspec only covers
#     packages/*/src/**.
#
# Exit codes:
#   0  no new occurrences (gate passes)
#   1  new occurrence(s) found, or the environment sanity check tripped
#   2  usage/setup error (missing baseline file)
#
# To accept a new, reviewed occurrence, regenerate the baseline with:
#   git grep -E '(^|[^A-Za-z0-9_])as (unknown|any)($|[^A-Za-z0-9_])' -- \
#     ':(glob)packages/*/src/**/*.ts' ':(glob,exclude)packages/*/src/test/**' \
#     | LC_ALL=C sort > scripts/cast-baseline.txt
#
# Test overrides (used by packages/utils/src/test/check-casts.test.ts to run
# this script against an isolated temp git repo instead of the real one):
#   CHECK_CASTS_ROOT_DIR    overrides the repo root the script cds into.
#   CHECK_CASTS_BASELINE_FILE  overrides the baseline file path.
#   CHECK_CASTS_PATHSPECS   overrides the git grep pathspec list (space-separated).

set -euo pipefail

ROOT_DIR="${CHECK_CASTS_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BASELINE_FILE="${CHECK_CASTS_BASELINE_FILE:-$ROOT_DIR/scripts/cast-baseline.txt}"
CAST_PATTERN='(^|[^A-Za-z0-9_])as (unknown|any)($|[^A-Za-z0-9_])'

if [[ -n "${CHECK_CASTS_PATHSPECS:-}" ]]; then
  # Intentional word-splitting of a caller-provided, space-separated pathspec
  # list (test-only override) — never built via string interpolation of
  # untrusted input.
  read -r -a PATHSPECS <<<"$CHECK_CASTS_PATHSPECS"
else
  PATHSPECS=(':(glob)packages/*/src/**/*.ts' ':(glob,exclude)packages/*/src/test/**')
fi

cd "$ROOT_DIR"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "error: baseline file not found at $BASELINE_FILE" >&2
  exit 2
fi

# git grep exits 0 (matches found) or 1 (no matches) in the normal case, and
# >1 on a real failure (e.g. 128 for "not a git repository" or a bad
# pathspec). Capture its exact exit code via PIPESTATUS rather than masking
# it with `|| true`, so only 0/1 are treated as success.
set +e
CURRENT_HITS="$(git grep -E "$CAST_PATTERN" -- "${PATHSPECS[@]}" | LC_ALL=C sort)"
GIT_GREP_EXIT="${PIPESTATUS[0]}"
set -e

if [[ "$GIT_GREP_EXIT" -gt 1 ]]; then
  echo "error: git grep failed with exit code $GIT_GREP_EXIT (expected 0 or 1)." >&2
  echo "This usually means the script is not running inside a git checkout, or the pathspec is invalid." >&2
  exit 1
fi

BASELINE_HITS="$(LC_ALL=C sort "$BASELINE_FILE")"

if [[ -z "$CURRENT_HITS" && -n "$BASELINE_HITS" ]]; then
  echo "error: git grep returned no hits at all, but the baseline is non-empty ($(wc -l < "$BASELINE_FILE" | tr -d ' ') entries)." >&2
  echo "This usually means the search ran with the wrong cwd/pathspec, not that every baseline" >&2
  echo "occurrence was fixed simultaneously. Investigate before trusting this as a green run." >&2
  exit 1
fi

# comm's exit status only ever signals a real failure (e.g. an unreadable
# input) — it does not encode "no common/unique lines found" the way grep
# does — so any non-zero exit here is always a hard failure.
set +e
NEW_HITS="$(LC_ALL=C comm -13 <(printf '%s\n' "$BASELINE_HITS") <(printf '%s\n' "$CURRENT_HITS"))"
COMM_EXIT=$?
set -e

if [[ "$COMM_EXIT" -ne 0 ]]; then
  echo "error: comm failed with exit code $COMM_EXIT while diffing the baseline against current hits." >&2
  exit 1
fi

if [[ -n "$NEW_HITS" ]]; then
  echo "error: new 'as unknown' / 'as any' occurrence(s) found outside packages/*/src/test/**:" >&2
  echo "$NEW_HITS" >&2
  echo "" >&2
  echo "Avoid the cast, or use a type guard instead. If this is a reviewed exception," >&2
  echo "add it to $BASELINE_FILE." >&2
  exit 1
fi

echo "check-casts: no new unsafe cast occurrences (baseline: $(wc -l < "$BASELINE_FILE" | tr -d ' ') pre-existing)."
