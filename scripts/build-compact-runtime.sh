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

# Build @midnight-ntwrk/compact-runtime from the `compact/` submodule via nix
# and lay out the resulting npm package at `.compact-runtime-home/` so it can
# be consumed via Yarn's `portal:` protocol.
#
# Companion to `scripts/build-compactc.sh`. Use both when developing against
# an unreleased compactc/runtime pair; their generated artifacts (compactc
# binary + compact-runtime npm package) must come from the same source tree.
#
# First build can be slow: without nix `trusted-users` access to the IOG cache
# (`cache.iog.io`), the dependencies compile from source. Subsequent runs are
# cached.

set -euo pipefail

# shellcheck source=./lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

assert_submodule_initialized
assert_command nix "building compact-runtime from the submodule"

# Output directory for the materialized npm package. Defaults to
# `.compact-runtime-home` at the repo root; `scripts/build-compact-runtime-docker.sh`
# overrides via COMPACT_RUNTIME_OUT to install outside its runtime bind-mount target.
home="${COMPACT_RUNTIME_OUT:-${REPO_ROOT}/.compact-runtime-home}"

# Default flake reference: see scripts/lib.sh:default_compact_flake_ref.
flake_ref="${COMPACTC_FLAKE_REF:-$(default_compact_flake_ref)}"

# Sibling gcroot directory keeps the runtime nix gcroot independent of the
# compactc one.
gcroot_dir="${home}-build"
mkdir -p "$gcroot_dir"

echo "Building compact-runtime from ${flake_ref} (first build can be slow)..."
nix build --out-link "$gcroot_dir/result" "${flake_ref}#runtime.package"

# `packages.runtime.package` layout (per compact/flake.nix):
#   $out/lib/node_modules/@midnight-ntwrk/compact-runtime/{package.json,dist/,...}
# Materialize a flat npm package directory at $home so Yarn `portal:` can point
# at it without a wrapper layer.
src_pkg_dir="$(readlink -f "$gcroot_dir/result")/lib/node_modules/@midnight-ntwrk/compact-runtime"
if [ ! -d "$src_pkg_dir" ]; then
  echo "error: built runtime package not found at $src_pkg_dir" >&2
  exit 1
fi

rm -rf "$home"
mkdir -p "$home"
cp -RL "$src_pkg_dir"/. "$home/"
# Ensure files are writable (nix-store paths are read-only by default).
chmod -R u+w "$home"

version=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$home/package.json" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
echo "compact-runtime ${version:-unknown} laid out at $home"
echo "Inject the Yarn file: resolution with: node scripts/use-source-compact-runtime.js"
