/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const MAX_SAFE_NAME_LENGTH = 255;

const SAFE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9._-]+)?$/;
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const INSECURE_SCHEMES = new Set(['http:', 'ws:']);

/**
 * Asserts that `name` is safe to use as a single path segment or URL path
 * component. Rejects traversal payloads (`.`, `..`, separators), URL-encoded
 * characters, null bytes, whitespace, empty strings, and names longer than
 * {@link MAX_SAFE_NAME_LENGTH}.
 *
 * @param name  The value to validate.
 * @param label Human-readable name of the parameter (for error messages).
 * @throws Error if `name` fails validation.
 */
export function assertSafeName(name: string, label: string): void {
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_SAFE_NAME_LENGTH) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
  if (name === '.' || name === '..') {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
  if (!SAFE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(name)}`);
  }
}

/**
 * Asserts that `version` is a valid SemVer-style version string of the shape
 * `MAJOR.MINOR.PATCH` with an optional pre-release suffix
 * (`-[A-Za-z0-9._-]+`). Build metadata (`+...`) is intentionally not
 * supported because compactc releases do not use it.
 *
 * @param version The version string to validate.
 * @param label   Human-readable name of the parameter (for error messages).
 * @throws Error if `version` is not SemVer-shaped.
 */
export function assertSemVer(version: string, label: string): void {
  if (typeof version !== 'string' || version.length === 0 || version.length > MAX_SAFE_NAME_LENGTH) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(version)}`);
  }
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(version)}`);
  }
}

/**
 * Emits a `console.warn` when `url` uses an unencrypted scheme (`http:` or `ws:`)
 * targeting a non-loopback host. No-op for encrypted schemes (`https:`, `wss:`),
 * other schemes, and unparseable input.
 *
 * Intended to be called once at provider-factory construction time so
 * misconfigured remote endpoints surface immediately rather than after sensitive
 * payloads are transmitted in clear text. As a diagnostic helper it never throws —
 * an unparseable URL will produce errors through other channels (the protocol
 * checks at every call site already throw `InvalidProtocolSchemeError`), and
 * crashing the factory from a warning helper would be worse than silence.
 *
 * @param url   An absolute URL string to inspect (e.g. `https://indexer.example/graphql`).
 * @param label Human-readable label used in the warning (e.g. "indexer query URL").
 */
export function warnIfInsecureRemoteUrl(url: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!INSECURE_SCHEMES.has(parsed.protocol)) {
    return;
  }
  if (LOOPBACK_HOSTNAMES.has(parsed.hostname)) {
    return;
  }
  const scheme = parsed.protocol.replace(/:$/, '');
  const secureReplacement = scheme === 'http' ? 'https://' : 'wss://';
  console.warn(
    `midnight-js: ${label} uses unencrypted ${scheme}:// for non-loopback host '${parsed.hostname}'; ` +
      `sensitive data may be transmitted in clear text. Use ${secureReplacement} in production.`
  );
}
