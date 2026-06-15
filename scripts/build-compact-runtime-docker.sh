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
# `.compact-runtime-home/` npm package that Yarn's `portal:` protocol points at.
# The Dockerfile delegates to `scripts/build-compact-runtime.sh` so the build
# logic lives in one place.

set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

if [ ! -f compact/flake.nix ]; then
  echo "error: compact submodule not initialized. Run: git submodule update --init compact" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required to build compact-runtime without host nix." >&2
  exit 1
fi

home="${repo_root}/.compact-runtime-home"
rm -rf "$home"
mkdir -p "$home"

image_tag="midnight-js-compact-runtime-local:latest"
echo "Building compact-runtime Docker image '$image_tag' (first build can be slow)..."

# Build context = repo root, narrowed by the repo-root `.dockerignore` to
# `scripts/` and `compact/` (minus compact/.git).
docker build --tag "$image_tag" --file - "$repo_root" <<'DOCKERFILE'
FROM nixos/nix:latest
RUN mkdir -p /etc/nix && { \
    echo "extra-experimental-features = nix-command flakes"; \
    echo "sandbox = false"; \
    echo "extra-substituters = https://cache.iog.io"; \
    echo "extra-trusted-public-keys = hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ="; \
  } >> /etc/nix/nix.conf
COPY scripts/build-compact-runtime.sh /opt/build/scripts/build-compact-runtime.sh
COPY compact /opt/build/compact
WORKDIR /opt/build
# `git+file://` flake ref needs a `.git` (excluded by .dockerignore), so use
# the path-flake override the script supports.
ENV COMPACTC_FLAKE_REF=path:/opt/build/compact
# Lay out the runtime npm package outside the host bind-mount target.
ENV COMPACT_RUNTIME_OUT=/compact-runtime-home
RUN /opt/build/scripts/build-compact-runtime.sh
DOCKERFILE

# Extract the built package to the host's .compact-runtime-home. The image's
# /compact-runtime-home is the canonical layout; we copy it onto the host so
# Yarn's portal: can point at .compact-runtime-home without a docker run for
# every node_modules read.
container_id=$(docker create "$image_tag")
trap 'docker rm -f "$container_id" >/dev/null 2>&1 || true' EXIT
docker cp "$container_id:/compact-runtime-home/." "$home/"

version=$(node -e "console.log(require('$home/package.json').version)" 2>/dev/null || echo unknown)
echo "compact-runtime $version extracted to $home"
echo "Inject the Yarn portal: resolution with: node scripts/use-source-compact-runtime.js"
