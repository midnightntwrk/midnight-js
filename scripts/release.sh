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

#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

NEW_VERSION=""
DRY_RUN=true
RUN_TESTS=false

print_usage() {
  echo "Usage: $0 <version> [--execute] [--with-tests]"
  echo ""
  echo "Options:"
  echo "  --execute     Execute full release including git operations (default: dry-run)"
  echo "  --with-tests  Run build and tests before release"
  echo ""
  echo "Dry-run mode (default):"
  echo "  - Updates version in all package.json files"
  echo "  - Generates changelog"
  echo "  - Does NOT create branch, commit, tag, or push"
  echo "  - Allows you to review changes with 'git diff' before proceeding"
  echo ""
  echo "Example:"
  echo "  $0 3.0.0-alpha.2                    # Dry-run: make file changes only"
  echo "  $0 3.0.0-alpha.2 --execute          # Full release with git operations"
  echo "  $0 3.0.0-alpha.2 --execute --with-tests  # Full release with tests"
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

execute_or_log() {
  local cmd="$1"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $cmd"
  else
    log_info "Executing: $cmd"
    eval "$cmd"
  fi
}

execute_local() {
  local cmd="$1"
  log_info "Executing: $cmd"
  eval "$cmd"
}

if [ $# -lt 1 ]; then
  print_usage
  exit 1
fi

NEW_VERSION="$1"
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --execute)
      DRY_RUN=false
      shift
      ;;
    --with-tests)
      RUN_TESTS=true
      shift
      ;;
    *)
      log_error "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  log_warn "Running in DRY-RUN mode. File changes will be made, but NO git operations."
fi

log_info "Target version: $NEW_VERSION"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  log_error "Must be on main branch (currently on: $CURRENT_BRANCH)"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  log_error "Working directory is not clean. Commit or stash changes first."
  exit 1
fi

log_info "Step 1: Update version in root package.json"
execute_local "npm pkg set version=$NEW_VERSION"

log_info "Step 2: Update versions in packages/* workspaces"
PACKAGES=$(yarn workspaces list --json | jq -r 'select(.location | startswith("packages/")) | .name')
for pkg in $PACKAGES; do
  execute_local "npm pkg set version=$NEW_VERSION -w $pkg"
done

log_info "Step 3: Update versions in testkit-js/* workspaces"
TESTKIT_PACKAGES=$(yarn workspaces list --json | jq -r 'select(.location | startswith("testkit-js/")) | .name')
for pkg in $TESTKIT_PACKAGES; do
  execute_local "npm pkg set version=$NEW_VERSION -w $pkg"
done

log_info "Step 4: Generate changelog"
execute_local "yarn changelog"

if [ "$RUN_TESTS" = true ]; then
  log_info "Step 5: Build and test"
  execute_or_log "yarn clean-build"
  execute_or_log "yarn check"
  execute_or_log "yarn test"
else
  log_warn "Skipping build and tests (use --with-tests to include)"
fi

log_info "Step 6: Create release branch"
RELEASE_BRANCH="release/v$NEW_VERSION"
execute_or_log "git checkout -b $RELEASE_BRANCH"

log_info "Step 7: Commit changes"
execute_or_log "git add ."
execute_or_log "git commit -m 'chore(release): bump version to $NEW_VERSION'"

log_info "Step 8: Create and push tag"
execute_or_log "git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
execute_or_log "git push origin $RELEASE_BRANCH"
execute_or_log "git push origin v$NEW_VERSION"

log_info "Release process completed successfully!"

if [ "$DRY_RUN" = true ]; then
  echo ""
  log_warn "DRY-RUN completed. File changes were made but NO git operations were performed."
  log_info "Review changes with: git diff"
  log_info "To discard changes: git checkout ."
  log_info "To proceed with release: $0 $NEW_VERSION --execute"
fi
