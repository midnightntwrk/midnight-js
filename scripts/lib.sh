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

# Shared helpers for scripts/build-*.sh. Sourced; do not exec.
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
#   cd "$REPO_ROOT"
#   assert_submodule_initialized
#   assert_command nix "building compactc from the submodule"
#   flake_ref="${COMPACTC_FLAKE_REF:-$(default_compact_flake_ref)}"

# `cd -P + pwd -P` so a symlinked checkout still resolves to its real location.
REPO_ROOT=$(cd -P -- "$(dirname -- "${BASH_SOURCE[1]}")/.." && pwd -P)

assert_submodule_initialized() {
  if [ ! -f "$REPO_ROOT/compact/flake.nix" ]; then
    echo "error: compact submodule not initialized. Run: git submodule update --init compact" >&2
    exit 1
  fi
}

assert_command() {
  local cmd="$1"
  local use_case="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: $cmd is required for $use_case." >&2
    exit 1
  fi
}

# `path:` flake refs tolerate spaces in the path (no URL encoding required) and
# work without a `.git` directory, so they are the safe default for both local
# checkouts and Docker COPY contexts. `git+file://` is left available via the
# COMPACTC_FLAKE_REF override for callers that explicitly want git semantics.
default_compact_flake_ref() {
  echo "path:$REPO_ROOT/compact"
}
