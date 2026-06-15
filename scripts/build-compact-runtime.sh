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

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

if [ ! -f compact/flake.nix ]; then
  echo "error: compact submodule not initialized. Run: git submodule update --init compact" >&2
  exit 1
fi

if ! command -v nix >/dev/null 2>&1; then
  echo "error: nix is required to build compact-runtime from the submodule." >&2
  exit 1
fi

# Output directory for the materialized npm package. Defaults to
# `.compact-runtime-home` at the repo root; `scripts/build-compact-runtime-docker.sh`
# overrides via COMPACT_RUNTIME_OUT to install outside its runtime bind-mount target.
home="${COMPACT_RUNTIME_OUT:-${repo_root}/.compact-runtime-home}"

# Flake reference for the compact build. Defaults to the local submodule as a
# git working tree (picks up uncommitted edits). Overridable via
# COMPACTC_FLAKE_REF (e.g., `path:/some/copy/of/compact` in environments where
# the submodule has no `.git` directory).
flake_ref="${COMPACTC_FLAKE_REF:-git+file://${repo_root}/compact}"

# Use a sibling out-link to keep the compactc gcroot independent.
gcroot_dir="$(dirname "$home")/$(basename "$home")-build"
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

version=$(node -e "console.log(require('$home/package.json').version)" 2>/dev/null || echo unknown)
echo "compact-runtime $version laid out at $home"
echo "Inject the Yarn portal: resolution with: node scripts/use-source-compact-runtime.js"
