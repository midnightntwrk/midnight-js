# This file is part of midnight-js.
# Copyright (C) 2025 Midnight Foundation
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
  echo "  --execute     Actually execute commands (default: dry-run)"
  echo "  --with-tests  Run build and tests before release"
  echo ""
  echo "Example:"
  echo "  $0 3.0.0-alpha.2                    # Dry-run mode"
  echo "  $0 3.0.0-alpha.2 --execute          # Execute release"
  echo "  $0 3.0.0-alpha.2 --execute --with-tests  # Execute with tests"
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
  log_warn "Running in DRY-RUN mode. Use --execute to actually run commands."
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
execute_or_log "yarn version $NEW_VERSION"

log_info "Step 2: Update versions in packages/* workspaces"
PACKAGES=$(yarn workspaces list --json | jq -r 'select(.location | startswith("packages/")) | .name')
for pkg in $PACKAGES; do
  execute_or_log "yarn workspace $pkg version $NEW_VERSION"
done

log_info "Step 3: Update versions in testkit-js/* workspaces"
TESTKIT_PACKAGES=$(yarn workspaces list --json | jq -r 'select(.location | startswith("testkit-js/")) | .name')
for pkg in $TESTKIT_PACKAGES; do
  execute_or_log "yarn workspace $pkg version $NEW_VERSION"
done

log_info "Step 4: Generate changelog"
execute_or_log "yarn changelog"

if [ "$RUN_TESTS" = true ]; then
  log_info "Step 5: Build and test"
  execute_or_log "yarn clean-build"
  execute_or_log "yarn check"
  execute_or_log "yarn test"
else
  log_warn "Skipping build and tests (use --with-tests to include)"
fi

log_info "Step 6: Create release branch"
RELEASE_BRANCH="release/$NEW_VERSION"
execute_or_log "git checkout -b $RELEASE_BRANCH"

log_info "Step 7: Commit changes"
execute_or_log "git add ."
execute_or_log "git commit -m 'chore(release): bump version to $NEW_VERSION'"

log_info "Step 8: Create and push tag"
execute_or_log "git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
execute_or_log "git push origin $RELEASE_BRANCH"
execute_or_log "git push origin v$NEW_VERSION"

log_info "Step 9: Create GitHub release"
execute_or_log "gh release create v$NEW_VERSION --title 'v$NEW_VERSION' --notes 'Release v$NEW_VERSION' --prerelease --target $RELEASE_BRANCH"

log_info "Step 10: Merge to main"
execute_or_log "git checkout main"
execute_or_log "git merge $RELEASE_BRANCH --no-ff -m 'chore: merge $RELEASE_BRANCH'"
execute_or_log "git push origin main"

log_info "Release process completed successfully!"

if [ "$DRY_RUN" = true ]; then
  log_warn "This was a DRY-RUN. Run with --execute to perform actual release."
fi
