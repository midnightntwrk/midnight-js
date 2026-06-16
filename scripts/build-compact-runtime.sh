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
# and lay it out at `.compact-runtime-home/` for Yarn's `file:` resolution.
# Companion to build-compactc.sh — the compactc/runtime pair must come from
# the same source tree.

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

gcroot_dir="${home}-build"
mkdir -p "$gcroot_dir"

echo "Building compact-runtime from ${flake_ref} (first build can be slow)..."
nix build --out-link "$gcroot_dir/result" "${flake_ref}#runtime.package"

# `packages.runtime.package` layout (per compact/flake.nix):
#   $out/lib/node_modules/@midnight-ntwrk/compact-runtime/{package.json,dist/,...}
# Materialize a flat npm package directory at $home so Yarn `file:` can point
# at it without a wrapper layer.
#
# `cd -P + pwd -P` is the portable equivalent of `readlink -f`: BSD readlink
# (macOS without coreutils) has no `-f`, but `cd` follows symlinks and `pwd -P`
# prints the physical (dereferenced) path.
src_pkg_dir="$(cd -P "$gcroot_dir/result/lib/node_modules/@midnight-ntwrk/compact-runtime" && pwd -P)"
if [ ! -d "$src_pkg_dir" ]; then
  echo "error: built runtime package not found at $src_pkg_dir" >&2
  exit 1
fi

# Stage into a sibling temp dir and atomically swap, so an interrupted cp
# (Ctrl-C, disk full, signal) cannot leave the developer with a half-deleted
# $home and no working install.
staging_dir="${home}.new"
rm -rf "$staging_dir"
mkdir -p "$staging_dir"
cp -RL "$src_pkg_dir"/. "$staging_dir/"
# Ensure files are writable (nix-store paths are read-only by default).
chmod -R u+w "$staging_dir"
rm -rf "$home"
mv "$staging_dir" "$home"

# Pass the path via argv so a $home containing shell metacharacters cannot
# break (or inject into) the embedded JS expression. Failure (missing or
# malformed package.json) propagates under `set -e` instead of being masked.
version=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).version)' "$home/package.json")
echo "compact-runtime ${version} laid out at $home"
echo "Inject the Yarn file: resolution with: node scripts/use-source-compact-runtime.js"
