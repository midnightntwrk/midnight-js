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
# substring "as" inside "h-as- unknown" matching the bare `as unknown|as any`
# pattern.
#
# To accept a new, reviewed occurrence, regenerate the baseline with:
#   git grep -E '(^|[^A-Za-z0-9_])as (unknown|any)($|[^A-Za-z0-9_])' -- \
#     ':(glob)packages/*/src/**/*.ts' ':(glob,exclude)packages/*/src/test/**' \
#     | sort > scripts/cast-baseline.txt

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_FILE="$ROOT_DIR/scripts/cast-baseline.txt"
CAST_PATTERN='(^|[^A-Za-z0-9_])as (unknown|any)($|[^A-Za-z0-9_])'

cd "$ROOT_DIR"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "error: baseline file not found at $BASELINE_FILE" >&2
  exit 1
fi

CURRENT_HITS="$(git grep -E "$CAST_PATTERN" -- ':(glob)packages/*/src/**/*.ts' ':(glob,exclude)packages/*/src/test/**' | sort || true)"
BASELINE_HITS="$(sort "$BASELINE_FILE")"

NEW_HITS="$(comm -13 <(printf '%s\n' "$BASELINE_HITS") <(printf '%s\n' "$CURRENT_HITS") || true)"

if [[ -n "$NEW_HITS" ]]; then
  echo "error: new 'as unknown' / 'as any' occurrence(s) found outside packages/*/src/test/**:" >&2
  echo "$NEW_HITS" >&2
  echo "" >&2
  echo "Avoid the cast, or use a type guard instead. If this is a reviewed exception," >&2
  echo "add it to $BASELINE_FILE." >&2
  exit 1
fi

echo "check-casts: no new unsafe cast occurrences (baseline: $(wc -l < "$BASELINE_FILE" | tr -d ' ') pre-existing)."
