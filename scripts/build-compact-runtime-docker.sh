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

# Build @midnight-ntwrk/compact-runtime from the `compact/` submodule inside a
# Docker container, so developers without host nix can still produce the
# `.compact-runtime-home/` npm package that Yarn's `file:` resolution points at.
# The Dockerfile delegates to `scripts/build-compact-runtime.sh` so the build
# logic lives in one place.

set -euo pipefail

# shellcheck source=./lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

assert_submodule_initialized
assert_command docker "building compact-runtime without host nix"

home="${REPO_ROOT}/.compact-runtime-home"

image_tag="midnight-js-compact-runtime-local:latest"
echo "Building compact-runtime Docker image '$image_tag' (first build can be slow)..."

# Build context = repo root, narrowed by the repo-root `.dockerignore` to
# `scripts/` and `compact/` (minus compact/.git).
docker build --tag "$image_tag" --file - "$REPO_ROOT" <<'DOCKERFILE'
FROM nixos/nix:latest
RUN mkdir -p /etc/nix && { \
    echo "extra-experimental-features = nix-command flakes"; \
    echo "sandbox = false"; \
    echo "extra-substituters = https://cache.iog.io"; \
    echo "extra-trusted-public-keys = hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ="; \
  } >> /etc/nix/nix.conf
COPY scripts/build-compact-runtime.sh /opt/build/scripts/build-compact-runtime.sh
COPY scripts/lib.sh /opt/build/scripts/lib.sh
COPY compact /opt/build/compact
WORKDIR /opt/build
# `path:` flake ref tolerates the missing `.git` (excluded by .dockerignore).
ENV COMPACTC_FLAKE_REF=path:/opt/build/compact
# Lay out the runtime npm package outside the host bind-mount target.
ENV COMPACT_RUNTIME_OUT=/compact-runtime-home
RUN /opt/build/scripts/build-compact-runtime.sh
DOCKERFILE

# Recreate the host output directory only after the image build succeeded, so a
# `docker build` failure does not wipe a previously-working install.
rm -rf "$home"
mkdir -p "$home"

# Extract via `docker run --rm` with a bind mount, avoiding the
# create/cp/remove cycle and the root-owned files that `docker cp` would
# produce on the host without user-namespace remapping. `chmod -R u+w` after
# copy mirrors build-compact-runtime.sh: nix-store files leak through as
# read-only and would otherwise break `yarn install`'s rewrite step.
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --volume "$home:/out" \
  "$image_tag" \
  sh -c 'cp -R /compact-runtime-home/. /out/ && chmod -R u+w /out'

version=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).version)' "$home/package.json")
echo "compact-runtime ${version} extracted to $home"
echo "Inject the Yarn file: resolution with: node scripts/use-source-compact-runtime.js"
