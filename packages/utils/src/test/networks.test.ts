/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { describe, expect, it } from "vitest";

import { networks } from "../networks";

describe("networks", () => {
  it("defines valid preprod endpoints", () => {
    expect(networks.preprod.networkId).toBe("preprod");
    expect(networks.preprod.indexer.queryURL).toBe("https://indexer.preprod.midnight.network/api/v4/graphql");
    expect(networks.preprod.indexer.subscriptionURL).toBe("wss://indexer.preprod.midnight.network/api/v4/graphql/ws");
    expect(networks.preprod.nodeURL).toBe("https://rpc.preprod.midnight.network");
  });

  it("defines valid preview endpoints", () => {
    expect(networks.preview.networkId).toBe("preview");
    expect(networks.preview.indexer.queryURL).toBe("https://indexer.preview.midnight.network/api/v4/graphql");
    expect(networks.preview.indexer.subscriptionURL).toBe("wss://indexer.preview.midnight.network/api/v4/graphql/ws");
    expect(networks.preview.nodeURL).toBe("https://rpc.preview.midnight.network");
  });
});
