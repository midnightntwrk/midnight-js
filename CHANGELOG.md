# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [5.0.0-beta.8](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-beta.7...v5.0.0-beta.8) (2026-09-11)


### ⚠ BREAKING CHANGES

* **midnight-js:** dispatch both ledger eras through protocol, contracts and the provider seams (#1218)
* **midnight-js:** build provider seams from per-era arms and declare what they serve (#1303)
* **midnight-js:** build provider seams from per-era arms and declare what they serve
* **midnight-js:** publish the retained era as one Ledger8 namespace (#1302)
* **midnight-js:** publish the retained era as one Ledger8 namespace
* **midnight-js:** establish the artifact era from its declared runtime version (#1301)
* **midnight-js:** establish the artifact era from its declared runtime version
* **midnight-js:** gate the contracts public surface and close the era drift it found (#1297)
* **midnight-js:** make the era unions narrow, and refuse a tag naming neither era
* **midnight-js:** give both eras one catchable failure base
* **midnight-js:** give both eras one circuitId and one private-state path
* **midnight-js:** rename Ledger8ConstructorResult
* **midnight-js:** answer the same result structure from both call eras
* **midnight-js:** date indexer reads with the ledger era they belong to (#1207)
* **midnight-js:** bridge the context an unpartitioned call recorded
* **midnight-js:** carry Zswap coin movements on the retained era
* **midnight-js:** date indexer reads with the ledger era they belong to
* **midnight-js:** make the era guards actually guard, and close the seam vocabulary
* **midnight-js:** derive the era discriminant and narrow it through one helper
* **midnight-js:** add head-version and raw-state queries to PublicDataProvider (FR3/FR6)
* **midnight-js:** version-tag the proveTx/balanceTx/submitTx payloads (D14)
* **midnight-js:** add LedgerVersion-discriminated read-surface unions (D14)
* **midnight-js:** refuse a user-addressed payout in an unsettleable token type
* **midnight-js:** complete the compose error vocabulary and its tables
* **midnight-js:** refuse a user-addressed dust payout instead of dropping it
* **midnight-js:** report a refused v8 Zswap offer as an option error
* **midnight-js:** refuse a v9 deploy of a blank-key state with no key map
* **midnight-js:** fail extractState the same way decodeContractState does
* **midnight-js:** move the symmetric ledger operations onto the era facade
* **midnight-js:** make the composition error codes era-neutral

### Features

* **midnight-js:** add 0.16 contract overloads (typing prototype) ([f2a15e9](https://github.com/midnightntwrk/midnight-js/commit/f2a15e9404fac884a87a9c7fd1ef14d320fc233a))
* **midnight-js:** add 0.16 contract overloads (typing prototype) ([#1227](https://github.com/midnightntwrk/midnight-js/pull/1227)) ([9b81bf8](https://github.com/midnightntwrk/midnight-js/commit/9b81bf8988bebd7f64bbed42d0f3f70c14bed07a)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1240](https://github.com/midnightntwrk/midnight-js/pull/1240)
* **midnight-js:** add a require-if-present ZK artifact integrity mode ([49666b5](https://github.com/midnightntwrk/midnight-js/commit/49666b5042b5856ec99a177e0a81a0019903ef9b)), closes [#1268](https://github.com/midnightntwrk/midnight-js/pull/1268)
* **midnight-js:** add a require-if-present ZK artifact integrity mode ([#1269](https://github.com/midnightntwrk/midnight-js/pull/1269)) ([e8fbad8](https://github.com/midnightntwrk/midnight-js/commit/e8fbad87964c14965db4a11ce4bc6d0910fdf5c5)), closes [#1268](https://github.com/midnightntwrk/midnight-js/pull/1268)
* **midnight-js:** add assertNever, error-code registry and bounded tag parse to utils ([f903707](https://github.com/midnightntwrk/midnight-js/commit/f903707d84b9ad5621e59fa0a69d095968f4d494))
* **midnight-js:** add createWalletProvider and createMidnightProvider adapters ([39d171c](https://github.com/midnightntwrk/midnight-js/commit/39d171ca0366bd411302a07de7b2d2e57829a13b))
* **midnight-js:** add fork-crossing stale-head detection with two-step remediation ([b9f7e21](https://github.com/midnightntwrk/midnight-js/commit/b9f7e21c802a096d4aa8a3307e8276e0568aba39))
* **midnight-js:** add fork-crossing stale-head detection with two-step remediation ([#1230](https://github.com/midnightntwrk/midnight-js/pull/1230)) ([89c99b2](https://github.com/midnightntwrk/midnight-js/commit/89c99b2fcd32bb4bc98a2e5565198c11c6e8ab33)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1229](https://github.com/midnightntwrk/midnight-js/pull/1229) [#1223](https://github.com/midnightntwrk/midnight-js/pull/1223) [#1229](https://github.com/midnightntwrk/midnight-js/pull/1229)
* **midnight-js:** add head-version and raw-state queries to PublicDataProvider (FR3/FR6) ([e828504](https://github.com/midnightntwrk/midnight-js/commit/e828504fe7b3fcab60f7e987a1de15cd90877d3d))
* **midnight-js:** add head-version query with corroborated monotonic era latch (FR3/D16) ([5d6799f](https://github.com/midnightntwrk/midnight-js/commit/5d6799f8fdadc509738a26ce6a645f661baaa639))
* **midnight-js:** add internal era dispatch and fork-window fail-fasts ([fbe70ee](https://github.com/midnightntwrk/midnight-js/commit/fbe70ee97bb5d549d8b9ba912a5ee964d7257f48))
* **midnight-js:** add internal era dispatch and fork-window fail-fasts ([#1228](https://github.com/midnightntwrk/midnight-js/pull/1228)) ([6353b28](https://github.com/midnightntwrk/midnight-js/commit/6353b28dbcfb89d489a05f50fe11fc5eb86dc0dc)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1227](https://github.com/midnightntwrk/midnight-js/pull/1227)
* **midnight-js:** add ledger-8 circuit execution and keep-state wrap behind the loadLedger8Engine facade ([71d1a9c](https://github.com/midnightntwrk/midnight-js/commit/71d1a9c6490f1faf05260f2899f57c0c78c18211))
* **midnight-js:** add ledger-8 engine envelope + down-convert/rehash (D11) ([65bfe78](https://github.com/midnightntwrk/midnight-js/commit/65bfe78e863dfe3fc2a0401b8a32574eb51e984c))
* **midnight-js:** add ledger-8 instance/runtime fail-fasts (D15, [#1052](https://github.com/midnightntwrk/midnight-js/pull/1052)) ([680b769](https://github.com/midnightntwrk/midnight-js/commit/680b7695e144ce316aef0b503d9dbfe4da83ef18))
* **midnight-js:** add LedgerVersion-discriminated read-surface unions (D14) ([c2bac30](https://github.com/midnightntwrk/midnight-js/commit/c2bac30d8fc0eed467b04de0a37ba52b624b442f))
* **midnight-js:** add pre-proving verifier-key checks ([b9b777c](https://github.com/midnightntwrk/midnight-js/commit/b9b777cbfd18a993d64d741ffca91913c578455f))
* **midnight-js:** add protocol version identity module (FR1, OQ1) ([56beb0d](https://github.com/midnightntwrk/midnight-js/commit/56beb0da9beb933e53da21de630d70c226463eca))
* **midnight-js:** add protocol/v8 subpath and lazy loadV8 accessor (D13, NFR6) ([ab29faa](https://github.com/midnightntwrk/midnight-js/commit/ab29faaf25fd8eabcc3281e04595dd432e3c6362))
* **midnight-js:** add raw contract-state query with composed head snapshot (FR6/§4.4) ([90ca9a3](https://github.com/midnightntwrk/midnight-js/commit/90ca9a325ae0fc66b610094ee2dfe829b7f49857))
* **midnight-js:** add v8-native tx composition incl. deploy machinery (FR8) ([f9b61dc](https://github.com/midnightntwrk/midnight-js/commit/f9b61dcae5744276c9cce8b81d279ef6b6446a78))
* **midnight-js:** add version-dispatch breadcrumbs ([#1233](https://github.com/midnightntwrk/midnight-js/pull/1233)) ([453d984](https://github.com/midnightntwrk/midnight-js/commit/453d984ec9d01ebd9cfdfeddbca2d7be3badf3ec)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1230](https://github.com/midnightntwrk/midnight-js/pull/1230) [#1230](https://github.com/midnightntwrk/midnight-js/pull/1230) [#1229](https://github.com/midnightntwrk/midnight-js/pull/1229)
* **midnight-js:** add version-dispatch breadcrumbs and error-code meta-test ([b546fb9](https://github.com/midnightntwrk/midnight-js/commit/b546fb9fc8a1ec121a9f67a75a21ad6903107c57))
* **midnight-js:** aggregate user-addressed unshielded outputs across a call tree ([99b2373](https://github.com/midnightntwrk/midnight-js/commit/99b2373db49dc34e19a511b7e4a762c4112820d0))
* **midnight-js:** build provider seams from per-era arms and declare what they serve ([915f89f](https://github.com/midnightntwrk/midnight-js/commit/915f89f73a1b789467d90c505e9a173577c1a474))
* **midnight-js:** build provider seams from per-era arms and declare what they serve ([#1303](https://github.com/midnightntwrk/midnight-js/pull/1303)) ([a3f0a4b](https://github.com/midnightntwrk/midnight-js/commit/a3f0a4b1a3d1aad4f70b0107e59c85fca6b549f3))
* **midnight-js:** carry version-tagged tx payloads through proof/wallet/midnight seams ([6475bd5](https://github.com/midnightntwrk/midnight-js/commit/6475bd5507c5a123a7682a944e84841e4012cf6b))
* **midnight-js:** carry version-tagged tx payloads through the proving seams ([#1237](https://github.com/midnightntwrk/midnight-js/pull/1237)) ([f647685](https://github.com/midnightntwrk/midnight-js/commit/f647685b4254fda7de376e3903ebf1817c1d11b9)), closes [#1052](https://github.com/midnightntwrk/midnight-js/pull/1052) [#1241](https://github.com/midnightntwrk/midnight-js/pull/1241)
* **midnight-js:** compose a v9 call transaction inside the protocol package ([0c8e465](https://github.com/midnightntwrk/midnight-js/commit/0c8e4652173984fd472e0e43a08b224396969df6))
* **midnight-js:** compose a v9 deploy transaction inside the protocol package ([d619be6](https://github.com/midnightntwrk/midnight-js/commit/d619be6d9f139e92ddae28f9797b64cac4fd0396))
* **midnight-js:** decode a contract state to an era-symmetric POJO ([a5d367e](https://github.com/midnightntwrk/midnight-js/commit/a5d367eb1fe273569411c82c4b9f520847561e40))
* **midnight-js:** decode v8 history lazily and surface versioned records ([4162c6f](https://github.com/midnightntwrk/midnight-js/commit/4162c6f08f6157fe8faf04f64ac3920bca39e343))
* **midnight-js:** decode v8 history lazily and surface versioned records ([#1241](https://github.com/midnightntwrk/midnight-js/pull/1241)) ([3bf212f](https://github.com/midnightntwrk/midnight-js/commit/3bf212fc3052efae975e34d612d37f6236d76d20)), closes [#1233](https://github.com/midnightntwrk/midnight-js/pull/1233) [#1228](https://github.com/midnightntwrk/midnight-js/pull/1228) [#1229](https://github.com/midnightntwrk/midnight-js/pull/1229) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1236](https://github.com/midnightntwrk/midnight-js/pull/1236)
* **midnight-js:** dispatch both ledger eras through protocol, contracts and the provider seams ([#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)) ([4b2d912](https://github.com/midnightntwrk/midnight-js/commit/4b2d912cb88057e6f319957e70ee4441ff6d01eb)), closes [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1164](https://github.com/midnightntwrk/midnight-js/pull/1164) [#1168](https://github.com/midnightntwrk/midnight-js/pull/1168) [#1165](https://github.com/midnightntwrk/midnight-js/pull/1165) [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194) [#1198](https://github.com/midnightntwrk/midnight-js/pull/1198) [#1216](https://github.com/midnightntwrk/midnight-js/pull/1216) [#1223](https://github.com/midnightntwrk/midnight-js/pull/1223) [#1225](https://github.com/midnightntwrk/midnight-js/pull/1225) [#1245](https://github.com/midnightntwrk/midnight-js/pull/1245) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1204](https://github.com/midnightntwrk/midnight-js/pull/1204) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1207](https://github.com/midnightntwrk/midnight-js/pull/1207) [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1259](https://github.com/midnightntwrk/midnight-js/pull/1259) [#1240](https://github.com/midnightntwrk/midnight-js/pull/1240) [#1227](https://github.com/midnightntwrk/midnight-js/pull/1227) [#1228](https://github.com/midnightntwrk/midnight-js/pull/1228) [#1229](https://github.com/midnightntwrk/midnight-js/pull/1229) [#1230](https://github.com/midnightntwrk/midnight-js/pull/1230) [#1233](https://github.com/midnightntwrk/midnight-js/pull/1233) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1260](https://github.com/midnightntwrk/midnight-js/pull/1260) [#1241](https://github.com/midnightntwrk/midnight-js/pull/1241) [#1237](https://github.com/midnightntwrk/midnight-js/pull/1237) [#1239](https://github.com/midnightntwrk/midnight-js/pull/1239) [#1238](https://github.com/midnightntwrk/midnight-js/pull/1238) [#1277](https://github.com/midnightntwrk/midnight-js/pull/1277) [#1276](https://github.com/midnightntwrk/midnight-js/pull/1276) [#1283](https://github.com/midnightntwrk/midnight-js/pull/1283) [#1280](https://github.com/midnightntwrk/midnight-js/pull/1280) [#1279](https://github.com/midnightntwrk/midnight-js/pull/1279) [#1281](https://github.com/midnightntwrk/midnight-js/pull/1281) [#1254](https://github.com/midnightntwrk/midnight-js/pull/1254) [#1284](https://github.com/midnightntwrk/midnight-js/pull/1284) [#1287](https://github.com/midnightntwrk/midnight-js/pull/1287) [#1291](https://github.com/midnightntwrk/midnight-js/pull/1291) [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288) [#1297](https://github.com/midnightntwrk/midnight-js/pull/1297) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1204](https://github.com/midnightntwrk/midnight-js/pull/1204) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1207](https://github.com/midnightntwrk/midnight-js/pull/1207) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1198](https://github.com/midnightntwrk/midnight-js/pull/1198) [#1254](https://github.com/midnightntwrk/midnight-js/pull/1254) [#1241](https://github.com/midnightntwrk/midnight-js/pull/1241) [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194) [#1241](https://github.com/midnightntwrk/midnight-js/pull/1241) [#1237](https://github.com/midnightntwrk/midnight-js/pull/1237) [#1245](https://github.com/midnightntwrk/midnight-js/pull/1245) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006) [#1277](https://github.com/midnightntwrk/midnight-js/pull/1277) [#1260](https://github.com/midnightntwrk/midnight-js/pull/1260) [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1006](https://github.com/midnightntwrk/midnight-js/pull/1006)
* **midnight-js:** dispatch the two ledger eras behind loadLedgerEra ([fa913ee](https://github.com/midnightntwrk/midnight-js/commit/fa913eec80295cdc91c4b0d54956aa0626415688))
* **midnight-js:** extend scoped transactions with per-scope era rules ([99367f8](https://github.com/midnightntwrk/midnight-js/commit/99367f8bf707da41873f2933311e01b5872477fc))
* **midnight-js:** give both eras one catchable failure base ([505e0ca](https://github.com/midnightntwrk/midnight-js/commit/505e0cad9b8b517531c04bfb20e51df41d97c51e))
* **midnight-js:** give the recorded-failure family one code, and name what a refusal saw ([6537a8d](https://github.com/midnightntwrk/midnight-js/commit/6537a8dec729d2cca50ba2d1ed37f0e20952b39b))
* **midnight-js:** move the symmetric ledger operations onto the era facade ([8098f0c](https://github.com/midnightntwrk/midnight-js/commit/8098f0c6058c976de79dd6b9bf9eb4551f2ee75e))
* **midnight-js:** publish the era result unions and a guard to narrow them ([894354c](https://github.com/midnightntwrk/midnight-js/commit/894354c4fbe7dbd311e36b7b347015e8c626aade))
* **midnight-js:** publish the era vocabulary the barrels omitted ([8924e11](https://github.com/midnightntwrk/midnight-js/commit/8924e1181a80171e9ef0bf0192a87665fdbc6fb0))
* **midnight-js:** publish the protocol types the contracts API names ([ae48fe8](https://github.com/midnightntwrk/midnight-js/commit/ae48fe89635435c515b795b493e5f5c52a3193c6))
* **midnight-js:** re-export ledger era vocabulary from the barrel ([f1aa88f](https://github.com/midnightntwrk/midnight-js/commit/f1aa88fb880450e5d175b7ae961fdeca9a9bab85))
* **midnight-js:** re-export ledger era vocabulary from the barrel ([078d6c8](https://github.com/midnightntwrk/midnight-js/commit/078d6c85fa212c9e2e3e648c6a5adfa41d1fca9e))
* **midnight-js:** re-export ledger era vocabulary from the barrel ([#1239](https://github.com/midnightntwrk/midnight-js/pull/1239)) ([3b95e16](https://github.com/midnightntwrk/midnight-js/commit/3b95e16b10b9427594076c6855c1149572f1b44c))
* **midnight-js:** read a v9 contract-state envelope without a pre-fork runtime ([23772df](https://github.com/midnightntwrk/midnight-js/commit/23772df5eefd907b2ec24844b63a837cbc20eedc))
* **midnight-js:** refuse a partitioned transcript carrying neither half ([f069cd1](https://github.com/midnightntwrk/midnight-js/commit/f069cd133cb422bed7ffc7cf834d4ac83577a962))
* **midnight-js:** route keep-state and v8-native pipelines through unified entries ([f5d9f93](https://github.com/midnightntwrk/midnight-js/commit/f5d9f93a997c319a792f8bc0845752cee4d31c30))
* **midnight-js:** route keep-state and v8-native pipelines through unified entries ([#1229](https://github.com/midnightntwrk/midnight-js/pull/1229)) ([3d53093](https://github.com/midnightntwrk/midnight-js/commit/3d530936e6e369b8f0900ad4e9284189b4b4ce12)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1228](https://github.com/midnightntwrk/midnight-js/pull/1228)
* **midnight-js:** share era result bases and publish era handles ([0d1e834](https://github.com/midnightntwrk/midnight-js/commit/0d1e8346dde226b07c529621ff48288b77c8a9dd))
* **midnight-js:** tag every result with its era and encode every state handle ([442ebec](https://github.com/midnightntwrk/midnight-js/commit/442ebec80efffb72a80d26680ac08fd443c951e4))
* **midnight-js:** version-tag the proveTx/balanceTx/submitTx payloads (D14) ([45350a1](https://github.com/midnightntwrk/midnight-js/commit/45350a1da4e97f539862963ac3b299f66ddd7a17))
* **testkit-js:** carry the retained era through balanceTx and submitTx ([05a2d39](https://github.com/midnightntwrk/midnight-js/commit/05a2d396e3b37957a0578afc980144bcff76d4ee))


### Bug Fixes

* **config:** make footer line length a warning, like every other length rule ([41ff137](https://github.com/midnightntwrk/midnight-js/commit/41ff1378e1f49dbbb01235eac367f6601a80afbc))
* **deps:** keep the -alt alias off the version this repo resolves ([b46b8b2](https://github.com/midnightntwrk/midnight-js/commit/b46b8b226c57077d2620da64f6678974072971a0))
* **deps:** regenerate yarn.lock for the main merge ([731b6b2](https://github.com/midnightntwrk/midnight-js/commit/731b6b245caf8ed2ec78e1edf247482f5bbf1dc4))
* **midnight-js:** address PR review — gate robustness, type-safe registry, strict tag grammar ([ba0b0c1](https://github.com/midnightntwrk/midnight-js/commit/ba0b0c1a8954df552f7c38d5e24103149ed91ea1))
* **midnight-js:** align call-entry state naming and carry the era and private-state id ([2e0be70](https://github.com/midnightntwrk/midnight-js/commit/2e0be703c2cd9b06fbe2d07a99f3fb9fc80f4ce8))
* **midnight-js:** answer the same result structure from both call eras ([27f46e2](https://github.com/midnightntwrk/midnight-js/commit/27f46e244f8cb96b0c62dddb1d922ece7028a7bd))
* **midnight-js:** attach the unshielded offers on the v8 era arm ([dcb6509](https://github.com/midnightntwrk/midnight-js/commit/dcb650978e99b10b70c4358fe2db330dd1c58b2e))
* **midnight-js:** attribute the retained era's finalized record to its head ([5443b41](https://github.com/midnightntwrk/midnight-js/commit/5443b4103c0323b3a3c1deb57644b52cfd9504d5))
* **midnight-js:** bound the type description and pin the real echo behaviour ([b8137d3](https://github.com/midnightntwrk/midnight-js/commit/b8137d312013727a69f1271f38c923d30a7aa39b))
* **midnight-js:** breadcrumb the post-rejection head read, and stop a faulty logger failing an operation ([98aebb6](https://github.com/midnightntwrk/midnight-js/commit/98aebb6fc7b7c4d3e72be7ceae05c7c47d09319e))
* **midnight-js:** bridge the context an unpartitioned call recorded ([f321ec9](https://github.com/midnightntwrk/midnight-js/commit/f321ec93bcd288b050511a36fe2dc0e93c5440b1))
* **midnight-js:** build the packaging personas outside the repository ([23aecd6](https://github.com/midnightntwrk/midnight-js/commit/23aecd6a0c08fa29c1b345755649a1da56fb8eea))
* **midnight-js:** carry calls on the scoped call result ([0fc077a](https://github.com/midnightntwrk/midnight-js/commit/0fc077a6a0c7e797d979cd7886018c64f55229b3))
* **midnight-js:** carry the chain's ledger parameters across the v8 adapter too ([02d7c72](https://github.com/midnightntwrk/midnight-js/commit/02d7c72401ceb03815752caa495bad9539e49cce))
* **midnight-js:** carry Zswap coin movements on the retained era ([6cc60bb](https://github.com/midnightntwrk/midnight-js/commit/6cc60bbc3c419c2eb1223c19f36cb19a3535b7e9))
* **midnight-js:** check the stage before passing an extraction failure through ([331a5eb](https://github.com/midnightntwrk/midnight-js/commit/331a5eb4ad4205a3f4caa897c02dda511f08f400))
* **midnight-js:** clear dist before the single bundle pass ([df64490](https://github.com/midnightntwrk/midnight-js/commit/df64490179f7199796b938e7d6ae55e39d339b1f))
* **midnight-js:** close the era predicate fail-open and consolidate it ([9eff284](https://github.com/midnightntwrk/midnight-js/commit/9eff284c01017db6c41c15b1abda63c77dec3528))
* **midnight-js:** close the era tables to prototype keys and to a new era ([dffb573](https://github.com/midnightntwrk/midnight-js/commit/dffb573e7de6988d110ed04fca9548205bfa9737))
* **midnight-js:** code the ledger failures the call assembler let escape ([ac2dcdc](https://github.com/midnightntwrk/midnight-js/commit/ac2dcdc40388ff7f0579de2545b1b166ef75af80))
* **midnight-js:** compare the packaging personas against the framework's own runtime ([d104397](https://github.com/midnightntwrk/midnight-js/commit/d104397cd6e43416177509c07491270f11a742a7))
* **midnight-js:** correct five misreporting seams in the ledger-8 engine ([fc8f22d](https://github.com/midnightntwrk/midnight-js/commit/fc8f22dac4cd688fba04f8afb2a7e8686818c793)), closes [#1164](https://github.com/midnightntwrk/midnight-js/pull/1164)
* **midnight-js:** correct the adapter refusal wording and pin the seam's laziness ([0a72260](https://github.com/midnightntwrk/midnight-js/commit/0a72260f519e253fcc5175ff05c5b2e08e1135d7))
* **midnight-js:** correct the keep-state call assembly and harden the engine guards ([824617d](https://github.com/midnightntwrk/midnight-js/commit/824617dff499c479cf456bc57a59aec12f09e525))
* **midnight-js:** date a block's ledger parameters before decoding them ([c59ca9d](https://github.com/midnightntwrk/midnight-js/commit/c59ca9d8e91134599aa80f5d9d32df8cbb3eb2b0))
* **midnight-js:** date a block's ledger parameters before decoding them ([#1279](https://github.com/midnightntwrk/midnight-js/pull/1279)) ([27516d7](https://github.com/midnightntwrk/midnight-js/commit/27516d71c3fd67ca63064dbb8b269c7ec2176168)), closes [#1277](https://github.com/midnightntwrk/midnight-js/pull/1277)
* **midnight-js:** date indexer reads with the ledger era they belong to ([40e4f25](https://github.com/midnightntwrk/midnight-js/commit/40e4f25e5f47181986f5408bd70555f472aa9860))
* **midnight-js:** date indexer reads with the ledger era they belong to ([#1207](https://github.com/midnightntwrk/midnight-js/pull/1207)) ([2d7bde2](https://github.com/midnightntwrk/midnight-js/commit/2d7bde23109a1254105a582e64c1542a4ecfcbd1)), closes [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [/github.com/midnightntwrk/midnight-js/pull/1177#pullrequestreview-5064575104](https://github.com/midnightntwrk/midnight-js/pull/pullrequestreview-5064575104) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177)
* **midnight-js:** declare the scope registry in the PnP persona ([616282d](https://github.com/midnightntwrk/midnight-js/commit/616282d17b94cb297f9c7f24ab6f39f6fbd3786b))
* **midnight-js:** defer the protocol barrel and correct the seam's documentation ([c188ad5](https://github.com/midnightntwrk/midnight-js/commit/c188ad52089595dcd1f019012725acf8f062b50a))
* **midnight-js:** deliver coded scope refusals and stop diagnosing uncoded rejections ([d743df1](https://github.com/midnightntwrk/midnight-js/commit/d743df12268d6a8e53e4744fa0b359a142d8603d))
* **midnight-js:** derive the era discriminant and narrow it through one helper ([c491d66](https://github.com/midnightntwrk/midnight-js/commit/c491d66cce285fbf5428c5c4610df9c6db411ebd))
* **midnight-js:** distinguish a keyless operation slot from a key mismatch ([#1274](https://github.com/midnightntwrk/midnight-js/pull/1274)) ([8545d7a](https://github.com/midnightntwrk/midnight-js/commit/8545d7a5853e0594e8987726d30a9f44f29d6a0e)), closes [#1270](https://github.com/midnightntwrk/midnight-js/pull/1270) [#1270](https://github.com/midnightntwrk/midnight-js/pull/1270) [#1270](https://github.com/midnightntwrk/midnight-js/pull/1270) [#1270](https://github.com/midnightntwrk/midnight-js/pull/1270) [#1270](https://github.com/midnightntwrk/midnight-js/pull/1270)
* **midnight-js:** drop the npm scope from the v8-runtime-missing specifier ([e3e30a3](https://github.com/midnightntwrk/midnight-js/commit/e3e30a3dc68bf3843c6a5db203be2ceb6d8652e3))
* **midnight-js:** encrypt retained-era outputs per recipient, and refuse an empty private state ([11a9f47](https://github.com/midnightntwrk/midnight-js/commit/11a9f47df1290b29f56df98642246350b3f768b0))
* **midnight-js:** establish the artifact era from its declared runtime version ([5a6345b](https://github.com/midnightntwrk/midnight-js/commit/5a6345b331fa6c01144b06e14bd6919863059a7c))
* **midnight-js:** establish the artifact era from its declared runtime version ([#1301](https://github.com/midnightntwrk/midnight-js/pull/1301)) ([0b37da7](https://github.com/midnightntwrk/midnight-js/commit/0b37da71431fc37ee9618452bd7c054006af6ca5)), closes [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)
* **midnight-js:** export the contracts types its signatures already name ([2568a7b](https://github.com/midnightntwrk/midnight-js/commit/2568a7bfb6869c1fd7192116a8c6189726d3f14a))
* **midnight-js:** export the era and verification-path errors from the barrel ([a3488c8](https://github.com/midnightntwrk/midnight-js/commit/a3488c822a9ed19028576ddead2fa1cf96f5e8d9))
* **midnight-js:** fail closed on an unknown ledger version during extraction ([c7f9f62](https://github.com/midnightntwrk/midnight-js/commit/c7f9f62d687920e5f5579c04f71c67d7fa82bdf5))
* **midnight-js:** fail extractState the same way decodeContractState does ([181396a](https://github.com/midnightntwrk/midnight-js/commit/181396a203c922dbc8194987cdc4e436399f18ae))
* **midnight-js:** fail fast on an unrecognised StateValue variant and a fallible root() ([c116b23](https://github.com/midnightntwrk/midnight-js/commit/c116b23828312b40592b97aa5c0b669e51f823fe))
* **midnight-js:** fail fast when a raw state arrives without a dating block ([ce12b3a](https://github.com/midnightntwrk/midnight-js/commit/ce12b3a630287cb74820a61e4af4096c2ec64bc9))
* **midnight-js:** gate the contract handles for era parity ([e087691](https://github.com/midnightntwrk/midnight-js/commit/e0876919b915a5240aebb9838f31a00699ff0676))
* **midnight-js:** gate the contracts public surface and close the era drift it found ([#1297](https://github.com/midnightntwrk/midnight-js/pull/1297)) ([5c43999](https://github.com/midnightntwrk/midnight-js/commit/5c4399967a8baf257a177d29366bf1924dca104e)), closes [#1298](https://github.com/midnightntwrk/midnight-js/pull/1298)
* **midnight-js:** gate the Ledger8 rename table, and correct its documentation ([17b1ba6](https://github.com/midnightntwrk/midnight-js/commit/17b1ba6ef77b24268981876b9a8c9607f49ea5d8)), closes [#1302](https://github.com/midnightntwrk/midnight-js/pull/1302)
* **midnight-js:** ground the retained-era deploy refusal in a measured authority ([e3fb7dd](https://github.com/midnightntwrk/midnight-js/commit/e3fb7dd1b07086644d71139eaa5c85e25730b390))
* **midnight-js:** guard the retained-era payload field and cover the proving seam ([7b11c5a](https://github.com/midnightntwrk/midnight-js/commit/7b11c5a53450119ad6abcb9d7e5b04fd619ecd48))
* **midnight-js:** harden HF gates — dynamic-import ban, cast-gate regex, tag-parse remediation ([e2c720b](https://github.com/midnightntwrk/midnight-js/commit/e2c720bc2fddd8d72671563a3c338daea0d2c767))
* **midnight-js:** harden instance guard against nullish probes + test gaps ([bbe17c9](https://github.com/midnightntwrk/midnight-js/commit/bbe17c907f6f0f923eb4b787cdfe1aae74a9b0bc))
* **midnight-js:** harden loadV8 failure handling and v8 laziness gates ([f00027f](https://github.com/midnightntwrk/midnight-js/commit/f00027f7a6090460799ab491fa8172f85591b3c9))
* **midnight-js:** harden the barrel era surface and its docs ([ec22cb8](https://github.com/midnightntwrk/midnight-js/commit/ec22cb8fe7602913c1642d32b18f255d7f5b78fc))
* **midnight-js:** harden the barrel era surface and its docs ([76f6157](https://github.com/midnightntwrk/midnight-js/commit/76f61578acccb76eb11a887785fc0055af86b5c6))
* **midnight-js:** harden the v8 composition legs and keep ledger-v8 lazy ([c999718](https://github.com/midnightntwrk/midnight-js/commit/c999718ebf227b29fef574a9702ac8813a73a920))
* **midnight-js:** hash the files the HF gates actually guard ([2b589c4](https://github.com/midnightntwrk/midnight-js/commit/2b589c4049579c52a993a4be32b1ccf4a7a4e6e8))
* **midnight-js:** hold back the retained-era deployed-contract type ([adf6ef4](https://github.com/midnightntwrk/midnight-js/commit/adf6ef4a1d560ac9c85d629cddf83a0534dd86a3))
* **midnight-js:** invoke the pinned Yarn release for the PnP persona ([4e7cc86](https://github.com/midnightntwrk/midnight-js/commit/4e7cc8612028a5d30dcc41b31d8d48b8bdffc150))
* **midnight-js:** keep a real current-era arm last on the era entry points ([5153eb5](https://github.com/midnightntwrk/midnight-js/commit/5153eb5c78678159ac4436b41b8940596ddd330d))
* **midnight-js:** keep argument-taking 0.16 contracts inside the era family ([5c487d7](https://github.com/midnightntwrk/midnight-js/commit/5c487d7220ef09978caf6796d550b3c640476479))
* **midnight-js:** keep era-latch corroboration failures out of finalization reads ([8e80dde](https://github.com/midnightntwrk/midnight-js/commit/8e80dde7341f746b3f1be0e81e8aed21a198bfd0))
* **midnight-js:** keep the dual-scope instance hint intact through the publish rewrite ([3308f80](https://github.com/midnightntwrk/midnight-js/commit/3308f80637f49d82c8fa0efd5c08332a8e483bcf))
* **midnight-js:** keep the scope context variant in its circuit parameter ([bcb8559](https://github.com/midnightntwrk/midnight-js/commit/bcb8559d61379f2ab6540114a4f500c80ebed082))
* **midnight-js:** key a v8 deploy by the entry point the state declares ([2eb8234](https://github.com/midnightntwrk/midnight-js/commit/2eb8234588af3219a83ded5c878e30af45f72082))
* **midnight-js:** let a migrated contract be called more than once ([2160bd0](https://github.com/midnightntwrk/midnight-js/commit/2160bd0a4630d21a3b3effe153048b9aad5dd19d))
* **midnight-js:** let a migrated contract be called more than once ([#1287](https://github.com/midnightntwrk/midnight-js/pull/1287)) ([8068947](https://github.com/midnightntwrk/midnight-js/commit/80689470f1655905edf82e60c2649641b7509768)), closes [#1285](https://github.com/midnightntwrk/midnight-js/pull/1285) [#1285](https://github.com/midnightntwrk/midnight-js/pull/1285) [#1284](https://github.com/midnightntwrk/midnight-js/pull/1284) [#1285](https://github.com/midnightntwrk/midnight-js/pull/1285)
* **midnight-js:** let the envelope decide the era, the block only bound it ([89fcd20](https://github.com/midnightntwrk/midnight-js/commit/89fcd20a117e1c36974f9b1aec6fbd0f5ab8d170))
* **midnight-js:** make dist-laziness test skip visibly without built dist ([f59c2b3](https://github.com/midnightntwrk/midnight-js/commit/f59c2b34c534038372cd5463c366bcde907e5e19))
* **midnight-js:** make Merkle recursion tests catch a broken rehash walk ([e97e5fd](https://github.com/midnightntwrk/midnight-js/commit/e97e5fd6ecb59aa8549f1646dcd3765baa79f29e))
* **midnight-js:** make the engine-core down-convert fail closed ([cbbae4f](https://github.com/midnightntwrk/midnight-js/commit/cbbae4fbc6c213c35a4dcaa07097bb1f2b1a1b7b))
* **midnight-js:** make the era guards actually guard, and close the seam vocabulary ([9f7d3fa](https://github.com/midnightntwrk/midnight-js/commit/9f7d3fa62986d7eac82c9638031e38bf56061425)), closes [#1204](https://github.com/midnightntwrk/midnight-js/pull/1204)
* **midnight-js:** make the era unions narrow, and refuse a tag naming neither era ([60319e7](https://github.com/midnightntwrk/midnight-js/commit/60319e7c1d2dd79c2a7d6a2d90710fe3045d8bfd))
* **midnight-js:** make the instance-mismatch remediation package-manager agnostic ([9db5813](https://github.com/midnightntwrk/midnight-js/commit/9db5813e4ba7b81b21905fc77a4ef88812e1208d))
* **midnight-js:** make the payload describer total ([a88b053](https://github.com/midnightntwrk/midnight-js/commit/a88b0534de94554349c1a7cb8a5cd154bd4a8ed2))
* **midnight-js:** make the retained-runtime resolution check fail closed ([4c114dd](https://github.com/midnightntwrk/midnight-js/commit/4c114dd8423699b8161fb2d4028e418c9549468b))
* **midnight-js:** make the unshielded surviving-balance control actually run ([685be91](https://github.com/midnightntwrk/midnight-js/commit/685be9175bd30e80bd1dad3bacddcd50dc5f7984)), closes [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288) [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288)
* **midnight-js:** name both npm scopes in the ledger-8 instance-mismatch hint ([1bff608](https://github.com/midnightntwrk/midnight-js/commit/1bff608bd24d84ad29e10b4c8bf43ecd1d497ca7))
* **midnight-js:** name loadLedger8 in the v8 gate messages ([d3771b1](https://github.com/midnightntwrk/midnight-js/commit/d3771b176a2f33951088305a0da118c7ac2be6bf))
* **midnight-js:** name the eras by role in the neither-era message ([768ef07](https://github.com/midnightntwrk/midnight-js/commit/768ef07863bd8f4d06960438392ee417476496d9))
* **midnight-js:** normalize the retained-era coin key and type its refusals ([3f7e0ec](https://github.com/midnightntwrk/midnight-js/commit/3f7e0ecf743f3f3ecc73fd841b5aeb411d214a56))
* **midnight-js:** partition retained calls against the chain's own ledger parameters ([5012ee8](https://github.com/midnightntwrk/midnight-js/commit/5012ee85de6949f30f8946d825fb1076ad262cb7))
* **midnight-js:** pass instance-mismatch errors through the loadLedger8Engine facade unwrapped ([f002525](https://github.com/midnightntwrk/midnight-js/commit/f002525a551582bc51aaf49229c7a01293e9e5be))
* **midnight-js:** pin the ledger-8 runtime to the pre-fork era ([41dd076](https://github.com/midnightntwrk/midnight-js/commit/41dd076a466d8fee5530cc9fc3550bb06beb05b1))
* **midnight-js:** publish PayloadNotATransactionError with its code ([cd3c962](https://github.com/midnightntwrk/midnight-js/commit/cd3c962f9d1351ad624e876b99a0da465dd13367))
* **midnight-js:** publish PayloadNotATransactionError with its code ([0fd7950](https://github.com/midnightntwrk/midnight-js/commit/0fd79502e17e432f7735f33f42d5fcc5b16ba1c8))
* **midnight-js:** publish the encoded post-state in the current era too ([38d9881](https://github.com/midnightntwrk/midnight-js/commit/38d9881665aec2a109d56b34ad7bd1a08300c8b3))
* **midnight-js:** re-export the protocol Contract type in type position ([0158073](https://github.com/midnightntwrk/midnight-js/commit/0158073c6c75f4e17f1e03846dae20b7c29a9413))
* **midnight-js:** read a retained twin's era off the envelope, not the deploy ([56e3870](https://github.com/midnightntwrk/midnight-js/commit/56e3870b20f72eab9fc1eec634972cac0403f41c))
* **midnight-js:** read a retained twin's ledger through its own runtime ([34c2ea4](https://github.com/midnightntwrk/midnight-js/commit/34c2ea4a05612fe3067a8e49c23d34d2e822978a))
* **midnight-js:** read keep-state against the chain's own state and parameters ([#1276](https://github.com/midnightntwrk/midnight-js/pull/1276)) ([b9f2e13](https://github.com/midnightntwrk/midnight-js/commit/b9f2e13cee18c3b9604fd32f0a18fea6e080bcee))
* **midnight-js:** read keep-state on the envelope the chain actually serves ([786892c](https://github.com/midnightntwrk/midnight-js/commit/786892c4b205566571bfac16683d1ee09964e4b9))
* **midnight-js:** read the recipient tag before matching a new coin's owner ([08adf12](https://github.com/midnightntwrk/midnight-js/commit/08adf120137d4253c2267fc92e27a9a49c17716b))
* **midnight-js:** read the retained call's transaction id off its own record ([ac80433](https://github.com/midnightntwrk/midnight-js/commit/ac80433a2779a4048fd2cbf87019ae59cfe41f75))
* **midnight-js:** recognise Ledger8RuntimeMissingError by code ([90c8d1e](https://github.com/midnightntwrk/midnight-js/commit/90c8d1e864fd90e020a9397a89d597b6aebe1d6e))
* **midnight-js:** recognise the engine-core errors by code ([828778e](https://github.com/midnightntwrk/midnight-js/commit/828778e1167943a74cfc901f67a6a5c8b0edf37e))
* **midnight-js:** refuse a pre-fork scope before acquiring that era, and name what a rejected submission left behind ([750c0fc](https://github.com/midnightntwrk/midnight-js/commit/750c0fc47f7421ddb7a33c660b46fd4812d964a3))
* **midnight-js:** refuse a user-addressed dust payout instead of dropping it ([2b24bc5](https://github.com/midnightntwrk/midnight-js/commit/2b24bc5e49988edabc77521df4d12a617e12e215))
* **midnight-js:** refuse a user-addressed payout in an unsettleable token type ([2ecd8e1](https://github.com/midnightntwrk/midnight-js/commit/2ecd8e1ec44dd05f7ce43408f3bdc00e88d65812))
* **midnight-js:** refuse a v9 deploy of a blank-key state with no key map ([eb7e932](https://github.com/midnightntwrk/midnight-js/commit/eb7e9328656ecca2327941fa4353487464312757))
* **midnight-js:** refuse era keys that only coerce, and kinds that are not calls ([c2223ad](https://github.com/midnightntwrk/midnight-js/commit/c2223ad7b81b944b19bea444d29019bf20a7b626))
* **midnight-js:** refuse the envelope before the era's own limits on v8 ([c6e9e47](https://github.com/midnightntwrk/midnight-js/commit/c6e9e47301d999f3e30d860c1d5ac2b2228e42e3))
* **midnight-js:** render the neither-era brand from the last overload ([47b76dc](https://github.com/midnightntwrk/midnight-js/commit/47b76dc65c87d0ddc31363be954807c5fe588d36))
* **midnight-js:** report a decode failure without attributing an era ([ace58e8](https://github.com/midnightntwrk/midnight-js/commit/ace58e89c96d146c378e8345fd94d844013c83d3))
* **midnight-js:** report a refused v8 Zswap offer as an option error ([6bbf845](https://github.com/midnightntwrk/midnight-js/commit/6bbf845d73fe81b68cf16dfa5634e56103e1ed61))
* **midnight-js:** report an era disagreement only when the payload names another vintage ([0736180](https://github.com/midnightntwrk/midnight-js/commit/07361806c92c1feb257f23e81c19e46a0e0aa345))
* **midnight-js:** require a call's ledger parameters instead of defaulting them ([7dc3f76](https://github.com/midnightntwrk/midnight-js/commit/7dc3f76e61954fcb2cd276e4380d4757059f1792))
* **midnight-js:** require a call's ledger parameters instead of defaulting them ([#1283](https://github.com/midnightntwrk/midnight-js/pull/1283)) ([7fbec20](https://github.com/midnightntwrk/midnight-js/commit/7fbec20a4bf2ff02235d4c0a9f32b45364f66f99))
* **midnight-js:** resolve gate specifiers instead of matching them as text ([46ba5a1](https://github.com/midnightntwrk/midnight-js/commit/46ba5a1f993a74a6efe86ab5c55461274e7e1a7d))
* **midnight-js:** route retained-era Zswap coins against the call's own partition ([af56141](https://github.com/midnightntwrk/midnight-js/commit/af5614134c0e1194b8662200a741d5dab94e431c)), closes [#877](https://github.com/midnightntwrk/midnight-js/pull/877)
* **midnight-js:** route retained-era Zswap coins against the call's own partition ([#1280](https://github.com/midnightntwrk/midnight-js/pull/1280)) ([411e2a9](https://github.com/midnightntwrk/midnight-js/commit/411e2a94bd401b2371e62178d1ef21ba9444ba3b)), closes [#877](https://github.com/midnightntwrk/midnight-js/pull/877)
* **midnight-js:** sanitize retained-era seam failures and cover the attach arm ([1950bec](https://github.com/midnightntwrk/midnight-js/commit/1950bec8c0821458ba3004fec2a65c893afbda88))
* **midnight-js:** scope the v8 gates by ignores instead of disabling the rule ([7699835](https://github.com/midnightntwrk/midnight-js/commit/769983579e392349aee46e980d417a99c1cafe74))
* **midnight-js:** serve only head-field values from the era latch ([8366873](https://github.com/midnightntwrk/midnight-js/commit/836687379d36d372ea7be9724f038b7b78bc4abb))
* **midnight-js:** share one error module across protocol bundles ([388ceee](https://github.com/midnightntwrk/midnight-js/commit/388ceee57402f2b96cb1688fcb1afd5c6704de98))
* **midnight-js:** sound era discrimination and a typed retained-era refusal ([bc697f8](https://github.com/midnightntwrk/midnight-js/commit/bc697f898c4695a34fb2a657bb10671503f68081))
* **midnight-js:** stop the fork driver losing the error that killed it ([d104791](https://github.com/midnightntwrk/midnight-js/commit/d1047917741d5f308beef72682113b7324f1804e))
* **midnight-js:** tag the retained-era deploy record before publishing it ([72d8bbe](https://github.com/midnightntwrk/midnight-js/commit/72d8bbe84cebdae5d030d7be3c30729a00eaf5e6))
* **midnight-js:** take the era from the pinned manifest and make the era gate real ([0d51416](https://github.com/midnightntwrk/midnight-js/commit/0d51416e440a50976553530491c75b29374bc7ea))
* **midnight-js:** upload the stack logs from a non-hidden directory ([c3ddffe](https://github.com/midnightntwrk/midnight-js/commit/c3ddffe46125514b1302d4bcad58c40075eb885c))
* **midnight-js:** wire the doc gates into CI and correct the deploy story ([94e9fa6](https://github.com/midnightntwrk/midnight-js/commit/94e9fa63cf0ca1ce815e01211552a52ac1fa40fb))
* **midnight-js:** withhold the era upper bound on unpinned indexer reads ([b95adce](https://github.com/midnightntwrk/midnight-js/commit/b95adce66b9e143d726a9660adc42c9965e50229))
* **release:** rewrite scope inside built files on public npm publish ([4c48a99](https://github.com/midnightntwrk/midnight-js/commit/4c48a992f1e48e44d85b4b41b5d099980b59314d))
* **testkit-js:** authorize ghcr for the fork lane on an image-cache hit ([1ab196c](https://github.com/midnightntwrk/midnight-js/commit/1ab196c97e527323557cbd37b6305c4a858563ba))
* **testkit-js:** bound the container-log capture so it cannot hang the run ([556ce15](https://github.com/midnightntwrk/midnight-js/commit/556ce15ebcf114edad5279afd262375f9ddff4da))
* **testkit-js:** build the wallet provider test's seed set the way the constructor expects ([5618142](https://github.com/midnightntwrk/midnight-js/commit/56181424d1c0849d610bd21230e52a589a722bc8))
* **testkit-js:** do not commit the retained fixture's declaration file ([c9c170d](https://github.com/midnightntwrk/midnight-js/commit/c9c170d854b0922dcddd2dc32ef2e337adc81d2d))
* **testkit-js:** find the fixtures-hf entry by key under the single-pass rollup ([2902fa6](https://github.com/midnightntwrk/midnight-js/commit/2902fa6275ba42b9884cce43361288b557b63073))
* **testkit-js:** make fork enactment and teardown diagnosable ([97e446f](https://github.com/midnightntwrk/midnight-js/commit/97e446f2719b44dd979c14832ca0dc441e40a6c7)), closes [#0](https://github.com/midnightntwrk/midnight-js/pull/0)
* **testkit-js:** rework A4 fixture as a valid state, foreign key inside ([9547780](https://github.com/midnightntwrk/midnight-js/commit/95477809b5fd1a583d5533da34c565cc27fb9e07))


### Documentation

* add ADR 0005 for the ESM-only publish decision ([#1188](https://github.com/midnightntwrk/midnight-js/pull/1188)) ([fe47f31](https://github.com/midnightntwrk/midnight-js/commit/fe47f31228e481eaab8c9c8dc9c9deb645673024)), closes [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1173](https://github.com/midnightntwrk/midnight-js/pull/1173) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1157](https://github.com/midnightntwrk/midnight-js/pull/1157) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180)
* add ADR 0008 for reading the network head version on every call ([db0865b](https://github.com/midnightntwrk/midnight-js/commit/db0865b1493165a0c0a19829821436551c1b3320))
* API documentation update ([fd02972](https://github.com/midnightntwrk/midnight-js/commit/fd02972ac023e19e1bed954633a8be2800fe051e))
* API documentation update ([1e71874](https://github.com/midnightntwrk/midnight-js/commit/1e71874610861ea880457f26d00714d02b7733df))
* API documentation update ([ff950ba](https://github.com/midnightntwrk/midnight-js/commit/ff950ba6ff9a8174929a50db8e7ecd510b7053eb))
* API documentation update ([a1b2146](https://github.com/midnightntwrk/midnight-js/commit/a1b2146a1eadd17281a4fde6261983ee1c9107ff))
* API documentation update ([#1193](https://github.com/midnightntwrk/midnight-js/pull/1193)) ([57d1436](https://github.com/midnightntwrk/midnight-js/commit/57d14365f47ba0a442009cc953fa8c6162779413))
* API documentation update ([#1224](https://github.com/midnightntwrk/midnight-js/pull/1224)) ([8ff04e4](https://github.com/midnightntwrk/midnight-js/commit/8ff04e4a7890993bf30b2864036a634169f0a4dc))
* API documentation update ([#1267](https://github.com/midnightntwrk/midnight-js/pull/1267)) ([54e1012](https://github.com/midnightntwrk/midnight-js/commit/54e10120ee768c01ded2eb5e5c14f272370945e7))
* API documentation update ([#1275](https://github.com/midnightntwrk/midnight-js/pull/1275)) ([fdb2ab1](https://github.com/midnightntwrk/midnight-js/commit/fdb2ab1cb359799ddc5c82c360e9df4f92076246))
* API documentation update ([#1304](https://github.com/midnightntwrk/midnight-js/pull/1304)) ([3e1f1f1](https://github.com/midnightntwrk/midnight-js/commit/3e1f1f138e859cf3ffaedb4c6eea1adf622f23ce))
* frame ADR 0008 corroboration cache as an unmerged spike ([025133d](https://github.com/midnightntwrk/midnight-js/commit/025133dbeec3d2aed32e335a55cde2853ee3fc12))
* make the ADR set internally consistent ([ccf2461](https://github.com/midnightntwrk/midnight-js/commit/ccf2461bf7f25c7ff4a7824d01a458f68fec68c9)), closes [#1241](https://github.com/midnightntwrk/midnight-js/pull/1241)
* **midnight-js:** add ADR 0006 for version-tagged provider seam payloads ([142d245](https://github.com/midnightntwrk/midnight-js/commit/142d24577504159fd70de242c8fdd9690a77c896))
* **midnight-js:** add an audit prompt for result-shape consistency ([4af5656](https://github.com/midnightntwrk/midnight-js/commit/4af565611871cc575d827bca0cb1a3e52313524a))
* **midnight-js:** add protocol architecture documents ([252fcab](https://github.com/midnightntwrk/midnight-js/commit/252fcabac7e036f5d19290899d64137a139c025c))
* **midnight-js:** close the loop on the uncached head reading ([9663bd7](https://github.com/midnightntwrk/midnight-js/commit/9663bd728bb0a1a936d5a39cca9b95cdc01300d5))
* **midnight-js:** commit the result-shape audit and correct its brief ([e9015ed](https://github.com/midnightntwrk/midnight-js/commit/e9015edf0b37a24bbeadcf333401a22ea8f30180))
* **midnight-js:** consolidate the derived-versus-narrowed thread ([afc19bb](https://github.com/midnightntwrk/midnight-js/commit/afc19bb4d580014cbf5df3921b6cc3b78c140cb0))
* **midnight-js:** correct error-code remediations and harden the doc gates ([b0991c1](https://github.com/midnightntwrk/midnight-js/commit/b0991c1cbff23ffc4d818925256509527ab591f3))
* **midnight-js:** correct false claims and give vendor-slice typing one home ([0600b6d](https://github.com/midnightntwrk/midnight-js/commit/0600b6dbc61a800972d2ca783f2fbb6fa4d818f9))
* **midnight-js:** correct stale comments and README gaps ([5bd1a54](https://github.com/midnightntwrk/midnight-js/commit/5bd1a54581d7829fe65461d3ed96d255be75a4a8))
* **midnight-js:** correct the AC0 blocker to the wallet-sdk pin ([2aa196f](https://github.com/midnightntwrk/midnight-js/commit/2aa196fd2420904d6e3b270f3dc7acdd0b5dcb7b))
* **midnight-js:** correct the claims the code contradicts ([44f8cde](https://github.com/midnightntwrk/midnight-js/commit/44f8cdef337a36846ea862a4ecbb1f2358f6923a))
* **midnight-js:** correct the deploy rationale, the pipeline order and the redaction rules ([b40c051](https://github.com/midnightntwrk/midnight-js/commit/b40c0510dcaccb4042db2972dbd7c9d689291b90))
* **midnight-js:** correct the dist-laziness claim and the paths the split staled ([554fc4f](https://github.com/midnightntwrk/midnight-js/commit/554fc4fad732d5b440034455bdc317483f2a4f60))
* **midnight-js:** correct the era discriminator ranking and the predicate plan ([85968fe](https://github.com/midnightntwrk/midnight-js/commit/85968fef2bc6114f50722915b0a48351a85fdf61))
* **midnight-js:** correct the era seam's rationales and error table ([59578c1](https://github.com/midnightntwrk/midnight-js/commit/59578c1064a2ebdee7f6f283071ddf9382aafe63))
* **midnight-js:** correct the era seam's stale references and record the follow-ups ([30304ad](https://github.com/midnightntwrk/midnight-js/commit/30304ad55d78e7a14cf73c3fe9d2262888d88de3))
* **midnight-js:** correct the era-parity claims this branch outdated ([ac6469d](https://github.com/midnightntwrk/midnight-js/commit/ac6469d263a45e95ee094d005fe48f3ce84cb8b0))
* **midnight-js:** correct the merkle rehash claim in the fixture generator ([09d443d](https://github.com/midnightntwrk/midnight-js/commit/09d443da139bd866336ea9e6a1c48e556eee9899))
* **midnight-js:** correct the protocol README against the built exports ([8b0a025](https://github.com/midnightntwrk/midnight-js/commit/8b0a025248f8821d78a4afe83e29ec218e7e3e75))
* **midnight-js:** correct the public examples and add the 5.0.0 migration notes ([cf506ac](https://github.com/midnightntwrk/midnight-js/commit/cf506ac0db048bee4be4ddc1223db5640a999e36))
* **midnight-js:** correct the seam guidance and complete the 5.0.0 release notes ([a7e641e](https://github.com/midnightntwrk/midnight-js/commit/a7e641e7a757a280b803043bc8a461703039fa67))
* **midnight-js:** describe the era split and repoint its stale paths ([2a9b9cb](https://github.com/midnightntwrk/midnight-js/commit/2a9b9cb1f852a1729b66234a6260e54704049ea8))
* **midnight-js:** describe the retained era's result and failure surfaces ([251e81f](https://github.com/midnightntwrk/midnight-js/commit/251e81f8ffd2d6b87e823f38090ccc8d1002b14f))
* **midnight-js:** document the era-mismatch throw and fix the runtime-access claim ([d80e551](https://github.com/midnightntwrk/midnight-js/commit/d80e551a1e3e8b44f7f85c4bb2e1de7e47098a1a))
* **midnight-js:** document the fork window and every error code (AC9) ([2e67179](https://github.com/midnightntwrk/midnight-js/commit/2e67179caffc21a6e9b82db3aa8b22f0541623c7))
* **midnight-js:** document the fork window and every error code (AC9) ([#1254](https://github.com/midnightntwrk/midnight-js/pull/1254)) ([abab27b](https://github.com/midnightntwrk/midnight-js/commit/abab27b5fb48807c6da3db9d8d090353cc217371)), closes [#1204](https://github.com/midnightntwrk/midnight-js/pull/1204) [#1239](https://github.com/midnightntwrk/midnight-js/pull/1239) [#1239](https://github.com/midnightntwrk/midnight-js/pull/1239)
* **midnight-js:** document the head protocol version as an uncached read ([d9ae31a](https://github.com/midnightntwrk/midnight-js/commit/d9ae31a8360206c0ecdf317e20736ef31ba6a0b3))
* **midnight-js:** document the ledger-era facade and its Zswap asymmetry ([a6ce414](https://github.com/midnightntwrk/midnight-js/commit/a6ce4148d72482b63f35343c42c1a59cbb22dc06))
* **midnight-js:** document the two error codes the base branch added ([ed0721c](https://github.com/midnightntwrk/midnight-js/commit/ed0721cb7d3f59c5154dd2cde891ce1e53f6f7dc))
* **midnight-js:** document the two new provider members and the version field ([3ab65fc](https://github.com/midnightntwrk/midnight-js/commit/3ab65fc207917448d0737a6745752812b3d9f8d6))
* **midnight-js:** drop the retained pipeline's pre-routing claims ([c8cdd02](https://github.com/midnightntwrk/midnight-js/commit/c8cdd0283b7fcddce25a2caf32f08bce5a48c63e))
* **midnight-js:** export the retained-era types, and make six published statements true ([9b029a3](https://github.com/midnightntwrk/midnight-js/commit/9b029a31ddc02e24370362bcc6669318fcc870f0))
* **midnight-js:** extract the era-boundary transport rule into ADR 0007 ([bf6059c](https://github.com/midnightntwrk/midnight-js/commit/bf6059c6dfffb2738ceee0c0d8aba05eced95965))
* **midnight-js:** fix three false claims found in review ([263f52e](https://github.com/midnightntwrk/midnight-js/commit/263f52eaa3eaaf9738adaccbf6e2f1eb9b29398a))
* **midnight-js:** give protocol errors a tagged API contract ([3bac41a](https://github.com/midnightntwrk/midnight-js/commit/3bac41a621ae3ddfc7a728e554e618e8f7eceb6a))
* **midnight-js:** give the era seam a tagged API contract ([ac07d05](https://github.com/midnightntwrk/midnight-js/commit/ac07d057428ca4e326d98b775211ac0776db5bcb)), closes [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)
* **midnight-js:** give the shared compose seams a tagged API contract ([e17f25c](https://github.com/midnightntwrk/midnight-js/commit/e17f25c714d169f0a7c27308391174d05cb0d691))
* **midnight-js:** give the v8 bridge a tagged API contract ([66e2c24](https://github.com/midnightntwrk/midnight-js/commit/66e2c24fbdb6817d237a635f4aeed7a63bc9de6b))
* **midnight-js:** give the version module a tagged API contract ([72803cf](https://github.com/midnightntwrk/midnight-js/commit/72803cf8d0161b71a8cdf32e22ee59ac40670339))
* **midnight-js:** justify the unconditional runtime argument by the real call graph ([64a5068](https://github.com/midnightntwrk/midnight-js/commit/64a50686dcd25afcb420cac529ad56695b4b1fa8))
* **midnight-js:** make the 5.0.0 release docs describe dual decode, and harden three gates ([d2dcfe6](https://github.com/midnightntwrk/midnight-js/commit/d2dcfe69250954a4d9b3413a0681db5643b99538))
* **midnight-js:** mark the hardcoded v9 arm as transitional ([5ccd149](https://github.com/midnightntwrk/midnight-js/commit/5ccd149528976eb4f7881fa545375d1a0fa491ea))
* **midnight-js:** move breadcrumb rationale into a package document ([e477427](https://github.com/midnightntwrk/midnight-js/commit/e477427d72b91bbaeba17de725b86499ef09647a))
* **midnight-js:** move era-dispatch and verifier-key rationale into package documents ([dd77df1](https://github.com/midnightntwrk/midnight-js/commit/dd77df14a81e36c77c66b5f994efed3ed589042f))
* **midnight-js:** move protocol architecture rationale into package documents ([#1223](https://github.com/midnightntwrk/midnight-js/pull/1223)) ([a2b9f31](https://github.com/midnightntwrk/midnight-js/commit/a2b9f3172a167d560c814496d248f9ab324f3646)), closes [#1141](https://github.com/midnightntwrk/midnight-js/pull/1141) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1222](https://github.com/midnightntwrk/midnight-js/pull/1222) [#1222](https://github.com/midnightntwrk/midnight-js/pull/1222) [#1222](https://github.com/midnightntwrk/midnight-js/pull/1222) [#1222](https://github.com/midnightntwrk/midnight-js/pull/1222) [#1222](https://github.com/midnightntwrk/midnight-js/pull/1222)
* **midnight-js:** move retained-era overload rationale into a package document ([5841335](https://github.com/midnightntwrk/midnight-js/commit/584133505ddd504ec17fbfcfd9f520bb3c28f0f3)), closes [#1223](https://github.com/midnightntwrk/midnight-js/pull/1223)
* **midnight-js:** move retained-era pipeline rationale into a package document ([a2f8902](https://github.com/midnightntwrk/midnight-js/commit/a2f89025b19ef18cb2dabbbb733807515155df4a))
* **midnight-js:** move stale-head and scope-era rationale into a package document ([8c6ce3e](https://github.com/midnightntwrk/midnight-js/commit/8c6ce3e883d8c6c0dd82ec15a7527beda5ede7c0))
* **midnight-js:** move the QA records out of the tree and onto issues ([ff1c81d](https://github.com/midnightntwrk/midnight-js/commit/ff1c81dc7b58755dcb7c48146dfaae4179c20b89)), closes [#1295](https://github.com/midnightntwrk/midnight-js/pull/1295) [#1296](https://github.com/midnightntwrk/midnight-js/pull/1296) [#1296](https://github.com/midnightntwrk/midnight-js/pull/1296)
* **midnight-js:** name the ESM-only artifact in the engine entry comment ([d563ae2](https://github.com/midnightntwrk/midnight-js/commit/d563ae2d08baea6b7ab5da7444f25ace6c1446cb)), closes [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180)
* **midnight-js:** point the AC0 report at the fix's own branch ([4edf71a](https://github.com/midnightntwrk/midnight-js/commit/4edf71a40bad674a8eafdecb5b58cb28532b80bc))
* **midnight-js:** point the excused handle divergence at its issue ([ade12d7](https://github.com/midnightntwrk/midnight-js/commit/ade12d7a65323e37753f2cf4bf50350439f275c8))
* **midnight-js:** record the AC0 segment-routing fix as verified, not proposed ([2b5c1be](https://github.com/midnightntwrk/midnight-js/commit/2b5c1bea49ebe766898cb75eb382648c4f3e19a2))
* **midnight-js:** record the first CI run of the fork crossing ([351e052](https://github.com/midnightntwrk/midnight-js/commit/351e052441fcb6c72f56933674a42ac7610dab45))
* **midnight-js:** record the shared result bases and the era-handle amendment ([4363605](https://github.com/midnightntwrk/midnight-js/commit/4363605f3aab5359061a473fbcf3a3fff7b1b9ca))
* **midnight-js:** say what a raw state's era does and does not assert ([18c776b](https://github.com/midnightntwrk/midnight-js/commit/18c776b5719782d8d8bfbc4f943eb6450ebe3c95))
* **midnight-js:** say what version-tagged records do not yet guarantee ([8cd986d](https://github.com/midnightntwrk/midnight-js/commit/8cd986d303accc455e3bbb198c03d38e57b19bcf))
* **midnight-js:** say why the retained pipeline may hand back the partitioner's own pair ([00c0b3a](https://github.com/midnightntwrk/midnight-js/commit/00c0b3a4236f5140370324780551ca4b2f99d593))
* **midnight-js:** state why skipping a contract-addressed spend is safe ([4024c11](https://github.com/midnightntwrk/midnight-js/commit/4024c11007be5ca3f8c82f31ccc58636dced333e))
* **midnight-js:** update proveTx examples for the version-tagged payload ([443300c](https://github.com/midnightntwrk/midnight-js/commit/443300cead3f871a4db7d0aebf9fbf82223eddd8))
* record the fork e2e environment's design decisions ([61987da](https://github.com/midnightntwrk/midnight-js/commit/61987da89395bb1c3d0379fffaeb00b5858ca7de))


### Code Refactoring

* **deps:** name the guard's second copy onchain-runtime-v3-test-only ([fd5e8b9](https://github.com/midnightntwrk/midnight-js/commit/fd5e8b97b86d45fa2bcd7ce53183ff206d33507b))
* **midnight-js:** adopt the single-axis instance guard in engine construction ([ea1171a](https://github.com/midnightntwrk/midnight-js/commit/ea1171aee6f02e898595b6362a8aab4955125bf7))
* **midnight-js:** allow a bounded head-version cache instead of forbidding one ([2299573](https://github.com/midnightntwrk/midnight-js/commit/2299573a2eae621bd8382ef1d8c209e4db8b5b41))
* **midnight-js:** assert Merkle roots in down-convert instead of rebuilding the state ([9e9adc1](https://github.com/midnightntwrk/midnight-js/commit/9e9adc1fa798a24976944779fa24e81f02d861a0))
* **midnight-js:** bind the two era vocabularies with one pairing table ([dbd6812](https://github.com/midnightntwrk/midnight-js/commit/dbd68123277815210badaa6d17f80d0b25646424))
* **midnight-js:** bind the two era vocabularies with one pairing table ([#1300](https://github.com/midnightntwrk/midnight-js/pull/1300)) ([090cba3](https://github.com/midnightntwrk/midnight-js/commit/090cba3d41d399f97062a4108210df2102516d15))
* **midnight-js:** build engine test envelopes in-process ([ac76e46](https://github.com/midnightntwrk/midnight-js/commit/ac76e46ec5cfef614c120f6c5ef480b1c24a6844)), closes [#1184](https://github.com/midnightntwrk/midnight-js/pull/1184) [#1159](https://github.com/midnightntwrk/midnight-js/pull/1159)
* **midnight-js:** bundle protocol entries in one rollup pass ([7584bbd](https://github.com/midnightntwrk/midnight-js/commit/7584bbd08eb882dfe8167cdeca698fd7fcac2a83))
* **midnight-js:** complete the compose error vocabulary and its tables ([2d4b05b](https://github.com/midnightntwrk/midnight-js/commit/2d4b05bd7187b3e47aa12c419f810f3ac88b7889))
* **midnight-js:** compose the v8-native call leg via assembleCallPrototype ([ec952d8](https://github.com/midnightntwrk/midnight-js/commit/ec952d8c0cec98ecf8c9666772ac5265319d1d1a))
* **midnight-js:** derive the single-era runtime types from their vendor ([3f8b932](https://github.com/midnightntwrk/midnight-js/commit/3f8b9328ce136a1bf75c037e8235667431585a4e))
* **midnight-js:** derive the single-era runtime types from their vendor ([#1216](https://github.com/midnightntwrk/midnight-js/pull/1216)) ([d4f8307](https://github.com/midnightntwrk/midnight-js/commit/d4f830757936f7d5d14646dfda6513feb4b581c4))
* **midnight-js:** drop check-casts.sh bash gate ([89c2a06](https://github.com/midnightntwrk/midnight-js/commit/89c2a0618b020627cd70a16456dff90749d1869b))
* **midnight-js:** drop node 0.x from the version mapping ([2d349f1](https://github.com/midnightntwrk/midnight-js/commit/2d349f1bc752f4f6654661a983a728899fa3815a))
* **midnight-js:** drop parseSerializedTag until a real caller needs it ([7a6a934](https://github.com/midnightntwrk/midnight-js/commit/7a6a93420d6c8e3fa6d6de57df75cfb08a2fc63c))
* **midnight-js:** drop the freshness option from queryLatestProtocolVersion ([709fc81](https://github.com/midnightntwrk/midnight-js/commit/709fc814f53affa2aab62bfb182bbf7ae584a7cb))
* **midnight-js:** drop the redundant assertLedger8RuntimePresent preflight ([5f4c262](https://github.com/midnightntwrk/midnight-js/commit/5f4c2622a62cda7396b5a289694c70c891c5e1dc))
* **midnight-js:** drop the retained arm's unused capture and expect ([#1284](https://github.com/midnightntwrk/midnight-js/pull/1284)) ([0e82e30](https://github.com/midnightntwrk/midnight-js/commit/0e82e3030c7e8654ddd88c7a0157fcb827e62b82)), closes [#1281](https://github.com/midnightntwrk/midnight-js/pull/1281) [#1281](https://github.com/midnightntwrk/midnight-js/pull/1281)
* **midnight-js:** drop the unused utils error registry and assertNever ([c5ffe98](https://github.com/midnightntwrk/midnight-js/commit/c5ffe98697ffb76878a679c2d40d7212fd598a02))
* **midnight-js:** extract the shared call-prototype assembly into assembleCallPrototype ([bad8a99](https://github.com/midnightntwrk/midnight-js/commit/bad8a998aead6a72fd136ed3fc64b5caefe0725d))
* **midnight-js:** follow the ledger-8 loader rename in provider fixtures ([d916db6](https://github.com/midnightntwrk/midnight-js/commit/d916db6b8b025f1165438175021df6602756e6d9))
* **midnight-js:** follow the ledger9 pipeline-era rename in the breadcrumb tests ([46c51e6](https://github.com/midnightntwrk/midnight-js/commit/46c51e69504756d9cb8d45407509222c369634ee))
* **midnight-js:** give both eras one circuitId and one private-state path ([5d7f163](https://github.com/midnightntwrk/midnight-js/commit/5d7f1632123a97f52d8fbbf62c4cc5c9454f9005))
* **midnight-js:** hoist the contract-state envelope table into utils ([6496cfc](https://github.com/midnightntwrk/midnight-js/commit/6496cfc5c7df9c46b9d97d3fde7cf190dbd21eec))
* **midnight-js:** hold the ledger-version constant in a leaf module ([7722563](https://github.com/midnightntwrk/midnight-js/commit/772256399c4b918eb581ca025809b538fccc075a))
* **midnight-js:** keep a scope's call and its circuit in one field ([26c63e4](https://github.com/midnightntwrk/midnight-js/commit/26c63e4a9409cf4fea1d6e65cc69fed68a0a1c80))
* **midnight-js:** keep the shared error module on the ESM-only build ([630522f](https://github.com/midnightntwrk/midnight-js/commit/630522f1b98b310cdb45838fa70c3b6093cfae68)), closes [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180)
* **midnight-js:** key engine runtime names by ledger era, not toolchain version ([03478eb](https://github.com/midnightntwrk/midnight-js/commit/03478eb863b01c78af5d31b0e43ede4456974215))
* **midnight-js:** let a call prototype accept an already-partitioned transcript ([bc7049c](https://github.com/midnightntwrk/midnight-js/commit/bc7049cb0d8b2065c96930193b746e4d2c136465))
* **midnight-js:** make the composition error codes era-neutral ([4a0e5a8](https://github.com/midnightntwrk/midnight-js/commit/4a0e5a8df19e343e41bd46f49a1f9f7b64d58f0f))
* **midnight-js:** move the contracts utils under src/internal ([c059407](https://github.com/midnightntwrk/midnight-js/commit/c059407d87feb2afd7422a9013da5af3dd9dd918))
* **midnight-js:** move the retained-era proving seam into the protocol package ([88e2df3](https://github.com/midnightntwrk/midnight-js/commit/88e2df36380f6f7a58860f4b7529d89d4465a58c)), closes [#1237](https://github.com/midnightntwrk/midnight-js/pull/1237)
* **midnight-js:** name the fork-crossing scenario after the fork, not AC0 ([173b3a5](https://github.com/midnightntwrk/midnight-js/commit/173b3a501b41cc7563c7a6e2b8d0eb4848dba8e0))
* **midnight-js:** name the pipeline era ledger9, not v9native ([b026d57](https://github.com/midnightntwrk/midnight-js/commit/b026d578811e3139b7aa6113ba9be4f1831ad250))
* **midnight-js:** publish the retained era as one Ledger8 namespace ([52b961b](https://github.com/midnightntwrk/midnight-js/commit/52b961b7ec51436c6bb15596ade052f2a20f465b))
* **midnight-js:** publish the retained era as one Ledger8 namespace ([#1302](https://github.com/midnightntwrk/midnight-js/pull/1302)) ([826518b](https://github.com/midnightntwrk/midnight-js/commit/826518b569c2a562e45975447d4ce235d1628ae9)), closes [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)
* **midnight-js:** reach the v8 module by relative import under ESM-only ([2b1964b](https://github.com/midnightntwrk/midnight-js/commit/2b1964b3fda4b35bb13a1c884623d422af3daef9)), closes [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180)
* **midnight-js:** read the hex fixtures through one shared helper ([d4611fd](https://github.com/midnightntwrk/midnight-js/commit/d4611fd095c865fc974b6cf8093a92ba3d2257ea))
* **midnight-js:** read the indexer head protocol version fresh on every call ([e4a4937](https://github.com/midnightntwrk/midnight-js/commit/e4a49379cb0dc8bc299bc9ab3384037ab2a82494))
* **midnight-js:** read the indexer head protocol version fresh on every call ([#1225](https://github.com/midnightntwrk/midnight-js/pull/1225)) ([a09a680](https://github.com/midnightntwrk/midnight-js/commit/a09a680103914e941fe37dabc75512dfa2c02db2)), closes [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1177](https://github.com/midnightntwrk/midnight-js/pull/1177) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)
* **midnight-js:** reduce the instance guard to the single genuine onchain-runtime-v3 axis ([d568293](https://github.com/midnightntwrk/midnight-js/commit/d5682930b80d33cb3fb5e5f618db13951dd5a33f))
* **midnight-js:** rename error-code prefix MJS_ to MIDNIGHT_JS_ ([5df15ff](https://github.com/midnightntwrk/midnight-js/commit/5df15ff43d10ebb63f2e6868691854e4b621e84b))
* **midnight-js:** rename Ledger8ConstructorResult ([4748f93](https://github.com/midnightntwrk/midnight-js/commit/4748f93347a9e7bc9c3386db17bc0d38f0f47199))
* **midnight-js:** rename loadV8 to loadLedger8 for era-keyed clarity ([857a714](https://github.com/midnightntwrk/midnight-js/commit/857a71407dd77e5aa1c543d50c73c1962f7a7321))
* **midnight-js:** rename packaging to consumer-e2e ([9808775](https://github.com/midnightntwrk/midnight-js/commit/9808775c35632d172855d61af38f692e330953fe))
* **midnight-js:** resolve verifier-key registrations once for both eras ([39229fc](https://github.com/midnightntwrk/midnight-js/commit/39229fcb8c4010776fd7991ab6eb97cd6ec629d3))
* **midnight-js:** split lib into v8, v9 and shared ([713456c](https://github.com/midnightntwrk/midnight-js/commit/713456c5e346875bf19850bb287255575e58e8fd))
* **midnight-js:** split the protocol lib by ledger era ([#1198](https://github.com/midnightntwrk/midnight-js/pull/1198)) ([e56c82e](https://github.com/midnightntwrk/midnight-js/commit/e56c82eaf0598b9b645012efe78629a6a0a9e9fb)), closes [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194) [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194) [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194)
* **midnight-js:** tighten the era seam's shared and defensive edges ([8d49af6](https://github.com/midnightntwrk/midnight-js/commit/8d49af699fda72d81f0e204f5b2555486e7cb487))
* **testkit-js:** build the wallet seams through the ADR 0006 adapters ([35fced8](https://github.com/midnightntwrk/midnight-js/commit/35fced81925e1933f7769054640715fa9fc6eee6))


### Performance Improvements

* **midnight-js:** shard the AC0 fork-crossing scenario by contract ([595466d](https://github.com/midnightntwrk/midnight-js/commit/595466da3966e4d096c8648177dfbab4bf773368)), closes [#176](https://github.com/midnightntwrk/midnight-js/pull/176)


### Tests

* **midnight-js:** add the AC0 fork-crossing harness, blocked on the wallet ([2dcf51f](https://github.com/midnightntwrk/midnight-js/commit/2dcf51f61e6a5d4f56af358100556444eacaea24))
* **midnight-js:** ask AC0 of the whole e2e contract set, on both eras ([eaa2b89](https://github.com/midnightntwrk/midnight-js/commit/eaa2b89cc5fee07b5f230a5a6c03e79fc16ea770))
* **midnight-js:** ask AC0 of the whole e2e contract set, on both eras ([#1281](https://github.com/midnightntwrk/midnight-js/pull/1281)) ([73ac127](https://github.com/midnightntwrk/midnight-js/commit/73ac127e0773ce127da6d7277640ece066eeb2a3)), closes [#877](https://github.com/midnightntwrk/midnight-js/pull/877) [#1280](https://github.com/midnightntwrk/midnight-js/pull/1280) [#1276](https://github.com/midnightntwrk/midnight-js/pull/1276) [#1280](https://github.com/midnightntwrk/midnight-js/pull/1280) [#1280](https://github.com/midnightntwrk/midnight-js/pull/1280)
* **midnight-js:** assert state continuity and gate the AC0 fork legs ([a72363d](https://github.com/midnightntwrk/midnight-js/commit/a72363de5ce363fe150716ee651e84d5b2014610))
* **midnight-js:** assert surviving state on a contract with a real circuit ([db8336b](https://github.com/midnightntwrk/midnight-js/commit/db8336b2823a25472702fc45fda204d276599db0))
* **midnight-js:** assert surviving state on four twins, not one ([cafad04](https://github.com/midnightntwrk/midnight-js/commit/cafad0421bf0eb59d70dff04a41921e8f5852f67))
* **midnight-js:** assert the engine against the hard-fork goldens ([865ad8d](https://github.com/midnightntwrk/midnight-js/commit/865ad8def5b224d9394840d14342edf85ed85f2f)), closes [#1164](https://github.com/midnightntwrk/midnight-js/pull/1164) [#1184](https://github.com/midnightntwrk/midnight-js/pull/1184) [#1164](https://github.com/midnightntwrk/midnight-js/pull/1164) [#1184](https://github.com/midnightntwrk/midnight-js/pull/1184)
* **midnight-js:** assert the handle members by identity, not shape ([7d1e0e6](https://github.com/midnightntwrk/midnight-js/commit/7d1e0e6d72a3eb7ef70ceec1bcadba179513154c))
* **midnight-js:** assert the unshielded twin's surviving balance, with a control ([4d18c39](https://github.com/midnightntwrk/midnight-js/commit/4d18c39c8f4937229f35c8172ab8035ef3e2910d))
* **midnight-js:** assert the unshielded twin's surviving balance, with a control ([#1288](https://github.com/midnightntwrk/midnight-js/pull/1288)) ([e741a3a](https://github.com/midnightntwrk/midnight-js/commit/e741a3a0cc3b6c2ee4bc45744429c86bc21b0b78)), closes [#1287](https://github.com/midnightntwrk/midnight-js/pull/1287) [#1287](https://github.com/midnightntwrk/midnight-js/pull/1287) [#1284](https://github.com/midnightntwrk/midnight-js/pull/1284) [#1284](https://github.com/midnightntwrk/midnight-js/pull/1284)
* **midnight-js:** capture v9-native non-regression baselines ([72b071a](https://github.com/midnightntwrk/midnight-js/commit/72b071a27ad8e37fa13cbc96902f22ec371ee560))
* **midnight-js:** capture v9-native non-regression baselines ([#1240](https://github.com/midnightntwrk/midnight-js/pull/1240)) ([96a5a77](https://github.com/midnightntwrk/midnight-js/commit/96a5a771a5de08fbd3d5c62c857784e395cf6ecd)), closes [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) [#1005](https://github.com/midnightntwrk/midnight-js/pull/1005) [#1226](https://github.com/midnightntwrk/midnight-js/pull/1226)
* **midnight-js:** carry AC0 to six of seven legs ([2f0574d](https://github.com/midnightntwrk/midnight-js/commit/2f0574d45fb5d86315cfd5931fd77d51d0321a23))
* **midnight-js:** carry AC0 to the wallet balancing seam on beta.3 ([7b69184](https://github.com/midnightntwrk/midnight-js/commit/7b691848ee5d9026e3a234cc12c84dba96b14d42))
* **midnight-js:** close the coverage gaps the era facade left behind ([bff8549](https://github.com/midnightntwrk/midnight-js/commit/bff8549fb994445cbf6eba2ec88f2e71e11275f1))
* **midnight-js:** close the engine-core coverage gaps ([19c82c5](https://github.com/midnightntwrk/midnight-js/commit/19c82c58906ea4b3b440eccfa47890a621520b61))
* **midnight-js:** close the gaps in the v9-native golden baselines ([ee69cc0](https://github.com/midnightntwrk/midnight-js/commit/ee69cc023cb6bc6e63b749b1f59a87c8823f69dd))
* **midnight-js:** cover v8-acquisition failure passthrough at engine construction ([18b781a](https://github.com/midnightntwrk/midnight-js/commit/18b781a5c9db9f7fff486c3d71ff0ac895d65ed7))
* **midnight-js:** drop spec identifier from union fixture comment ([cb6fba0](https://github.com/midnightntwrk/midnight-js/commit/cb6fba0cc7d2deada4a88a6ab78251a83db9f5b9))
* **midnight-js:** drop the diff-gate meta-test, pin the golden inputs instead ([25c3706](https://github.com/midnightntwrk/midnight-js/commit/25c3706d9f92326267ed5e6984abf6f2c2b7d0ea))
* **midnight-js:** drop the error-code coverage meta-test ([b6e7bf5](https://github.com/midnightntwrk/midnight-js/commit/b6e7bf5d3736ee41c8e5c5f8beabeafcc8bbfcf7))
* **midnight-js:** drop the golden fixture's reference to the removed diff gate ([359b594](https://github.com/midnightntwrk/midnight-js/commit/359b5947c7b5f7e30ff7d95ee0140256cd174344))
* **midnight-js:** drop the unshielded state assertion, recording why ([bd20085](https://github.com/midnightntwrk/midnight-js/commit/bd20085e38703fd69bce09908ba8d267fc9a6d23))
* **midnight-js:** drop unknown casts from proof-provider tests ([0a1a1e5](https://github.com/midnightntwrk/midnight-js/commit/0a1a1e54c068a180893059e3684b20cb1b603fb9))
* **midnight-js:** execute both ledger eras' contracts in one process ([53ab5f4](https://github.com/midnightntwrk/midnight-js/commit/53ab5f4e9af0ebfccd4ab9565624226194771c13))
* **midnight-js:** exercise the down-convert across both codecs, not one ([bed65a4](https://github.com/midnightntwrk/midnight-js/commit/bed65a40875cf0518d585e2c91db236d875f35f2))
* **midnight-js:** gate engine errors against the built bundles ([2bdf337](https://github.com/midnightntwrk/midnight-js/commit/2bdf337187261cc7833c110000d5f6365e29125c))
* **midnight-js:** gate the call-arm signatures, not just their names ([6b9467b](https://github.com/midnightntwrk/midnight-js/commit/6b9467b07ac1288774d09cf803480cd720f9cf61))
* **midnight-js:** gate the era facade against a static v8 linkage ([e16c8ce](https://github.com/midnightntwrk/midnight-js/commit/e16c8ce0c2453324b89f63f4d78921aad94134fc))
* **midnight-js:** inline what the union compile checks were shown to catch ([652e78a](https://github.com/midnightntwrk/midnight-js/commit/652e78a08980e30262141c64411ba67b19b78db0))
* **midnight-js:** install the framework the way a consumer does (AC6, OQ13) ([6f2863a](https://github.com/midnightntwrk/midnight-js/commit/6f2863ad890c2e6b0c029d4acd2839bdc34d66b7))
* **midnight-js:** isolate the AC0 wallet blocker to the ledger-v8 genesis ([4d84f69](https://github.com/midnightntwrk/midnight-js/commit/4d84f69ab84b77e25ed393194cb8b7d4e511c6a8))
* **midnight-js:** make D14 union compile tests actually discriminating ([a8e7b34](https://github.com/midnightntwrk/midnight-js/commit/a8e7b348b0ebf95c7a70c4023959e9caa30aae3f))
* **midnight-js:** make the dist engine-error gate fail instead of skip ([947beb7](https://github.com/midnightntwrk/midnight-js/commit/947beb7c5879fd02732e78da38a6803efcee0711))
* **midnight-js:** make the dist engine-error gate fail instead of skip ([eed462a](https://github.com/midnightntwrk/midnight-js/commit/eed462a7d0d9bf554e94425fa29ef287f7e59bba))
* **midnight-js:** make the dist error-identity gate fail instead of skip ([ec5f697](https://github.com/midnightntwrk/midnight-js/commit/ec5f69707172414c017a72ce80ec70acb5e42c1e))
* **midnight-js:** make the dist laziness gate fail instead of skip ([878c4af](https://github.com/midnightntwrk/midnight-js/commit/878c4afdda49e08ae09d31cf59cb26e0b700d412))
* **midnight-js:** make the seam chain and private-state threading falsifiable ([fdfbcf2](https://github.com/midnightntwrk/midnight-js/commit/fdfbcf28317d3244c83851fb2257a5e36e545b7f))
* **midnight-js:** make the two vocabulary gates real, and reject a commented-out assertion ([7bc5e7a](https://github.com/midnightntwrk/midnight-js/commit/7bc5e7a71aabab4c21f90f45f101743659616beb))
* **midnight-js:** name the era in the orchestration log ([8bfd6d0](https://github.com/midnightntwrk/midnight-js/commit/8bfd6d01c8359e71681068118e27b1461ecee6e3))
* **midnight-js:** name the suites after the era they cover ([cdba59e](https://github.com/midnightntwrk/midnight-js/commit/cdba59ef48008adcc8cf35b5401195e1dd5d822f))
* **midnight-js:** note audit-before-re-pin in v8 surface comment ([b1c6e29](https://github.com/midnightntwrk/midnight-js/commit/b1c6e2942f63951c43568c522d9f26b5f14d3a21))
* **midnight-js:** pin closed OQ3_SURFACE v8 export list in v8-surface test ([ec0a863](https://github.com/midnightntwrk/midnight-js/commit/ec0a8635b4a3065058e43ec73f96ba11968b071e))
* **midnight-js:** pin how an invalid contract address is refused ([5c93107](https://github.com/midnightntwrk/midnight-js/commit/5c9310715b8ad2f52e19a2174029c189bcd61a7b))
* **midnight-js:** pin that a foreign registered key reaches the call key location ([116dca4](https://github.com/midnightntwrk/midnight-js/commit/116dca4b6701079393111d5d3ca5fffabcf1a25e))
* **midnight-js:** pin the contracts runtime export surface ([8abb215](https://github.com/midnightntwrk/midnight-js/commit/8abb215e9c5294743e05761bb50d61d230cf0179))
* **midnight-js:** pin the encoded post-state and the two runtimes' Zswap parity ([e896c7c](https://github.com/midnightntwrk/midnight-js/commit/e896c7c268a9ef6e1fb5b29b3c7cdf53964a25ac))
* **midnight-js:** pin the new error codes and the retained call arm's local refusals ([971ded2](https://github.com/midnightntwrk/midnight-js/commit/971ded262c627480d696d712f564bee93457173d))
* **midnight-js:** pin the protocol error codes the era seam added ([6bd5120](https://github.com/midnightntwrk/midnight-js/commit/6bd5120b41916dd2856f9aaebb284322a845eb1d)), closes [#1194](https://github.com/midnightntwrk/midnight-js/pull/1194)
* **midnight-js:** pin Transcript across the pre-fork axis too ([8072fbb](https://github.com/midnightntwrk/midnight-js/commit/8072fbbe48046df42a2b6516d0c64a250ed571fc))
* **midnight-js:** re-baseline the v9-native golden input hash ([4a05379](https://github.com/midnightntwrk/midnight-js/commit/4a05379782fde6b49e5ff0832bf12d4880528922))
* **midnight-js:** re-pin the golden fixture to the bumped compiled artifact ([28d57e4](https://github.com/midnightntwrk/midnight-js/commit/28d57e491c547000110dd2850349f3b568727ea8))
* **midnight-js:** read both protocol type surfaces from one program ([78c9414](https://github.com/midnightntwrk/midnight-js/commit/78c9414b1b8285dbc9e14eea0e2d029b43bf260d))
* **midnight-js:** remove the coverage gate's table exemption and give the deploy refusal a direct negative ([0d3aa71](https://github.com/midnightntwrk/midnight-js/commit/0d3aa712dadf62477e7a0b1b0966411e72e8e349))
* **midnight-js:** reproduce the receive-into-contract partition failure ([df6679d](https://github.com/midnightntwrk/midnight-js/commit/df6679d0201ebf5ea706fa21bad55ad7266d61df))
* **midnight-js:** restore the gates the era move left uncovered ([6f8c908](https://github.com/midnightntwrk/midnight-js/commit/6f8c90855600724c304a2f1f574274dd2fe2a62b))
* **midnight-js:** run the same scenario through both ledger eras ([c0ce5c9](https://github.com/midnightntwrk/midnight-js/commit/c0ce5c9bc6b5f9bc5c24a2189954eb6a9e050f19))
* **midnight-js:** share a typed Apollo stub across the new provider suites ([1221abb](https://github.com/midnightntwrk/midnight-js/commit/1221abb5a7a61789745db0364515ce8e7fec7289))
* **midnight-js:** shrink the fetch-zk prover fixture to a synthetic artifact ([f3992ae](https://github.com/midnightntwrk/midnight-js/commit/f3992ae9b73e703c56181ac0b613ce9ce29e2a93)), closes [#1075](https://github.com/midnightntwrk/midnight-js/pull/1075) [#1263](https://github.com/midnightntwrk/midnight-js/pull/1263)
* **midnight-js:** shrink the fetch-zk prover fixture to a synthetic artifact ([#1264](https://github.com/midnightntwrk/midnight-js/pull/1264)) ([431a2d4](https://github.com/midnightntwrk/midnight-js/commit/431a2d475029f6722400d6d14a43d0181c4bc465)), closes [#1075](https://github.com/midnightntwrk/midnight-js/pull/1075) [#1263](https://github.com/midnightntwrk/midnight-js/pull/1263)
* **midnight-js:** snapshot the neither-era diagnostic by running tsc ([528724e](https://github.com/midnightntwrk/midnight-js/commit/528724eba4274e78ef10a8af8d458b6748698cc4))
* **midnight-js:** spend the one post-fork retained call on the measurement ([5262a0d](https://github.com/midnightntwrk/midnight-js/commit/5262a0d8f618b6bc0abcdb413f2bf454a93cf372))
* **midnight-js:** stop pinning compiler output for the era overloads ([4c4c204](https://github.com/midnightntwrk/midnight-js/commit/4c4c2046ef21f4344cb89775e1b382494479611b))
* **midnight-js:** trim eslint gate tests to per-artifact canaries ([69a6117](https://github.com/midnightntwrk/midnight-js/commit/69a6117facb8f4307b16c8bf5c696a40a7bcdfc0))
* **testkit-js:** add a fork-capable e2e environment (OQ14) ([c16caa0](https://github.com/midnightntwrk/midnight-js/commit/c16caa0e90256d286df4ecd1f3c3d09acbdcc8bf))
* **testkit-js:** add a node-side reading and an envelope diagnostic ([c91d68a](https://github.com/midnightntwrk/midnight-js/commit/c91d68a775d1bc0d27f99b165c90933c3d07dfd2))
* **testkit-js:** add a witness-bearing contract fixture pair for the fork window ([561835b](https://github.com/midnightntwrk/midnight-js/commit/561835b8b52e0d7c3331937cfb3fd8ac0ad6005c))
* **testkit-js:** add smoke test for OQ9 hard-fork fixtures ([b068671](https://github.com/midnightntwrk/midnight-js/commit/b068671b62915442d61b319c1a9a28dfbbb0fbe7))
* **testkit-js:** add the spike 0.16-compiled counter fixture with golden transcript ([2a3af76](https://github.com/midnightntwrk/midnight-js/commit/2a3af768b2b3ff4109c0be65824ec7acf48492f6))
* **testkit-js:** assert fixtures.json protocolVersion and A4 shape ([1ff8e85](https://github.com/midnightntwrk/midnight-js/commit/1ff8e850636135f1ae710cf29aac11dcebdd8699))
* **testkit-js:** assert private-state continuity across the fork window ([#1238](https://github.com/midnightntwrk/midnight-js/pull/1238)) ([6e423c7](https://github.com/midnightntwrk/midnight-js/commit/6e423c71d37272f8a624aa2d2ea7324395f7f9f8))
* **testkit-js:** assert private-state continuity across the fork window (SEC-8) ([1cb20d8](https://github.com/midnightntwrk/midnight-js/commit/1cb20d8a1f2e09dce8126a5b9f8b7e77a129ba1d))
* **testkit-js:** capture the stack's container logs when a fork run fails ([b59aa2b](https://github.com/midnightntwrk/midnight-js/commit/b59aa2b377616f18f759cdf253db420016e55603)), closes [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288)
* **testkit-js:** capture the stack's container logs when a fork run fails ([d24ab20](https://github.com/midnightntwrk/midnight-js/commit/d24ab20ad7b73003ada51b0ed6a017e201a2fdf5))
* **testkit-js:** capture the stack's container logs when a fork run fails ([#1291](https://github.com/midnightntwrk/midnight-js/pull/1291)) ([4dfe1fa](https://github.com/midnightntwrk/midnight-js/commit/4dfe1fa08bb9749aa6d9a8b70c83bfc403a73990)), closes [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288) [#1281](https://github.com/midnightntwrk/midnight-js/pull/1281) [#1290](https://github.com/midnightntwrk/midnight-js/pull/1290)
* **testkit-js:** decouple the fork lane and cover the environment's guards ([a0b6f2b](https://github.com/midnightntwrk/midnight-js/commit/a0b6f2b713a3f2e94ff7b952b0dd6072268e94de))
* **testkit-js:** freeze a private-state store so envelope breaks cannot pass ([6741395](https://github.com/midnightntwrk/midnight-js/commit/6741395f541067b3ede3144fcd002af788a8208a))
* **testkit-js:** generate the retained-era ZK artifacts for counter-016 ([a3cef08](https://github.com/midnightntwrk/midnight-js/commit/a3cef0844f959562eeaf773d906b9a130953ced6))
* **testkit-js:** harden the frozen-store fixture and correct its documentation ([7ffef57](https://github.com/midnightntwrk/midnight-js/commit/7ffef570fa2cc248a00ffc7d5283f3cff8d5131a))
* **testkit-js:** port OQ9 hard-fork fixtures from spike-dapp-hf ([91a501d](https://github.com/midnightntwrk/midnight-js/commit/91a501deee9f1d739980371be1b3a696054d5143))
* **testkit-js:** run the read path against a real pre-fork network (QA-6) ([7392e9e](https://github.com/midnightntwrk/midnight-js/commit/7392e9e272b3752355a86e431c5d92fe46129d07))


### Build System

* **deps:** bump compactc to 0.34.0, compact-runtime to 0.19.0 and ledger-v8 to 8.1.2 ([c67e610](https://github.com/midnightntwrk/midnight-js/commit/c67e6109bbde93ad15b83733a250480f680e86fd))
* **deps:** bump compactc to 0.34.0, compact-runtime to 0.19.0 and ledger-v8 to 8.1.2 ([#1244](https://github.com/midnightntwrk/midnight-js/pull/1244)) ([6062655](https://github.com/midnightntwrk/midnight-js/commit/6062655181c555d35edc0b7d129834cf076caa23)), closes [#1190](https://github.com/midnightntwrk/midnight-js/pull/1190)
* **deps:** bump onchain-runtime-v3 to 3.1.1 and the retained proof server to 8.1.2 ([a51cc01](https://github.com/midnightntwrk/midnight-js/commit/a51cc015aa2bd8c6ea08e963c7b669c13aea8e04))
* **deps:** bump the Compact toolchain and the v8-era runtimes ([2d51f5d](https://github.com/midnightntwrk/midnight-js/commit/2d51f5d963b1a4e6bfc0adf7857781801daf1814))
* **deps:** bump the Compact toolchain and the v8-era runtimes ([#1245](https://github.com/midnightntwrk/midnight-js/pull/1245)) ([9e0c571](https://github.com/midnightntwrk/midnight-js/commit/9e0c571189c7345a3e6d442f22ec61208c7a69d2)), closes [#1244](https://github.com/midnightntwrk/midnight-js/pull/1244) [#1244](https://github.com/midnightntwrk/midnight-js/pull/1244)
* **deps:** bump the devnet indexer to 4.4.0-rc.5 ([dbfd250](https://github.com/midnightntwrk/midnight-js/commit/dbfd25061adaffebe5f5efc93a6f70d0c894fd27))
* **deps:** bump the devnet node to 2.1.0-beta.1 ([17b6bd5](https://github.com/midnightntwrk/midnight-js/commit/17b6bd55f1fd50329e40c98f3e9085ac7ee4cf80))
* **deps:** bump wallet-sdk to 2.0.0-beta.3 and ledger-v9 to 1.0.0-rc.4 ([2b5cfb4](https://github.com/midnightntwrk/midnight-js/commit/2b5cfb4d772d1678475da67498511ba4288fbcae))
* **deps:** bump wallet-sdk to 2.0.0-beta.3 and ledger-v9 to 1.0.0-rc.4 ([#1249](https://github.com/midnightntwrk/midnight-js/pull/1249)) ([1f72c75](https://github.com/midnightntwrk/midnight-js/commit/1f72c752ccbc7e27a1d59eb7f470e5f45a405a29)), closes [#1244](https://github.com/midnightntwrk/midnight-js/pull/1244) [#1244](https://github.com/midnightntwrk/midnight-js/pull/1244)
* **deps:** resolve both ledger-v8 scopes to one published artifact ([942c0ca](https://github.com/midnightntwrk/midnight-js/commit/942c0ca513517a1534bd3441861003edd2335fc0))
* **deps:** scope the contracts dependency of the proof provider to dev ([bff6868](https://github.com/midnightntwrk/midnight-js/commit/bff6868af9fc19882f04e41df750cdc735a71799))
* **midnight-js:** mark contracts and types side-effect free ([2171928](https://github.com/midnightntwrk/midnight-js/commit/217192858466648ba4467f2ecd82d1f9c189fc22))


### Continuous Integration

* authorize Docker Hub for the fork lane and size its budget ([c21739a](https://github.com/midnightntwrk/midnight-js/commit/c21739ab03902c79c06a453dbfec53efce8bf1b5))
* **config:** gate the packaging and hard-fork lanes on packaging/** ([fcbe0d0](https://github.com/midnightntwrk/midnight-js/commit/fcbe0d0cd2588836bf6e43f26e36232dac0b7448))
* **config:** resolve the opengrep findings the fork window's gates raised ([737842e](https://github.com/midnightntwrk/midnight-js/commit/737842eda97568633bff3601efa1f8983c62fb4b))
* enforce lint:casts in CI lint path ([558b054](https://github.com/midnightntwrk/midnight-js/commit/558b054b24e78dbd912e010a7c1be4281e9ceef8))
* gate protocol/v8 runtime imports and unsafe casts ([ba4d319](https://github.com/midnightntwrk/midnight-js/commit/ba4d31976df9eef44dd5a96d259a25f7e17c70af))
* grant nightly-e2e the actions:read its build workflow requires ([6a62664](https://github.com/midnightntwrk/midnight-js/commit/6a626645c3901a3b84adca4342552d89ff07ab9d))
* grant nightly-e2e the actions:read its build workflow requires ([#1252](https://github.com/midnightntwrk/midnight-js/pull/1252)) ([2c07e65](https://github.com/midnightntwrk/midnight-js/commit/2c07e657060e621e87f6cff4ea4bf42c4d89a607)), closes [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218)
* make the workflow-permissions gate able to report its own chain ([8e2b567](https://github.com/midnightntwrk/midnight-js/commit/8e2b5671336263d7ad57954a14b8967f79a213ed))
* **midnight-js:** drop the test type-check step from the shared CI workflow ([f6b820c](https://github.com/midnightntwrk/midnight-js/commit/f6b820c88f843d35d82ce1fefb88b098e3a48c1b))
* **midnight-js:** put consumer-e2e under the lint gate that already exists ([a227dc8](https://github.com/midnightntwrk/midnight-js/commit/a227dc8c76d9f32060beda6931bc6d1be63db4f0)), closes [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288) [#1288](https://github.com/midnightntwrk/midnight-js/pull/1288)
* **midnight-js:** type-check test files and hash hf fixtures in the test cache ([49383d1](https://github.com/midnightntwrk/midnight-js/commit/49383d1d90feb7bc14d2d7e7c84909318890a14a))
* run the AC0 fork-crossing scenario as a blocking gate ([3c781ad](https://github.com/midnightntwrk/midnight-js/commit/3c781adfb713b8895e985cdfcaf8992a36b99387))
* typecheck the test files in CI, not only on pre-push ([0eb86f3](https://github.com/midnightntwrk/midnight-js/commit/0eb86f320f875e1fd7dab0c67b1a2846c375c4cd))
* typecheck the test files in CI, not only on pre-push ([#1197](https://github.com/midnightntwrk/midnight-js/pull/1197)) ([3248143](https://github.com/midnightntwrk/midnight-js/commit/3248143cfd7e15d38a76011c20a441b2aafe613e))


### Improvements

* **config:** pin onchain-runtime-v3 in the root resolutions ([afc3046](https://github.com/midnightntwrk/midnight-js/commit/afc304680a62c2af30d1cc9e30fe515e07e1b0e1))
* **config:** scope lint rules for OQ9 fixture generators ([53a23cb](https://github.com/midnightntwrk/midnight-js/commit/53a23cb8c8caec2ce7d0eb298e5e835b01e8adc4))
* **deps-dev:** bump @commitlint/cli from 20.5.0 to 21.2.2 ([4415aae](https://github.com/midnightntwrk/midnight-js/commit/4415aae4421898271d1158bf7d8992b89c0f3836))
* **deps-dev:** bump @commitlint/cli from 20.5.0 to 21.2.2 ([#1179](https://github.com/midnightntwrk/midnight-js/pull/1179)) ([aa03002](https://github.com/midnightntwrk/midnight-js/commit/aa030025466196f957e358031f091c76264dcdf7))
* **deps-dev:** bump semver from 7.8.1 to 7.8.5 ([0445f90](https://github.com/midnightntwrk/midnight-js/commit/0445f90687385f9ac779b2c5a0adcc5b413582dd))
* **deps-dev:** bump semver from 7.8.1 to 7.8.5 ([#1199](https://github.com/midnightntwrk/midnight-js/pull/1199)) ([3585172](https://github.com/midnightntwrk/midnight-js/commit/358517291291cb4f28f12e757684b6ac04711107)), closes [#878](https://github.com/midnightntwrk/midnight-js/pull/878) [#878](https://github.com/midnightntwrk/midnight-js/pull/878) [#874](https://github.com/midnightntwrk/midnight-js/pull/874) [#872](https://github.com/midnightntwrk/midnight-js/pull/872) [#872](https://github.com/midnightntwrk/midnight-js/pull/872) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#870](https://github.com/midnightntwrk/midnight-js/pull/870) [#870](https://github.com/midnightntwrk/midnight-js/pull/870) [#878](https://github.com/midnightntwrk/midnight-js/pull/878) [#878](https://github.com/midnightntwrk/midnight-js/pull/878) [#874](https://github.com/midnightntwrk/midnight-js/pull/874) [#872](https://github.com/midnightntwrk/midnight-js/pull/872) [#872](https://github.com/midnightntwrk/midnight-js/pull/872) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#870](https://github.com/midnightntwrk/midnight-js/pull/870) [#870](https://github.com/midnightntwrk/midnight-js/pull/870) [#879](https://github.com/midnightntwrk/midnight-js/pull/879) [#875](https://github.com/midnightntwrk/midnight-js/pull/875) [#873](https://github.com/midnightntwrk/midnight-js/pull/873) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#872](https://github.com/midnightntwrk/midnight-js/pull/872) [#871](https://github.com/midnightntwrk/midnight-js/pull/871) [#870](https://github.com/midnightntwrk/midnight-js/pull/870)
* **deps:** bump @scure/bip39 from 2.2.0 to 2.3.0 ([#1178](https://github.com/midnightntwrk/midnight-js/pull/1178)) ([017135c](https://github.com/midnightntwrk/midnight-js/commit/017135c88355d08bb71a1ee6c34b1f7ea5edc4da))
* **deps:** bump ctrf-io/github-test-reporter from 1.1.0 to 1.3.0 ([6822ba9](https://github.com/midnightntwrk/midnight-js/commit/6822ba984444ab91223e88451a9d1cd721d8da20))
* **deps:** bump ctrf-io/github-test-reporter from 1.1.0 to 1.3.0 ([#1215](https://github.com/midnightntwrk/midnight-js/pull/1215)) ([cb8833a](https://github.com/midnightntwrk/midnight-js/commit/cb8833a003f0eb40b3d7a6f14cb054bab7b57df0)), closes [ctrf-io/github-test-reporter#327](https://github.com/midnightntwrk/midnight-js/pull/327) [ctrf-io/github-test-reporter#326](https://github.com/midnightntwrk/midnight-js/pull/326) [ctrf-io/github-test-reporter#326](https://github.com/midnightntwrk/midnight-js/pull/326) [#319](https://github.com/midnightntwrk/midnight-js/pull/319) [#319](https://github.com/midnightntwrk/midnight-js/pull/319) [#327](https://github.com/midnightntwrk/midnight-js/pull/327) [#326](https://github.com/midnightntwrk/midnight-js/pull/326) [#319](https://github.com/midnightntwrk/midnight-js/pull/319) [#315](https://github.com/midnightntwrk/midnight-js/pull/315) [#323](https://github.com/midnightntwrk/midnight-js/pull/323) [#321](https://github.com/midnightntwrk/midnight-js/pull/321) [#322](https://github.com/midnightntwrk/midnight-js/pull/322) [#311](https://github.com/midnightntwrk/midnight-js/pull/311) [#310](https://github.com/midnightntwrk/midnight-js/pull/310) [#312](https://github.com/midnightntwrk/midnight-js/pull/312)
* **deps:** update the lockfile for the onchain-runtime-v3 resolution pin ([e17c532](https://github.com/midnightntwrk/midnight-js/commit/e17c532c97bdd02beb2d19872d0b73437953e8fe))
* **midnight-js:** point compact-js and platform-js typedoc mappings at their public source ([4315fef](https://github.com/midnightntwrk/midnight-js/commit/4315fefb6b5a8c579c55ede81580f80af70376ad))
* **midnight-js:** stop republishing vendor API docs from protocol ([1986d15](https://github.com/midnightntwrk/midnight-js/commit/1986d15767c72a2194ca58dd0992a240fa620a94)), closes [#1221](https://github.com/midnightntwrk/midnight-js/pull/1221)
* **midnight-js:** stop republishing vendor API docs from protocol ([#1222](https://github.com/midnightntwrk/midnight-js/pull/1222)) ([41627e4](https://github.com/midnightntwrk/midnight-js/commit/41627e4e2f2e60c158c948f62e768c49750ff8f9)), closes [#1221](https://github.com/midnightntwrk/midnight-js/pull/1221) [#1221](https://github.com/midnightntwrk/midnight-js/pull/1221)
* **midnight-js:** trigger CI ([4ad181b](https://github.com/midnightntwrk/midnight-js/commit/4ad181b5dc04cbd1e958c5d12c87cd503f387d88))
* **testkit-js:** add ledger-v8 and ledger-v9 devDependencies ([f8a49a1](https://github.com/midnightntwrk/midnight-js/commit/f8a49a18f99cfbbec16bfe8ebca5c1465be3bbe9))


### Reverts

* Revert "test(testkit-js): capture the stack's container logs when a fork run fails" ([84bf7bb](https://github.com/midnightntwrk/midnight-js/commit/84bf7bbfaf24c673cac92a55c4ade02a72c59cec))
* Revert "fix(testkit-js): bound the container-log capture so it cannot hang the run" ([c702d59](https://github.com/midnightntwrk/midnight-js/commit/c702d59b0a2a5b292d19e624ed3c826b0c68d05a))

## [5.0.0-beta.7](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-beta.6...v5.0.0-beta.7) (2026-08-21)


### ⚠ BREAKING CHANGES

* **midnight-js:** publish every package as ESM-only (#1180)

### Features

* **midnight-js:** enforce no-new-unsafe-casts via ESLint ([#1158](https://github.com/midnightntwrk/midnight-js/pull/1158)) ([546085f](https://github.com/midnightntwrk/midnight-js/commit/546085f98a25b4e4145f0d0fc1f7ae5a1d2481fa)), closes [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155)
* **midnight-js:** harden ESLint gates ([#1161](https://github.com/midnightntwrk/midnight-js/pull/1161)) ([8949082](https://github.com/midnightntwrk/midnight-js/commit/8949082a1804a5ea8f403d77d428133f0224b087)), closes [#1158](https://github.com/midnightntwrk/midnight-js/pull/1158)
* **midnight-js:** publish every package as ESM-only ([#1180](https://github.com/midnightntwrk/midnight-js/pull/1180)) ([b57d7b7](https://github.com/midnightntwrk/midnight-js/commit/b57d7b71108973bf96e0a28dd426cea9a6644b83)), closes [#1173](https://github.com/midnightntwrk/midnight-js/pull/1173)
* **testkit-js:** add hard-fork fixtures and publish them via a typed accessor ([#1184](https://github.com/midnightntwrk/midnight-js/pull/1184)) ([9685c3f](https://github.com/midnightntwrk/midnight-js/commit/9685c3f3219d0e4755ba5fea475d2dd8942bf1ba)), closes [#1159](https://github.com/midnightntwrk/midnight-js/pull/1159) [#1167](https://github.com/midnightntwrk/midnight-js/pull/1167) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1159](https://github.com/midnightntwrk/midnight-js/pull/1159) [#1167](https://github.com/midnightntwrk/midnight-js/pull/1167) [#1004](https://github.com/midnightntwrk/midnight-js/pull/1004)


### Bug Fixes

* **ci:** pin npm-installed CI tool versions ([43b31e6](https://github.com/midnightntwrk/midnight-js/commit/43b31e6e545f7916569524eda1df315e2d80813b))
* re-point label dispatchers at public workflows repo ([1aa6bc3](https://github.com/midnightntwrk/midnight-js/commit/1aa6bc37b484b3d1884cf3df0c4a5d8dbc4122b1)), closes [#1181](https://github.com/midnightntwrk/midnight-js/pull/1181)
* re-point label dispatchers at public workflows repo ([#1182](https://github.com/midnightntwrk/midnight-js/pull/1182)) ([5a52ce2](https://github.com/midnightntwrk/midnight-js/commit/5a52ce2d04d88d666b836673ad4a26209e85fb79)), closes [#1181](https://github.com/midnightntwrk/midnight-js/pull/1181)
* update copyright year in multiple files ([#1106](https://github.com/midnightntwrk/midnight-js/pull/1106)) ([ccfad12](https://github.com/midnightntwrk/midnight-js/commit/ccfad1273e61e260602c0ce6f51a554935e28cd8))


### Documentation

* add ADR 0004 for lazy v8 era access via protocol subpath ([#1157](https://github.com/midnightntwrk/midnight-js/pull/1157)) ([9b0610e](https://github.com/midnightntwrk/midnight-js/commit/9b0610ea4043b10108251cb94daa700a0113ffc9)), closes [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1180](https://github.com/midnightntwrk/midnight-js/pull/1180) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1161](https://github.com/midnightntwrk/midnight-js/pull/1161) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156) [#1155](https://github.com/midnightntwrk/midnight-js/pull/1155) [#1156](https://github.com/midnightntwrk/midnight-js/pull/1156)
* add Vite WASM resolution guide for monorepo setups ([#1129](https://github.com/midnightntwrk/midnight-js/pull/1129)) ([6f2576b](https://github.com/midnightntwrk/midnight-js/commit/6f2576b7172bf09653cb758f082c3dbad98806dc)), closes [#1105](https://github.com/midnightntwrk/midnight-js/pull/1105) [#1052](https://github.com/midnightntwrk/midnight-js/pull/1052)
* API documentation update ([#1104](https://github.com/midnightntwrk/midnight-js/pull/1104)) ([7a50b64](https://github.com/midnightntwrk/midnight-js/commit/7a50b64447a3cf8a85edee427dfe30ddae657d42))
* API documentation update ([#1117](https://github.com/midnightntwrk/midnight-js/pull/1117)) ([f27d492](https://github.com/midnightntwrk/midnight-js/commit/f27d492f1162340c68eae0742d3ab23b051cf989))
* API documentation update ([#1183](https://github.com/midnightntwrk/midnight-js/pull/1183)) ([b458586](https://github.com/midnightntwrk/midnight-js/commit/b4585864c0cdb539a0164488cf5cb844e97b6322))


### Code Refactoring

* **midnight-js:** replace unsafe test casts with typed mock patterns ([#1163](https://github.com/midnightntwrk/midnight-js/pull/1163)) ([67dd28a](https://github.com/midnightntwrk/midnight-js/commit/67dd28a5c658374d2dc9d4d285c205a8f96b07d9)), closes [#1158](https://github.com/midnightntwrk/midnight-js/pull/1158) [#1161](https://github.com/midnightntwrk/midnight-js/pull/1161)


### Tests

* **midnight-js:** deflake tampered prover key integrity test ([#1162](https://github.com/midnightntwrk/midnight-js/pull/1162)) ([71cf9cb](https://github.com/midnightntwrk/midnight-js/commit/71cf9cbe55b1706f5aabbce8b3b6619c2e2e89b0)), closes [#1075](https://github.com/midnightntwrk/midnight-js/pull/1075)
* prevent CI unit-test timeout flakes ([#1116](https://github.com/midnightntwrk/midnight-js/pull/1116)) ([e1b6e1c](https://github.com/midnightntwrk/midnight-js/commit/e1b6e1c9ea3e6e2e055fc690b0689aa118be70e3))


### Build System

* **deps:** bump compactc to 0.33.0-rc.2 ([#1125](https://github.com/midnightntwrk/midnight-js/pull/1125)) ([15cad50](https://github.com/midnightntwrk/midnight-js/commit/15cad5026bcf48c591aabbd10c35e7ee5e746980))
* **deps:** bump compactc to 0.34.0-rc.0 and compact-runtime to 0.19.0-rc.0 ([#1190](https://github.com/midnightntwrk/midnight-js/pull/1190)) ([87c3b3c](https://github.com/midnightntwrk/midnight-js/commit/87c3b3cf95bf02b2eab40223d76164df61825bdd))


### Continuous Integration

* pin npm-installed CI tool versions ([#1140](https://github.com/midnightntwrk/midnight-js/pull/1140)) ([0570505](https://github.com/midnightntwrk/midnight-js/commit/0570505542c74ff9f60cfe40448d3e4a6dd8d1d1)), closes [#1139](https://github.com/midnightntwrk/midnight-js/pull/1139)
* **release:** dual-publish midnight-js to [@midnightntwrk](https://github.com/midnightntwrk) via OIDC ([#958](https://github.com/midnightntwrk/midnight-js/pull/958)) ([6120d35](https://github.com/midnightntwrk/midnight-js/commit/6120d3511f1260aef712f42ebf293378648fd9a3)), closes [shielded-sre#258](https://github.com/midnightntwrk/midnight-js/pull/258)


### Improvements

* **deps-dev:** bump @rollup/plugin-commonjs from 29.0.2 to 29.0.3 ([#1120](https://github.com/midnightntwrk/midnight-js/pull/1120)) ([de000f9](https://github.com/midnightntwrk/midnight-js/commit/de000f92121bd475b928661cee552e95f4947fd2)), closes [#1868](https://github.com/midnightntwrk/midnight-js/pull/1868) [#1981](https://github.com/midnightntwrk/midnight-js/pull/1981) [#1868](https://github.com/midnightntwrk/midnight-js/pull/1868) [#1981](https://github.com/midnightntwrk/midnight-js/pull/1981) [#1978](https://github.com/midnightntwrk/midnight-js/pull/1978)
* **deps-dev:** bump @vitest/coverage-v8 from 4.1.7 to 4.1.10 ([#1113](https://github.com/midnightntwrk/midnight-js/pull/1113)) ([2c892ca](https://github.com/midnightntwrk/midnight-js/commit/2c892ca3395af1ce09a9c434f8124619818a150f)), closes [vitest-dev/vitest#10680](https://github.com/midnightntwrk/midnight-js/pull/10680) [vitest-dev/vitest#10661](https://github.com/midnightntwrk/midnight-js/pull/10661) [vitest-dev/vitest#10546](https://github.com/midnightntwrk/midnight-js/pull/10546) [vitest-dev/vitest#10555](https://github.com/midnightntwrk/midnight-js/pull/10555) [vitest-dev/vitest#10497](https://github.com/midnightntwrk/midnight-js/pull/10497) [vitest-dev/vitest#10556](https://github.com/midnightntwrk/midnight-js/pull/10556) [vitest-dev/vitest#10548](https://github.com/midnightntwrk/midnight-js/pull/10548) [vitest-dev/vitest#10543](https://github.com/midnightntwrk/midnight-js/pull/10543) [vitest-dev/vitest#10564](https://github.com/midnightntwrk/midnight-js/pull/10564) [vitest-dev/vitest#10450](https://github.com/midnightntwrk/midnight-js/pull/10450) [vitest-dev/vitest#10474](https://github.com/midnightntwrk/midnight-js/pull/10474) [#10718](https://github.com/midnightntwrk/midnight-js/pull/10718) [#10598](https://github.com/midnightntwrk/midnight-js/pull/10598)
* **deps-dev:** bump @vitest/runner from 4.1.7 to 4.1.10 ([#1118](https://github.com/midnightntwrk/midnight-js/pull/1118)) ([ef8750b](https://github.com/midnightntwrk/midnight-js/commit/ef8750b3d3f0dbfe0296f24252e17dc34242fdde)), closes [vitest-dev/vitest#10680](https://github.com/midnightntwrk/midnight-js/pull/10680) [vitest-dev/vitest#10661](https://github.com/midnightntwrk/midnight-js/pull/10661) [vitest-dev/vitest#10546](https://github.com/midnightntwrk/midnight-js/pull/10546) [vitest-dev/vitest#10555](https://github.com/midnightntwrk/midnight-js/pull/10555) [vitest-dev/vitest#10497](https://github.com/midnightntwrk/midnight-js/pull/10497) [vitest-dev/vitest#10556](https://github.com/midnightntwrk/midnight-js/pull/10556) [vitest-dev/vitest#10548](https://github.com/midnightntwrk/midnight-js/pull/10548) [vitest-dev/vitest#10543](https://github.com/midnightntwrk/midnight-js/pull/10543) [vitest-dev/vitest#10564](https://github.com/midnightntwrk/midnight-js/pull/10564) [vitest-dev/vitest#10450](https://github.com/midnightntwrk/midnight-js/pull/10450) [vitest-dev/vitest#10474](https://github.com/midnightntwrk/midnight-js/pull/10474) [#10718](https://github.com/midnightntwrk/midnight-js/pull/10718) [#10598](https://github.com/midnightntwrk/midnight-js/pull/10598)
* **deps-dev:** bump @vitest/ui from 4.1.7 to 4.1.9 ([#1090](https://github.com/midnightntwrk/midnight-js/pull/1090)) ([d8b3399](https://github.com/midnightntwrk/midnight-js/commit/d8b33995222afeb24d1ff655c25845edaa33b85c)), closes [vitest-dev/vitest#10546](https://github.com/midnightntwrk/midnight-js/pull/10546) [vitest-dev/vitest#10555](https://github.com/midnightntwrk/midnight-js/pull/10555) [vitest-dev/vitest#10497](https://github.com/midnightntwrk/midnight-js/pull/10497) [vitest-dev/vitest#10556](https://github.com/midnightntwrk/midnight-js/pull/10556) [vitest-dev/vitest#10548](https://github.com/midnightntwrk/midnight-js/pull/10548) [vitest-dev/vitest#10543](https://github.com/midnightntwrk/midnight-js/pull/10543) [vitest-dev/vitest#10564](https://github.com/midnightntwrk/midnight-js/pull/10564) [vitest-dev/vitest#10450](https://github.com/midnightntwrk/midnight-js/pull/10450) [vitest-dev/vitest#10474](https://github.com/midnightntwrk/midnight-js/pull/10474) [#10598](https://github.com/midnightntwrk/midnight-js/pull/10598)
* **deps-dev:** bump allure-commandline from 2.42.0 to 2.43.0 ([#1108](https://github.com/midnightntwrk/midnight-js/pull/1108)) ([2ea2749](https://github.com/midnightntwrk/midnight-js/commit/2ea27491be8004be5d388bdaa9809a3c8b51a512))
* **deps-dev:** bump eslint from 10.4.0 to 10.6.0 ([#1123](https://github.com/midnightntwrk/midnight-js/pull/1123)) ([e9362d5](https://github.com/midnightntwrk/midnight-js/commit/e9362d500cfa452fb38d31648afad8c060c93e00)), closes [#20981](https://github.com/midnightntwrk/midnight-js/pull/20981) [#20948](https://github.com/midnightntwrk/midnight-js/pull/20948) [#20997](https://github.com/midnightntwrk/midnight-js/pull/20997) [#21013](https://github.com/midnightntwrk/midnight-js/pull/21013) [#21011](https://github.com/midnightntwrk/midnight-js/pull/21011) [#21010](https://github.com/midnightntwrk/midnight-js/pull/21010) [#21008](https://github.com/midnightntwrk/midnight-js/pull/21008) [#21006](https://github.com/midnightntwrk/midnight-js/pull/21006) [#21003](https://github.com/midnightntwrk/midnight-js/pull/21003) [#21002](https://github.com/midnightntwrk/midnight-js/pull/21002) [#20979](https://github.com/midnightntwrk/midnight-js/pull/20979) [#20995](https://github.com/midnightntwrk/midnight-js/pull/20995) [#20986](https://github.com/midnightntwrk/midnight-js/pull/20986) [#20984](https://github.com/midnightntwrk/midnight-js/pull/20984) [#20796](https://github.com/midnightntwrk/midnight-js/pull/20796) [#20983](https://github.com/midnightntwrk/midnight-js/pull/20983) [#20891](https://github.com/midnightntwrk/midnight-js/pull/20891) [#21014](https://github.com/midnightntwrk/midnight-js/pull/21014) [#21018](https://github.com/midnightntwrk/midnight-js/pull/21018) [#21001](https://github.com/midnightntwrk/midnight-js/pull/21001) [#21005](https://github.com/midnightntwrk/midnight-js/pull/21005) [#20989](https://github.com/midnightntwrk/midnight-js/pull/20989) [#20994](https://github.com/midnightntwrk/midnight-js/pull/20994) [#20993](https://github.com/midnightntwrk/midnight-js/pull/20993) [#20990](https://github.com/midnightntwrk/midnight-js/pull/20990) [#20985](https://github.com/midnightntwrk/midnight-js/pull/20985) [#20973](https://github.com/midnightntwrk/midnight-js/pull/20973) [#20971](https://github.com/midnightntwrk/midnight-js/pull/20971) [#20966](https://github.com/midnightntwrk/midnight-js/pull/20966) [#20967](https://github.com/midnightntwrk/midnight-js/pull/20967) [#20943](https://github.com/midnightntwrk/midnight-js/pull/20943) [#20944](https://github.com/midnightntwrk/midnight-js/pull/20944) [#20907](https://github.com/midnightntwrk/midnight-js/pull/20907) [#20891](https://github.com/midnightntwrk/midnight-js/pull/20891) [#20981](https://github.com/midnightntwrk/midnight-js/pull/20981) [#21014](https://github.com/midnightntwrk/midnight-js/pull/21014) [#21018](https://github.com/midnightntwrk/midnight-js/pull/21018) [#21001](https://github.com/midnightntwrk/midnight-js/pull/21001) [#20997](https://github.com/midnightntwrk/midnight-js/pull/20997) [#21013](https://github.com/midnightntwrk/midnight-js/pull/21013)
* **deps-dev:** bump eslint from 10.6.0 to 10.8.1 ([#1160](https://github.com/midnightntwrk/midnight-js/pull/1160)) ([45c47f8](https://github.com/midnightntwrk/midnight-js/commit/45c47f80249666f5d16de50f02826cd950cd5b7b)), closes [#21173](https://github.com/midnightntwrk/midnight-js/pull/21173) [#21163](https://github.com/midnightntwrk/midnight-js/pull/21163) [#21166](https://github.com/midnightntwrk/midnight-js/pull/21166) [#21167](https://github.com/midnightntwrk/midnight-js/pull/21167) [#20935](https://github.com/midnightntwrk/midnight-js/pull/20935) [#21183](https://github.com/midnightntwrk/midnight-js/pull/21183) [#21196](https://github.com/midnightntwrk/midnight-js/pull/21196) [#21191](https://github.com/midnightntwrk/midnight-js/pull/21191) [#21185](https://github.com/midnightntwrk/midnight-js/pull/21185) [#21176](https://github.com/midnightntwrk/midnight-js/pull/21176) [#20937](https://github.com/midnightntwrk/midnight-js/pull/20937) [#21182](https://github.com/midnightntwrk/midnight-js/pull/21182) [#21172](https://github.com/midnightntwrk/midnight-js/pull/21172) [#21092](https://github.com/midnightntwrk/midnight-js/pull/21092) [#21141](https://github.com/midnightntwrk/midnight-js/pull/21141) [#21159](https://github.com/midnightntwrk/midnight-js/pull/21159) [#21162](https://github.com/midnightntwrk/midnight-js/pull/21162) [#21156](https://github.com/midnightntwrk/midnight-js/pull/21156) [#21150](https://github.com/midnightntwrk/midnight-js/pull/21150) [#21151](https://github.com/midnightntwrk/midnight-js/pull/21151) [#21147](https://github.com/midnightntwrk/midnight-js/pull/21147) [#21144](https://github.com/midnightntwrk/midnight-js/pull/21144) [#21143](https://github.com/midnightntwrk/midnight-js/pull/21143) [#21145](https://github.com/midnightntwrk/midnight-js/pull/21145) [#21139](https://github.com/midnightntwrk/midnight-js/pull/21139) [#21140](https://github.com/midnightntwrk/midnight-js/pull/21140) [#21138](https://github.com/midnightntwrk/midnight-js/pull/21138) [#21082](https://github.com/midnightntwrk/midnight-js/pull/21082) [#21129](https://github.com/midnightntwrk/midnight-js/pull/21129) [#21116](https://github.com/midnightntwrk/midnight-js/pull/21116) [#21081](https://github.com/midnightntwrk/midnight-js/pull/21081) [#21096](https://github.com/midnightntwrk/midnight-js/pull/21096) [#21094](https://github.com/midnightntwrk/midnight-js/pull/21094) [#21083](https://github.com/midnightntwrk/midnight-js/pull/21083) [#21173](https://github.com/midnightntwrk/midnight-js/pull/21173) [#21196](https://github.com/midnightntwrk/midnight-js/pull/21196) [#21191](https://github.com/midnightntwrk/midnight-js/pull/21191) [#21185](https://github.com/midnightntwrk/midnight-js/pull/21185) [#21176](https://github.com/midnightntwrk/midnight-js/pull/21176) [#20937](https://github.com/midnightntwrk/midnight-js/pull/20937) [#21183](https://github.com/midnightntwrk/midnight-js/pull/21183)
* **deps-dev:** bump prettier from 3.8.3 to 3.9.4 ([#1107](https://github.com/midnightntwrk/midnight-js/pull/1107)) ([288d886](https://github.com/midnightntwrk/midnight-js/commit/288d886f580d5d664f91166b79de84962d313168))
* **deps-dev:** bump typedoc-plugin-markdown from 4.11.0 to 4.12.0 ([#1114](https://github.com/midnightntwrk/midnight-js/pull/1114)) ([30dff04](https://github.com/midnightntwrk/midnight-js/commit/30dff041ab8e271dc10a5227e44b4a30e23a103e)), closes [#861](https://github.com/midnightntwrk/midnight-js/pull/861) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#861](https://github.com/midnightntwrk/midnight-js/pull/861) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#866](https://github.com/midnightntwrk/midnight-js/pull/866) [#861](https://github.com/midnightntwrk/midnight-js/pull/861)
* **deps-dev:** bump typescript-eslint from 8.60.0 to 8.63.0 ([#1112](https://github.com/midnightntwrk/midnight-js/pull/1112)) ([0df10c8](https://github.com/midnightntwrk/midnight-js/commit/0df10c814ccce8adbe808cf736b12b2319687fef)), closes [#12426](https://github.com/midnightntwrk/midnight-js/pull/12426) [#12447](https://github.com/midnightntwrk/midnight-js/pull/12447) [#12446](https://github.com/midnightntwrk/midnight-js/pull/12446) [#12491](https://github.com/midnightntwrk/midnight-js/pull/12491) [#12485](https://github.com/midnightntwrk/midnight-js/pull/12485) [#12492](https://github.com/midnightntwrk/midnight-js/pull/12492) [#12460](https://github.com/midnightntwrk/midnight-js/pull/12460) [#12328](https://github.com/midnightntwrk/midnight-js/pull/12328) [#12365](https://github.com/midnightntwrk/midnight-js/pull/12365) [#12443](https://github.com/midnightntwrk/midnight-js/pull/12443) [#12418](https://github.com/midnightntwrk/midnight-js/pull/12418) [#12444](https://github.com/midnightntwrk/midnight-js/pull/12444) [#12444](https://github.com/midnightntwrk/midnight-js/pull/12444) [#12139](https://github.com/midnightntwrk/midnight-js/pull/12139)
* **deps:** bump @apollo/client from 4.2.3 to 4.2.5 ([#1091](https://github.com/midnightntwrk/midnight-js/pull/1091)) ([e463c6d](https://github.com/midnightntwrk/midnight-js/commit/e463c6dda1a9baeed8049cede061672bd2a120eb)), closes [#13302](https://github.com/midnightntwrk/midnight-js/pull/13302) [#13281](https://github.com/midnightntwrk/midnight-js/pull/13281) [#13302](https://github.com/midnightntwrk/midnight-js/pull/13302) [#13281](https://github.com/midnightntwrk/midnight-js/pull/13281) [#13303](https://github.com/midnightntwrk/midnight-js/pull/13303) [#13302](https://github.com/midnightntwrk/midnight-js/pull/13302) [#13300](https://github.com/midnightntwrk/midnight-js/pull/13300) [#13298](https://github.com/midnightntwrk/midnight-js/pull/13298) [#13291](https://github.com/midnightntwrk/midnight-js/pull/13291) [#13290](https://github.com/midnightntwrk/midnight-js/pull/13290) [#13293](https://github.com/midnightntwrk/midnight-js/pull/13293) [#13288](https://github.com/midnightntwrk/midnight-js/pull/13288) [#13283](https://github.com/midnightntwrk/midnight-js/pull/13283)
* **deps:** bump actions/checkout from 7.0.0 to 7.0.1 ([e5d4dfb](https://github.com/midnightntwrk/midnight-js/commit/e5d4dfb7714a7d29df27e539845d7514fc74f35c))
* **deps:** bump actions/checkout from 7.0.0 to 7.0.1 ([#1128](https://github.com/midnightntwrk/midnight-js/pull/1128)) ([d290ecf](https://github.com/midnightntwrk/midnight-js/commit/d290ecfd863fc30e7495ba45e73f286a61e91a72)), closes [actions/checkout#2518](https://github.com/midnightntwrk/midnight-js/pull/2518) [actions/checkout#2521](https://github.com/midnightntwrk/midnight-js/pull/2521) [actions/checkout#2530](https://github.com/midnightntwrk/midnight-js/pull/2530) [actions/checkout#2518](https://github.com/midnightntwrk/midnight-js/pull/2518) [actions/checkout#2521](https://github.com/midnightntwrk/midnight-js/pull/2521) [actions/checkout#2530](https://github.com/midnightntwrk/midnight-js/pull/2530) [actions/checkout#2454](https://github.com/midnightntwrk/midnight-js/pull/2454) [actions/checkout#2439](https://github.com/midnightntwrk/midnight-js/pull/2439) [actions/checkout#2414](https://github.com/midnightntwrk/midnight-js/pull/2414) [actions/checkout#2356](https://github.com/midnightntwrk/midnight-js/pull/2356) [actions/checkout#2327](https://github.com/midnightntwrk/midnight-js/pull/2327) [actions/checkout#2286](https://github.com/midnightntwrk/midnight-js/pull/2286) [actions/checkout#2248](https://github.com/midnightntwrk/midnight-js/pull/2248) [actions/checkout#2301](https://github.com/midnightntwrk/midnight-js/pull/2301) [actions/checkout#2226](https://github.com/midnightntwrk/midnight-js/pull/2226) [actions/checkout#2305](https://github.com/midnightntwrk/midnight-js/pull/2305) [actions/checkout#1971](https://github.com/midnightntwrk/midnight-js/pull/1971) [actions/checkout#1977](https://github.com/midnightntwrk/midnight-js/pull/1977) [actions/checkout#2043](https://github.com/midnightntwrk/midnight-js/pull/2043) [actions/checkout#2044](https://github.com/midnightntwrk/midnight-js/pull/2044) [actions/checkout#2194](https://github.com/midnightntwrk/midnight-js/pull/2194) [actions/checkout#2224](https://github.com/midnightntwrk/midnight-js/pull/2224) [actions/checkout#2236](https://github.com/midnightntwrk/midnight-js/pull/2236) [actions/checkout#1941](https://github.com/midnightntwrk/midnight-js/pull/1941) [actions/checkout#1946](https://github.com/midnightntwrk/midnight-js/pull/1946) [actions/checkout#1924](https://github.com/midnightntwrk/midnight-js/pull/1924) [#2531](https://github.com/midnightntwrk/midnight-js/pull/2531) [#2530](https://github.com/midnightntwrk/midnight-js/pull/2530) [#2521](https://github.com/midnightntwrk/midnight-js/pull/2521) [#2518](https://github.com/midnightntwrk/midnight-js/pull/2518) [#2499](https://github.com/midnightntwrk/midnight-js/pull/2499) [#2474](https://github.com/midnightntwrk/midnight-js/pull/2474) [#2476](https://github.com/midnightntwrk/midnight-js/pull/2476) [#2488](https://github.com/midnightntwrk/midnight-js/pull/2488) [#2479](https://github.com/midnightntwrk/midnight-js/pull/2479) [#2478](https://github.com/midnightntwrk/midnight-js/pull/2478)
* **deps:** bump actions/setup-node from 6.4.0 to 7.0.0 ([#1127](https://github.com/midnightntwrk/midnight-js/pull/1127)) ([e8a026e](https://github.com/midnightntwrk/midnight-js/commit/e8a026e5be8d1539a4210111daf9cb2ea74d7d8d)), closes [actions/setup-node#1577](https://github.com/midnightntwrk/midnight-js/pull/1577) [actions/setup-node#1574](https://github.com/midnightntwrk/midnight-js/pull/1574) [actions/setup-node#1558](https://github.com/midnightntwrk/midnight-js/pull/1558) [actions/setup-node#1548](https://github.com/midnightntwrk/midnight-js/pull/1548) [actions/setup-node#1536](https://github.com/midnightntwrk/midnight-js/pull/1536) [actions/setup-node#1550](https://github.com/midnightntwrk/midnight-js/pull/1550) [actions/setup-node#1567](https://github.com/midnightntwrk/midnight-js/pull/1567) [actions/setup-node#1569](https://github.com/midnightntwrk/midnight-js/pull/1569) [actions/setup-node#1536](https://github.com/midnightntwrk/midnight-js/pull/1536) [actions/setup-node#1548](https://github.com/midnightntwrk/midnight-js/pull/1548) [actions/setup-node#1569](https://github.com/midnightntwrk/midnight-js/pull/1569) [actions/setup-node#1579](https://github.com/midnightntwrk/midnight-js/pull/1579) [#1574](https://github.com/midnightntwrk/midnight-js/pull/1574) [#1577](https://github.com/midnightntwrk/midnight-js/pull/1577) [#1567](https://github.com/midnightntwrk/midnight-js/pull/1567) [#1569](https://github.com/midnightntwrk/midnight-js/pull/1569) [#1548](https://github.com/midnightntwrk/midnight-js/pull/1548) [#1558](https://github.com/midnightntwrk/midnight-js/pull/1558)
* **deps:** bump docker/login-action from 4.2.0 to 4.4.0 ([#1110](https://github.com/midnightntwrk/midnight-js/pull/1110)) ([ab8c3ae](https://github.com/midnightntwrk/midnight-js/commit/ab8c3ae2285d52e4c20f2442d05aa08d6bc3dc20)), closes [docker/login-action#1035](https://github.com/midnightntwrk/midnight-js/pull/1035) [docker/login-action#1034](https://github.com/midnightntwrk/midnight-js/pull/1034) [docker/login-action#1022](https://github.com/midnightntwrk/midnight-js/pull/1022) [docker/login-action#999](https://github.com/midnightntwrk/midnight-js/pull/999) [docker/login-action#1030](https://github.com/midnightntwrk/midnight-js/pull/1030) [docker/login-action#1004](https://github.com/midnightntwrk/midnight-js/pull/1004) [docker/login-action#1027](https://github.com/midnightntwrk/midnight-js/pull/1027) [docker/login-action#1023](https://github.com/midnightntwrk/midnight-js/pull/1023) [docker/login-action#1029](https://github.com/midnightntwrk/midnight-js/pull/1029) [docker/login-action#1017](https://github.com/midnightntwrk/midnight-js/pull/1017) [docker/login-action#1028](https://github.com/midnightntwrk/midnight-js/pull/1028) [docker/login-action#1031](https://github.com/midnightntwrk/midnight-js/pull/1031) [docker/login-action#1002](https://github.com/midnightntwrk/midnight-js/pull/1002) [docker/login-action#1020](https://github.com/midnightntwrk/midnight-js/pull/1020) [docker/login-action#1019](https://github.com/midnightntwrk/midnight-js/pull/1019) [#1034](https://github.com/midnightntwrk/midnight-js/pull/1034) [#1035](https://github.com/midnightntwrk/midnight-js/pull/1035) [#1033](https://github.com/midnightntwrk/midnight-js/pull/1033) [#1032](https://github.com/midnightntwrk/midnight-js/pull/1032)
* **deps:** bump docker/login-action from 4.4.0 to 4.5.2 ([da7199e](https://github.com/midnightntwrk/midnight-js/commit/da7199e6ad678f7024fad2770ed5b0ca07ea525c))
* **deps:** bump docker/login-action from 4.4.0 to 4.5.2 ([#1133](https://github.com/midnightntwrk/midnight-js/pull/1133)) ([97eae02](https://github.com/midnightntwrk/midnight-js/commit/97eae0249aacaed9bf946741bc8497f0db54c454)), closes [docker/login-action#1058](https://github.com/midnightntwrk/midnight-js/pull/1058) [docker/login-action#1054](https://github.com/midnightntwrk/midnight-js/pull/1054) [docker/login-action#1048](https://github.com/midnightntwrk/midnight-js/pull/1048) [docker/login-action#1037](https://github.com/midnightntwrk/midnight-js/pull/1037) [docker/login-action#1044](https://github.com/midnightntwrk/midnight-js/pull/1044) [docker/login-action#1050](https://github.com/midnightntwrk/midnight-js/pull/1050) [docker/login-action#1046](https://github.com/midnightntwrk/midnight-js/pull/1046) [docker/login-action#1038](https://github.com/midnightntwrk/midnight-js/pull/1038) [#1058](https://github.com/midnightntwrk/midnight-js/pull/1058) [#1055](https://github.com/midnightntwrk/midnight-js/pull/1055) [#1054](https://github.com/midnightntwrk/midnight-js/pull/1054) [#1037](https://github.com/midnightntwrk/midnight-js/pull/1037)
* **deps:** bump docker/login-action from 4.5.2 to 4.6.0 ([8fa5966](https://github.com/midnightntwrk/midnight-js/commit/8fa59661f881b7b49214128bc262300853fe68c6))
* **deps:** bump docker/login-action from 4.5.2 to 4.6.0 ([#1146](https://github.com/midnightntwrk/midnight-js/pull/1146)) ([3b7d1a3](https://github.com/midnightntwrk/midnight-js/commit/3b7d1a35329f2523782df134b51bdfc4e34b77e3)), closes [docker/login-action#1059](https://github.com/midnightntwrk/midnight-js/pull/1059) [docker/login-action#1051](https://github.com/midnightntwrk/midnight-js/pull/1051) [docker/login-action#1057](https://github.com/midnightntwrk/midnight-js/pull/1057) [docker/login-action#1056](https://github.com/midnightntwrk/midnight-js/pull/1056) [#1051](https://github.com/midnightntwrk/midnight-js/pull/1051) [#1057](https://github.com/midnightntwrk/midnight-js/pull/1057) [#1056](https://github.com/midnightntwrk/midnight-js/pull/1056) [#1053](https://github.com/midnightntwrk/midnight-js/pull/1053) [#1052](https://github.com/midnightntwrk/midnight-js/pull/1052) [#1059](https://github.com/midnightntwrk/midnight-js/pull/1059)
* **deps:** bump dorny/paths-filter from 4.0.1 to 4.0.2 ([#1111](https://github.com/midnightntwrk/midnight-js/pull/1111)) ([cc3983d](https://github.com/midnightntwrk/midnight-js/commit/cc3983dfc993a155fde1ff26861608aea895fe87)), closes [dorny/paths-filter#282](https://github.com/midnightntwrk/midnight-js/pull/282) [dorny/paths-filter#278](https://github.com/midnightntwrk/midnight-js/pull/278) [dorny/paths-filter#303](https://github.com/midnightntwrk/midnight-js/pull/303) [dorny/paths-filter#317](https://github.com/midnightntwrk/midnight-js/pull/317) [dorny/paths-filter#318](https://github.com/midnightntwrk/midnight-js/pull/318) [dorny/paths-filter#282](https://github.com/midnightntwrk/midnight-js/pull/282) [dorny/paths-filter#278](https://github.com/midnightntwrk/midnight-js/pull/278) [#318](https://github.com/midnightntwrk/midnight-js/pull/318) [#317](https://github.com/midnightntwrk/midnight-js/pull/317) [#303](https://github.com/midnightntwrk/midnight-js/pull/303) [#278](https://github.com/midnightntwrk/midnight-js/pull/278) [#282](https://github.com/midnightntwrk/midnight-js/pull/282)
* **deps:** bump dorny/paths-filter from 4.0.2 to 4.0.3 ([#1152](https://github.com/midnightntwrk/midnight-js/pull/1152)) ([3b8f779](https://github.com/midnightntwrk/midnight-js/commit/3b8f779cd1d1cea176331ea07ca88f49aef26aa9)), closes [dorny/paths-filter#247](https://github.com/midnightntwrk/midnight-js/pull/247) [dorny/paths-filter#319](https://github.com/midnightntwrk/midnight-js/pull/319) [dorny/paths-filter#248](https://github.com/midnightntwrk/midnight-js/pull/248) [dorny/paths-filter#322](https://github.com/midnightntwrk/midnight-js/pull/322) [dorny/paths-filter#326](https://github.com/midnightntwrk/midnight-js/pull/326) [dorny/paths-filter#247](https://github.com/midnightntwrk/midnight-js/pull/247) [dorny/paths-filter#248](https://github.com/midnightntwrk/midnight-js/pull/248) [dorny/paths-filter#322](https://github.com/midnightntwrk/midnight-js/pull/322) [#327](https://github.com/midnightntwrk/midnight-js/pull/327) [#326](https://github.com/midnightntwrk/midnight-js/pull/326) [#322](https://github.com/midnightntwrk/midnight-js/pull/322) [#248](https://github.com/midnightntwrk/midnight-js/pull/248) [#319](https://github.com/midnightntwrk/midnight-js/pull/319)
* **deps:** bump effect from 3.21.4 to 3.22.1 ([#1136](https://github.com/midnightntwrk/midnight-js/pull/1136)) ([8de4562](https://github.com/midnightntwrk/midnight-js/commit/8de456238c6c0bf456e71b2237d2e0dde589b6ef)), closes [#6443](https://github.com/midnightntwrk/midnight-js/pull/6443) [#6673](https://github.com/midnightntwrk/midnight-js/pull/6673) [#6761](https://github.com/midnightntwrk/midnight-js/pull/6761) [#6507](https://github.com/midnightntwrk/midnight-js/pull/6507) [#6762](https://github.com/midnightntwrk/midnight-js/pull/6762) [#6669](https://github.com/midnightntwrk/midnight-js/pull/6669) [#6286](https://github.com/midnightntwrk/midnight-js/pull/6286) [#6302](https://github.com/midnightntwrk/midnight-js/pull/6302) [#6303](https://github.com/midnightntwrk/midnight-js/pull/6303) [#6285](https://github.com/midnightntwrk/midnight-js/pull/6285) [#6305](https://github.com/midnightntwrk/midnight-js/pull/6305) [#6466](https://github.com/midnightntwrk/midnight-js/pull/6466) [#6762](https://github.com/midnightntwrk/midnight-js/pull/6762) [#6761](https://github.com/midnightntwrk/midnight-js/pull/6761) [#6669](https://github.com/midnightntwrk/midnight-js/pull/6669) [#6673](https://github.com/midnightntwrk/midnight-js/pull/6673) [#6507](https://github.com/midnightntwrk/midnight-js/pull/6507) [#6443](https://github.com/midnightntwrk/midnight-js/pull/6443) [#6323](https://github.com/midnightntwrk/midnight-js/pull/6323) [#6286](https://github.com/midnightntwrk/midnight-js/pull/6286) [#6282](https://github.com/midnightntwrk/midnight-js/pull/6282)
* **deps:** bump MishaKav/jest-coverage-comment from 1.0.34 to 1.0.36 ([aaab6ba](https://github.com/midnightntwrk/midnight-js/commit/aaab6ba93c12bb2e98dac9bdea6f57baf2f774cc))
* **deps:** bump MishaKav/jest-coverage-comment from 1.0.34 to 1.0.36 ([#1145](https://github.com/midnightntwrk/midnight-js/pull/1145)) ([b739c24](https://github.com/midnightntwrk/midnight-js/commit/b739c24d8d05eaf314fc972a0523ad47e375fc68)), closes [#92](https://github.com/midnightntwrk/midnight-js/pull/92) [#89](https://github.com/midnightntwrk/midnight-js/pull/89) [#92](https://github.com/midnightntwrk/midnight-js/pull/92) [#89](https://github.com/midnightntwrk/midnight-js/pull/89) [#150](https://github.com/midnightntwrk/midnight-js/pull/150) [#149](https://github.com/midnightntwrk/midnight-js/pull/149) [#148](https://github.com/midnightntwrk/midnight-js/pull/148) [#147](https://github.com/midnightntwrk/midnight-js/pull/147) [#145](https://github.com/midnightntwrk/midnight-js/pull/145) [#144](https://github.com/midnightntwrk/midnight-js/pull/144) [#143](https://github.com/midnightntwrk/midnight-js/pull/143)
* **deps:** bump softprops/action-gh-release from 3.0.1 to 3.0.2 ([#1126](https://github.com/midnightntwrk/midnight-js/pull/1126)) ([f6cee8b](https://github.com/midnightntwrk/midnight-js/commit/f6cee8b6986e496fd033b80254501ec65c87ea11)), closes [#795](https://github.com/midnightntwrk/midnight-js/pull/795) [#438](https://github.com/midnightntwrk/midnight-js/pull/438) [#803](https://github.com/midnightntwrk/midnight-js/pull/803) [#790](https://github.com/midnightntwrk/midnight-js/pull/790) [#786](https://github.com/midnightntwrk/midnight-js/pull/786) [softprops/action-gh-release#813](https://github.com/midnightntwrk/midnight-js/pull/813) [softprops/action-gh-release#801](https://github.com/midnightntwrk/midnight-js/pull/801) [softprops/action-gh-release#815](https://github.com/midnightntwrk/midnight-js/pull/815) [softprops/action-gh-release#816](https://github.com/midnightntwrk/midnight-js/pull/816) [softprops/action-gh-release#817](https://github.com/midnightntwrk/midnight-js/pull/817) [softprops/action-gh-release#812](https://github.com/midnightntwrk/midnight-js/pull/812) [softprops/action-gh-release#814](https://github.com/midnightntwrk/midnight-js/pull/814) [#795](https://github.com/midnightntwrk/midnight-js/pull/795) [#438](https://github.com/midnightntwrk/midnight-js/pull/438) [#803](https://github.com/midnightntwrk/midnight-js/pull/803) [#790](https://github.com/midnightntwrk/midnight-js/pull/790) [#786](https://github.com/midnightntwrk/midnight-js/pull/786) [softprops/action-gh-release#813](https://github.com/midnightntwrk/midnight-js/pull/813) [softprops/action-gh-release#801](https://github.com/midnightntwrk/midnight-js/pull/801) [softprops/action-gh-release#815](https://github.com/midnightntwrk/midnight-js/pull/815) [softprops/action-gh-release#816](https://github.com/midnightntwrk/midnight-js/pull/816) [softprops/action-gh-release#817](https://github.com/midnightntwrk/midnight-js/pull/817) [softprops/action-gh-release#812](https://github.com/midnightntwrk/midnight-js/pull/812) [softprops/action-gh-release#814](https://github.com/midnightntwrk/midnight-js/pull/814) [#818](https://github.com/midnightntwrk/midnight-js/pull/818) [#817](https://github.com/midnightntwrk/midnight-js/pull/817) [#816](https://github.com/midnightntwrk/midnight-js/pull/816) [#801](https://github.com/midnightntwrk/midnight-js/pull/801) [#815](https://github.com/midnightntwrk/midnight-js/pull/815) [#814](https://github.com/midnightntwrk/midnight-js/pull/814) [#813](https://github.com/midnightntwrk/midnight-js/pull/813) [#812](https://github.com/midnightntwrk/midnight-js/pull/812) [#810](https://github.com/midnightntwrk/midnight-js/pull/810) [#811](https://github.com/midnightntwrk/midnight-js/pull/811)
* **deps:** route dependabot/renovate PRs to canonical bot:* labels ([7a18f3a](https://github.com/midnightntwrk/midnight-js/commit/7a18f3a6f082fbefe1b61c676cd14da299f1ca96))
* **deps:** route dependabot/renovate PRs to canonical bot:* labels ([#1148](https://github.com/midnightntwrk/midnight-js/pull/1148)) ([5ad7bae](https://github.com/midnightntwrk/midnight-js/commit/5ad7bae2ce80b42540f2049e227feedfabc04c20)), closes [#1147](https://github.com/midnightntwrk/midnight-js/pull/1147)
* own all of .github in CODEOWNERS, not named subdirs ([144cfae](https://github.com/midnightntwrk/midnight-js/commit/144cfaee30dd0b9d02d953f09276b5057decd8ae))
* **release:** bump version to 5.0.0-beta.7 ([#1191](https://github.com/midnightntwrk/midnight-js/pull/1191)) ([41a29e7](https://github.com/midnightntwrk/midnight-js/commit/41a29e756a4448dfad84ee40001f9803f86f198d))
* standard issue templates + label-automation dispatchers ([#1150](https://github.com/midnightntwrk/midnight-js/pull/1150)) ([64cd784](https://github.com/midnightntwrk/midnight-js/commit/64cd78488a0ab9b0e35d72608bd46d7565d49479)), closes [midnightntwrk/midnight-iac#314](https://github.com/midnightntwrk/midnight-js/pull/314) [#1149](https://github.com/midnightntwrk/midnight-js/pull/1149)

## [5.0.0-beta.6](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-beta.4...v5.0.0-beta.6) (2026-07-10)


### Features

* **midnight-js:** add provider(options) factories for proof and zk-config providers ([#1078](https://github.com/midnightntwrk/midnight-js/pull/1078)) ([69e3381](https://github.com/midnightntwrk/midnight-js/commit/69e338162477946242586eb5d509cd9d41421560)), closes [#974](https://github.com/midnightntwrk/midnight-js/pull/974)
* **midnight-js:** surface MIP-0002 contract log events on CallResult ([#1083](https://github.com/midnightntwrk/midnight-js/pull/1083)) ([8decfd5](https://github.com/midnightntwrk/midnight-js/commit/8decfd55125f5e3641b9643ff702d972e009941e)), closes [#1081](https://github.com/midnightntwrk/midnight-js/pull/1081) [midnight-sdk#231](https://github.com/midnightntwrk/midnight-js/pull/231)


### Documentation

* add missing cryptoBackend and levelFactory options to README configuration table ([#1085](https://github.com/midnightntwrk/midnight-js/pull/1085)) ([aadaa50](https://github.com/midnightntwrk/midnight-js/commit/aadaa509d3108fcf11b2e0c0d08fdbed4ae40306)), closes [#827](https://github.com/midnightntwrk/midnight-js/pull/827) [#827](https://github.com/midnightntwrk/midnight-js/pull/827)
* API documentation update ([#1098](https://github.com/midnightntwrk/midnight-js/pull/1098)) ([ddf1a03](https://github.com/midnightntwrk/midnight-js/commit/ddf1a03db68bdf11359c4ccc3e14665f72b8c4b3))
* **midnight-js:** add ADR template and create/read enforcement ([#1084](https://github.com/midnightntwrk/midnight-js/pull/1084)) ([1026390](https://github.com/midnightntwrk/midnight-js/commit/1026390fd2c0af969d3b8df375c03674022df0de))
* **midnight-js:** author ADRs as Accepted, not Proposed ([#1087](https://github.com/midnightntwrk/midnight-js/pull/1087)) ([6efef68](https://github.com/midnightntwrk/midnight-js/commit/6efef688a793d474ca5a4f7f4b1436d2446dd8ac))
* update release notes for v5.0.0 ([#1074](https://github.com/midnightntwrk/midnight-js/pull/1074)) ([59bd742](https://github.com/midnightntwrk/midnight-js/commit/59bd742d9ecb4d3c492f48f406aea49737b23915)), closes [#1029](https://github.com/midnightntwrk/midnight-js/pull/1029) [#974](https://github.com/midnightntwrk/midnight-js/pull/974) [#1034](https://github.com/midnightntwrk/midnight-js/pull/1034) [#1068](https://github.com/midnightntwrk/midnight-js/pull/1068) [#1067](https://github.com/midnightntwrk/midnight-js/pull/1067) [#1065](https://github.com/midnightntwrk/midnight-js/pull/1065) [#1033](https://github.com/midnightntwrk/midnight-js/pull/1033) [#1064](https://github.com/midnightntwrk/midnight-js/pull/1064) [#1062](https://github.com/midnightntwrk/midnight-js/pull/1062) [#1035](https://github.com/midnightntwrk/midnight-js/pull/1035) [#1045](https://github.com/midnightntwrk/midnight-js/pull/1045) [#1053](https://github.com/midnightntwrk/midnight-js/pull/1053) [#1056](https://github.com/midnightntwrk/midnight-js/pull/1056) [#1051](https://github.com/midnightntwrk/midnight-js/pull/1051) [#1049](https://github.com/midnightntwrk/midnight-js/pull/1049) [#1055](https://github.com/midnightntwrk/midnight-js/pull/1055) [#1060](https://github.com/midnightntwrk/midnight-js/pull/1060) [#1047](https://github.com/midnightntwrk/midnight-js/pull/1047) [#1029](https://github.com/midnightntwrk/midnight-js/pull/1029)
* update release notes for v5.0.0 ([#1097](https://github.com/midnightntwrk/midnight-js/pull/1097)) ([9d9a241](https://github.com/midnightntwrk/midnight-js/commit/9d9a2415bf8e9166194b2b62c0c0432c02941f1a)), closes [#1074](https://github.com/midnightntwrk/midnight-js/pull/1074) [#1083](https://github.com/midnightntwrk/midnight-js/pull/1083) [#988](https://github.com/midnightntwrk/midnight-js/pull/988) [#1078](https://github.com/midnightntwrk/midnight-js/pull/1078) [#629](https://github.com/midnightntwrk/midnight-js/pull/629) [#1086](https://github.com/midnightntwrk/midnight-js/pull/1086) [#1081](https://github.com/midnightntwrk/midnight-js/pull/1081) [#1083](https://github.com/midnightntwrk/midnight-js/pull/1083) [#1078](https://github.com/midnightntwrk/midnight-js/pull/1078) [#629](https://github.com/midnightntwrk/midnight-js/pull/629) [#1086](https://github.com/midnightntwrk/midnight-js/pull/1086) [#1081](https://github.com/midnightntwrk/midnight-js/pull/1081)


### Code Refactoring

* convert intersection type aliases to interfaces for better IDE tooltips ([#629](https://github.com/midnightntwrk/midnight-js/pull/629)) ([9df7520](https://github.com/midnightntwrk/midnight-js/commit/9df7520af50b2be0ef9d693f9bf6f11b5fd75976))


### Tests

* **midnight-js:** use small synthetic fixtures for ZK provider tests ([#1075](https://github.com/midnightntwrk/midnight-js/pull/1075)) ([1e9bc40](https://github.com/midnightntwrk/midnight-js/commit/1e9bc40a4023a5228768ef308eeff476d12ff1e5))
* **testkit-js:** add regression test for [#731](https://github.com/midnightntwrk/midnight-js/pull/731) mintShieldedToken + receiveUnshielded combo ([#1079](https://github.com/midnightntwrk/midnight-js/pull/1079)) ([eb7130e](https://github.com/midnightntwrk/midnight-js/commit/eb7130e05553965b804810025d74486b9558593d)), closes [#876](https://github.com/midnightntwrk/midnight-js/pull/876) [#877](https://github.com/midnightntwrk/midnight-js/pull/877) [#876](https://github.com/midnightntwrk/midnight-js/pull/876) [#876](https://github.com/midnightntwrk/midnight-js/pull/876) [Pre-#877](https://github.com/midnightntwrk/midnight-js/pull/877)


### Build System

* **deps:** bump @midnight-ntwrk/compact-js to 2.5.5-rc.7 ([#1081](https://github.com/midnightntwrk/midnight-js/pull/1081)) ([8536c17](https://github.com/midnightntwrk/midnight-js/commit/8536c17c35bd35549f4d193fbdb37d7ee2b2789b))
* **testkit-js:** stop publishing testkit-js-e2e (too large, 413) ([#1103](https://github.com/midnightntwrk/midnight-js/pull/1103)) ([370fa66](https://github.com/midnightntwrk/midnight-js/commit/370fa66f4fe4e082a65cbbe857e081b82b93ede0))


### Continuous Integration

* fix GPG signing failure in docs and release-prepare workflows ([#1088](https://github.com/midnightntwrk/midnight-js/pull/1088)) ([f3d73ca](https://github.com/midnightntwrk/midnight-js/commit/f3d73ca11bf2ce3e2b7759dd87d14b218c460fe7))
* push automation branches with --no-verify (fix release-prepare) ([#1099](https://github.com/midnightntwrk/midnight-js/pull/1099)) ([e69218a](https://github.com/midnightntwrk/midnight-js/commit/e69218a6af6dc6ea5b9a144405850072f9ed00b2)), closes [#1096](https://github.com/midnightntwrk/midnight-js/pull/1096)
* **release:** add manual Release (prepare PR) workflow ([#1080](https://github.com/midnightntwrk/midnight-js/pull/1080)) ([327a3c5](https://github.com/midnightntwrk/midnight-js/commit/327a3c5704e9874a894f5d48ef47c6d4a8f1daff))
* **release:** create release/vX from a signed staging commit (ruleset-safe) ([#1100](https://github.com/midnightntwrk/midnight-js/pull/1100)) ([93c6fba](https://github.com/midnightntwrk/midnight-js/commit/93c6fba6bf9f2e4e5c5e51a80951f6f31d50c73f))
* sign docs/release automation commits via GitHub API (fix CLA) ([#1095](https://github.com/midnightntwrk/midnight-js/pull/1095)) ([d96d6bd](https://github.com/midnightntwrk/midnight-js/commit/d96d6bda9f84aed8bee74f3d3fe2c5f5b18a47b8)), closes [#1088](https://github.com/midnightntwrk/midnight-js/pull/1088) [#1089](https://github.com/midnightntwrk/midnight-js/pull/1089) [pre-#1065](https://github.com/midnightntwrk/midnight-js/pull/1065) [#1060](https://github.com/midnightntwrk/midnight-js/pull/1060) [#1088](https://github.com/midnightntwrk/midnight-js/pull/1088) [#1060](https://github.com/midnightntwrk/midnight-js/pull/1060) [#1089](https://github.com/midnightntwrk/midnight-js/pull/1089) [#1089](https://github.com/midnightntwrk/midnight-js/pull/1089)
* stage changes before ghcommit so new doc dirs aren't read as files ([#1096](https://github.com/midnightntwrk/midnight-js/pull/1096)) ([76e92b7](https://github.com/midnightntwrk/midnight-js/commit/76e92b750c015a18a9f7131e1efd8ce51e25a680)), closes [#1095](https://github.com/midnightntwrk/midnight-js/pull/1095)


### Improvements

* **deps-dev:** bump allure-vitest from 3.9.0 to 3.10.2 ([#1072](https://github.com/midnightntwrk/midnight-js/pull/1072)) ([bd0b125](https://github.com/midnightntwrk/midnight-js/commit/bd0b125b9008e763cf8ee39a102f0e74066d6c3a)), closes [allure-framework/allure-js#1531](https://github.com/midnightntwrk/midnight-js/pull/1531) [allure-framework/allure-js#1529](https://github.com/midnightntwrk/midnight-js/pull/1529) [allure-framework/allure-js#1532](https://github.com/midnightntwrk/midnight-js/pull/1532) [allure-framework/allure-js#1531](https://github.com/midnightntwrk/midnight-js/pull/1531) [allure-framework/allure-js#1505](https://github.com/midnightntwrk/midnight-js/pull/1505) [allure-framework/allure-js#1523](https://github.com/midnightntwrk/midnight-js/pull/1523) [allure-framework/allure-js#1507](https://github.com/midnightntwrk/midnight-js/pull/1507) [allure-framework/allure-js#1472](https://github.com/midnightntwrk/midnight-js/pull/1472) [allure-framework/allure-js#1521](https://github.com/midnightntwrk/midnight-js/pull/1521) [allure-framework/allure-js#1520](https://github.com/midnightntwrk/midnight-js/pull/1520) [allure-framework/allure-js#1514](https://github.com/midnightntwrk/midnight-js/pull/1514) [allure-framework/allure-js#1516](https://github.com/midnightntwrk/midnight-js/pull/1516) [allure-framework/allure-js#1494](https://github.com/midnightntwrk/midnight-js/pull/1494) [allure-framework/allure-js#1454](https://github.com/midnightntwrk/midnight-js/pull/1454) [allure-framework/allure-js#1498](https://github.com/midnightntwrk/midnight-js/pull/1498) [allure-framework/allure-js#1504](https://github.com/midnightntwrk/midnight-js/pull/1504) [allure-framework/allure-js#1500](https://github.com/midnightntwrk/midnight-js/pull/1500) [allure-framework/allure-js#1503](https://github.com/midnightntwrk/midnight-js/pull/1503) [allure-framework/allure-js#1479](https://github.com/midnightntwrk/midnight-js/pull/1479) [#1521](https://github.com/midnightntwrk/midnight-js/pull/1521) [#1516](https://github.com/midnightntwrk/midnight-js/pull/1516) [#1505](https://github.com/midnightntwrk/midnight-js/pull/1505) [#1514](https://github.com/midnightntwrk/midnight-js/pull/1514) [#1510](https://github.com/midnightntwrk/midnight-js/pull/1510) [#1501](https://github.com/midnightntwrk/midnight-js/pull/1501) [#1500](https://github.com/midnightntwrk/midnight-js/pull/1500)
* **deps:** bump graphql to 17 and graphql-codegen to v6/v7 ([#1086](https://github.com/midnightntwrk/midnight-js/pull/1086)) ([c75d9f4](https://github.com/midnightntwrk/midnight-js/commit/c75d9f4712cdbcacc426aef2f3325a86f25b6cb7)), closes [#1073](https://github.com/midnightntwrk/midnight-js/pull/1073) [#1059](https://github.com/midnightntwrk/midnight-js/pull/1059) [#1058](https://github.com/midnightntwrk/midnight-js/pull/1058) [#1057](https://github.com/midnightntwrk/midnight-js/pull/1057)
* fix stale contributor docs and add coverage floor gate ([#1076](https://github.com/midnightntwrk/midnight-js/pull/1076)) ([4306f48](https://github.com/midnightntwrk/midnight-js/commit/4306f48bd56c1a6439d9e7475af232a74d5bd3fa))
* **release:** bump version to 5.0.0-beta.6 ([#1101](https://github.com/midnightntwrk/midnight-js/pull/1101)) ([ce895b3](https://github.com/midnightntwrk/midnight-js/commit/ce895b328949810773dab40b8d36f98f6ff146dc))


### Reverts

* **testkit-js:** drop compactc/compact-runtime from-submodule build ([#1069](https://github.com/midnightntwrk/midnight-js/pull/1069)) ([f81036e](https://github.com/midnightntwrk/midnight-js/commit/f81036e8a31513900b793023c528e25d312ce05b)), closes [#978](https://github.com/midnightntwrk/midnight-js/pull/978) [#979](https://github.com/midnightntwrk/midnight-js/pull/979) [#978](https://github.com/midnightntwrk/midnight-js/pull/978)

## [5.0.0-beta.4](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-beta.3...v5.0.0-beta.4) (2026-07-08)


### Bug Fixes

* Add tests for cross-contract calls ([#1035](https://github.com/midnightntwrk/midnight-js/pull/1035)) ([3c84099](https://github.com/midnightntwrk/midnight-js/commit/3c840995505c21cd3c8ed27ad19fef1a53140cb7))
* **midnight-js:** honor per-call proveTxConfig.timeout ([#1054](https://github.com/midnightntwrk/midnight-js/pull/1054)) ([d20a0c5](https://github.com/midnightntwrk/midnight-js/commit/d20a0c552605f9ad737ee00b69490c750777aeb3)), closes [#983](https://github.com/midnightntwrk/midnight-js/pull/983) [#974](https://github.com/midnightntwrk/midnight-js/pull/974)
* Robustness fixes for cross-contract calls ([#1034](https://github.com/midnightntwrk/midnight-js/pull/1034)) ([7616b31](https://github.com/midnightntwrk/midnight-js/commit/7616b3153849a6f880d20fc6e78a0bbc1f70bcd2))


### Documentation

* API documentation update ([#1047](https://github.com/midnightntwrk/midnight-js/pull/1047)) ([1ce1b22](https://github.com/midnightntwrk/midnight-js/commit/1ce1b22a675750ffd2642409076b31ea2918f18b))
* API documentation update ([#1060](https://github.com/midnightntwrk/midnight-js/pull/1060)) ([3a5bb4d](https://github.com/midnightntwrk/midnight-js/commit/3a5bb4d43e789141c98c7e97984a5537b631ba03))


### Performance Improvements

* **testkit-js:** speed up e2e env startup ([#1064](https://github.com/midnightntwrk/midnight-js/pull/1064)) ([3e22d6e](https://github.com/midnightntwrk/midnight-js/commit/3e22d6e9189163ac5870c3089aa1c7d2e59cef7d))


### Tests

* **midnight-js:** close ZK artifact integrity verification coverage gaps ([823e69d](https://github.com/midnightntwrk/midnight-js/commit/823e69d6adef7196bb6a404fd99ef5f9a96d4a43))
* **midnight-js:** cover null contractEvents subscription payload guard ([cff6e9b](https://github.com/midnightntwrk/midnight-js/commit/cff6e9bf4008c0764f3e8fe898a9e44ac4e5c2b0))
* **testkit-js:** close MIP-0002 event e2e coverage gaps ([47fa657](https://github.com/midnightntwrk/midnight-js/commit/47fa657e4dd9961346a557cd6245483b86a4fd5f))
* **testkit-js:** consolidate events e2e suites to cut CI cost ([7f58730](https://github.com/midnightntwrk/midnight-js/commit/7f587308f3d57236c59dcdaa80b35fde13a905ba))
* **testkit-js:** skip Misc event e2e pending proof-server log-volume fix ([e038a92](https://github.com/midnightntwrk/midnight-js/commit/e038a92ae948f4607e2999b3306764be5bd2b395))


### Build System

* **deps:** bump compact toolchain to compactc 0.33.0-rc.1 ([#1068](https://github.com/midnightntwrk/midnight-js/pull/1068)) ([123b9ba](https://github.com/midnightntwrk/midnight-js/commit/123b9ba13830f91c54312dce662b3d27ed260a27))
* **deps:** re-apply devnet stack and wallet/ledger/connector/zkir dependency bumps ([#1045](https://github.com/midnightntwrk/midnight-js/pull/1045)) ([e6dc68c](https://github.com/midnightntwrk/midnight-js/commit/e6dc68caeb5489e627a37d15aba520436345df32)), closes [#1019](https://github.com/midnightntwrk/midnight-js/pull/1019) [#1038](https://github.com/midnightntwrk/midnight-js/pull/1038) [#1019](https://github.com/midnightntwrk/midnight-js/pull/1019)


### Continuous Integration

* add manual publish-from-main workflow ([#1071](https://github.com/midnightntwrk/midnight-js/pull/1071)) ([7ddea71](https://github.com/midnightntwrk/midnight-js/commit/7ddea71d366c0c2a8d792fa8d74f84f9d830bcd9))
* dedupe workflow setup, gate release concurrency, fix coverage mapping ([#1065](https://github.com/midnightntwrk/midnight-js/pull/1065)) ([36fac7b](https://github.com/midnightntwrk/midnight-js/commit/36fac7b80d7b8acf6384b34cc59f5618daaf6100)), closes [#1](https://github.com/midnightntwrk/midnight-js/pull/1) [#3](https://github.com/midnightntwrk/midnight-js/pull/3) [#4](https://github.com/midnightntwrk/midnight-js/pull/4) [#6](https://github.com/midnightntwrk/midnight-js/pull/6)
* publish releases from CI, dropping the duplicate CD e2e run ([#1033](https://github.com/midnightntwrk/midnight-js/pull/1033)) ([a7d920a](https://github.com/midnightntwrk/midnight-js/commit/a7d920ab8be154120e7b278084c5ce32f5830a66))
* **testkit-js:** cache pinned docker images to unblock e2e parallelism ([#1062](https://github.com/midnightntwrk/midnight-js/pull/1062)) ([b9982c7](https://github.com/midnightntwrk/midnight-js/commit/b9982c7dcff167f4059bdfd187afbe3fa24fbcef))


### Improvements

* **config:** enforce packageManager and engines consistency via yarn constraints ([#1067](https://github.com/midnightntwrk/midnight-js/pull/1067)) ([c217896](https://github.com/midnightntwrk/midnight-js/commit/c217896729362e2432917f0c1df93cab1153e4c6))
* **deps:** bump @apollo/client from 4.2.0 to 4.2.3 ([#1056](https://github.com/midnightntwrk/midnight-js/pull/1056)) ([0de66ee](https://github.com/midnightntwrk/midnight-js/commit/0de66ee254d734d93b08996f9f8e882b76600514))
* **deps:** bump lint-staged to 17 and transitive security deps ([#1051](https://github.com/midnightntwrk/midnight-js/pull/1051)) ([5463c7b](https://github.com/midnightntwrk/midnight-js/commit/5463c7bbb376956a546f0e982207f413e303da58)), closes [#931](https://github.com/midnightntwrk/midnight-js/pull/931) [#991](https://github.com/midnightntwrk/midnight-js/pull/991)
* **deps:** bump MishaKav/jest-coverage-comment from 1.0.33 to 1.0.34 ([#1055](https://github.com/midnightntwrk/midnight-js/pull/1055)) ([98f08b4](https://github.com/midnightntwrk/midnight-js/commit/98f08b4d853c280bc1f6b6bfbb9335ffc7cc966c))
* **deps:** consolidate GitHub Actions bumps ([#1049](https://github.com/midnightntwrk/midnight-js/pull/1049)) ([1a96e3d](https://github.com/midnightntwrk/midnight-js/commit/1a96e3d99315723d32cb1ddac2819d92ece5ebdb))
* **env:** update indexer version to 4.4.0-pre-alpha.16 ([#1053](https://github.com/midnightntwrk/midnight-js/pull/1053)) ([b9563a9](https://github.com/midnightntwrk/midnight-js/commit/b9563a95b7c69d9f5632b5c5f903b3525af96bbb))
* **release:** bump version to 5.0.0-beta.4 ([#1070](https://github.com/midnightntwrk/midnight-js/pull/1070)) ([8419d76](https://github.com/midnightntwrk/midnight-js/commit/8419d76ea16e59bb471ce3a1c842a40f6533a0a0))

## [5.0.0-beta.3](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-beta.1...v5.0.0-beta.3) (2026-07-03)


### Documentation

* update release notes for v5.0.0 ([#1029](https://github.com/midnightntwrk/midnight-js/pull/1029)) ([7184daa](https://github.com/midnightntwrk/midnight-js/commit/7184daad2152aab172cea8e10dca0b656c4f4e3f)), closes [#998](https://github.com/midnightntwrk/midnight-js/pull/998) [#967](https://github.com/midnightntwrk/midnight-js/pull/967) [#1015](https://github.com/midnightntwrk/midnight-js/pull/1015) [#977](https://github.com/midnightntwrk/midnight-js/pull/977) [#999](https://github.com/midnightntwrk/midnight-js/pull/999) [#1020](https://github.com/midnightntwrk/midnight-js/pull/1020) [#993](https://github.com/midnightntwrk/midnight-js/pull/993) [midnight-indexer#1279](https://github.com/midnightntwrk/midnight-js/pull/1279)


### Improvements

* **release:** bump version to 5.0.0-beta.3 ([#1041](https://github.com/midnightntwrk/midnight-js/pull/1041)) ([18aac45](https://github.com/midnightntwrk/midnight-js/commit/18aac452e6eb791b3a5a4ef424c8e41d6087bdf6))


### Reverts

* "build(deps): bump devnet stack and wallet/ledger/connector/zkir dependencies ([#1019](https://github.com/midnightntwrk/midnight-js/pull/1019))" ([#1038](https://github.com/midnightntwrk/midnight-js/pull/1038)) ([0316fbb](https://github.com/midnightntwrk/midnight-js/commit/0316fbb44e6cb033226e21b0121bc5b96413fa36)), closes [#1032](https://github.com/midnightntwrk/midnight-js/pull/1032)

## [5.0.0-beta.1](https://github.com/midnightntwrk/midnight-js/compare/v5.0.0-alpha.1...v5.0.0-beta.1) (2026-07-02)


### ⚠ BREAKING CHANGES

* **midnight-js:** verify ZK artifacts against the compactc integrity manifest (#1015)

### Features

* Cross-Contract Call Support ([#967](https://github.com/midnightntwrk/midnight-js/pull/967)) ([be6012c](https://github.com/midnightntwrk/midnight-js/commit/be6012c503d9b04843b73ae448b1263298119391))
* **midnight-js:** adopt graphql-transport-ws+deflate subscription compression ([#977](https://github.com/midnightntwrk/midnight-js/pull/977)) ([feb8308](https://github.com/midnightntwrk/midnight-js/commit/feb8308cd06ec1adb3f9f97ce3b408045e5d4c3c))
* **midnight-js:** verify ZK artifacts against the compactc integrity manifest ([#1015](https://github.com/midnightntwrk/midnight-js/pull/1015)) ([8512994](https://github.com/midnightntwrk/midnight-js/commit/8512994276e3a1ad0674de46402b03711365c35f))


### Bug Fixes

* **config:** pass --no-stash to lint-staged to keep GPG signatures valid ([#1020](https://github.com/midnightntwrk/midnight-js/pull/1020)) ([6e1505d](https://github.com/midnightntwrk/midnight-js/commit/6e1505d45cfcb1e23bc92e255e43cb80a9596bd8))


### Documentation

* API documentation update ([#1007](https://github.com/midnightntwrk/midnight-js/pull/1007)) ([555c68f](https://github.com/midnightntwrk/midnight-js/commit/555c68febfae9f60247279d96da0c235afbab990))
* API documentation update ([#1021](https://github.com/midnightntwrk/midnight-js/pull/1021)) ([7a72cb2](https://github.com/midnightntwrk/midnight-js/commit/7a72cb2a8f1d8c8e0534a17b21d2c084ca840854))
* API documentation update ([#1024](https://github.com/midnightntwrk/midnight-js/pull/1024)) ([3162b79](https://github.com/midnightntwrk/midnight-js/commit/3162b79978c535c2e6c331ff9be098753e8722c3))


### Tests

* **testkit-js:** cover ECDSA contract maintenance actions and key persistence ([#901](https://github.com/midnightntwrk/midnight-js/pull/901)) ([c6e90a8](https://github.com/midnightntwrk/midnight-js/commit/c6e90a8315dc255b1c9428e9954f01f6712035c4))
* **testkit-js:** verify MIP-0002 emit→indexer contract-events loop ([#993](https://github.com/midnightntwrk/midnight-js/pull/993)) ([a92a91f](https://github.com/midnightntwrk/midnight-js/commit/a92a91f7535ecf1ea759ac61c36ef794226c7e94)), closes [midnight-indexer#1279](https://github.com/midnightntwrk/midnight-js/pull/1279) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001) [#1001](https://github.com/midnightntwrk/midnight-js/pull/1001)


### Build System

* **deps:** bump compact-runtime to 0.18.0-rc.0 and compactc to 0.33.0-rc.0 ([#1016](https://github.com/midnightntwrk/midnight-js/pull/1016)) ([9669eb9](https://github.com/midnightntwrk/midnight-js/commit/9669eb9f4dbe05d4165993cf274dee52f8b9cb44))
* **deps:** bump devnet stack and wallet/ledger/connector/zkir dependencies ([#1019](https://github.com/midnightntwrk/midnight-js/pull/1019)) ([e5d8e9e](https://github.com/midnightntwrk/midnight-js/commit/e5d8e9e0ca075c2a08518e1b78687224da668a31))


### Improvements

* **release:** bump version to 5.0.0-beta.1 ([#1032](https://github.com/midnightntwrk/midnight-js/pull/1032)) ([e9db03f](https://github.com/midnightntwrk/midnight-js/commit/e9db03f508d6eebc25b85364dbc7512b520d7f26))

## [5.0.0-alpha.1](https://github.com/midnightntwrk/midnight-js/compare/v4.1.0...v5.0.0-alpha.1) (2026-06-29)


### ⚠ BREAKING CHANGES

* **deps:** swap protocol to ledger-v9 + onchain-runtime-v4 (@midnightntwrk) (#970)

### Features

* **graphql:** enhance contract event types and add dust generation support ([#971](https://github.com/midnightntwrk/midnight-js/pull/971)) ([a0ac680](https://github.com/midnightntwrk/midnight-js/commit/a0ac680688a62ef2986fa7598cfdfdeeb449fae1))
* **graphql:** regenerate contract event schema with transaction refs and beta markers ([#975](https://github.com/midnightntwrk/midnight-js/pull/975)) ([83b0e1c](https://github.com/midnightntwrk/midnight-js/commit/83b0e1c499093990076f6c82880abf88a64a51c4))
* **midnight-js:** add IndexerPublicDataProvider class, config object, and dispose() lifecycle ([#961](https://github.com/midnightntwrk/midnight-js/pull/961)) ([a0cf14a](https://github.com/midnightntwrk/midnight-js/commit/a0cf14ac562139b423930c88a344e1a353eb9ee4)), closes [#820](https://github.com/midnightntwrk/midnight-js/pull/820) [#843](https://github.com/midnightntwrk/midnight-js/pull/843)
* **midnight-js:** surface MIP-0002 contract events via PublicDataProvider ([#988](https://github.com/midnightntwrk/midnight-js/pull/988)) ([6e0cfcc](https://github.com/midnightntwrk/midnight-js/commit/6e0cfcc55069a65b4f8864b8f752f3dcd9088b4c)), closes [#970](https://github.com/midnightntwrk/midnight-js/pull/970)
* **midnight-js:** turn deserialization errors into versioning errors ([#955](https://github.com/midnightntwrk/midnight-js/pull/955)) ([658ad2f](https://github.com/midnightntwrk/midnight-js/commit/658ad2f124283b4593a456bf7b9c6dd9c949ef50)), closes [#816](https://github.com/midnightntwrk/midnight-js/pull/816) [#1](https://github.com/midnightntwrk/midnight-js/pull/1) [#816](https://github.com/midnightntwrk/midnight-js/pull/816) [#816](https://github.com/midnightntwrk/midnight-js/pull/816) [#869](https://github.com/midnightntwrk/midnight-js/pull/869) [#949](https://github.com/midnightntwrk/midnight-js/pull/949) [#26992747642](https://github.com/midnightntwrk/midnight-js/pull/26992747642)
* **testkit-js:** parameterize compose image versions + nightly e2e matrix ([#917](https://github.com/midnightntwrk/midnight-js/pull/917)) ([1621524](https://github.com/midnightntwrk/midnight-js/commit/16215240e02f738374aa644c43039ae5c90f962f))
* **testkit-js:** support qanet via NIGHT/dust faucet flow ([73a3fd5](https://github.com/midnightntwrk/midnight-js/commit/73a3fd59a549ff09940ab85f5ad3995288b5063a))


### Bug Fixes

* **midnight-js:** apply full password policy to export operations ([#922](https://github.com/midnightntwrk/midnight-js/pull/922)) ([c6f43dd](https://github.com/midnightntwrk/midnight-js/commit/c6f43dda1f5f1cf7cc124baa37f7417fe919ef1d)), closes [#819](https://github.com/midnightntwrk/midnight-js/pull/819)
* **midnight-js:** emit contract state for blockHeight/blockHash configs ([#911](https://github.com/midnightntwrk/midnight-js/pull/911)) ([f8d2e48](https://github.com/midnightntwrk/midnight-js/commit/f8d2e48ba026f21597f9a634b4b87874dc0b7bec)), closes [#805](https://github.com/midnightntwrk/midnight-js/pull/805)
* **midnight-js:** harden error handling in indexer-public-data-provider ([#937](https://github.com/midnightntwrk/midnight-js/pull/937)) ([28c840a](https://github.com/midnightntwrk/midnight-js/commit/28c840a33efbdc6f3b93756d981baeb82382251c)), closes [#823](https://github.com/midnightntwrk/midnight-js/pull/823) [#822](https://github.com/midnightntwrk/midnight-js/pull/822) [#821](https://github.com/midnightntwrk/midnight-js/pull/821) [#821](https://github.com/midnightntwrk/midnight-js/pull/821)
* **midnight-js:** pass signing key kind via KEYS_SIGNING_KIND config key ([#999](https://github.com/midnightntwrk/midnight-js/pull/999)) ([428bc31](https://github.com/midnightntwrk/midnight-js/commit/428bc31c90b58ea72e3f346cd5a18d09330be591))
* **midnight-js:** validate signing key value on import ([#926](https://github.com/midnightntwrk/midnight-js/pull/926)) ([9fa41f4](https://github.com/midnightntwrk/midnight-js/commit/9fa41f43a63031a1f04e325818762c9413cb6790)), closes [#824](https://github.com/midnightntwrk/midnight-js/pull/824)
* **midnight-js:** warn on plain http/ws for non-loopback provider URLs ([#920](https://github.com/midnightntwrk/midnight-js/pull/920)) ([dc6a3c6](https://github.com/midnightntwrk/midnight-js/commit/dc6a3c6360cca87d51a62b563863f403439e99c9)), closes [#818](https://github.com/midnightntwrk/midnight-js/pull/818)
* **testkit-js:** derive waitForFunds address from keystore ([f1b980b](https://github.com/midnightntwrk/midnight-js/commit/f1b980b51962a924e28d11ca1c27dc0054bc6584))
* **testkit-js:** stretch indexer SPO reconnect delay to keep it alive ([#950](https://github.com/midnightntwrk/midnight-js/pull/950)) ([daa292f](https://github.com/midnightntwrk/midnight-js/commit/daa292ff91dc1e1d8a5cb09a8fd6003fd82ca7a1))
* **testkit-js:** wait on indexer healthcheck with 3-minute startup timeout ([#980](https://github.com/midnightntwrk/midnight-js/pull/980)) ([b88ae90](https://github.com/midnightntwrk/midnight-js/commit/b88ae9017385188f0f94c1d5bc13b30781efcb19))


### Documentation

* add release notes for v4.1.1 ([#936](https://github.com/midnightntwrk/midnight-js/pull/936)) ([9340f78](https://github.com/midnightntwrk/midnight-js/commit/9340f780f7edc4f736872e944eb08e8b03e57cbf)), closes [#911](https://github.com/midnightntwrk/midnight-js/pull/911) [#920](https://github.com/midnightntwrk/midnight-js/pull/920) [#922](https://github.com/midnightntwrk/midnight-js/pull/922) [#926](https://github.com/midnightntwrk/midnight-js/pull/926) [#925](https://github.com/midnightntwrk/midnight-js/pull/925) [#919](https://github.com/midnightntwrk/midnight-js/pull/919) [#909](https://github.com/midnightntwrk/midnight-js/pull/909) [#903](https://github.com/midnightntwrk/midnight-js/pull/903) [#917](https://github.com/midnightntwrk/midnight-js/pull/917) [#918](https://github.com/midnightntwrk/midnight-js/pull/918) [#934](https://github.com/midnightntwrk/midnight-js/pull/934) [#927](https://github.com/midnightntwrk/midnight-js/pull/927) [#937](https://github.com/midnightntwrk/midnight-js/pull/937) [#935](https://github.com/midnightntwrk/midnight-js/pull/935) [#939](https://github.com/midnightntwrk/midnight-js/pull/939) [#937](https://github.com/midnightntwrk/midnight-js/pull/937) [#935](https://github.com/midnightntwrk/midnight-js/pull/935) [#939](https://github.com/midnightntwrk/midnight-js/pull/939) [#934](https://github.com/midnightntwrk/midnight-js/pull/934) [#924](https://github.com/midnightntwrk/midnight-js/pull/924) [#910](https://github.com/midnightntwrk/midnight-js/pull/910) [#823](https://github.com/midnightntwrk/midnight-js/pull/823) [#822](https://github.com/midnightntwrk/midnight-js/pull/822) [#821](https://github.com/midnightntwrk/midnight-js/pull/821)
* add release notes for v5.0.0 ([#998](https://github.com/midnightntwrk/midnight-js/pull/998)) ([7565b72](https://github.com/midnightntwrk/midnight-js/commit/7565b72bfea63168428491818b617ca0dd45a43c))
* API documentation update ([#910](https://github.com/midnightntwrk/midnight-js/pull/910)) ([96146e5](https://github.com/midnightntwrk/midnight-js/commit/96146e53107417d5361133d6e342d92eb1b3e45f))
* API documentation update ([#924](https://github.com/midnightntwrk/midnight-js/pull/924)) ([092257c](https://github.com/midnightntwrk/midnight-js/commit/092257cb9bc4210de2171c1ed3aba08543ad6e1c))
* API documentation update ([#934](https://github.com/midnightntwrk/midnight-js/pull/934)) ([7370b65](https://github.com/midnightntwrk/midnight-js/commit/7370b6506dcab281df61233bd104babb825133db))
* API documentation update ([#939](https://github.com/midnightntwrk/midnight-js/pull/939)) ([5251bce](https://github.com/midnightntwrk/midnight-js/commit/5251bce03e0825f42848d735583635356e9b2ebd))
* API documentation update ([#944](https://github.com/midnightntwrk/midnight-js/pull/944)) ([96dbe02](https://github.com/midnightntwrk/midnight-js/commit/96dbe02964fbde734e2002d005f6a8048ce0ff20))
* API documentation update ([#947](https://github.com/midnightntwrk/midnight-js/pull/947)) ([85b9219](https://github.com/midnightntwrk/midnight-js/commit/85b92194ab04cf51b993fa099f9558d99364c4a3))
* API documentation update ([#969](https://github.com/midnightntwrk/midnight-js/pull/969)) ([1596c37](https://github.com/midnightntwrk/midnight-js/commit/1596c37054b80e30246cd6aa8898a34e3afdf150))
* API documentation update ([#972](https://github.com/midnightntwrk/midnight-js/pull/972)) ([431c3f0](https://github.com/midnightntwrk/midnight-js/commit/431c3f02bf4314ff704ab9ce546b663dcdc6f10b))
* API documentation update ([#997](https://github.com/midnightntwrk/midnight-js/pull/997)) ([289236d](https://github.com/midnightntwrk/midnight-js/commit/289236d58b223902f5797c2a065aa34256496f36))
* **midnight-js:** clarify provider semantics and tx privacy ([#918](https://github.com/midnightntwrk/midnight-js/pull/918)) ([cc9312e](https://github.com/midnightntwrk/midnight-js/commit/cc9312e4f7081db13db5193a12e121b96b11c03b)), closes [#870](https://github.com/midnightntwrk/midnight-js/pull/870) [#871](https://github.com/midnightntwrk/midnight-js/pull/871) [#872](https://github.com/midnightntwrk/midnight-js/pull/872)
* update release process and refresh READMEs ([#943](https://github.com/midnightntwrk/midnight-js/pull/943)) ([68e8171](https://github.com/midnightntwrk/midnight-js/commit/68e8171c2f002adb8f0d560aa554c904290e1aa4))


### Code Refactoring

* co-locate contracts governance code under src/governance/ ([#909](https://github.com/midnightntwrk/midnight-js/pull/909)) ([0199119](https://github.com/midnightntwrk/midnight-js/commit/01991194c589257e762c75c0a01b029a164babf8))
* **midnight-js:** split indexer-public-data-provider monolith into 7 layered files ([#960](https://github.com/midnightntwrk/midnight-js/pull/960)) ([8480ae9](https://github.com/midnightntwrk/midnight-js/commit/8480ae9a290538832182f2f53c6edb91d13df558)), closes [#808](https://github.com/midnightntwrk/midnight-js/pull/808) [#843](https://github.com/midnightntwrk/midnight-js/pull/843) [#820](https://github.com/midnightntwrk/midnight-js/pull/820)
* **midnight-js:** wrapper consolidation, assertion hygiene, pollUntilPresent helper ([#962](https://github.com/midnightntwrk/midnight-js/pull/962)) ([67280e8](https://github.com/midnightntwrk/midnight-js/commit/67280e8a066caa522b4da912b893a3573b7aed76)), closes [#808](https://github.com/midnightntwrk/midnight-js/pull/808)
* **testkit-js:** split CI workflow into build/e2e/prerelease for build-once fanout ([#949](https://github.com/midnightntwrk/midnight-js/pull/949)) ([e799a47](https://github.com/midnightntwrk/midnight-js/commit/e799a47d1fbb2243e3b1d641f832377223b88564)), closes [#26992747642](https://github.com/midnightntwrk/midnight-js/pull/26992747642)


### Tests

* **midnight-js:** guard submit-tx debug logging against disk writes ([0759428](https://github.com/midnightntwrk/midnight-js/commit/0759428e417b69cdddb813fe38c3e513dbf26d4a)), closes [#869](https://github.com/midnightntwrk/midnight-js/pull/869)
* **testkit-js-e2e:** add regression test for shielded segment routing ([#876](https://github.com/midnightntwrk/midnight-js/pull/876)) ([#903](https://github.com/midnightntwrk/midnight-js/pull/903)) ([3e93cc5](https://github.com/midnightntwrk/midnight-js/commit/3e93cc588f9b6775f79f4d78ac3c668e6cec0376))


### Build System

* bump compactc 0.32.102 / compact-runtime 0.17.102 and recompile test contracts ([#996](https://github.com/midnightntwrk/midnight-js/pull/996)) ([054cadd](https://github.com/midnightntwrk/midnight-js/commit/054caddbb48ab75cc7627774623c35d9a9e5c920))
* **config:** stop changelog from collecting BREAKING CHANGE footer notes ([#1002](https://github.com/midnightntwrk/midnight-js/pull/1002)) ([aeea706](https://github.com/midnightntwrk/midnight-js/commit/aeea7067fcb29c832ca6321dd48535cf66cd68c6))
* **testkit-js:** build compactc from compact/ submodule (opt-in) ([#978](https://github.com/midnightntwrk/midnight-js/pull/978)) ([685ae7b](https://github.com/midnightntwrk/midnight-js/commit/685ae7bcafdf335765e978e558098280e76327ee)), closes [midnight-node#1662](https://github.com/midnightntwrk/midnight-js/pull/1662) [#979](https://github.com/midnightntwrk/midnight-js/pull/979) [#979](https://github.com/midnightntwrk/midnight-js/pull/979)


### Continuous Integration

* bump pinned GitHub Actions to latest versions ([#927](https://github.com/midnightntwrk/midnight-js/pull/927)) ([150ecd4](https://github.com/midnightntwrk/midnight-js/commit/150ecd42952198d708ae1c9ef0289ff76d109793))
* **testkit-js:** scope concurrency group by docker env ([#935](https://github.com/midnightntwrk/midnight-js/pull/935)) ([af794ca](https://github.com/midnightntwrk/midnight-js/commit/af794ca99673e7640ba2e2892aa1d6249b6a2858))
* **testkit-js:** scope e2e artifacts per env and render summaries ([#948](https://github.com/midnightntwrk/midnight-js/pull/948)) ([96d43a7](https://github.com/midnightntwrk/midnight-js/commit/96d43a7e7bb2b587e8945a71a213bd153e196a12))


### Improvements

* **deps:** bump @midnight-ntwrk/wallet-sdk to 1.1.0 ([#919](https://github.com/midnightntwrk/midnight-js/pull/919)) ([0c59c4b](https://github.com/midnightntwrk/midnight-js/commit/0c59c4b960f9c14063cc9a0eeea1ff4635b56b98))
* **deps:** bump dependencies to address security advisories ([#925](https://github.com/midnightntwrk/midnight-js/pull/925)) ([36d5aee](https://github.com/midnightntwrk/midnight-js/commit/36d5aeeb806af9416e5afc6cc25150c3f91038f6)), closes [#134](https://github.com/midnightntwrk/midnight-js/pull/134)
* **deps:** bump EnricoMi/publish-unit-test-result-action ([#990](https://github.com/midnightntwrk/midnight-js/pull/990)) ([c3d1f7a](https://github.com/midnightntwrk/midnight-js/commit/c3d1f7a8ee038a1fc727df6a4961f520a061f40f))
* **deps:** bump shell-quote ([#973](https://github.com/midnightntwrk/midnight-js/pull/973)) ([1a82eca](https://github.com/midnightntwrk/midnight-js/commit/1a82eca9534127f1ca8972c90527427d9d2d7acf))
* **deps:** bump testcontainers from 11.13.0 to 12.0.0 ([#928](https://github.com/midnightntwrk/midnight-js/pull/928)) ([ec14840](https://github.com/midnightntwrk/midnight-js/commit/ec148403b15bc7ac989c2830fa94e8910e9309a6))
* **deps:** declare missing dependencies and enforce via ESLint ([#913](https://github.com/midnightntwrk/midnight-js/pull/913)) ([75cbc75](https://github.com/midnightntwrk/midnight-js/commit/75cbc7556b3abe504083c8365bc0e42ffee76987))
* **deps:** enforce consistent dependency versions via Yarn Constraints ([#914](https://github.com/midnightntwrk/midnight-js/pull/914)) ([75085d3](https://github.com/midnightntwrk/midnight-js/commit/75085d391d527c78daef1ab60c8a8eaf84b12afc))
* **deps:** migrate wallet-sdk to [@midnightntwrk](https://github.com/midnightntwrk) scope and bump to v1.2.0 ([#986](https://github.com/midnightntwrk/midnight-js/pull/986)) ([3789c0a](https://github.com/midnightntwrk/midnight-js/commit/3789c0ab1968dab3b02b4e8c1b4e83220441c60e))
* **deps:** remove unused root devDependencies, scope build-time deps to packages ([#916](https://github.com/midnightntwrk/midnight-js/pull/916)) ([b24283f](https://github.com/midnightntwrk/midnight-js/commit/b24283f32bd64dd540ef3206c1568c7cf4b1fac3))
* **deps:** swap protocol to ledger-v9 + onchain-runtime-v4 ([@midnightntwrk](https://github.com/midnightntwrk)) ([#970](https://github.com/midnightntwrk/midnight-js/pull/970)) ([f33743c](https://github.com/midnightntwrk/midnight-js/commit/f33743cd92c099a983bf2a0d6632f1170aceeb58))
* **release:** bump version to 4.1.1 ([#946](https://github.com/midnightntwrk/midnight-js/pull/946)) ([d4f3755](https://github.com/midnightntwrk/midnight-js/commit/d4f375505aba3245b34e555167ab6c1c59ec24d1))
* **release:** bump version to 5.0.0-alpha.1 ([#1003](https://github.com/midnightntwrk/midnight-js/pull/1003)) ([7fbd590](https://github.com/midnightntwrk/midnight-js/commit/7fbd59059c15ed3681f1ba65f509a8b66a1f5d23))

## [4.1.0](https://github.com/midnightntwrk/midnight-js/compare/v4.0.4...v4.1.0) (2026-05-21)


### Features

* crypto backend abstraction with noble fallback ([#827](https://github.com/midnightntwrk/midnight-js/pull/827)) ([578d5f2](https://github.com/midnightntwrk/midnight-js/commit/578d5f243f73d1376aefd6182aae84a6dc95fd50))
* introduce Protocol ACL package ([#832](https://github.com/midnightntwrk/midnight-js/pull/832)) ([9f83e8a](https://github.com/midnightntwrk/midnight-js/commit/9f83e8a796252b031d01732736f8973132bcbb67))
* **testkit-js:** add DAppConnectorWalletAdapter and DAppConnectorInitialAPI ([#855](https://github.com/midnightntwrk/midnight-js/pull/855)) ([c7ab8c1](https://github.com/midnightntwrk/midnight-js/commit/c7ab8c106ea79767f0f72759553bedcfa7cfbc87))
* web crypto migration ([#798](https://github.com/midnightntwrk/midnight-js/pull/798)) ([2a31be3](https://github.com/midnightntwrk/midnight-js/commit/2a31be30d90f99af2c33ffcf4684dc31f32a1f23))


### Bug Fixes

* **midnight-js:** block path traversal in ZK providers and VersionManager ([#875](https://github.com/midnightntwrk/midnight-js/pull/875)) ([0a2172b](https://github.com/midnightntwrk/midnight-js/commit/0a2172bfd2f86ea39f1f3b1fb66f0029d10b36dd)), closes [shieldedtech/shielded-security-engineering#270](https://github.com/midnightntwrk/midnight-js/pull/270) [shieldedtech/shielded-security-engineering#270](https://github.com/midnightntwrk/midnight-js/pull/270) [shieldedtech/shielded-security-engineering#270](https://github.com/midnightntwrk/midnight-js/pull/270) [shieldedtech/shielded-security-engineering#270](https://github.com/midnightntwrk/midnight-js/pull/270)
* **midnight-js:** correctly handle falsy values in assertDefined and assertUndefined ([#900](https://github.com/midnightntwrk/midnight-js/pull/900)) ([997d1df](https://github.com/midnightntwrk/midnight-js/commit/997d1dfc89356125a50406e42fee020bd764f040)), closes [#806](https://github.com/midnightntwrk/midnight-js/pull/806)
* **midnight-js:** fail closed in decryptValue on unrecognized data ([#885](https://github.com/midnightntwrk/midnight-js/pull/885)) ([ab71ae9](https://github.com/midnightntwrk/midnight-js/commit/ab71ae9818b63f67b2dd8692d0ee5e025d99a4a3))
* **midnight-js:** reject HTML responses in FetchZkConfigProvider ([#785](https://github.com/midnightntwrk/midnight-js/pull/785)) ([e50d5e4](https://github.com/midnightntwrk/midnight-js/commit/e50d5e44b418ddf5ad1a3569285157164d4c6347)), closes [#782](https://github.com/midnightntwrk/midnight-js/pull/782) [#782](https://github.com/midnightntwrk/midnight-js/pull/782)
* **midnight-js:** remove fs/path imports from contracts submit-tx ([#869](https://github.com/midnightntwrk/midnight-js/pull/869)) ([956c3a2](https://github.com/midnightntwrk/midnight-js/commit/956c3a2e071fb68a3742a28677791a02aedd013f)), closes [#864](https://github.com/midnightntwrk/midnight-js/pull/864)
* **midnight-js:** replace SHA-256 password verifier with PBKDF2 ([#883](https://github.com/midnightntwrk/midnight-js/pull/883)) ([43d0558](https://github.com/midnightntwrk/midnight-js/commit/43d0558a32c7b05cf8b84e14f1d15dd0ae5ec0da)), closes [shielded-security-engineering#272](https://github.com/midnightntwrk/midnight-js/pull/272)
* **midnight-js:** route shielded coins to correct segment ([#876](https://github.com/midnightntwrk/midnight-js/pull/876)) ([#877](https://github.com/midnightntwrk/midnight-js/pull/877)) ([3f00642](https://github.com/midnightntwrk/midnight-js/commit/3f0064245e81de1d60807a1ae4bd12ee5c7b6a2e)), closes [#878](https://github.com/midnightntwrk/midnight-js/pull/878)


### Documentation

* add protocol package README and update main README ([#835](https://github.com/midnightntwrk/midnight-js/pull/835)) ([f5d8ad6](https://github.com/midnightntwrk/midnight-js/commit/f5d8ad69daaf163f96b0cd0575d41ae5275a5768))
* add release notes for v4.0.4 ([#780](https://github.com/midnightntwrk/midnight-js/pull/780)) ([8850e9a](https://github.com/midnightntwrk/midnight-js/commit/8850e9a0d7b58727e4a1817205343132d1d2d307))
* add release notes for v4.1.0 ([#860](https://github.com/midnightntwrk/midnight-js/pull/860)) ([8f94440](https://github.com/midnightntwrk/midnight-js/commit/8f94440484104c386e6d6325a06159179c3ac131))
* API documentation update ([#784](https://github.com/midnightntwrk/midnight-js/pull/784)) ([69554de](https://github.com/midnightntwrk/midnight-js/commit/69554de960c48d742f32e44b4f6202681fea87f0))
* API documentation update ([#826](https://github.com/midnightntwrk/midnight-js/pull/826)) ([80137f1](https://github.com/midnightntwrk/midnight-js/commit/80137f1f276685fb481af339c1f5e64750c9fc57))
* API documentation update ([#833](https://github.com/midnightntwrk/midnight-js/pull/833)) ([5a12631](https://github.com/midnightntwrk/midnight-js/commit/5a12631844ab24037f66fc54676b63dd67dab821))
* API documentation update ([#841](https://github.com/midnightntwrk/midnight-js/pull/841)) ([8326cdd](https://github.com/midnightntwrk/midnight-js/commit/8326cdd1e551f5e91e6a42cf22b579aa0da03b2d))
* API documentation update ([#846](https://github.com/midnightntwrk/midnight-js/pull/846)) ([461681d](https://github.com/midnightntwrk/midnight-js/commit/461681d5640b9e2b30c665d553538f7182c76b63))
* API documentation update ([#866](https://github.com/midnightntwrk/midnight-js/pull/866)) ([18320d1](https://github.com/midnightntwrk/midnight-js/commit/18320d1458729ee4ce5008bb037e69ccf22b8356))
* API documentation update ([#884](https://github.com/midnightntwrk/midnight-js/pull/884)) ([f156a26](https://github.com/midnightntwrk/midnight-js/commit/f156a2602b742f3fb774fd70ee08d7dc37a81aa8))
* **midnight-js:** rewrite CLAUDE.md as contributor guide ([#747](https://github.com/midnightntwrk/midnight-js/pull/747)) ([87cc154](https://github.com/midnightntwrk/midnight-js/commit/87cc1546cfe47cf882089b8fb968ce78e71151d5))
* refresh v4.1.0 release notes for post-[#860](https://github.com/midnightntwrk/midnight-js/pull/860) changes ([#904](https://github.com/midnightntwrk/midnight-js/pull/904)) ([e97b292](https://github.com/midnightntwrk/midnight-js/commit/e97b292364ecf1a9870aa790ac79bf19349517c2)), closes [#883](https://github.com/midnightntwrk/midnight-js/pull/883) [#875](https://github.com/midnightntwrk/midnight-js/pull/875) [#900](https://github.com/midnightntwrk/midnight-js/pull/900) [#869](https://github.com/midnightntwrk/midnight-js/pull/869) [#902](https://github.com/midnightntwrk/midnight-js/pull/902) [#862](https://github.com/midnightntwrk/midnight-js/pull/862) [#879](https://github.com/midnightntwrk/midnight-js/pull/879) [#878](https://github.com/midnightntwrk/midnight-js/pull/878) [#854](https://github.com/midnightntwrk/midnight-js/pull/854)


### Styles

* **contracts:** apply formatter pass to zswap-utils tests ([adb687e](https://github.com/midnightntwrk/midnight-js/commit/adb687efb4ecc2b9eb3229c6fa9bc9ddbb064724))


### Tests

* cover encryption key resolver and dapp-connector error paths ([79002c1](https://github.com/midnightntwrk/midnight-js/commit/79002c152c97d3e02c43c1a63659b301ff3daa05)), closes [#745](https://github.com/midnightntwrk/midnight-js/pull/745) [#732](https://github.com/midnightntwrk/midnight-js/pull/732)
* **midnight-js:** add shell-injection regression suite for compact CLI ([0efb6ff](https://github.com/midnightntwrk/midnight-js/commit/0efb6ff97b6a3b8b744d9cb840146a9f7c2cd2de)), closes [#711](https://github.com/midnightntwrk/midnight-js/pull/711)
* **midnight-js:** address code review feedback on [#848](https://github.com/midnightntwrk/midnight-js/pull/848) ([1334806](https://github.com/midnightntwrk/midnight-js/commit/13348062125154a8e08a41dae126e764b68544da))
* **midnight-js:** address code review feedback on [#848](https://github.com/midnightntwrk/midnight-js/pull/848) ([2e3387e](https://github.com/midnightntwrk/midnight-js/commit/2e3387e2f1eaf8260871b2b725ecbc790241b2ef))
* **midnight-js:** guard invalidate-and-re-derive in level-private-state ([0f7e8e0](https://github.com/midnightntwrk/midnight-js/commit/0f7e8e0e42a71b900545a44054839870643299b7)), closes [#538](https://github.com/midnightntwrk/midnight-js/pull/538) [#798](https://github.com/midnightntwrk/midnight-js/pull/798)
* **midnight-js:** improve indexer-public-data-provider coverage ([#801](https://github.com/midnightntwrk/midnight-js/pull/801)) ([9bbf069](https://github.com/midnightntwrk/midnight-js/commit/9bbf06998e06966934c4618465df2a375775d755))
* **midnight-js:** prune low-value tests from resolver and dapp-connector suites ([620f251](https://github.com/midnightntwrk/midnight-js/commit/620f251eea2a72ecc37e5d8a403fad16f5b779bf)), closes [#745](https://github.com/midnightntwrk/midnight-js/pull/745)
* **protocol:** add ACL structural and ESLint rule tests ([150b5a6](https://github.com/midnightntwrk/midnight-js/commit/150b5a661f643a420d7192e8050a2653c9df4d0d)), closes [#832](https://github.com/midnightntwrk/midnight-js/pull/832)


### Continuous Integration

* stabilize CD tests and limit e2e parallel runners ([#906](https://github.com/midnightntwrk/midnight-js/pull/906)) ([28db5a4](https://github.com/midnightntwrk/midnight-js/commit/28db5a42a2c211a68aed3b776db5617adff3acb6))


### Improvements

* bump @apollo/client from 3.14.0 to 4.1.6 ([#666](https://github.com/midnightntwrk/midnight-js/pull/666)) ([a21b461](https://github.com/midnightntwrk/midnight-js/commit/a21b46151660cb470d2d92133be4063265cbf173))
* **deps-dev:** bump rollup from 4.59.0 to 4.60.1 ([#797](https://github.com/midnightntwrk/midnight-js/pull/797)) ([5ee9d70](https://github.com/midnightntwrk/midnight-js/commit/5ee9d7053671ac183cc068bea6096374abedf726))
* **deps-dev:** bump turbo from 2.8.21 to 2.9.5 ([#845](https://github.com/midnightntwrk/midnight-js/pull/845)) ([dcfa423](https://github.com/midnightntwrk/midnight-js/commit/dcfa42377645177dd0cae05eb08c4deafd3a32aa))
* **deps:** bump ctrf-io/github-test-reporter from 1.0.27 to 1.0.28 ([#793](https://github.com/midnightntwrk/midnight-js/pull/793)) ([66e3afa](https://github.com/midnightntwrk/midnight-js/commit/66e3afac40e27b9c5d509966fe9c9c4e97cc9902))
* **deps:** bump docker/login-action from 4.0.0 to 4.1.0 ([#836](https://github.com/midnightntwrk/midnight-js/pull/836)) ([8aa1d91](https://github.com/midnightntwrk/midnight-js/commit/8aa1d91edbb607e5acf946c5e4ed53b4dcd3b65d))
* **deps:** bump graphql from 16.13.1 to 16.13.2 ([#778](https://github.com/midnightntwrk/midnight-js/pull/778)) ([a63d393](https://github.com/midnightntwrk/midnight-js/commit/a63d3931276c57137dbcf3f1aeb672cab63cea64))
* **deps:** bump graphql-ws from 6.0.7 to 6.0.8 ([#796](https://github.com/midnightntwrk/midnight-js/pull/796)) ([e600664](https://github.com/midnightntwrk/midnight-js/commit/e60066423052ab2adf853467ce2494dc92713b37))
* **deps:** bump mikepenz/action-junit-report from 6.3.1 to 6.4.0 ([#792](https://github.com/midnightntwrk/midnight-js/pull/792)) ([e061e28](https://github.com/midnightntwrk/midnight-js/commit/e061e288706f523f5c113d955e873f1d24371e83))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([#791](https://github.com/midnightntwrk/midnight-js/pull/791)) ([8933ae3](https://github.com/midnightntwrk/midnight-js/commit/8933ae392da23e45ade158bd68ee02d3627e4025))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([#854](https://github.com/midnightntwrk/midnight-js/pull/854)) ([4204db0](https://github.com/midnightntwrk/midnight-js/commit/4204db0245ad59cbbaee259db6b4334a5078c86c))
* **deps:** bump typescript, rollup, ws, and @vitest/runner ([#776](https://github.com/midnightntwrk/midnight-js/pull/776)) ([7fd3542](https://github.com/midnightntwrk/midnight-js/commit/7fd354266c40546924ebe0c2f35ddf648cb33801)), closes [#768](https://github.com/midnightntwrk/midnight-js/pull/768) [#769](https://github.com/midnightntwrk/midnight-js/pull/769) [#770](https://github.com/midnightntwrk/midnight-js/pull/770) [#771](https://github.com/midnightntwrk/midnight-js/pull/771)
* **deps:** upgrade wallet-sdk-facade to wallet-sdk barrel v1.0.0 ([#862](https://github.com/midnightntwrk/midnight-js/pull/862)) ([5900b28](https://github.com/midnightntwrk/midnight-js/commit/5900b285041a427e2776e181811168e4bf4a6bea))
* **midnight-js:** add protocol as dependency of barrel package ([#842](https://github.com/midnightntwrk/midnight-js/pull/842)) ([05c6b0f](https://github.com/midnightntwrk/midnight-js/commit/05c6b0f0e3aa015c8a37574587cb2b5adea11417))
* **midnight-js:** remove unused deps ([#800](https://github.com/midnightntwrk/midnight-js/pull/800)) ([886a86e](https://github.com/midnightntwrk/midnight-js/commit/886a86e37d05f24d86adee5aa9735c600ff602b5))
* **midnight-js:** update yarn.lock for protocol and compact devDeps ([04774fd](https://github.com/midnightntwrk/midnight-js/commit/04774fde5b341aa7451ed7c1e7d5b0fc3439dd41))
* **release:** bump version to 4.1.0 ([#907](https://github.com/midnightntwrk/midnight-js/pull/907)) ([e96cc2f](https://github.com/midnightntwrk/midnight-js/commit/e96cc2f9aedd62837194bd0922f5e334c20c6567))
* update compactc to 0.31.0 and dependencies ([#902](https://github.com/midnightntwrk/midnight-js/pull/902)) ([42324f2](https://github.com/midnightntwrk/midnight-js/commit/42324f215a55a230cdf597db4a33d96940e50bb1))
* update indexer and node images to match current preview ([#879](https://github.com/midnightntwrk/midnight-js/pull/879)) ([c9e96d1](https://github.com/midnightntwrk/midnight-js/commit/c9e96d1de41fe8f5ea3657006777471c96151a61))
* update yarn to 4.14.1 ([#878](https://github.com/midnightntwrk/midnight-js/pull/878)) ([60e2e56](https://github.com/midnightntwrk/midnight-js/commit/60e2e565714e27193850d9331f87ea6c64f7eb2f))

## [4.0.4](https://github.com/midnightntwrk/midnight-js/compare/v4.0.3...v4.0.4) (2026-04-01)


### Bug Fixes

* add option to use a github token for compact fetch ([#760](https://github.com/midnightntwrk/midnight-js/pull/760)) ([fa7430d](https://github.com/midnightntwrk/midnight-js/commit/fa7430d7fb30dcf401f1bdd77e7c4b2552abc9df))
* **midnight-js:** use per-recipient encryption keys in zswap output creation ([#745](https://github.com/midnightntwrk/midnight-js/pull/745)) ([f760edf](https://github.com/midnightntwrk/midnight-js/commit/f760edf8aa200b10154f4521cfc11620c0043ee5)), closes [midnightntwrk/midnight-js#742](https://github.com/midnightntwrk/midnight-js/pull/742) [#773](https://github.com/midnightntwrk/midnight-js/pull/773)
* Support Browser builds when `crypto.timingSafeEqual` is missing ([#737](https://github.com/midnightntwrk/midnight-js/pull/737)) ([c70b8b4](https://github.com/midnightntwrk/midnight-js/commit/c70b8b4736744b7b54c2f09e2b292821d674f3c8))


### Documentation

* add badges to README ([#743](https://github.com/midnightntwrk/midnight-js/pull/743)) ([fe8723f](https://github.com/midnightntwrk/midnight-js/commit/fe8723f6537db7cae22ed776a15d2ee8ad753692))
* add documentation for dapp-connector-proof-provider and midnight-js packages ([#751](https://github.com/midnightntwrk/midnight-js/pull/751)) ([01d4e05](https://github.com/midnightntwrk/midnight-js/commit/01d4e05794ed09a1a9e334156c9fdad9e136a6eb))
* add README and TSDoc for dapp-connector-proof-provider and midnight-js ([#741](https://github.com/midnightntwrk/midnight-js/pull/741)) ([92c0783](https://github.com/midnightntwrk/midnight-js/commit/92c0783f2ee40f5e7e4f2ac9af1b7878074ec1d8))
* API documentation update ([#750](https://github.com/midnightntwrk/midnight-js/pull/750)) ([97d4df7](https://github.com/midnightntwrk/midnight-js/commit/97d4df788ba19bcd8a363e9a7e77a53d8a7e6483))
* API documentation update ([#764](https://github.com/midnightntwrk/midnight-js/pull/764)) ([bda224e](https://github.com/midnightntwrk/midnight-js/commit/bda224e6d5c34ef50d705af66f18d7397aafd348))
* API documentation update ([#777](https://github.com/midnightntwrk/midnight-js/pull/777)) ([3bb01cb](https://github.com/midnightntwrk/midnight-js/commit/3bb01cb9c3587d98fd20c7e0bcda1b7a5fe4d85e))


### Tests

* enable custom color token e2e tests ([#765](https://github.com/midnightntwrk/midnight-js/pull/765)) ([41e7e05](https://github.com/midnightntwrk/midnight-js/commit/41e7e05748eb68533afe06867389280082489399))
* **testkit-js:** add e2e tests for std library token functions ([#772](https://github.com/midnightntwrk/midnight-js/pull/772)) ([04b9f7b](https://github.com/midnightntwrk/midnight-js/commit/04b9f7be0415e4e1461eac146c200acd6a23c802))
* **testkit-js:** add unshielded mint and send variant e2e tests ([#766](https://github.com/midnightntwrk/midnight-js/pull/766)) ([331c06f](https://github.com/midnightntwrk/midnight-js/commit/331c06f5beb7d169d4f4885f144a6ad2f311e4ef))


### Improvements

* **deps-dev:** aggregate dependency updates ([#759](https://github.com/midnightntwrk/midnight-js/pull/759)) ([47f6d2e](https://github.com/midnightntwrk/midnight-js/commit/47f6d2e8cd661ef1f1f2092ece5ac8321c2c7f86))
* **deps:** bump the npm_and_yarn group across 1 directory with 3 updates ([#746](https://github.com/midnightntwrk/midnight-js/pull/746)) ([41764ba](https://github.com/midnightntwrk/midnight-js/commit/41764baba425408f8d83f680ab40b1ef6b4a4fdf))
* **release:** bump version to 4.0.4 ([#779](https://github.com/midnightntwrk/midnight-js/pull/779)) ([03374bb](https://github.com/midnightntwrk/midnight-js/commit/03374bb929426e86c900bbf46f955c733440c83f))

## [4.0.3](https://github.com/midnightntwrk/midnight-js/compare/v4.0.2...v4.0.3) (2026-03-28)


### Features

* add barrel package @midnight-ntwrk/midnight-js ([#735](https://github.com/midnightntwrk/midnight-js/pull/735)) ([0bd075c](https://github.com/midnightntwrk/midnight-js/commit/0bd075c5b4f27bef598a0d419a56096749189d44))
* add dapp-connector-proof-provider package ([#732](https://github.com/midnightntwrk/midnight-js/pull/732)) ([5add6b0](https://github.com/midnightntwrk/midnight-js/commit/5add6b0cafdb75ed91417f3614bd38c25bfe9fed)), closes [#635](https://github.com/midnightntwrk/midnight-js/pull/635)


### Bug Fixes

* **testkit-js:** fix 15 bugs covering missing assertions, swallowed errors, and stale env vars ([#721](https://github.com/midnightntwrk/midnight-js/pull/721)) ([3a5bd21](https://github.com/midnightntwrk/midnight-js/commit/3a5bd2164ddf341774115764315f36b632797f1a))


### Documentation

* add release notes for v4.0.2 ([#717](https://github.com/midnightntwrk/midnight-js/pull/717)) ([84671fa](https://github.com/midnightntwrk/midnight-js/commit/84671fa337828ece709a2bd7e92229ff8e7fb89d))
* API documentation update ([#716](https://github.com/midnightntwrk/midnight-js/pull/716)) ([69a21c1](https://github.com/midnightntwrk/midnight-js/commit/69a21c1f8fb1e52b8e10667ab72f30a581950f15))
* API documentation update ([#728](https://github.com/midnightntwrk/midnight-js/pull/728)) ([bfb30e5](https://github.com/midnightntwrk/midnight-js/commit/bfb30e5adad3098a2ca316063d00d03568324f36))
* API documentation update ([#739](https://github.com/midnightntwrk/midnight-js/pull/739)) ([45e0503](https://github.com/midnightntwrk/midnight-js/commit/45e0503e6d71efbe792175646924aa41ba550d87))


### Tests

* issue 720 ([#727](https://github.com/midnightntwrk/midnight-js/pull/727)) ([64eb9c7](https://github.com/midnightntwrk/midnight-js/commit/64eb9c75fcc877e965594f615e671c3004a14cac))


### Improvements

* **deps:** consolidate dependency updates ([#740](https://github.com/midnightntwrk/midnight-js/pull/740)) ([6ac46da](https://github.com/midnightntwrk/midnight-js/commit/6ac46dadaa2dcdd7ad143b55d9858461b61a623c))
* **release:** bump version to 4.0.3 ([#744](https://github.com/midnightntwrk/midnight-js/pull/744)) ([7f25a8a](https://github.com/midnightntwrk/midnight-js/commit/7f25a8a40075d2bf51e09774c3fbcf5c7652718a))

## [4.0.2](https://github.com/midnightntwrk/midnight-js/compare/v4.0.1...v4.0.2) (2026-03-24)


### Bug Fixes

* **contracts:** replace error as-any casts with type guard ([#712](https://github.com/midnightntwrk/midnight-js/pull/712)) ([2a895cf](https://github.com/midnightntwrk/midnight-js/commit/2a895cf052890f59924cdd52007de640a3e7e603))
* fallible offer error reporting bugs ([#705](https://github.com/midnightntwrk/midnight-js/pull/705)) ([f2685dd](https://github.com/midnightntwrk/midnight-js/commit/f2685dda9e26b38aa2d08babcbe07a6d84a7e91b))
* fallible offer error reporting bugs ([#705](https://github.com/midnightntwrk/midnight-js/pull/705)) ([878c586](https://github.com/midnightntwrk/midnight-js/commit/878c586122b52288a66703101f152de75557ad15))
* pin upload-sarif-github-action to latest SHA ([71c9837](https://github.com/midnightntwrk/midnight-js/commit/71c9837ad3d614611ef6c99f38192ace90a8e0e8))
* replace shell string interpolation with safe argument arrays in compact CLI tools ([#711](https://github.com/midnightntwrk/midnight-js/pull/711)) ([c50ffec](https://github.com/midnightntwrk/midnight-js/commit/c50ffecd9b2b5ac601ea551d5db653f483d03fab))
* revert createUnprovenLedgerCallTx to ContractCallPrototype approach ([#695](https://github.com/midnightntwrk/midnight-js/pull/695)) ([675bef7](https://github.com/midnightntwrk/midnight-js/commit/675bef7c9475d0d192ca171001545c7e701e5e5f)), closes [#648](https://github.com/midnightntwrk/midnight-js/pull/648) [#686](https://github.com/midnightntwrk/midnight-js/pull/686) [#686](https://github.com/midnightntwrk/midnight-js/pull/686) [#686](https://github.com/midnightntwrk/midnight-js/pull/686)


### Documentation

* API documentation update ([#703](https://github.com/midnightntwrk/midnight-js/pull/703)) ([2b3a2bf](https://github.com/midnightntwrk/midnight-js/commit/2b3a2bf029092870684c47f3e223e852ae34ffee))
* release note for 4.0.1 ([#698](https://github.com/midnightntwrk/midnight-js/pull/698)) ([866d225](https://github.com/midnightntwrk/midnight-js/commit/866d225e1df7c47e3215448b5a14c6503039b350))
* update release and API docs from v4.0.0 to v4.0.1 ([#696](https://github.com/midnightntwrk/midnight-js/pull/696)) ([4f81cd1](https://github.com/midnightntwrk/midnight-js/commit/4f81cd1b876b09d2a1700186b52b3c373b13c24c))


### Improvements

* add basic fallible tests and bugfix for fallible errors ([#704](https://github.com/midnightntwrk/midnight-js/pull/704)) ([44d956b](https://github.com/midnightntwrk/midnight-js/commit/44d956b46e2ea1cbbdd4c02e6788c23716a1633c))
* add headers handling to http-client-proof-provider and fix ci ([#685](https://github.com/midnightntwrk/midnight-js/pull/685)) ([e97d99c](https://github.com/midnightntwrk/midnight-js/commit/e97d99cb9877ea5a330efea0d1a8c3ea8b2a6fe0))
* **release:** bump version to 4.0.2 ([#715](https://github.com/midnightntwrk/midnight-js/pull/715)) ([00225c3](https://github.com/midnightntwrk/midnight-js/commit/00225c3a96e7c237f3261fa1885fb22efb450389))
* remove dead code from zswap-utils offer construction ([#710](https://github.com/midnightntwrk/midnight-js/pull/710)) ([b9f1912](https://github.com/midnightntwrk/midnight-js/commit/b9f19129dc19498c1a4247030e9ec3b6624aff42))

## [4.0.1](https://github.com/midnightntwrk/midnight-js/compare/v4.0.0-rc.2...v4.0.1) (2026-03-21)


### Bug Fixes

* use lossless binary path for QueryContext in createUnprovenLedgerCallTx ([#689](https://github.com/midnightntwrk/midnight-js/pull/689)) ([d559365](https://github.com/midnightntwrk/midnight-js/commit/d55936569034617a0978be41e5e591a14754b5df))


### Documentation

* API documentation update ([#671](https://github.com/midnightntwrk/midnight-js/pull/671)) ([34194a3](https://github.com/midnightntwrk/midnight-js/commit/34194a365eae10ae91798bc0b443784f560eaf58))
* API documentation update ([#676](https://github.com/midnightntwrk/midnight-js/pull/676)) ([677aeda](https://github.com/midnightntwrk/midnight-js/commit/677aeda02c64e027ef001e5bbcc45b5d40c83f51))
* API documentation update ([#687](https://github.com/midnightntwrk/midnight-js/pull/687)) ([56c7cf1](https://github.com/midnightntwrk/midnight-js/commit/56c7cf179dfca2995306224c51c689b66f65d52c))
* release notes 4.0.0 update ([#669](https://github.com/midnightntwrk/midnight-js/pull/669)) ([2215864](https://github.com/midnightntwrk/midnight-js/commit/22158642c29b137f18b44c3b4e81ba2c1cfdb0b1))


### Improvements

* **deps-dev:** bump jsdom from 28.1.0 to 29.0.0 ([#674](https://github.com/midnightntwrk/midnight-js/pull/674)) ([7816a5f](https://github.com/midnightntwrk/midnight-js/commit/7816a5f7151d21a523476d14180137dfae959e39))
* **deps-dev:** bump turbo from 2.8.18 to 2.8.19 ([#675](https://github.com/midnightntwrk/midnight-js/pull/675)) ([536e518](https://github.com/midnightntwrk/midnight-js/commit/536e51842d5f2771d7f8d50910b0a45356708d43))
* **deps-dev:** bump typedoc-plugin-markdown from 4.10.0 to 4.11.0 ([#673](https://github.com/midnightntwrk/midnight-js/pull/673)) ([3a0f301](https://github.com/midnightntwrk/midnight-js/commit/3a0f301822fe7a897f72c6dacf2b458138c24252))
* **deps:** bump @midnight-ntwrk/wallet-sdk-facade ([#680](https://github.com/midnightntwrk/midnight-js/pull/680)) ([2c165ec](https://github.com/midnightntwrk/midnight-js/commit/2c165ec83c4c8455e80dc9565dc604f3cd9eedd4))
* **release:** bump version to 4.0.0-rc.2 ([#677](https://github.com/midnightntwrk/midnight-js/pull/677)) ([06f31a2](https://github.com/midnightntwrk/midnight-js/commit/06f31a292557fb79d63d0653fe5c14e5ecfafb56))
* **release:** bump version to v4.0.1 ([#692](https://github.com/midnightntwrk/midnight-js/pull/692)) ([02d11c7](https://github.com/midnightntwrk/midnight-js/commit/02d11c7f92af81debc1431a91301d25131b781a8))
* set location in compactc to official releases channel ([#672](https://github.com/midnightntwrk/midnight-js/pull/672)) ([f1c4092](https://github.com/midnightntwrk/midnight-js/commit/f1c4092e50a859ef0cab2a547d9eebe4340632a7))
* update to stable component versions ([#684](https://github.com/midnightntwrk/midnight-js/pull/684)) ([42a23af](https://github.com/midnightntwrk/midnight-js/commit/42a23af0f7d8abc10976d7eaa82025410704d2c9))

## [4.0.0-rc.2](https://github.com/midnightntwrk/midnight-js/compare/v4.0.0-rc.1...v4.0.0-rc.2) (2026-03-19)


### Documentation

* API documentation update ([#655](https://github.com/midnightntwrk/midnight-js/pull/655)) ([06d58db](https://github.com/midnightntwrk/midnight-js/commit/06d58dba0659df287d1bb8aeba9d0a48e2323a50))
* API documentation update ([#664](https://github.com/midnightntwrk/midnight-js/pull/664)) ([13f5823](https://github.com/midnightntwrk/midnight-js/commit/13f58230be2d212413e32a24026e5d48f1e7e356))


### Tests

* add night wallet transfer tests ([#646](https://github.com/midnightntwrk/midnight-js/pull/646)) ([6d10ea3](https://github.com/midnightntwrk/midnight-js/commit/6d10ea35d40174e54b5d15a7799a49bbc483f023))


### Improvements

* proof provider adapter ([#636](https://github.com/midnightntwrk/midnight-js/pull/636)) ([a45a182](https://github.com/midnightntwrk/midnight-js/commit/a45a18268e229eae4d64fe4ec2182127d448f2da))
* update @midnight-ntwrk/compact-js to 2.5.0-rc.3 and platform-js to 2.2.4 ([#663](https://github.com/midnightntwrk/midnight-js/pull/663)) ([f5fb7b1](https://github.com/midnightntwrk/midnight-js/commit/f5fb7b1c0dd1e4e22d30d8b4aa3664ef6822a3a6))
* update dev dependencies ([#665](https://github.com/midnightntwrk/midnight-js/pull/665)) ([cc895a3](https://github.com/midnightntwrk/midnight-js/commit/cc895a38ba5a5793ce345e658c5ce4de488fa14f))
* update docker images to latest versions ([#654](https://github.com/midnightntwrk/midnight-js/pull/654)) ([35f15ed](https://github.com/midnightntwrk/midnight-js/commit/35f15ed8b69628d9aec5ed7744b843593bee6641))

## [4.0.0-rc.1](https://github.com/midnightntwrk/midnight-js/compare/v3.2.0...v4.0.0-rc.1) (2026-03-18)


### Features

* [PM-22110] Flow `LedgerParameters` like public state data ([#633](https://github.com/midnightntwrk/midnight-js/pull/633)) ([f3fc5cc](https://github.com/midnightntwrk/midnight-js/commit/f3fc5cc9b27f0b6062e75d7b53839e4a486f2aee))
* update to ledger v8 ([#607](https://github.com/midnightntwrk/midnight-js/pull/607)) ([3ce66bd](https://github.com/midnightntwrk/midnight-js/commit/3ce66bda14d6f2251cb688850247403b89c2adf1))


### Bug Fixes

* Attach unshielded offers for user-addressed claim unshielded spends ([#558](https://github.com/midnightntwrk/midnight-js/pull/558)) ([e5e52f1](https://github.com/midnightntwrk/midnight-js/commit/e5e52f14f93122bb4974432a4315ed670b04c023))


### Documentation

* API documentation update ([#641](https://github.com/midnightntwrk/midnight-js/pull/641)) ([59dd1b2](https://github.com/midnightntwrk/midnight-js/commit/59dd1b209be78714d755bed11d2101f9d06edc42))
* release notes 4.0.0 ([#637](https://github.com/midnightntwrk/midnight-js/pull/637)) ([8558abf](https://github.com/midnightntwrk/midnight-js/commit/8558abff4f3a38cc97c7a7ef9885c715fc3e4484))
* update release notes for 3.2.0 ([#623](https://github.com/midnightntwrk/midnight-js/pull/623)) ([001425f](https://github.com/midnightntwrk/midnight-js/commit/001425f792dedca090f92dc98122e8945688f6e2))


### Continuous Integration

* update ci ([#632](https://github.com/midnightntwrk/midnight-js/pull/632)) ([fc7cd5d](https://github.com/midnightntwrk/midnight-js/commit/fc7cd5d222b4c69eb600ebf8474afcbe9b519c31))
* update permissions for api docs workflow ([#639](https://github.com/midnightntwrk/midnight-js/pull/639)) ([dd4a792](https://github.com/midnightntwrk/midnight-js/commit/dd4a792b70782f0937212ff565b1dad31a2fdaed))


### Improvements

* immutable and diff security patch ([#649](https://github.com/midnightntwrk/midnight-js/pull/649)) ([7cd594d](https://github.com/midnightntwrk/midnight-js/commit/7cd594d4f6087698977c8b6b2a098bdd847a6b7b))
* **release:** bump version to 4.0.0-rc.1 ([#653](https://github.com/midnightntwrk/midnight-js/pull/653)) ([333dab7](https://github.com/midnightntwrk/midnight-js/commit/333dab754fe2a5165d2148806bdacf151d057f30))
* security dependencies update ([#640](https://github.com/midnightntwrk/midnight-js/pull/640)) ([2897175](https://github.com/midnightntwrk/midnight-js/commit/2897175f40f4af1c960cc3c5ea35d4ebfc101522))
* update @midnight-ntwrk/ledger-v8 to 8.0.2 ([#631](https://github.com/midnightntwrk/midnight-js/pull/631)) ([e4706d2](https://github.com/midnightntwrk/midnight-js/commit/e4706d225b4f01266fee7590f58bc060e1571e88))
* update compactc to 0.30.0 and @midnight-ntwrk/wallet-sdk-facade to 3.0.0-rc.0 and @midnight-ntwrk/compact-runtime to 0.15.0 ([#651](https://github.com/midnightntwrk/midnight-js/pull/651)) ([4560fcb](https://github.com/midnightntwrk/midnight-js/commit/4560fcb0a8e1c5b05e4e5d2d25a7add1e9d70fff))
* update defaults for midnight-js-compact ([#630](https://github.com/midnightntwrk/midnight-js/pull/630)) ([cd43e8c](https://github.com/midnightntwrk/midnight-js/commit/cd43e8c405b6c34549792c0442c1a4577f6b26cf))
* update wallet-sdk, compact-runtime and compactc to latest versions ([#638](https://github.com/midnightntwrk/midnight-js/pull/638)) ([0853673](https://github.com/midnightntwrk/midnight-js/commit/0853673dc7ae761867a7f82f33cb90121fce76f2))
* use add calls to build transaction ([#648](https://github.com/midnightntwrk/midnight-js/pull/648)) ([83c9fe6](https://github.com/midnightntwrk/midnight-js/commit/83c9fe6fc262070790710590e875384b229547bb))

## [3.2.0](https://github.com/midnightntwrk/midnight-js/compare/v3.2.0-rc.3...v3.2.0) (2026-03-12)


### Documentation

* add containers configuration section to testkit-js README ([#613](https://github.com/midnightntwrk/midnight-js/pull/613)) ([435413f](https://github.com/midnightntwrk/midnight-js/commit/435413fb66663523d71c5bb3e29f8e984bd0bee3))


### Improvements

* **ci:** bump gha plugins ([#616](https://github.com/midnightntwrk/midnight-js/pull/616)) ([ddbf7ee](https://github.com/midnightntwrk/midnight-js/commit/ddbf7eed6b9b76c133577f8b23dc003d2cd6667c))
* compact fetcher - location change ([#624](https://github.com/midnightntwrk/midnight-js/pull/624)) ([cb50a2f](https://github.com/midnightntwrk/midnight-js/commit/cb50a2fd6aa3bb94e8ec25eee5d90f048d129339))
* **deps-dev:** bump @fast-check/vitest from 0.2.4 to 0.3.0 ([#619](https://github.com/midnightntwrk/midnight-js/pull/619)) ([d0ac78f](https://github.com/midnightntwrk/midnight-js/commit/d0ac78ff921d088e412f94c7f0cb9a7a5c13a5bf))
* **deps-dev:** bump tstyche from 4.3.0 to 6.2.0 ([#593](https://github.com/midnightntwrk/midnight-js/pull/593)) ([f591ac7](https://github.com/midnightntwrk/midnight-js/commit/f591ac70dcad1e6b5327237b3464965b8d186f22))
* **deps:** bump dev dependencies ([#615](https://github.com/midnightntwrk/midnight-js/pull/615)) ([aa14a2b](https://github.com/midnightntwrk/midnight-js/commit/aa14a2b0914e41de235cb9283b6038b21ec118de))
* **deps:** bump fast-xml-parser ([#617](https://github.com/midnightntwrk/midnight-js/pull/617)) ([f358802](https://github.com/midnightntwrk/midnight-js/commit/f358802a308a98022178cb0175a0c6941b702abb))
* **release:** bump version to 3.2.0 ([#626](https://github.com/midnightntwrk/midnight-js/pull/626)) ([860c4f1](https://github.com/midnightntwrk/midnight-js/commit/860c4f1332881f72a722d3b11292d91d7d0373f6))
* update default location for downloading the compactc ([#625](https://github.com/midnightntwrk/midnight-js/pull/625)) ([3430acf](https://github.com/midnightntwrk/midnight-js/commit/3430acf44557def7b62f23be7341e3b892f96141))
* update wallet-sdk to 2.0.0 ([#614](https://github.com/midnightntwrk/midnight-js/pull/614)) ([47b7855](https://github.com/midnightntwrk/midnight-js/commit/47b78556be2cfb9ea792226bfbb141081692052a))

## [3.2.0-rc.3](https://github.com/midnightntwrk/midnight-js/compare/v3.2.0-rc.2...v3.2.0-rc.3) (2026-03-10)


### Bug Fixes

* ensure TransactionContext is not included in circuit call arguments ([d90d462](https://github.com/midnightntwrk/midnight-js/commit/d90d4621d48287292d3c875ec177e72637cbc111))
* fail fast on unset network id ([#604](https://github.com/midnightntwrk/midnight-js/pull/604)) ([dffc2da](https://github.com/midnightntwrk/midnight-js/commit/dffc2da00ea6f38240eae35b6e28356ed303fd42))
* **http-client-proof-provider:** copy WASM payload bytes before sending to proof server ([#596](https://github.com/midnightntwrk/midnight-js/pull/596)) ([0922ce0](https://github.com/midnightntwrk/midnight-js/commit/0922ce0802de96ffe6d518ffb50c5a049aeab45c))


### Documentation

* add development docs ([#590](https://github.com/midnightntwrk/midnight-js/pull/590)) ([0767aaf](https://github.com/midnightntwrk/midnight-js/commit/0767aaf0a0f77404d60347097e9f2c4ec675f4f2))
* update release notes for v3.2.0 ([#600](https://github.com/midnightntwrk/midnight-js/pull/600)) ([fec7cf1](https://github.com/midnightntwrk/midnight-js/commit/fec7cf1fca243409845640d800f212752e25b44c)), closes [#596](https://github.com/midnightntwrk/midnight-js/pull/596) [#592](https://github.com/midnightntwrk/midnight-js/pull/592) [#579](https://github.com/midnightntwrk/midnight-js/pull/579)


### Improvements

* **deps-dev:** bump jsdom from 27.4.0 to 28.1.0 ([#594](https://github.com/midnightntwrk/midnight-js/pull/594)) ([018b64f](https://github.com/midnightntwrk/midnight-js/commit/018b64f424a90762dbd25003d2d33b4f8011172f))
* **deps:** bump @midnight-ntwrk/compact-js from 2.4.0 to 2.4.3 ([#595](https://github.com/midnightntwrk/midnight-js/pull/595)) ([87d0c77](https://github.com/midnightntwrk/midnight-js/commit/87d0c77c8d949910be227b6d9dadce4ee74b3fdb))
* **deps:** bump mikepenz/action-junit-report from 6.2.0 to 6.3.1 ([#583](https://github.com/midnightntwrk/midnight-js/pull/583)) ([8e06284](https://github.com/midnightntwrk/midnight-js/commit/8e06284ba5f057617411d6e1016651747b471591))
* **release:** bump version to 3.2.0-rc.3 ([#609](https://github.com/midnightntwrk/midnight-js/pull/609)) ([c1dc8f6](https://github.com/midnightntwrk/midnight-js/commit/c1dc8f674323015d69e0716653bb61a48d417fd8))
* **testkit-js:** add test environments ([#592](https://github.com/midnightntwrk/midnight-js/pull/592)) ([349bd16](https://github.com/midnightntwrk/midnight-js/commit/349bd16e2422b074f8644a3ec98e7999288c81ad))
* update to wallet-sdk-facade-2.0.0-rc.3 ([#608](https://github.com/midnightntwrk/midnight-js/pull/608)) ([2d44ce5](https://github.com/midnightntwrk/midnight-js/commit/2d44ce5d3574e2eb37332c039dc69f65fd9fe30c))

## [3.2.0-rc.2](https://github.com/midnightntwrk/midnight-js/compare/v3.2.0-rc.1...v3.2.0-rc.2) (2026-03-03)


### Features

* enhance URL handling in httpClientProvingProvider with path and query parameter support ([#575](https://github.com/midnightntwrk/midnight-js/pull/575)) ([29c381b](https://github.com/midnightntwrk/midnight-js/commit/29c381b0143761f3dccf31425a6e49efdfbab7ff))


### Documentation

* add llms.txt, AGENTS.md, and CLAUDE.md for AI agent guidance ([#579](https://github.com/midnightntwrk/midnight-js/pull/579)) ([a2199c7](https://github.com/midnightntwrk/midnight-js/commit/a2199c7052473a4d582cbd86e253e9e9c364c43e))
* update compact to compactc ([#580](https://github.com/midnightntwrk/midnight-js/pull/580)) ([16d4481](https://github.com/midnightntwrk/midnight-js/commit/16d4481cf1fac45e30f3d54094eb7204fa4d01a8))
* update README with installation, usage, and configuration details for various Midnight.js modules ([#576](https://github.com/midnightntwrk/midnight-js/pull/576)) ([cda4fae](https://github.com/midnightntwrk/midnight-js/commit/cda4fae08ebd6a5bb0bae1db8ca53ed4af47737e))
* update release notes for 3.2.0 ([#588](https://github.com/midnightntwrk/midnight-js/pull/588)) ([1679043](https://github.com/midnightntwrk/midnight-js/commit/167904313c5817b345ac1b9bd18b3d2c37b34f73))


### Tests

* add integration tests for Level Private State Provider export/import functionality ([#578](https://github.com/midnightntwrk/midnight-js/pull/578)) ([5f538e6](https://github.com/midnightntwrk/midnight-js/commit/5f538e6e3ae29f379cf1da6d3a5c16314022f913))


### Continuous Integration

* update scanner action to latest version ([#572](https://github.com/midnightntwrk/midnight-js/pull/572)) ([f885acc](https://github.com/midnightntwrk/midnight-js/commit/f885acc94b7f01bba8b92bd140cfdd18ffb1c444))


### Improvements

* **deps-dev:** bump @graphql-codegen/typescript-operations ([#539](https://github.com/midnightntwrk/midnight-js/pull/539)) ([f49d946](https://github.com/midnightntwrk/midnight-js/commit/f49d9469a3e0546986422389ba9a0255d572be97))
* **deps:** bump actions/setup-node from 6.0.0 to 6.2.0 ([#550](https://github.com/midnightntwrk/midnight-js/pull/550)) ([f335ae2](https://github.com/midnightntwrk/midnight-js/commit/f335ae25055747be8c3f478935749ae912dc1dbc))
* **deps:** bump EnricoMi/publish-unit-test-result-action ([#546](https://github.com/midnightntwrk/midnight-js/pull/546)) ([33e4a86](https://github.com/midnightntwrk/midnight-js/commit/33e4a864a3bc49ff1d20f60d074ff2359ac57d8d))
* **deps:** bump MishaKav/jest-coverage-comment from 1.0.29 to 1.0.30 ([#548](https://github.com/midnightntwrk/midnight-js/pull/548)) ([9553670](https://github.com/midnightntwrk/midnight-js/commit/955367053cdc25fcbebd09671c7ef7e52fe2cae9))
* **deps:** bump peter-evans/create-pull-request from 8.0.0 to 8.1.0 ([#547](https://github.com/midnightntwrk/midnight-js/pull/547)) ([c6203f6](https://github.com/midnightntwrk/midnight-js/commit/c6203f678939e027e017620cddc4dea851953726))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([#537](https://github.com/midnightntwrk/midnight-js/pull/537)) ([e1ffaf6](https://github.com/midnightntwrk/midnight-js/commit/e1ffaf6499bd25d94587e3b3f41a7814f9bc5102))
* enhance release script with detailed usage instructions and improve dry-run feedback ([#567](https://github.com/midnightntwrk/midnight-js/pull/567)) ([b6800fb](https://github.com/midnightntwrk/midnight-js/commit/b6800fb38e1732046845cecbc17e46ddb0320c94))
* **release:** bump version to 3.2.0-rc.2 ([#591](https://github.com/midnightntwrk/midnight-js/pull/591)) ([fbc94aa](https://github.com/midnightntwrk/midnight-js/commit/fbc94aa462a07a442b85718c6d203b0a73a211a5))
* update docker images and enable tests ([#577](https://github.com/midnightntwrk/midnight-js/pull/577)) ([25d1a99](https://github.com/midnightntwrk/midnight-js/commit/25d1a9974e07c3c886e5fb0f51324641cfc863d5))
* update eslint to 10.0.2 ([#587](https://github.com/midnightntwrk/midnight-js/pull/587)) ([74fbbf4](https://github.com/midnightntwrk/midnight-js/commit/74fbbf4e3ac4f37c9be587575b1d9f090d7baa39))

## [3.2.0-rc.1](https://github.com/midnightntwrk/midnight-js/compare/v3.1.0...v3.2.0-rc.1) (2026-02-26)


### Features

* add account-scoped isolation and migration support ([#545](https://github.com/midnightntwrk/midnight-js/pull/545)) ([4b71f47](https://github.com/midnightntwrk/midnight-js/commit/4b71f478dff440970f8730b563c8c06aebb735a9))
* add encryption caching and invalidation mechanism to `level-private-state-provider` ([#538](https://github.com/midnightntwrk/midnight-js/pull/538)) ([debdc49](https://github.com/midnightntwrk/midnight-js/commit/debdc49cdd59158178461de3d35b7a6b9ce3387d))
* add mnemonic-based wallet generation to testkit ([#524](https://github.com/midnightntwrk/midnight-js/pull/524)) ([2833a74](https://github.com/midnightntwrk/midnight-js/commit/2833a74f4b226731df4656838193723455a2eae6))
* add signing key export/import APIs and browser storage warning  ([#526](https://github.com/midnightntwrk/midnight-js/pull/526)) ([27fb995](https://github.com/midnightntwrk/midnight-js/commit/27fb9952ee5317a9b77d81a0f2440dd2097a3fdc))
* add support for multi-version encryption in `StorageEncryption` ([#530](https://github.com/midnightntwrk/midnight-js/pull/530)) ([fccbb0f](https://github.com/midnightntwrk/midnight-js/commit/fccbb0f9202e351d3f57a743f0632cd4a4d4b2dc))
* implement consistent salt generation to prevent race conditions in private state operations ([#534](https://github.com/midnightntwrk/midnight-js/pull/534)) ([0d15cdd](https://github.com/midnightntwrk/midnight-js/commit/0d15cddd1816a9fb00b17addbf85682bb7dca3ad))
* implement scoped transaction identity validation and error handling ([#555](https://github.com/midnightntwrk/midnight-js/pull/555)) ([669ffcf](https://github.com/midnightntwrk/midnight-js/commit/669ffcfab7855ca3d7a4e83fd8454e335f9c1a08))
* implement secure password rotation for private states and signing keys ([#542](https://github.com/midnightntwrk/midnight-js/pull/542)) ([98542aa](https://github.com/midnightntwrk/midnight-js/commit/98542aa50e733538c2e25a9f1080d0cb538aab79))
* **midnight-js:** remove need for auth token ([#523](https://github.com/midnightntwrk/midnight-js/pull/523)) ([415e78b](https://github.com/midnightntwrk/midnight-js/commit/415e78bf6e2b892c415a63c860dd2434478a7b8a))
* remove `walletProvider` option and enforce `privateStoragePasswordProvider` for LevelDB provider configuration ([#528](https://github.com/midnightntwrk/midnight-js/pull/528)) ([08b06eb](https://github.com/midnightntwrk/midnight-js/commit/08b06ebcd89b0f11a290926f12e28dec361676a2))


### Bug Fixes

* remove lodash dependency and replace usage with native object spread ([#556](https://github.com/midnightntwrk/midnight-js/pull/556)) ([ebc0d45](https://github.com/midnightntwrk/midnight-js/commit/ebc0d454c59ddbc9e3ef80e2c9bbf2d74c2afa16))
* Reuse the initial Zswap chain state rather than merging it ([#543](https://github.com/midnightntwrk/midnight-js/pull/543)) ([a8c45e5](https://github.com/midnightntwrk/midnight-js/commit/a8c45e5e89c4ae487b202ce77584830c02a2394e))
* update direnv installation to use GITHUB_TOKEN for authentication ([#562](https://github.com/midnightntwrk/midnight-js/pull/562)) ([ed8057f](https://github.com/midnightntwrk/midnight-js/commit/ed8057ff7945c09f5862d13087ed0f8cda9a0d4d))


### Documentation

* add release notes for v3.2.0 ([#566](https://github.com/midnightntwrk/midnight-js/pull/566)) ([dbe0855](https://github.com/midnightntwrk/midnight-js/commit/dbe0855ae47a173fbfef20e159626bce6a09e077)), closes [#528](https://github.com/midnightntwrk/midnight-js/pull/528) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#530](https://github.com/midnightntwrk/midnight-js/pull/530) [#534](https://github.com/midnightntwrk/midnight-js/pull/534) [#538](https://github.com/midnightntwrk/midnight-js/pull/538) [#542](https://github.com/midnightntwrk/midnight-js/pull/542) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#555](https://github.com/midnightntwrk/midnight-js/pull/555) [#493](https://github.com/midnightntwrk/midnight-js/pull/493) [#526](https://github.com/midnightntwrk/midnight-js/pull/526) [#526](https://github.com/midnightntwrk/midnight-js/pull/526) [#542](https://github.com/midnightntwrk/midnight-js/pull/542) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#524](https://github.com/midnightntwrk/midnight-js/pull/524) [#543](https://github.com/midnightntwrk/midnight-js/pull/543) [#556](https://github.com/midnightntwrk/midnight-js/pull/556) [#562](https://github.com/midnightntwrk/midnight-js/pull/562) [#505](https://github.com/midnightntwrk/midnight-js/pull/505)
* API documentation update ([#531](https://github.com/midnightntwrk/midnight-js/pull/531)) ([86b7481](https://github.com/midnightntwrk/midnight-js/commit/86b74814ddcc17bd6dddcbca76719cada3c2426e))
* API documentation update ([#544](https://github.com/midnightntwrk/midnight-js/pull/544)) ([708f57a](https://github.com/midnightntwrk/midnight-js/commit/708f57a07b1f3f699271011a9fd84c2992925c39))
* API documentation update ([#557](https://github.com/midnightntwrk/midnight-js/pull/557)) ([575bd30](https://github.com/midnightntwrk/midnight-js/commit/575bd3040e3046d431bcce0d55d08e396680c863))
* API documentation update ([#559](https://github.com/midnightntwrk/midnight-js/pull/559)) ([8ec717e](https://github.com/midnightntwrk/midnight-js/commit/8ec717e435c6178e7cc306d34e4379a10b1b0578))
* update README with installation, usage, and configuration details for levelPrivateStateProvider ([#563](https://github.com/midnightntwrk/midnight-js/pull/563)) ([f858547](https://github.com/midnightntwrk/midnight-js/commit/f858547b793e50ce27539a3382d6e6f2f30abd18))


### Code Refactoring

* update wallet state provider to use WalletAPI types ([#529](https://github.com/midnightntwrk/midnight-js/pull/529)) ([46e731e](https://github.com/midnightntwrk/midnight-js/commit/46e731e36c27dc84364e2a2b636f6d36fe52d4da))


### Improvements

* **deps-dev:** bump @rollup/plugin-commonjs from 28.0.9 to 29.0.0 ([#533](https://github.com/midnightntwrk/midnight-js/pull/533)) ([7556ec0](https://github.com/midnightntwrk/midnight-js/commit/7556ec0bb07613642f12de76c09667b0c4f37a94))
* **deps-dev:** bump axios in the npm_and_yarn group across 1 directory ([#503](https://github.com/midnightntwrk/midnight-js/pull/503)) ([aa3e815](https://github.com/midnightntwrk/midnight-js/commit/aa3e8150fc6c3001c95a12e6cdaf608948d371df))
* **deps-dev:** bump glob from 11.1.0 to 13.0.4 ([#516](https://github.com/midnightntwrk/midnight-js/pull/516)) ([8dbdedf](https://github.com/midnightntwrk/midnight-js/commit/8dbdedf01cfdf2febb9420f58b29b96635161e94))
* **deps-dev:** bump testcontainers from 11.11.0 to 11.12.0 ([#522](https://github.com/midnightntwrk/midnight-js/pull/522)) ([8ab19cd](https://github.com/midnightntwrk/midnight-js/commit/8ab19cd51c13ab5289cca0212ff2ffeface9926e))
* **deps:** bump actions/cache from 5.0.1 to 5.0.3 ([#498](https://github.com/midnightntwrk/midnight-js/pull/498)) ([612a759](https://github.com/midnightntwrk/midnight-js/commit/612a75934a990425c7eda752eeebdb5c011d9407))
* **deps:** bump tar in the npm_and_yarn group across 1 directory ([#525](https://github.com/midnightntwrk/midnight-js/pull/525)) ([bba68d6](https://github.com/midnightntwrk/midnight-js/commit/bba68d6f740b96e3ff05ca044fc5db625e98a31e))
* **deps:** bump the npm_and_yarn group across 1 directory with 3 updates ([#519](https://github.com/midnightntwrk/midnight-js/pull/519)) ([4dd25c6](https://github.com/midnightntwrk/midnight-js/commit/4dd25c60256f8a6159d6c10ca6d887a3b6aabf88))
* pin workflow dependencies and fix security issues ([#493](https://github.com/midnightntwrk/midnight-js/pull/493)) ([d4f74b5](https://github.com/midnightntwrk/midnight-js/commit/d4f74b5a27f719e47e12020e3908af0fba7e5107))
* **release:** bump version to 3.2.0-rc.1 ([#568](https://github.com/midnightntwrk/midnight-js/pull/568)) ([bdea445](https://github.com/midnightntwrk/midnight-js/commit/bdea44567255e618de1af912b1a1262c803ca4d1)), closes [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#538](https://github.com/midnightntwrk/midnight-js/pull/538) [#524](https://github.com/midnightntwrk/midnight-js/pull/524) [#526](https://github.com/midnightntwrk/midnight-js/pull/526) [#530](https://github.com/midnightntwrk/midnight-js/pull/530) [#534](https://github.com/midnightntwrk/midnight-js/pull/534) [#555](https://github.com/midnightntwrk/midnight-js/pull/555) [#542](https://github.com/midnightntwrk/midnight-js/pull/542) [#523](https://github.com/midnightntwrk/midnight-js/pull/523) [#528](https://github.com/midnightntwrk/midnight-js/pull/528) [#556](https://github.com/midnightntwrk/midnight-js/pull/556) [#543](https://github.com/midnightntwrk/midnight-js/pull/543) [#562](https://github.com/midnightntwrk/midnight-js/pull/562) [#566](https://github.com/midnightntwrk/midnight-js/pull/566) [#528](https://github.com/midnightntwrk/midnight-js/pull/528) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#530](https://github.com/midnightntwrk/midnight-js/pull/530) [#534](https://github.com/midnightntwrk/midnight-js/pull/534) [#538](https://github.com/midnightntwrk/midnight-js/pull/538) [#542](https://github.com/midnightntwrk/midnight-js/pull/542) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#555](https://github.com/midnightntwrk/midnight-js/pull/555) [#493](https://github.com/midnightntwrk/midnight-js/pull/493) [#526](https://github.com/midnightntwrk/midnight-js/pull/526) [#526](https://github.com/midnightntwrk/midnight-js/pull/526) [#542](https://github.com/midnightntwrk/midnight-js/pull/542) [#545](https://github.com/midnightntwrk/midnight-js/pull/545) [#524](https://github.com/midnightntwrk/midnight-js/pull/524) [#543](https://github.com/midnightntwrk/midnight-js/pull/543) [#556](https://github.com/midnightntwrk/midnight-js/pull/556) [#562](https://github.com/midnightntwrk/midnight-js/pull/562) [#505](https://github.com/midnightntwrk/midnight-js/pull/505) [#531](https://github.com/midnightntwrk/midnight-js/pull/531) [#544](https://github.com/midnightntwrk/midnight-js/pull/544) [#557](https://github.com/midnightntwrk/midnight-js/pull/557) [#559](https://github.com/midnightntwrk/midnight-js/pull/559) [#563](https://github.com/midnightntwrk/midnight-js/pull/563) [#529](https://github.com/midnightntwrk/midnight-js/pull/529) [#533](https://github.com/midnightntwrk/midnight-js/pull/533) [#503](https://github.com/midnightntwrk/midnight-js/pull/503) [#516](https://github.com/midnightntwrk/midnight-js/pull/516) [#522](https://github.com/midnightntwrk/midnight-js/pull/522) [#498](https://github.com/midnightntwrk/midnight-js/pull/498) [#525](https://github.com/midnightntwrk/midnight-js/pull/525) [#519](https://github.com/midnightntwrk/midnight-js/pull/519) [#493](https://github.com/midnightntwrk/midnight-js/pull/493) [#561](https://github.com/midnightntwrk/midnight-js/pull/561) [#532](https://github.com/midnightntwrk/midnight-js/pull/532) [#564](https://github.com/midnightntwrk/midnight-js/pull/564) [#560](https://github.com/midnightntwrk/midnight-js/pull/560)
* update compactc to 0.29.0 ([#561](https://github.com/midnightntwrk/midnight-js/pull/561)) ([7660cb4](https://github.com/midnightntwrk/midnight-js/commit/7660cb4fd81e2d3f66814adf0b7edf67d589c67f))
* update dependencies and container images ([#532](https://github.com/midnightntwrk/midnight-js/pull/532)) ([df7bad7](https://github.com/midnightntwrk/midnight-js/commit/df7bad7595c8b9c7a3586aaece8f749ed4b74339))
* update indexer image version to 3.1.0 ([#564](https://github.com/midnightntwrk/midnight-js/pull/564)) ([b73df05](https://github.com/midnightntwrk/midnight-js/commit/b73df05c1afbf4868955820cdf47ff4ebf6a5097))
* update wallet-sdk-facade and related dependencies to version 2.0.0-rc.2 ([#560](https://github.com/midnightntwrk/midnight-js/pull/560)) ([f561785](https://github.com/midnightntwrk/midnight-js/commit/f56178578d70aebef0de8394ee4d9f3d1991bd4b))

## [3.1.0](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0...v3.1.0) (2026-02-17)


### Features

* add contract address scoping for private state operations ([#470](https://github.com/midnightntwrk/midnight-js/pull/470)) ([d828642](https://github.com/midnightntwrk/midnight-js/commit/d828642b6efa3e5b2904c80ead26a573cab88035))
* integrate `@midnight-ntwrk/compact-js` for contract building and deployment ([49623fb](https://github.com/midnightntwrk/midnight-js/commit/49623fbea0aaeef87a4247b51619b0db9fb62291))
* **midnight-js:** add import/export functionality to private-state-provider ([#435](https://github.com/midnightntwrk/midnight-js/pull/435)) ([ac82edc](https://github.com/midnightntwrk/midnight-js/commit/ac82edc371870a7e011370a639767ca53b265d63))


### Bug Fixes

* add npm registry auth for Dependabot ([#505](https://github.com/midnightntwrk/midnight-js/pull/505)) ([a8740e3](https://github.com/midnightntwrk/midnight-js/commit/a8740e352a0bae6d76351ab9cf91ff76a3f7fc2a))
* Ensure `TransactionContext` is not included in circuit call arguments ([#497](https://github.com/midnightntwrk/midnight-js/pull/497)) ([ca28c3f](https://github.com/midnightntwrk/midnight-js/commit/ca28c3f1bc190219a1c9d25edabd7c8e3a338a93))


### Documentation

* add v3.1.0 release notes ([#500](https://github.com/midnightntwrk/midnight-js/pull/500)) ([7aa68c3](https://github.com/midnightntwrk/midnight-js/commit/7aa68c31b962d4a2a6853188b5b64044f5ac3d92))
* API documentation update ([#477](https://github.com/midnightntwrk/midnight-js/pull/477)) ([16f00ee](https://github.com/midnightntwrk/midnight-js/commit/16f00ee36d316e5d05a21b9512ffd9deb4cef603))
* API documentation update ([#482](https://github.com/midnightntwrk/midnight-js/pull/482)) ([40197d5](https://github.com/midnightntwrk/midnight-js/commit/40197d5f5e8877566c0fe5322562619042f9a547))
* API documentation update ([#488](https://github.com/midnightntwrk/midnight-js/pull/488)) ([35b0dc6](https://github.com/midnightntwrk/midnight-js/commit/35b0dc69d9d217d48f88caec9999151664aefcb3))
* API documentation update ([#489](https://github.com/midnightntwrk/midnight-js/pull/489)) ([6b69452](https://github.com/midnightntwrk/midnight-js/commit/6b694522d45f4b3ac1bda2b5ac8b9d3817df46d1))
* API documentation update ([#504](https://github.com/midnightntwrk/midnight-js/pull/504)) ([4c60f6a](https://github.com/midnightntwrk/midnight-js/commit/4c60f6a3a333a31f6aa8194239a6d5be2fc71dda))
* clean up `level-private-state-provider` README ([#502](https://github.com/midnightntwrk/midnight-js/pull/502)) ([54b73e0](https://github.com/midnightntwrk/midnight-js/commit/54b73e0a414c92453744863eb04631efb9419dae))
* update v3.0.0 docs to reflect `deployContract` API changes ([2a7d914](https://github.com/midnightntwrk/midnight-js/commit/2a7d9147de145c2b56ac8024df943cca01ed2b51))


### Code Refactoring

* rename `level-private-state-provider-example` package to `level-private-state-provider` ([#496](https://github.com/midnightntwrk/midnight-js/pull/496)) ([bd2c1f6](https://github.com/midnightntwrk/midnight-js/commit/bd2c1f61d53e78f3164e7f2b5a70c85e26649778))


### Tests

* replace `it` with `test` in all test files for consistency and remove unused constants ([#491](https://github.com/midnightntwrk/midnight-js/pull/491)) ([aecd82c](https://github.com/midnightntwrk/midnight-js/commit/aecd82ce749f432c31fd369e690cd7a6835a2340))


### Improvements

* bump `indexer` and `node` images in `testkit-js` to latest versions ([#490](https://github.com/midnightntwrk/midnight-js/pull/490)) ([35b6f7b](https://github.com/midnightntwrk/midnight-js/commit/35b6f7b274fbb8faf2fbe32e9f48ae732ccb127f))
* bump to release 3.1.0 ([#518](https://github.com/midnightntwrk/midnight-js/pull/518)) ([ca127bc](https://github.com/midnightntwrk/midnight-js/commit/ca127bcb74198098152bd3d8805d1161ce164220))
* deprecate `@midnight-ntwrk/midnight-js-level-private-state-provider` ([#487](https://github.com/midnightntwrk/midnight-js/pull/487)) ([4f6f735](https://github.com/midnightntwrk/midnight-js/commit/4f6f7350060ff7ffc0fa4dd37ddc4119deecb9e8))
* **deps-dev:** bump eslint-plugin-unused-imports from 4.3.0 to 4.4.1 ([#508](https://github.com/midnightntwrk/midnight-js/pull/508)) ([8240937](https://github.com/midnightntwrk/midnight-js/commit/8240937c53dc66d9573b351f45af9d9d5d4708e4))
* **deps-dev:** bump typedoc-plugin-markdown from 4.9.0 to 4.10.0 ([#515](https://github.com/midnightntwrk/midnight-js/pull/515)) ([249b8ef](https://github.com/midnightntwrk/midnight-js/commit/249b8ef4899a49c04aa3d9d8b951fd2e361783ce))
* **deps:** bump actions/github-script from 7 to 8 ([#438](https://github.com/midnightntwrk/midnight-js/pull/438)) ([3241bc4](https://github.com/midnightntwrk/midnight-js/commit/3241bc4153a186313536b638ce61211429c64c59))
* **deps:** bump docker/login-action from 3.6.0 to 3.7.0 ([#483](https://github.com/midnightntwrk/midnight-js/pull/483)) ([bde755b](https://github.com/midnightntwrk/midnight-js/commit/bde755b438179c66272be36ba845705e1381d1f6))
* **deps:** bump lodash from 4.17.21 to 4.17.23 ([#507](https://github.com/midnightntwrk/midnight-js/pull/507)) ([f83ff08](https://github.com/midnightntwrk/midnight-js/commit/f83ff082941ab74de94f38391ceda19740bbb14a))
* **deps:** bump mikepenz/action-junit-report from 6.1.0 to 6.2.0 ([#484](https://github.com/midnightntwrk/midnight-js/pull/484)) ([f9938a8](https://github.com/midnightntwrk/midnight-js/commit/f9938a8b5f826ec851fbf67ddad83cb59f0a17f2))
* **deps:** bump tar in the npm_and_yarn group across 1 directory ([#476](https://github.com/midnightntwrk/midnight-js/pull/476)) ([e1348a5](https://github.com/midnightntwrk/midnight-js/commit/e1348a57326ebb322f1785bd11c64299e081cedf))
* handle empty `preRelease` in target version calculation in CD workflow ([#478](https://github.com/midnightntwrk/midnight-js/pull/478)) ([641fa5a](https://github.com/midnightntwrk/midnight-js/commit/641fa5a5b5733802fb283d67c373531909a9493a))
* multiple libraries updates + yarn update to 4.12.0 ([#485](https://github.com/midnightntwrk/midnight-js/pull/485)) ([d5d7129](https://github.com/midnightntwrk/midnight-js/commit/d5d7129f9b5135c5e88a1ae207ef887711642fb7))
* refactor tokens tests ([#486](https://github.com/midnightntwrk/midnight-js/pull/486)) ([bb03570](https://github.com/midnightntwrk/midnight-js/commit/bb035704b0180f21cae127b45173e9d095d48768))
* remove `update-indexer-schema.yml` workflow and add new commit scopes (`midnight-js`, `deps-dev`) ([#517](https://github.com/midnightntwrk/midnight-js/pull/517)) ([1ef281a](https://github.com/midnightntwrk/midnight-js/commit/1ef281a084c862d57fb589e6859d8141d3636b25))
* remove deprecated TestKit.js CD workflow ([#492](https://github.com/midnightntwrk/midnight-js/pull/492)) ([9840d93](https://github.com/midnightntwrk/midnight-js/commit/9840d93033f33f100d21d6df31383bbb6e2ee428))
* update wallet-sdk-facade to 2.0.0-rc.1 ([#511](https://github.com/midnightntwrk/midnight-js/pull/511)) ([10c40ee](https://github.com/midnightntwrk/midnight-js/commit/10c40ee941d910c252c9c89e6b69dd53cf90a293))

## [3.0.0](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.15...v3.0.0) (2026-01-28)


### Features

* extend GraphQL schema with governance-related types and updates ([cc45f97](https://github.com/midnightntwrk/midnight-js/commit/cc45f978caa1c5c71611cd04bbc5b29260b1d2a8))
* Integrate Compact.js ([#370](https://github.com/midnightntwrk/midnight-js/pull/370)) ([6f9dff1](https://github.com/midnightntwrk/midnight-js/commit/6f9dff1313d99a5ad1c92d82351338f40cdda9a4))
* switch to faster (more open source friendly) scanner ([4c59300](https://github.com/midnightntwrk/midnight-js/commit/4c593003b3e4d897e248209e7815a226a2036b60))


### Documentation

* API documentation update ([#445](https://github.com/midnightntwrk/midnight-js/pull/445)) ([022ae09](https://github.com/midnightntwrk/midnight-js/commit/022ae090b785f148a5471ad0d3aca32bda62a36d))
* API documentation update ([#451](https://github.com/midnightntwrk/midnight-js/pull/451)) ([bdba83f](https://github.com/midnightntwrk/midnight-js/commit/bdba83fb763c822d8554e0efb15a5f078a62731e))
* API documentation update ([#462](https://github.com/midnightntwrk/midnight-js/pull/462)) ([0136567](https://github.com/midnightntwrk/midnight-js/commit/0136567ca3d8108d1a40948f037105f36c4209f0))
* API documentation update ([#468](https://github.com/midnightntwrk/midnight-js/pull/468)) ([36a4c59](https://github.com/midnightntwrk/midnight-js/commit/36a4c59965ecf0c4312df8f31b2ca238e95320fe))
* release notes ([#465](https://github.com/midnightntwrk/midnight-js/pull/465)) ([a468d13](https://github.com/midnightntwrk/midnight-js/commit/a468d130107467e34d491318b284542e031e2722))


### Improvements

* **release:** bump version to 3.0.0 ([#475](https://github.com/midnightntwrk/midnight-js/pull/475)) ([8fbe81f](https://github.com/midnightntwrk/midnight-js/commit/8fbe81fd728b18221019ec4845ab4c630805ac2d))
* remove `newCoins` parameter and related logic from `balanceTx` method and update affected tests, docs, and types ([#466](https://github.com/midnightntwrk/midnight-js/pull/466)) ([f300457](https://github.com/midnightntwrk/midnight-js/commit/f300457f737cda060828f67c9b4d9659c485c555))
* remove unused `signTx` method from `midnight-wallet-provider` and update `balanceTx` logic to sign balancing transactions ([cead765](https://github.com/midnightntwrk/midnight-js/commit/cead7651543bac99b7090849e2bebe405aed8141))
* skip failing e2e tests in indexer and contracts modules ([#472](https://github.com/midnightntwrk/midnight-js/pull/472)) ([36e6c8c](https://github.com/midnightntwrk/midnight-js/commit/36e6c8c493ffcf6eef1816a9842e5ce2a5f9b9c7))
* skip failing test for wallet token receiving (BUG: 21219) ([867084a](https://github.com/midnightntwrk/midnight-js/commit/867084af12098978a3392e30ae3056a25fb8a204))
* update CODEOWNERS to reference scan.yaml workflow ([76896ca](https://github.com/midnightntwrk/midnight-js/commit/76896ca2b60d7dbf08b5002df50d92eeb0bfa46a))
* update GitHub Actions workflow permissions for `id-token` and `packages` ([#463](https://github.com/midnightntwrk/midnight-js/pull/463)) ([6bcba54](https://github.com/midnightntwrk/midnight-js/commit/6bcba545f10df948cfc3f4a07fe0006225e97f28))
* update testkit version to 3.0.0-alpha ([#460](https://github.com/midnightntwrk/midnight-js/pull/460)) ([334c494](https://github.com/midnightntwrk/midnight-js/commit/334c494a9478cf723573e1e8a6cc2b1bbf2a34c4))
* update tests ([109e6ea](https://github.com/midnightntwrk/midnight-js/commit/109e6ea4a3f633b2ec7f7bd2a4eb7ccf13aa7a88))
* upgrade all dependencies to stable versions ([#467](https://github.com/midnightntwrk/midnight-js/pull/467)) ([38891c1](https://github.com/midnightntwrk/midnight-js/commit/38891c18f8b852d1c007baf228f17e5c2228793f))

## [3.0.0-alpha.15](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.14...v3.0.0-alpha.15) (2026-01-21)


### Features

* add KeyMaterialProvider type for DApp connector compatibility ([#430](https://github.com/midnightntwrk/midnight-js/pull/430)) ([ce32335](https://github.com/midnightntwrk/midnight-js/commit/ce32335e2f2105906e412c16c6f02e346e2863df)), closes [#429](https://github.com/midnightntwrk/midnight-js/pull/429)


### Documentation

* API documentation update ([#427](https://github.com/midnightntwrk/midnight-js/pull/427)) ([a3d9114](https://github.com/midnightntwrk/midnight-js/commit/a3d9114681ddd5fd6c2864b209e18bd335a13972))
* API documentation update ([#441](https://github.com/midnightntwrk/midnight-js/pull/441)) ([ebc39e6](https://github.com/midnightntwrk/midnight-js/commit/ebc39e68c409825d86a1e3a88be89dcec10d2f50))


### Continuous Integration

* remove custom compact version loading, replace with standard direnv ([#429](https://github.com/midnightntwrk/midnight-js/pull/429)) ([d6946eb](https://github.com/midnightntwrk/midnight-js/commit/d6946eb0ab1aab8c168b1f2f1ca41dbde3106413))


### Improvements

* add typechecking for tests ([#431](https://github.com/midnightntwrk/midnight-js/pull/431)) ([be765fd](https://github.com/midnightntwrk/midnight-js/commit/be765fda7f39f2d42d1d583d8addd56ccc8a5b7c))
* **deps:** bump undici in the npm_and_yarn group across 1 directory ([#433](https://github.com/midnightntwrk/midnight-js/pull/433)) ([8153da1](https://github.com/midnightntwrk/midnight-js/commit/8153da137c668e2470579b95580ea3cdd82f6fb7))
* optimize build time by conditionally skipping contract compilation ([#428](https://github.com/midnightntwrk/midnight-js/pull/428)) ([b4ad703](https://github.com/midnightntwrk/midnight-js/commit/b4ad703a4a5cea7b54ee41867ff97c7fd4e2ac2c))
* **release:** bump version to 3.0.0-alpha.15 ([#446](https://github.com/midnightntwrk/midnight-js/pull/446)) ([20c4088](https://github.com/midnightntwrk/midnight-js/commit/20c4088f69cdfee56d8601a4f326f3c1a9738e5c))
* update README - remove outdated encryption note and document AES-256-GCM support ([c4c512e](https://github.com/midnightntwrk/midnight-js/commit/c4c512e5578d79c7c50b66eea4f981e4a02f5ed7))
* update wallet-sdk-facade to 1.0.0-beta.16 ([#437](https://github.com/midnightntwrk/midnight-js/pull/437)) ([163100d](https://github.com/midnightntwrk/midnight-js/commit/163100de5e5b8763cea89264e88b7b1a66bc46c8))

## [3.0.0-alpha.14](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.13...v3.0.0-alpha.14) (2026-01-13)


### Features

* ledger v7 support ([#414](https://github.com/midnightntwrk/midnight-js/pull/414)) ([1f6f04f](https://github.com/midnightntwrk/midnight-js/commit/1f6f04f5726cc7a65b010943c164b1041b37c38d))


### Documentation

* API documentation update ([#420](https://github.com/midnightntwrk/midnight-js/pull/420)) ([0c9e4d7](https://github.com/midnightntwrk/midnight-js/commit/0c9e4d74d248b6200c899d1c3d05be0aa97a4a6b))
* API documentation update ([#425](https://github.com/midnightntwrk/midnight-js/pull/425)) ([fa49615](https://github.com/midnightntwrk/midnight-js/commit/fa49615e25c869e006f7129373a2bd332549604b))


### Improvements

* add workflow to fix release tags on main branch after PR merge ([#423](https://github.com/midnightntwrk/midnight-js/pull/423)) ([6f88a4f](https://github.com/midnightntwrk/midnight-js/commit/6f88a4f57a0e329818109e94a641a9f63ed5ae1c))
* **deps:** update dependency typescript-eslint to v8.48.0 ([#339](https://github.com/midnightntwrk/midnight-js/pull/339)) ([b6aae43](https://github.com/midnightntwrk/midnight-js/commit/b6aae43dedfdd3e3d09fabb2702d64c945577be9))
* **release:** bump version to 3.0.0-alpha.14 ([5304b89](https://github.com/midnightntwrk/midnight-js/commit/5304b89cbead45115fd55c1d091cb493ef7e0eac))
* update changelog generation commands + improve release configuration ([#421](https://github.com/midnightntwrk/midnight-js/pull/421)) ([36a36e3](https://github.com/midnightntwrk/midnight-js/commit/36a36e3c52e651f05103650887feb63d53c84995))

## [3.0.0-alpha.13](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.12...v3.0.0-alpha.13) (2026-01-08)


### Documentation

* API documentation update ([#417](https://github.com/midnightntwrk/midnight-js/pull/417)) ([082c77a](https://github.com/midnightntwrk/midnight-js/commit/082c77a5b3d318585919cbc1daacfbbf4a8e331d))


### Improvements

* **deps:** update dependency express to v5.2.0 [security] ([#363](https://github.com/midnightntwrk/midnight-js/pull/363)) ([e7bab3d](https://github.com/midnightntwrk/midnight-js/commit/e7bab3d028001c03b69582869daed6577bb45fcb))
* **release:** bump version to 3.0.0-alpha.13 ([#419](https://github.com/midnightntwrk/midnight-js/pull/419)) ([f463218](https://github.com/midnightntwrk/midnight-js/commit/f463218aa131bc32f8a2fe8816d7b7b23fda5b9a))

## [3.0.0-alpha.12](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.11...v3.0.0-alpha.12) (2026-01-07)


### Features

* Support contract calls within scoped transactions ([#404](https://github.com/midnightntwrk/midnight-js/pull/404)) ([2968e77](https://github.com/midnightntwrk/midnight-js/commit/2968e77b19bb3dbb5cc4b5de046bca4e1c22cf5f))


### Bug Fixes

* update compact compiler version ([#402](https://github.com/midnightntwrk/midnight-js/pull/402)) ([8312d09](https://github.com/midnightntwrk/midnight-js/commit/8312d09480ef1709a0fd78957f22fcd9c5438577))


### Documentation

* API documentation update ([#394](https://github.com/midnightntwrk/midnight-js/pull/394)) ([ecfb2d0](https://github.com/midnightntwrk/midnight-js/commit/ecfb2d059e947845810249a5f519e48172744dd3))
* API documentation update ([#413](https://github.com/midnightntwrk/midnight-js/pull/413)) ([d0d206d](https://github.com/midnightntwrk/midnight-js/commit/d0d206dba5692d85b6fd9e8ac0052d3372098dcf))


### Improvements

* **deps:** bump actions/download-artifact from 6.0.0 to 7.0.0 ([#386](https://github.com/midnightntwrk/midnight-js/pull/386)) ([4a42c64](https://github.com/midnightntwrk/midnight-js/commit/4a42c64b26f30f208b77c948300854a0d8012611))
* **deps:** bump EnricoMi/publish-unit-test-result-action ([#401](https://github.com/midnightntwrk/midnight-js/pull/401)) ([9ea2c1b](https://github.com/midnightntwrk/midnight-js/commit/9ea2c1bd46f921ca59861782bf302037baa2c9de))
* **deps:** bump mikepenz/action-junit-report from 6.0.1 to 6.1.0 ([#409](https://github.com/midnightntwrk/midnight-js/pull/409)) ([0d39b4c](https://github.com/midnightntwrk/midnight-js/commit/0d39b4c737aecaec6a6112778624776e6b1dc942))
* **deps:** bump peter-evans/create-pull-request from 6 to 8 ([#387](https://github.com/midnightntwrk/midnight-js/pull/387)) ([0dcfe29](https://github.com/midnightntwrk/midnight-js/commit/0dcfe291772d852d56eddc8976213bfaa466c78f))
* fix a release process and add release documentation ([#399](https://github.com/midnightntwrk/midnight-js/pull/399)) ([8784088](https://github.com/midnightntwrk/midnight-js/commit/8784088d007e852d27a0b82419b10e4f57901aff))
* fix the documentation on encryption ([7cec0aa](https://github.com/midnightntwrk/midnight-js/commit/7cec0aa8b7500e94b4425d33a975a87495906522))
* merge release/v3.0.0-alpha.12 into main ([#416](https://github.com/midnightntwrk/midnight-js/pull/416)) ([80de708](https://github.com/midnightntwrk/midnight-js/commit/80de70853f09992094906f37b8d2d1ef24e4eb70))
* Remove source code for Compact.js and Platform.js ([#406](https://github.com/midnightntwrk/midnight-js/pull/406)) ([561c5fa](https://github.com/midnightntwrk/midnight-js/commit/561c5fad532aa23eb6177366c154c6a356c48f20))
* tests linting issues - fix warnings ([5cfd89e](https://github.com/midnightntwrk/midnight-js/commit/5cfd89ec3b7dc7619c64ae9b24c1c74f63b202dc))
* tests linting issues - fix warnings ([b4ba6d3](https://github.com/midnightntwrk/midnight-js/commit/b4ba6d32d6ecdb5bf07b26689de62fc6a87e9c9c))
* update wallet-sdk-facade and related dependencies to version 1.0.0-beta.13 ([d029a1e](https://github.com/midnightntwrk/midnight-js/commit/d029a1e1d765d881c056ee1583007cf049598d33))

## [3.0.0-alpha.11](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.10...v3.0.0-alpha.11) (2025-12-17)


### Features

* add a configurable password provider with wallet fallback ([c318cb4](https://github.com/midnightntwrk/midnight-js/commit/c318cb450f083ba54aac5806bc9ae91a9f81997c))
* fix the repository urls ([#380](https://github.com/midnightntwrk/midnight-js/pull/380)) ([026b7a0](https://github.com/midnightntwrk/midnight-js/commit/026b7a05c5e6025dc8a8830f314dbbaaa62e3898))
* provider configuration tweaks ([9894f67](https://github.com/midnightntwrk/midnight-js/commit/9894f67cf92349aa07730cf029ac1915a3750740))


### Documentation

* API documentation update ([#381](https://github.com/midnightntwrk/midnight-js/pull/381)) ([5ba607b](https://github.com/midnightntwrk/midnight-js/commit/5ba607b8766f4a7c5ebace6524a1b3a3a0847904))
* API documentation update ([#382](https://github.com/midnightntwrk/midnight-js/pull/382)) ([581e42f](https://github.com/midnightntwrk/midnight-js/commit/581e42f4c02fafd933f571ba123d450293c3587a))


### Improvements

* **deps:** bump actions/cache from 4 to 5 ([#385](https://github.com/midnightntwrk/midnight-js/pull/385)) ([1d4df6b](https://github.com/midnightntwrk/midnight-js/commit/1d4df6b21b4c0a7924e1eb1f2dc1f2cbb0c631a8))
* indexer-standalone:3.0.0-alpha.19 and midnight-node:0.18.0-rc.10 ([#383](https://github.com/midnightntwrk/midnight-js/pull/383)) ([7d3a0fc](https://github.com/midnightntwrk/midnight-js/commit/7d3a0fc8957ccfc1405f10eb2cc2b4c5168f9aaf))
* **release:** bump version to 3.0.0-alpha.11 ([#393](https://github.com/midnightntwrk/midnight-js/pull/393)) ([b8a8908](https://github.com/midnightntwrk/midnight-js/commit/b8a89081da6c53502b5b580ebba06a2094a0f982))

## [3.0.0-alpha.10](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.9...v3.0.0-alpha.10) (2025-12-12)


### Features

* bump compact compiler to 0.27.0 ([#373](https://github.com/midnightntwrk/midnight-js/pull/373)) ([e45ac9d](https://github.com/midnightntwrk/midnight-js/commit/e45ac9d7de4e8d5f8ab53f028f9af8168029f301))
* update to latest version ([a705430](https://github.com/midnightntwrk/midnight-js/commit/a70543067a1a4fcf31bc25533e2bd706dee5b784))


### Bug Fixes

* remove unnecessary networkId parameter from Dust.startWithSeed ([#368](https://github.com/midnightntwrk/midnight-js/pull/368)) ([c0448a6](https://github.com/midnightntwrk/midnight-js/commit/c0448a6c1a5ce3ceeb2ae1b38d1dead6be214785))


### Documentation

* API documentation update ([#369](https://github.com/midnightntwrk/midnight-js/pull/369)) ([7a2d84b](https://github.com/midnightntwrk/midnight-js/commit/7a2d84b7387b0ef9f3157102b20c0bd52af3737b))
* API documentation update ([#378](https://github.com/midnightntwrk/midnight-js/pull/378)) ([696f959](https://github.com/midnightntwrk/midnight-js/commit/696f959267f4d14420625cd459d929efbf88bdca))


### Code Refactoring

* replace WalletBuilder with FluentWalletBuilder pattern ([#376](https://github.com/midnightntwrk/midnight-js/pull/376)) ([0e1f175](https://github.com/midnightntwrk/midnight-js/commit/0e1f17540963a9ed7fbe6de71e440f24d55fdeeb))


### Improvements

* **release:** bump version to 3.0.0-alpha.10 ([#379](https://github.com/midnightntwrk/midnight-js/pull/379)) ([ddeab79](https://github.com/midnightntwrk/midnight-js/commit/ddeab799f53f6f5091af43255dc6e90e16dadaaf))

## [3.0.0-alpha.9](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.8...v3.0.0-alpha.9) (2025-12-03)


### Features

* enhance transaction documentation with execution phases and failure behavior ([a274ecc](https://github.com/midnightntwrk/midnight-js/commit/a274eccb9e6546277eded28c1aedcaee1e7b702e))
* enhance transaction handling documentation for indefinite waiting behavior ([69606e7](https://github.com/midnightntwrk/midnight-js/commit/69606e7c8252ed9ae2b95022351cea49bfeb2f3d))
* enhance transaction handling documentation for indefinite waiting behavior ([944a242](https://github.com/midnightntwrk/midnight-js/commit/944a24287a5ab8cb3e2be635b89d38664b8538b2))
* move @midnight-ntwrk/midnight-js-compact to devDependencies ([#361](https://github.com/midnightntwrk/midnight-js/pull/361)) ([b5771d1](https://github.com/midnightntwrk/midnight-js/commit/b5771d1f1399425e78f66ca04079994ae71d06fb))


### Improvements

* **release:** bump version to 3.0.0-alpha.9 ([#365](https://github.com/midnightntwrk/midnight-js/pull/365)) ([5ef16e5](https://github.com/midnightntwrk/midnight-js/commit/5ef16e5fd0c0f59b9f8b0dee243a5c06a8ebb119))
* update proof-server, indexer, and node images to latest alpha versions ([759a061](https://github.com/midnightntwrk/midnight-js/commit/759a06151d0f72d392f2427590f0a6f6da35fcbe))

## [3.0.0-alpha.8](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.7...v3.0.0-alpha.8) (2025-12-01)


### Features

* move @midnight-ntwrk/midnight-js-compact to devDependencies ([#361](https://github.com/midnightntwrk/midnight-js/pull/361)) ([625854b](https://github.com/midnightntwrk/midnight-js/commit/625854baca2f51e73dc5bbd2a1feb2bb0f6481e7))


### Improvements

* **release:** bump version to 3.0.0-alpha.8 ([face77d](https://github.com/midnightntwrk/midnight-js/commit/face77d22d11f2fdde83acd8ea67abac4569b430))

## [3.0.0-alpha.7](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.6...v3.0.0-alpha.7) (2025-11-28)


### Features

* add testkit-js password handling ([0e293a9](https://github.com/midnightntwrk/midnight-js/commit/0e293a965d2d725514f8cba7e638986fc1c4c8ae))
* async submit tx and call ([#348](https://github.com/midnightntwrk/midnight-js/pull/348)) ([a37e96f](https://github.com/midnightntwrk/midnight-js/commit/a37e96fb86ec89c7fa04c542993c601d3f679daf))
* encrypt storage ([ae863fe](https://github.com/midnightntwrk/midnight-js/commit/ae863fe2a729fc270d0c18ad9ed71e4ece936bc2))
* encrypt storage ([420a64d](https://github.com/midnightntwrk/midnight-js/commit/420a64d72a7c375ce719c22fadc76de29a81b00d))
* remove debug code on build on CI ([082f1db](https://github.com/midnightntwrk/midnight-js/commit/082f1db0f736a744f1004a5344fdf0b1b758a706))


### Improvements

* add 'release' to commitlint configuration ([d48f6c6](https://github.com/midnightntwrk/midnight-js/commit/d48f6c62a27a617c43c685020d3f27608963b1f6))
* **docs:** unify commit message format for API documentation updates ([96b8504](https://github.com/midnightntwrk/midnight-js/commit/96b8504dc9c4015d95311014b15bd38087b54345))
* **docs:** unify commit message format for API documentation updates ([6a3e6c0](https://github.com/midnightntwrk/midnight-js/commit/6a3e6c083d0200009d941bd1811d93f04f804e0e))
* **release:** bump version to 3.0.0-alpha.7 ([4d106f7](https://github.com/midnightntwrk/midnight-js/commit/4d106f79c10a137e8d4408e3ac030678b30e0f4f))
* update build script to copy run-compactc.cjs to dist and remove it from files ([96e8187](https://github.com/midnightntwrk/midnight-js/commit/96e81871256aa8e6fc90e4205a08f2e8ead16d56))
* update license to Apache-2.0 and adjust run-compactc path in package.json ([adf794d](https://github.com/midnightntwrk/midnight-js/commit/adf794d1082d5403d53d13f9cd97fcc95a7698cf))
* update run-compactc path in yarn.lock to point to dist ([05eb923](https://github.com/midnightntwrk/midnight-js/commit/05eb9234967113d0c480eeb717180a5a9e00f6ee))

## [3.0.0-alpha.6](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.5...v3.0.0-alpha.6) (2025-11-26)


### Features

* update @midnight-ntwrk/wallet-sdk-facade to 1.0.0-beta.10 ([8d5136f](https://github.com/midnightntwrk/midnight-js/commit/8d5136fd244cc88d476b9bbcda3a82946aadad27))


### Bug Fixes

* cleaner types in wallet provider ([#346](https://github.com/midnightntwrk/midnight-js/pull/346)) ([e08e655](https://github.com/midnightntwrk/midnight-js/commit/e08e6559724bfb54778d95085629e6c17757541a))


### Improvements

* **deps:** bump actions/checkout from 5 to 6 ([#341](https://github.com/midnightntwrk/midnight-js/pull/341)) ([002ea41](https://github.com/midnightntwrk/midnight-js/commit/002ea41514a0af708d653732757a8f6e71c355a7))
* **deps:** bump body-parser ([#351](https://github.com/midnightntwrk/midnight-js/pull/351)) ([f9177fa](https://github.com/midnightntwrk/midnight-js/commit/f9177fa266551619d5384d3babc116597cc3871b))
* **release:** bump version to 3.0.0-alpha.6 ([82c64d9](https://github.com/midnightntwrk/midnight-js/commit/82c64d9785136bd106f412b05d0fcbd414d2ed10))

## [3.0.0-alpha.5](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.4...v3.0.0-alpha.5) (2025-11-24)


### Features

* clean wallet provider ([#342](https://github.com/midnightntwrk/midnight-js/pull/342)) ([f3f2601](https://github.com/midnightntwrk/midnight-js/commit/f3f260193168c658fbd7fbeb8f9e68a213d08fa2))


### Improvements

* **release:** bump version to 3.0.0-alpha.5 ([#345](https://github.com/midnightntwrk/midnight-js/pull/345)) ([6f2736c](https://github.com/midnightntwrk/midnight-js/commit/6f2736cbeead41016401eed7940583c1d78e7f85))

## [3.0.0-alpha.4](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.3...v3.0.0-alpha.4) (2025-11-21)


### Features

* handle BalanceTransactionToProve ([#320](https://github.com/midnightntwrk/midnight-js/pull/320)) ([ccb24ca](https://github.com/midnightntwrk/midnight-js/commit/ccb24cab95cf0e77f23a66682e79c1a8d09286d0))


### Improvements

* **deps:** bump @babel/helpers ([#323](https://github.com/midnightntwrk/midnight-js/pull/323)) ([accc449](https://github.com/midnightntwrk/midnight-js/commit/accc4492e5000fb198a5e68149c8d77246c5fe72))
* **deps:** update dependency @effect/experimental to v0.57.3 ([#321](https://github.com/midnightntwrk/midnight-js/pull/321)) ([9cf1c39](https://github.com/midnightntwrk/midnight-js/commit/9cf1c39c4cc6b592395b6bd0e8afc1c9c5dae74b))
* **deps:** update dependency @effect/experimental to v0.57.4 ([#331](https://github.com/midnightntwrk/midnight-js/pull/331)) ([caf7cab](https://github.com/midnightntwrk/midnight-js/commit/caf7cab855487fec134b5a355eb574c2d6afa2f3))
* **deps:** update dependency @effect/rpc to v0.72.2 ([#332](https://github.com/midnightntwrk/midnight-js/pull/332)) ([0955da1](https://github.com/midnightntwrk/midnight-js/commit/0955da1b8fe58a63c4c2431fd1f0cd1a1463a0e4))
* **deps:** update dependency @effect/workflow to ^0.12.0 ([#310](https://github.com/midnightntwrk/midnight-js/pull/310)) ([5890e15](https://github.com/midnightntwrk/midnight-js/commit/5890e152af62a6c2a6f80a0671eb9ef21ddf7a9d))
* **deps:** update dependency @tsconfig/node24 to v24.0.3 ([#324](https://github.com/midnightntwrk/midnight-js/pull/324)) ([0fb07fe](https://github.com/midnightntwrk/midnight-js/commit/0fb07fe3a845d9e716e26c8b9f0b121aa06aa29d))
* **deps:** update dependency glob to v11.1.0 [security] ([#322](https://github.com/midnightntwrk/midnight-js/pull/322)) ([c47d222](https://github.com/midnightntwrk/midnight-js/commit/c47d2224a2b0eda22079c11a5c37772168cab665))
* **deps:** update dependency lint-staged to v16.2.7 ([#330](https://github.com/midnightntwrk/midnight-js/pull/330)) ([5ef8afb](https://github.com/midnightntwrk/midnight-js/commit/5ef8afb6f1b5883a455887330ef55f9a6225ad14))
* **deps:** update dependency rollup to v4.53.3 ([#327](https://github.com/midnightntwrk/midnight-js/pull/327)) ([fcba43c](https://github.com/midnightntwrk/midnight-js/commit/fcba43ca01ef5dd6716f37702e8c4aa34b1e4a55))
* **deps:** update dependency testcontainers to v11.8.1 ([#328](https://github.com/midnightntwrk/midnight-js/pull/328)) ([ed6173b](https://github.com/midnightntwrk/midnight-js/commit/ed6173b65b31e53e093761b73f71ba51f2ce984c))
* **deps:** update vitest monorepo to v4.0.10 ([#313](https://github.com/midnightntwrk/midnight-js/pull/313)) ([56d4304](https://github.com/midnightntwrk/midnight-js/commit/56d430497bb0eec76df91e6c5d61062ead9f1b60))
* indexer-standalone:3.0.0-alpha.10 ([1f53a0a](https://github.com/midnightntwrk/midnight-js/commit/1f53a0aebae0a248b35feefeb5e48179f70d6ddb))
* indexer-standalone:3.0.0-alpha.11 ([b4f5347](https://github.com/midnightntwrk/midnight-js/commit/b4f53474f1d92eb5df9155eec8ff14e29daf0d83))
* midnight-node:0.18.0-rc.6 ([11af678](https://github.com/midnightntwrk/midnight-js/commit/11af678fd99cd933ce189a0ffbe567e22af0182a))
* **release:** bump version to 3.0.0-alpha.4 ([#335](https://github.com/midnightntwrk/midnight-js/pull/335)) ([fd89509](https://github.com/midnightntwrk/midnight-js/commit/fd8950947630fd4c1d1ac22a7b840edef115bc38))
* tweak testkit-js default configuration ([f2ef937](https://github.com/midnightntwrk/midnight-js/commit/f2ef9370ce7d803fe41ceedb8e28818b3a76df01))

## [3.0.0-alpha.3](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.2...v3.0.0-alpha.3) (2025-11-17)


### Features

* automated indexer schema update ([bd287f7](https://github.com/midnightntwrk/midnight-js/commit/bd287f7865ee15d17dfa09b77a5f2b24d2a1d703))
* delta should be undefined if balance is 0 ([0b0bf30](https://github.com/midnightntwrk/midnight-js/commit/0b0bf305d1802bad6a905741eec28ea4bf067f89))
* fix broken api docs generation ([e7bfafd](https://github.com/midnightntwrk/midnight-js/commit/e7bfafd2389ab970dfd7b1f32ab6556417dd6748))
* fix docs generation ([9c700c0](https://github.com/midnightntwrk/midnight-js/commit/9c700c056e595aedfa0015df332d892c13838764))
* fix workflows - replace istanbul with nyc ([e79010d](https://github.com/midnightntwrk/midnight-js/commit/e79010dbdca5541ce468dd76e84114d955631cfd))
* lockfile ([3a2e77e](https://github.com/midnightntwrk/midnight-js/commit/3a2e77e518f5d9939d16967f9fadc5fc8c056d99))
* release 3.0.0-alpha.3 ([#318](https://github.com/midnightntwrk/midnight-js/pull/318)) ([585edd2](https://github.com/midnightntwrk/midnight-js/commit/585edd273e48f1f2d0f321d399cd52c82d9b7a7d))
* release script ([#308](https://github.com/midnightntwrk/midnight-js/pull/308)) ([19d918c](https://github.com/midnightntwrk/midnight-js/commit/19d918c751b34fa425f037ec8ebef91f2ed2d861))
* remove Allure server reporting from CI configuration ([3465190](https://github.com/midnightntwrk/midnight-js/commit/3465190dd6eedd0c8d53585fa500d02379cebb1b))
* remove obsolete steps from the release script ([#317](https://github.com/midnightntwrk/midnight-js/pull/317)) ([bbd5dd7](https://github.com/midnightntwrk/midnight-js/commit/bbd5dd76e5ce676a57e5bfced038741f66fb2a15))
* replace compactc ([0fb103e](https://github.com/midnightntwrk/midnight-js/commit/0fb103efe3301be3e6e484c9f5adc81f64b4add2))
* replace compactc ([90f579f](https://github.com/midnightntwrk/midnight-js/commit/90f579feb6a697676a489027438e7ebd3f7ee162))
* update node imports and tweak config ([034a4cb](https://github.com/midnightntwrk/midnight-js/commit/034a4cb802381760bbf79f48b5e689d02513ff2c))
* update wallet ([#297](https://github.com/midnightntwrk/midnight-js/pull/297)) ([3b2f5dc](https://github.com/midnightntwrk/midnight-js/commit/3b2f5dce21e78aeb4b58a85b591bb0ce9cad5a44))


### Improvements

* **deps:** bump actions/checkout from 4 to 5 ([#288](https://github.com/midnightntwrk/midnight-js/pull/288)) ([2f583a6](https://github.com/midnightntwrk/midnight-js/commit/2f583a6495cc934054507c954aa352ea5e6274ec))
* **deps:** bump actions/setup-node from 4 to 6 ([#287](https://github.com/midnightntwrk/midnight-js/pull/287)) ([31416b6](https://github.com/midnightntwrk/midnight-js/commit/31416b6161790208d50ba7644a5b4aeffb563ca0))
* **deps:** bump js-yaml in the npm_and_yarn group across 1 directory ([#307](https://github.com/midnightntwrk/midnight-js/pull/307)) ([002595a](https://github.com/midnightntwrk/midnight-js/commit/002595a46bc9db3b40fd08633ef267139f1c4b3c))
* **deps:** update dependency @effect/experimental to ^0.57.0 ([#283](https://github.com/midnightntwrk/midnight-js/pull/283)) ([2a07c17](https://github.com/midnightntwrk/midnight-js/commit/2a07c171c0c9af114bd206a37c963e4252ce8bd4))
* **deps:** update dependency @effect/experimental to v0.57.1 ([#293](https://github.com/midnightntwrk/midnight-js/pull/293)) ([ac23fd6](https://github.com/midnightntwrk/midnight-js/commit/ac23fd6b5146b524b581a24f8cef195593ae1cf6))
* **deps:** update dependency @effect/platform-node-shared to ^0.53.0 ([#285](https://github.com/midnightntwrk/midnight-js/pull/285)) ([5e39e51](https://github.com/midnightntwrk/midnight-js/commit/5e39e518705e0c9a427d4da8bb6c0bce265766e3))
* **deps:** update dependency @effect/rpc to ^0.72.0 ([#286](https://github.com/midnightntwrk/midnight-js/pull/286)) ([97f4499](https://github.com/midnightntwrk/midnight-js/commit/97f44998c1fa85f11f7e661df56ad27c84b3ece8))
* **deps:** update dependency @effect/sql to ^0.48.0 ([#305](https://github.com/midnightntwrk/midnight-js/pull/305)) ([fcca1cf](https://github.com/midnightntwrk/midnight-js/commit/fcca1cf9253ddfa1076dcad8ef57c066639e65b3))
* **deps:** update dependency @effect/vitest to ^0.27.0 ([#306](https://github.com/midnightntwrk/midnight-js/pull/306)) ([d71fc79](https://github.com/midnightntwrk/midnight-js/commit/d71fc795820b5d358ba10555b3138384dc099280))
* **deps:** update dependency @tsconfig/node22 to v22.0.3 ([#294](https://github.com/midnightntwrk/midnight-js/pull/294)) ([a796bba](https://github.com/midnightntwrk/midnight-js/commit/a796bba54efac08321c428f866523797b87ffc26))
* **deps:** update dependency @tsconfig/node22 to v22.0.3 ([#299](https://github.com/midnightntwrk/midnight-js/pull/299)) ([e9fb568](https://github.com/midnightntwrk/midnight-js/commit/e9fb568029fb383ed2f8f4be11a985fe8afb6c16))
* **deps:** update dependency @types/node to v24.10.1 ([#289](https://github.com/midnightntwrk/midnight-js/pull/289)) ([6e85b88](https://github.com/midnightntwrk/midnight-js/commit/6e85b886789c9ca2278d01c1744c227f1eeae6ae))
* **deps:** update dependency @types/node to v24.10.1 ([#300](https://github.com/midnightntwrk/midnight-js/pull/300)) ([38a6171](https://github.com/midnightntwrk/midnight-js/commit/38a617134593a4e66fce9139970979b1dd6304dc))
* **deps:** update dependency axios to v1.13.2 ([#278](https://github.com/midnightntwrk/midnight-js/pull/278)) ([47b4852](https://github.com/midnightntwrk/midnight-js/commit/47b48528b45fc3ac09a6f6f3410b1ff129784cd3))
* **deps:** update dependency jsdom to v27.2.0 ([#311](https://github.com/midnightntwrk/midnight-js/pull/311)) ([e078405](https://github.com/midnightntwrk/midnight-js/commit/e07840538d060136325ff05a6b9fe251f7205c00))
* **deps:** update dependency node to v24.11.1 ([#290](https://github.com/midnightntwrk/midnight-js/pull/290)) ([0cab0c1](https://github.com/midnightntwrk/midnight-js/commit/0cab0c1315d2f3d6f0d2fdc23f3c0eaa3d5a8396))
* **deps:** update dependency typescript-eslint to v8.46.4 ([#291](https://github.com/midnightntwrk/midnight-js/pull/291)) ([325f10b](https://github.com/midnightntwrk/midnight-js/commit/325f10b950ad5cbabdda7b94e0c43c61f261fa81))
* **deps:** update dependency typescript-eslint to v8.46.4 ([#301](https://github.com/midnightntwrk/midnight-js/pull/301)) ([e6ae05e](https://github.com/midnightntwrk/midnight-js/commit/e6ae05e7dbdf39757de0fc1afa311e3a568d99c1))
* **deps:** update graphqlcodegenerator monorepo ([#292](https://github.com/midnightntwrk/midnight-js/pull/292)) ([59458d6](https://github.com/midnightntwrk/midnight-js/commit/59458d6f4586d232f67c994b4325575104cff323))
* **deps:** update graphqlcodegenerator monorepo (major) ([#246](https://github.com/midnightntwrk/midnight-js/pull/246)) ([cece16c](https://github.com/midnightntwrk/midnight-js/commit/cece16c8b07a23c0751f5ab3924290ee4a0b4f44))
* **deps:** update graphqlcodegenerator monorepo to v5.1.3 ([#298](https://github.com/midnightntwrk/midnight-js/pull/298)) ([643111f](https://github.com/midnightntwrk/midnight-js/commit/643111fa3c5cdbd25774746cdc0d60cab3eec9ba))
* **deps:** update vitest monorepo to v4 ([bf72e9a](https://github.com/midnightntwrk/midnight-js/commit/bf72e9acd7514410433821653bb0eec67d719274))
* **deps:** update vitest monorepo to v4.0.9 ([#303](https://github.com/midnightntwrk/midnight-js/pull/303)) ([6d3e9b9](https://github.com/midnightntwrk/midnight-js/commit/6d3e9b9e7f80e7b8326a7f8ee1e8a5eb5057de57))

## [3.0.0-alpha.2](https://github.com/midnightntwrk/midnight-js/compare/v3.0.0-alpha.1...v3.0.0-alpha.2) (2025-11-05)


### Features

* change assertions ([1e7db4e](https://github.com/midnightntwrk/midnight-js/commit/1e7db4e7bfb70f5a1c4c97db37f91289eea7afcc))
* fix esm and cjs packaging ([3d224d4](https://github.com/midnightntwrk/midnight-js/commit/3d224d4d0c690beb1d107eaffb17974dadd1cc1e))
* update cd workflow ([#265](https://github.com/midnightntwrk/midnight-js/pull/265)) ([df3a423](https://github.com/midnightntwrk/midnight-js/commit/df3a423200a11b23a7a44de68fd4cd97daabbea9))
* update components ([1f06ec0](https://github.com/midnightntwrk/midnight-js/commit/1f06ec0f7750307903438aba24aa30c52128793b))
* update indexer TxId mapping ([9ed2fef](https://github.com/midnightntwrk/midnight-js/commit/9ed2fefdfe77be7f278ea6e7ef26157fd0d754af))
* update mock ([afb9bdf](https://github.com/midnightntwrk/midnight-js/commit/afb9bdf4e2cf78a60883f748d533b80fcb844d8f))
* update submit tx ([7ceba12](https://github.com/midnightntwrk/midnight-js/commit/7ceba126eb7081de2d3451fb8843ccb844e36273))
* update tests ([6d46777](https://github.com/midnightntwrk/midnight-js/commit/6d467779a185534f409e8e0a441d2b164da0ff25))
* update the FinalizedTxData to store all transaction identifiers ([df58c30](https://github.com/midnightntwrk/midnight-js/commit/df58c3043563c395ed2c8617882df9d8aaed26ac))


### Bug Fixes

* **deps:** update dependency superjson to v2.2.5 ([#276](https://github.com/midnightntwrk/midnight-js/pull/276)) ([18d26ec](https://github.com/midnightntwrk/midnight-js/commit/18d26ec9158a69d35aa72235c2d7bc5e25e83487))


### Improvements

* **deps:** bump actions/upload-artifact from 4.4.3 to 5.0.0 ([#255](https://github.com/midnightntwrk/midnight-js/pull/255)) ([1946bdd](https://github.com/midnightntwrk/midnight-js/commit/1946bdda9e5b49fec79898bfa30043a759fe0960))
* **deps:** bump ctrf-io/github-test-reporter from 1.0.25 to 1.0.26 ([#269](https://github.com/midnightntwrk/midnight-js/pull/269)) ([ce3ee9a](https://github.com/midnightntwrk/midnight-js/commit/ce3ee9a74213544695a47aa6747e57daae4c24a6))
* **deps:** bump EnricoMi/publish-unit-test-result-action ([#271](https://github.com/midnightntwrk/midnight-js/pull/271)) ([2fc8ab7](https://github.com/midnightntwrk/midnight-js/commit/2fc8ab7be53286dbb7e8a3b11b390e100bba309a))
* **deps:** bump mikepenz/action-junit-report from 6.0.0 to 6.0.1 ([#270](https://github.com/midnightntwrk/midnight-js/pull/270)) ([095db97](https://github.com/midnightntwrk/midnight-js/commit/095db978f4860dd420d313e5e354511d9ca7382f))
* **deps:** update actions/github-script action to v8 ([#260](https://github.com/midnightntwrk/midnight-js/pull/260)) ([05d59ee](https://github.com/midnightntwrk/midnight-js/commit/05d59ee071e84b531d88a39affb442353bd074fe))
* **deps:** update dependency @fast-check/vitest to v0.2.3 ([#273](https://github.com/midnightntwrk/midnight-js/pull/273)) ([6c0bcd2](https://github.com/midnightntwrk/midnight-js/commit/6c0bcd2ca1d1908fcf452bc2791cfbfec49769d5))
* **deps:** update dependency @types/express to v5.0.5 ([#258](https://github.com/midnightntwrk/midnight-js/pull/258)) ([5163a92](https://github.com/midnightntwrk/midnight-js/commit/5163a92c97e33df0de133fe5d64f5ff03c5fc68a))
* **deps:** update dependency allure-vitest to v3.4.2 ([#274](https://github.com/midnightntwrk/midnight-js/pull/274)) ([cd15b40](https://github.com/midnightntwrk/midnight-js/commit/cd15b4091973b97349c07f2999541047c77da1e0))
* **deps:** update dependency axios to v1.13.1 ([#257](https://github.com/midnightntwrk/midnight-js/pull/257)) ([7cc7f95](https://github.com/midnightntwrk/midnight-js/commit/7cc7f95d32debf94bacb799c3a7cf2d46ed1ee52))
* **deps:** update dependency node to v24 ([#259](https://github.com/midnightntwrk/midnight-js/pull/259)) ([e7d1a0f](https://github.com/midnightntwrk/midnight-js/commit/e7d1a0fc39dd008832f17afe15d46194b3f77f4f))
* **deps:** update dependency pino to v10 ([#245](https://github.com/midnightntwrk/midnight-js/pull/245)) ([773ee91](https://github.com/midnightntwrk/midnight-js/commit/773ee91f427ff524c294e810f08c00512298ec57))
* **deps:** update dependency typescript-eslint to v8.46.3 ([#275](https://github.com/midnightntwrk/midnight-js/pull/275)) ([b5feb2e](https://github.com/midnightntwrk/midnight-js/commit/b5feb2e67a85cf9cb8804ca214f46c21a9a4ef3f))
* **release:** bump version to 3.0.0-alpha.2 ([#279](https://github.com/midnightntwrk/midnight-js/pull/279)) ([6ba77cc](https://github.com/midnightntwrk/midnight-js/commit/6ba77cca12ab3ee1158739c0eb3a83a42521dbff))

## [3.0.0-alpha.1](https://github.com/midnightntwrk/midnight-js/compare/v2.1.0...v3.0.0-alpha.1) (2025-10-29)


### Features

* "Undeployed" typo ([b816a8e](https://github.com/midnightntwrk/midnight-js/commit/b816a8efbf02a4051c8003a0a7390eadc510bbcf))
* add docs for testkit-js ([2ab6dd4](https://github.com/midnightntwrk/midnight-js/commit/2ab6dd46d3fb358045fa6449c8e5ceb16ace5f36))
* add unshielded address parsing ([5144503](https://github.com/midnightntwrk/midnight-js/commit/51445037e67028ea8d31a2c1cd1280a5b88627a7))
* **compact-js:** change import of json5 ([#243](https://github.com/midnightntwrk/midnight-js/pull/243)) ([8d87ccd](https://github.com/midnightntwrk/midnight-js/commit/8d87ccd48544b93407b111701f79fef31c43a710))
* fix docs api flow ([e1f5b10](https://github.com/midnightntwrk/midnight-js/commit/e1f5b10c53297421b806829b036554e1a3edc28c))
* fix prerelease workflow ([#242](https://github.com/midnightntwrk/midnight-js/pull/242)) ([7934d2a](https://github.com/midnightntwrk/midnight-js/commit/7934d2a314eaa1affd058a32af18b951622a13f0))
* fix publint ([cad1a9f](https://github.com/midnightntwrk/midnight-js/commit/cad1a9f03eb207dc18a2b568feda8dcd735f2f6f))
* fix publint ([4597e32](https://github.com/midnightntwrk/midnight-js/commit/4597e32380f015bfad8ce1a9b4a3a10f06b9bcf5))
* indexer chainState replaced with zswapState ([40f2253](https://github.com/midnightntwrk/midnight-js/commit/40f225331a71b34fa9c7accaa549b219e955ffd1))
* less code now action is public ([25e975a](https://github.com/midnightntwrk/midnight-js/commit/25e975a8bd1bc0ccbe6acbc6974dbaf47dc509a9))
* lockfile ([9d05a65](https://github.com/midnightntwrk/midnight-js/commit/9d05a655893b35338010f76f260dff819ee02b79))
* **midnight-js:** Migration to ledger 6 and add Unshielded Tokens ([#125](https://github.com/midnightntwrk/midnight-js/pull/125)) ([aec8321](https://github.com/midnightntwrk/midnight-js/commit/aec83218a8c6218412e98bb1b03832257351a4f8)), closes [#126](https://github.com/midnightntwrk/midnight-js/pull/126) [#127](https://github.com/midnightntwrk/midnight-js/pull/127) [#129](https://github.com/midnightntwrk/midnight-js/pull/129) [#130](https://github.com/midnightntwrk/midnight-js/pull/130)
* point to fork friendly action. Caution: uses pull_request_target. ([77e361d](https://github.com/midnightntwrk/midnight-js/commit/77e361de7eeaec1b4a4be0e2813622463175c9bc))
* resolve esm compatibility issue ([#241](https://github.com/midnightntwrk/midnight-js/pull/241)) ([3acb59b](https://github.com/midnightntwrk/midnight-js/commit/3acb59be62d1fbb2711d221ac2e3a8c2a4f54a42))
* update CHANGELOG.md ([af6c18e](https://github.com/midnightntwrk/midnight-js/commit/af6c18e15ac5f03a6cf91a39e90dd8facd70dcd3))
* update ci ([85d0e36](https://github.com/midnightntwrk/midnight-js/commit/85d0e36664413580a64bc344b6c22bbc2e57c132))
* update indexer and node docker images ([d03f1e5](https://github.com/midnightntwrk/midnight-js/commit/d03f1e5f3c8cddbd93160c7787ae6a87a87be964))
* update node to 0.17.1-8d7c529d ([d95754b](https://github.com/midnightntwrk/midnight-js/commit/d95754b08337c727bc4ee8f29f073ad2abad745e))
* update node to 0.18.0-rc.1 ([b6b734e](https://github.com/midnightntwrk/midnight-js/commit/b6b734e28b80018a0def96b90983984baed4f7d4))
* update test and roll back one workaround ([47178a6](https://github.com/midnightntwrk/midnight-js/commit/47178a679a6e5ed957160bd789c2a18cc279bb93))
* update tests ([a833408](https://github.com/midnightntwrk/midnight-js/commit/a833408337f5136b0320177e0821b6525b749388))
* update tests ([a81a040](https://github.com/midnightntwrk/midnight-js/commit/a81a040240607641c3c58def500ebfcb8d23ed7d))
* update unshielded tests ([86d5d20](https://github.com/midnightntwrk/midnight-js/commit/86d5d203a647e79fa8890c8ec52c329ed02d5bb9))
* update wallet and remove workarounds ([c73eb95](https://github.com/midnightntwrk/midnight-js/commit/c73eb959c14ae03200de6f4d637831b6ca9e88f3))
* update wf ([6aec674](https://github.com/midnightntwrk/midnight-js/commit/6aec674e6e5372062ae2665cf296d242c848193a))
* update workflow ([dd8ca6b](https://github.com/midnightntwrk/midnight-js/commit/dd8ca6b370a79f77ea6fb9197d6c046f9c05a2bc))


### Bug Fixes

* **deps:** update dependency @midnight-ntwrk/ledger to v6.1.0-alpha.4 ([#225](https://github.com/midnightntwrk/midnight-js/pull/225)) ([de32378](https://github.com/midnightntwrk/midnight-js/commit/de32378557a12fe4bd5ea9f9002485a87c170fdc))
* **deps:** update dependency @scure/base to v1.2.6 ([#240](https://github.com/midnightntwrk/midnight-js/pull/240)) ([63664b8](https://github.com/midnightntwrk/midnight-js/commit/63664b8ee0251a3b03e7ea6d76836148e50a89e7))
* **deps:** update dependency @scure/base to v2 ([#248](https://github.com/midnightntwrk/midnight-js/pull/248)) ([a92d34b](https://github.com/midnightntwrk/midnight-js/commit/a92d34b2c25df3e217baaaad549e65e6f800c151))
* **deps:** update dependency superjson to v2.2.3 ([#229](https://github.com/midnightntwrk/midnight-js/pull/229)) ([9584f7c](https://github.com/midnightntwrk/midnight-js/commit/9584f7cb3e850b2d15732ce4820956b728804093))
* point to updated action: include upload of results. ([9affa42](https://github.com/midnightntwrk/midnight-js/commit/9affa4280b93f1d4d79b098d9fb61ab0de51ebe4))


### Code Refactoring

* **compact-js:** Add type handling for array types in `transformParams` ([#192](https://github.com/midnightntwrk/midnight-js/pull/192)) ([6a76ef6](https://github.com/midnightntwrk/midnight-js/commit/6a76ef682daccbb647d5a2ea30345c910bcf9679))
* **compact-js:** Report type name for literal and reference types ([#188](https://github.com/midnightntwrk/midnight-js/pull/188)) ([9c18c13](https://github.com/midnightntwrk/midnight-js/commit/9c18c1343fc29cb2478820ef7fcc55ff6881940c))


### Improvements

* **deps:** bump actions/download-artifact from 5.0.0 to 6.0.0 ([#254](https://github.com/midnightntwrk/midnight-js/pull/254)) ([e94ef4e](https://github.com/midnightntwrk/midnight-js/commit/e94ef4e6512a6308dd1e364c81e1ebce3de71edb))
* **deps:** bump actions/setup-node from 5.0.0 to 6.0.0 ([#218](https://github.com/midnightntwrk/midnight-js/pull/218)) ([cdb1ad5](https://github.com/midnightntwrk/midnight-js/commit/cdb1ad51f5e93e51a164027cf2845fee379de75c))
* **deps:** bump ctrf-io/github-test-reporter from 1.0.22 to 1.0.25 ([#207](https://github.com/midnightntwrk/midnight-js/pull/207)) ([b7aee79](https://github.com/midnightntwrk/midnight-js/commit/b7aee79a90bc5e34bfad595eb303e674c9ff0642))
* **deps:** bump mikepenz/action-junit-report from 5.6.2 to 6.0.0 ([#208](https://github.com/midnightntwrk/midnight-js/pull/208)) ([ffcab76](https://github.com/midnightntwrk/midnight-js/commit/ffcab761a32285c0ddd22eb29595912065cc24ee))
* **deps:** update commitlint monorepo to v20 ([#234](https://github.com/midnightntwrk/midnight-js/pull/234)) ([8b46863](https://github.com/midnightntwrk/midnight-js/commit/8b46863b90708f8d845bbd7ffd8aa6bbe998a5ae))
* **deps:** update dependency @effect/cluster to ^0.50.0 ([#190](https://github.com/midnightntwrk/midnight-js/pull/190)) ([b7a151f](https://github.com/midnightntwrk/midnight-js/commit/b7a151f6371794f8fa630927c5db15ddd67d78dd))
* **deps:** update dependency @effect/cluster to v0.50.6 ([#215](https://github.com/midnightntwrk/midnight-js/pull/215)) ([62be37a](https://github.com/midnightntwrk/midnight-js/commit/62be37ae2f89aa7562198c06286c96d53cda10df))
* **deps:** update dependency @effect/platform-node to ^0.98.0 ([#195](https://github.com/midnightntwrk/midnight-js/pull/195)) ([478428d](https://github.com/midnightntwrk/midnight-js/commit/478428d648a5b6f729d1de27070a7beb7cbea806))
* **deps:** update dependency @effect/platform-node to v0.98.4 ([#216](https://github.com/midnightntwrk/midnight-js/pull/216)) ([b7c6427](https://github.com/midnightntwrk/midnight-js/commit/b7c64271ed54d80e066dd3fecebfda0811e9154a))
* **deps:** update dependency @effect/platform-node-shared to v0.51.6 ([#220](https://github.com/midnightntwrk/midnight-js/pull/220)) ([48e4845](https://github.com/midnightntwrk/midnight-js/commit/48e48457d5184767cd5af7e05478aabc46647446))
* **deps:** update dependency @effect/rpc to ^0.71.0 ([#197](https://github.com/midnightntwrk/midnight-js/pull/197)) ([ed15a22](https://github.com/midnightntwrk/midnight-js/commit/ed15a22bbbad97be083b6e4f977267d0b19e6b4a))
* **deps:** update dependency @effect/rpc to v0.71.1 ([#221](https://github.com/midnightntwrk/midnight-js/pull/221)) ([a59e94d](https://github.com/midnightntwrk/midnight-js/commit/a59e94d5aae083c0b2bc89ae704b29b2958f5135))
* **deps:** update dependency @effect/sql to ^0.46.0 ([#201](https://github.com/midnightntwrk/midnight-js/pull/201)) ([19e4843](https://github.com/midnightntwrk/midnight-js/commit/19e4843023e4ea0618dc19c3ac501ccfad167cc1))
* **deps:** update dependency @effect/vitest to ^0.26.0 ([#203](https://github.com/midnightntwrk/midnight-js/pull/203)) ([1ad7534](https://github.com/midnightntwrk/midnight-js/commit/1ad75343cd51b3c73b9c310059e0ef657a67f7e3))
* **deps:** update dependency @effect/workflow to v0.11.5 ([#222](https://github.com/midnightntwrk/midnight-js/pull/222)) ([77db47e](https://github.com/midnightntwrk/midnight-js/commit/77db47e61a2a20aa8cdad27ad66a384bdfa1f33c))
* **deps:** update dependency @rollup/plugin-commonjs to v28.0.8 ([#223](https://github.com/midnightntwrk/midnight-js/pull/223)) ([d726ed0](https://github.com/midnightntwrk/midnight-js/commit/d726ed08f6617db24ac25b648a1eb7dc50217d99))
* **deps:** update dependency @rollup/plugin-commonjs to v28.0.9 ([#250](https://github.com/midnightntwrk/midnight-js/pull/250)) ([9c4a0c3](https://github.com/midnightntwrk/midnight-js/commit/9c4a0c380c3ca29bc432f3b6ff0b2007a9add920))
* **deps:** update dependency @rollup/plugin-node-resolve to v16.0.3 ([#210](https://github.com/midnightntwrk/midnight-js/pull/210)) ([6f169ce](https://github.com/midnightntwrk/midnight-js/commit/6f169cea8de056597ad2f751e18a1f1d7783bd45))
* **deps:** update dependency @rollup/plugin-typescript to v12.3.0 ([#244](https://github.com/midnightntwrk/midnight-js/pull/244)) ([dc34be4](https://github.com/midnightntwrk/midnight-js/commit/dc34be48ded32a0bc476ef147988e707ecf24b31))
* **deps:** update dependency @types/express to v5.0.4 ([#249](https://github.com/midnightntwrk/midnight-js/pull/249)) ([ade95a9](https://github.com/midnightntwrk/midnight-js/commit/ade95a97bfa9356a21b82b6dab9e71c6018401a6))
* **deps:** update dependency @types/node to v22.18.12 ([#202](https://github.com/midnightntwrk/midnight-js/pull/202)) ([7505c36](https://github.com/midnightntwrk/midnight-js/commit/7505c360390104094fe8b1703816217c65b7bced))
* **deps:** update dependency allure-vitest to v3.4.1 ([#204](https://github.com/midnightntwrk/midnight-js/pull/204)) ([e46603c](https://github.com/midnightntwrk/midnight-js/commit/e46603cadc731ae6f2d7cf082153a4cedb9ec2d8))
* **deps:** update dependency eslint-plugin-unused-imports to v4.3.0 ([#226](https://github.com/midnightntwrk/midnight-js/pull/226)) ([0f2ee49](https://github.com/midnightntwrk/midnight-js/commit/0f2ee4940c28004d047211c4117462ecd93d5b33))
* **deps:** update dependency jsdom to v27 ([#235](https://github.com/midnightntwrk/midnight-js/pull/235)) ([7560020](https://github.com/midnightntwrk/midnight-js/commit/756002037d92d5277e041901bb792f8035b24de3))
* **deps:** update dependency lint-staged to v16.2.4 ([#205](https://github.com/midnightntwrk/midnight-js/pull/205)) ([9c087e1](https://github.com/midnightntwrk/midnight-js/commit/9c087e16d17c02e53ecc613d553eab4829b7c45f))
* **deps:** update dependency lint-staged to v16.2.5 ([#224](https://github.com/midnightntwrk/midnight-js/pull/224)) ([4e2c00c](https://github.com/midnightntwrk/midnight-js/commit/4e2c00c41ac95635f8bf455364b30a9da116cfc7))
* **deps:** update dependency lint-staged to v16.2.6 ([#236](https://github.com/midnightntwrk/midnight-js/pull/236)) ([ee57827](https://github.com/midnightntwrk/midnight-js/commit/ee57827e664851759c25e2c263d871a5e20851f7))
* **deps:** update dependency node to v22.21.0 ([#211](https://github.com/midnightntwrk/midnight-js/pull/211)) ([3d87606](https://github.com/midnightntwrk/midnight-js/commit/3d87606f853f8877b203f30005d2bb738e42ee90))
* **deps:** update dependency pino to v9.14.0 ([#212](https://github.com/midnightntwrk/midnight-js/pull/212)) ([43ca947](https://github.com/midnightntwrk/midnight-js/commit/43ca947e475d7876b9e695d2259c07ca0983b63d))
* **deps:** update dependency pino-pretty to v13.1.2 ([#194](https://github.com/midnightntwrk/midnight-js/pull/194)) ([365f1f3](https://github.com/midnightntwrk/midnight-js/commit/365f1f378bd6a81b2bc137069d3df7772fd16ca2))
* **deps:** update dependency rollup to v4.52.5 ([#213](https://github.com/midnightntwrk/midnight-js/pull/213)) ([dfed54a](https://github.com/midnightntwrk/midnight-js/commit/dfed54a0d838db4b4fa6276cef282aedc221e5ec))
* **deps:** update dependency testcontainers to v11.7.1 ([#227](https://github.com/midnightntwrk/midnight-js/pull/227)) ([d7bb098](https://github.com/midnightntwrk/midnight-js/commit/d7bb09869cb3f191a6840110e7b99b664493253e))
* **deps:** update dependency testcontainers to v11.7.2 ([#228](https://github.com/midnightntwrk/midnight-js/pull/228)) ([6fbbf82](https://github.com/midnightntwrk/midnight-js/commit/6fbbf8289a82d5e76777987ac5366101a5fa914c))
* **deps:** update dependency typedoc to v0.28.14 ([#200](https://github.com/midnightntwrk/midnight-js/pull/200)) ([a886000](https://github.com/midnightntwrk/midnight-js/commit/a886000f16eb2a1551ad0ee30b6ce074c531f97a))
* **deps:** update dependency typedoc-plugin-markdown to v4.9.0 ([#230](https://github.com/midnightntwrk/midnight-js/pull/230)) ([6b07140](https://github.com/midnightntwrk/midnight-js/commit/6b07140a1d095854334f16a8ce27d70f6c2e9fb9))
* **deps:** update dependency typescript-eslint to v8.46.2 ([#231](https://github.com/midnightntwrk/midnight-js/pull/231)) ([2b974d8](https://github.com/midnightntwrk/midnight-js/commit/2b974d842ebb33ca60e3701a3a1e780407af3edc))
* **deps:** update eslint monorepo to v9.38.0 ([#232](https://github.com/midnightntwrk/midnight-js/pull/232)) ([f585086](https://github.com/midnightntwrk/midnight-js/commit/f5850866e25aed986b0ec7c0dd10bf33d04d7c15))
* Integrate Compact.js 2.3, Platform.js 2.1 ([#214](https://github.com/midnightntwrk/midnight-js/pull/214)) ([fa7ca01](https://github.com/midnightntwrk/midnight-js/commit/fa7ca01cb6735e83ee96ee5dd265ead1bd6ed9f1))
* **release:** bump midnight-js and testkit-js packages to 3.0.0-alpha.1 ([d0380ef](https://github.com/midnightntwrk/midnight-js/commit/d0380ef027ea29aa77a2738b94767f146c86cf35))

## [2.1.0](https://github.com/midnightntwrk/midnight-js/compare/4fa5b3bf798ed082ba311998cd54bee7f8e349d1...v2.1.0) (2025-10-10)


### Features

* **compact-js:** Add contract maintenance operations to `ContractExecutable` ([#182](https://github.com/midnightntwrk/midnight-js/pull/182)) ([4c06f48](https://github.com/midnightntwrk/midnight-js/commit/4c06f48adc97952e1b62b86bc3b7d8e997aa8477))
* daily scans of main ([d04c1b3](https://github.com/midnightntwrk/midnight-js/commit/d04c1b3337af02c63b2f0afb788259605d938bc7))
* fix and update checkmarx ([f87f615](https://github.com/midnightntwrk/midnight-js/commit/f87f615106fd17a81161a1138558d1bd387a2b88))
* Platform.js and Compact.js ([#80](https://github.com/midnightntwrk/midnight-js/pull/80)) ([3a02d96](https://github.com/midnightntwrk/midnight-js/commit/3a02d96d633ea687bda03f1c416cf291ddbfddc1))
* schedule checkmarx daily (at midnight of couese) and allow manual kick off of workflow ([7bed270](https://github.com/midnightntwrk/midnight-js/commit/7bed270f8d45fccf92a3c0f33201a9c3ccb32eda))
* turn on dependabot ([9d37dc3](https://github.com/midnightntwrk/midnight-js/commit/9d37dc389016c317057c7d2ae5c7d52972a997d0))
* upgrade checkout action to latest version and pin to hash ([a4d2878](https://github.com/midnightntwrk/midnight-js/commit/a4d2878d05e6a6c93c65712db0ce44ea0d74e853))
* upgrade checkout action to latest version and pin to hash ([71c3777](https://github.com/midnightntwrk/midnight-js/commit/71c37772a9b694801bd4fda3a8a4ab6c222058ab))
* use latest checkmarx action ([a960114](https://github.com/midnightntwrk/midnight-js/commit/a960114068575169b6d75edbe36169983dd20a86))


### Bug Fixes

* add SARIF message validation for codeql-action compatibility ([5db5a41](https://github.com/midnightntwrk/midnight-js/commit/5db5a411c9f9d08674c1cde776312b446537fabb))
* **deps:** update dependency @apollo/client to v3.14.0 ([#93](https://github.com/midnightntwrk/midnight-js/pull/93)) ([257650f](https://github.com/midnightntwrk/midnight-js/commit/257650f964a356c8c103561a169b18fc43b0ba1b))
* **deps:** update dependency @dao-xyz/borsh to v5.2.4 ([#82](https://github.com/midnightntwrk/midnight-js/pull/82)) ([3a114f8](https://github.com/midnightntwrk/midnight-js/commit/3a114f88ed759887b1036f1eb7bbb2d53ab0da6c))
* **deps:** update dependency @effect/cli to v0.69.2 ([#108](https://github.com/midnightntwrk/midnight-js/pull/108)) ([45a4812](https://github.com/midnightntwrk/midnight-js/commit/45a4812d4daa5a22103dbc56817d244a3b2b467c))
* **deps:** update dependency @effect/platform to v0.90.10 ([#109](https://github.com/midnightntwrk/midnight-js/pull/109)) ([fcd9156](https://github.com/midnightntwrk/midnight-js/commit/fcd9156745ff8d399d48a51057830d1159ddf9cd))
* **deps:** update dependency @midnight-ntwrk/ledger to v6.1.0-alpha.3 ([c8b51a0](https://github.com/midnightntwrk/midnight-js/commit/c8b51a0667e12d433abfa5e1ae142d2f48ac5a07))
* **deps:** update dependency abstract-level to v3.1.1 ([#181](https://github.com/midnightntwrk/midnight-js/pull/181)) ([bfbbb8a](https://github.com/midnightntwrk/midnight-js/commit/bfbbb8a359fdc6d38acc09df398e7cb441430ef6))
* **deps:** update dependency effect to v3.17.14 ([#111](https://github.com/midnightntwrk/midnight-js/pull/111)) ([4b1bff2](https://github.com/midnightntwrk/midnight-js/commit/4b1bff288a515fadd8d1260eab73198253712f5e))
* **deps:** update dependency fp-ts to v2.16.11 ([#75](https://github.com/midnightntwrk/midnight-js/pull/75)) ([5567fd1](https://github.com/midnightntwrk/midnight-js/commit/5567fd14004d73d839ebcb233bc0ff1a783cf90e))
* **testkit:** update healthcheck parameters for improved reliability ([#169](https://github.com/midnightntwrk/midnight-js/pull/169)) ([713f5e8](https://github.com/midnightntwrk/midnight-js/commit/713f5e861171ade5f6a1bf1b1f4c6a1ad3d92b32))


### Documentation

* acknowledge original co-authors from repository migration ([0c34ecf](https://github.com/midnightntwrk/midnight-js/commit/0c34ecf1660280e3cecfc781ba7f239f68456920))
* acknowledge original co-authors from repository migration ([8bf34b9](https://github.com/midnightntwrk/midnight-js/commit/8bf34b92172f9b53929abb48d13181517d9c3866))
* acknowledge original co-authors from repository migration ([363527a](https://github.com/midnightntwrk/midnight-js/commit/363527aeb9b5857ffd2f43388a6444caf2033ece))


### Improvements

* Bump major version number on Platform.js and Compact.js ([#118](https://github.com/midnightntwrk/midnight-js/pull/118)) ([6a53094](https://github.com/midnightntwrk/midnight-js/commit/6a530942c4ce6d8b889b9034348d694831694254))
* commit staged changes across repos ([4fa5b3b](https://github.com/midnightntwrk/midnight-js/commit/4fa5b3bf798ed082ba311998cd54bee7f8e349d1))
* **compact-js/platform-js:** Fix up package version numbers ([#150](https://github.com/midnightntwrk/midnight-js/pull/150)) ([32356c3](https://github.com/midnightntwrk/midnight-js/commit/32356c3c825583a9d7d658060ef68ab4d21ee010))
* **compact-js:** Add detail to the Compact.js `README.md` files ([#159](https://github.com/midnightntwrk/midnight-js/pull/159)) ([2ce6e1e](https://github.com/midnightntwrk/midnight-js/commit/2ce6e1e651dda73d973332931132e2f0bf21956f))
* **compact-js:** Ensure that unshielded inputs, outputs, and spends are included in the public transcript ([#171](https://github.com/midnightntwrk/midnight-js/pull/171)) ([7699071](https://github.com/midnightntwrk/midnight-js/commit/7699071c468efdf9c092a0d37490757a268362fc))
* **compact-js:** Refactor command and CLI option usage ([#157](https://github.com/midnightntwrk/midnight-js/pull/157)) ([2df3189](https://github.com/midnightntwrk/midnight-js/commit/2df31895205b5962ef5ebea703d614c1a0113b1c))
* conventional commits ([#154](https://github.com/midnightntwrk/midnight-js/pull/154)) ([f562ac1](https://github.com/midnightntwrk/midnight-js/commit/f562ac1f33d34b632448fa8c0f5ea613b05272af))
* **deps:** bump actions/github-script from 7.1.0 to 8.0.0 ([#174](https://github.com/midnightntwrk/midnight-js/pull/174)) ([a606204](https://github.com/midnightntwrk/midnight-js/commit/a606204526db3667a0c5d2e6c9afe15faa5c08ef))
* **deps:** bump actions/setup-node from 4.1.0 to 5.0.0 ([#120](https://github.com/midnightntwrk/midnight-js/pull/120)) ([e445cfc](https://github.com/midnightntwrk/midnight-js/commit/e445cfc91ce5df0445d86094741749533a8865b6))
* **deps:** bump apache/skywalking-eyes ([#138](https://github.com/midnightntwrk/midnight-js/pull/138)) ([1c61af3](https://github.com/midnightntwrk/midnight-js/commit/1c61af3739855dac9a465311015be7d264f90d6b))
* **deps:** bump docker/login-action from 3.3.0 to 3.5.0 ([#121](https://github.com/midnightntwrk/midnight-js/pull/121)) ([4604977](https://github.com/midnightntwrk/midnight-js/commit/4604977fde992e9449e633bd12eab242b8de0685))
* **deps:** bump docker/login-action from 3.5.0 to 3.6.0 ([#176](https://github.com/midnightntwrk/midnight-js/pull/176)) ([0b8182a](https://github.com/midnightntwrk/midnight-js/commit/0b8182a36eb1ea10fad240d1ede2e567261bf619))
* **deps:** bump MishaKav/jest-coverage-comment from 1.0.28 to 1.0.29 ([#175](https://github.com/midnightntwrk/midnight-js/pull/175)) ([262874d](https://github.com/midnightntwrk/midnight-js/commit/262874da2537a876f1671368fc78020b1e135950))
* **deps:** bump tar-fs from 2.1.3 to 2.1.4 in the npm_and_yarn group across 1 directory ([#160](https://github.com/midnightntwrk/midnight-js/pull/160)) ([1dcde4c](https://github.com/midnightntwrk/midnight-js/commit/1dcde4c657e43cd1de131b32b4174a4c44de16c9))
* **deps:** bump vite in the npm_and_yarn group across 1 directory ([#128](https://github.com/midnightntwrk/midnight-js/pull/128)) ([e86d9d4](https://github.com/midnightntwrk/midnight-js/commit/e86d9d4dfa9443509c2f67acd71316b0c8d17e34))
* **deps:** remove outdated @opentelemetry/semantic-conventions entry from yarn.lock ([#158](https://github.com/midnightntwrk/midnight-js/pull/158)) ([cbbfdf3](https://github.com/midnightntwrk/midnight-js/commit/cbbfdf33b1646b8b6de37e1e904d3d03d90e7a71))
* **deps:** update dependency @d2t/vitest-ctrf-json-reporter to v1.2.0 ([#76](https://github.com/midnightntwrk/midnight-js/pull/76)) ([54d3e6e](https://github.com/midnightntwrk/midnight-js/commit/54d3e6e81de076a95f2cab6a067ea3462d6d4590))
* **deps:** update dependency @d2t/vitest-ctrf-json-reporter to v1.3.0 ([#163](https://github.com/midnightntwrk/midnight-js/pull/163)) ([c4b0515](https://github.com/midnightntwrk/midnight-js/commit/c4b051521be393d8793678e33e03bbff19360744))
* **deps:** update dependency @effect/cluster to ^0.49.0 ([#164](https://github.com/midnightntwrk/midnight-js/pull/164)) ([6a5189c](https://github.com/midnightntwrk/midnight-js/commit/6a5189c988d6e8a337c07a78ddcfd91f7c7556c4))
* **deps:** update dependency @effect/cluster to v0.49.6 ([#177](https://github.com/midnightntwrk/midnight-js/pull/177)) ([98ddc2a](https://github.com/midnightntwrk/midnight-js/commit/98ddc2a634dcee74b7f1a07ead09c32d709aef67))
* **deps:** update dependency @effect/experimental to ^0.55.0 ([#165](https://github.com/midnightntwrk/midnight-js/pull/165)) ([c4cb7df](https://github.com/midnightntwrk/midnight-js/commit/c4cb7df524b2c204750bf9ec731e1da597d85127))
* **deps:** update dependency @effect/experimental to ^0.56.0 ([#191](https://github.com/midnightntwrk/midnight-js/pull/191)) ([3b36604](https://github.com/midnightntwrk/midnight-js/commit/3b366040a2492b0e12640b949f114d44faa42846))
* **deps:** update dependency @effect/experimental to v0.54.6 ([#105](https://github.com/midnightntwrk/midnight-js/pull/105)) ([20fd087](https://github.com/midnightntwrk/midnight-js/commit/20fd087bbe83f884f70367359660033027188cc7))
* **deps:** update dependency @effect/platform-node-shared to ^0.50.0 ([#167](https://github.com/midnightntwrk/midnight-js/pull/167)) ([156cc67](https://github.com/midnightntwrk/midnight-js/commit/156cc6770097172cea6dd7bc717f1d025edb99b0))
* **deps:** update dependency @effect/sql to v0.44.2 ([#106](https://github.com/midnightntwrk/midnight-js/pull/106)) ([2b712a4](https://github.com/midnightntwrk/midnight-js/commit/2b712a4526534a0fb1e6ba80a61e6c3b56aa2c0a))
* **deps:** update dependency @rollup/plugin-node-resolve to v16.0.2 ([#186](https://github.com/midnightntwrk/midnight-js/pull/186)) ([b2b1ea8](https://github.com/midnightntwrk/midnight-js/commit/b2b1ea84d720fc29851ccbd9024ad40199c7d984))
* **deps:** update dependency @types/node to v22.18.0 ([#77](https://github.com/midnightntwrk/midnight-js/pull/77)) ([aa69d17](https://github.com/midnightntwrk/midnight-js/commit/aa69d17a1cff281af1b7ae58bc6e1c54b3643358))
* **deps:** update dependency @types/node to v22.18.6 ([#132](https://github.com/midnightntwrk/midnight-js/pull/132)) ([81a9625](https://github.com/midnightntwrk/midnight-js/commit/81a9625e82120772855450b7bf21250c3ac02125))
* **deps:** update dependency @types/node to v22.18.8 ([#178](https://github.com/midnightntwrk/midnight-js/pull/178)) ([a51d3ce](https://github.com/midnightntwrk/midnight-js/commit/a51d3ce9bb534ed8b0c54d0fb3225b0f214823aa))
* **deps:** update dependency @types/node to v22.18.9 ([#189](https://github.com/midnightntwrk/midnight-js/pull/189)) ([a727ec0](https://github.com/midnightntwrk/midnight-js/commit/a727ec02ab1f2b73e9c762a4f1c4f67d30e9ba67))
* **deps:** update dependency axios to v1.12.0 [security] ([#134](https://github.com/midnightntwrk/midnight-js/pull/134)) ([72be53f](https://github.com/midnightntwrk/midnight-js/commit/72be53fef90a38ee96b8400e5ea4f1795c593a12))
* **deps:** update dependency lint-staged to v16.1.6 ([#71](https://github.com/midnightntwrk/midnight-js/pull/71)) ([220f3eb](https://github.com/midnightntwrk/midnight-js/commit/220f3eb8af124431b458d82924e9698b833348cf))
* **deps:** update dependency node to v22.19.0 ([#78](https://github.com/midnightntwrk/midnight-js/pull/78)) ([914529c](https://github.com/midnightntwrk/midnight-js/commit/914529cc4f25fc8f0163dc88661febc3a4cbc192))
* **deps:** update dependency patch-package to v8.0.1 ([#179](https://github.com/midnightntwrk/midnight-js/pull/179)) ([eea3885](https://github.com/midnightntwrk/midnight-js/commit/eea388524bf721339b2bd446e684f6d1bc42f515))
* **deps:** update dependency pino to v9.9.1 ([#83](https://github.com/midnightntwrk/midnight-js/pull/83)) ([bb84a97](https://github.com/midnightntwrk/midnight-js/commit/bb84a97ed73b4a6be5b29761f9377092d9c48602))
* **deps:** update dependency pino-pretty to v13.1.1 ([#84](https://github.com/midnightntwrk/midnight-js/pull/84)) ([357fdb6](https://github.com/midnightntwrk/midnight-js/commit/357fdb62c52e1fe6e25606e4b22d44c03d754103))
* **deps:** update dependency rollup to v4.50.0 ([#85](https://github.com/midnightntwrk/midnight-js/pull/85)) ([d885af8](https://github.com/midnightntwrk/midnight-js/commit/d885af87840a8e2dcd10407c6980ca14ce59bc71))
* **deps:** update dependency rollup to v4.50.2 ([#147](https://github.com/midnightntwrk/midnight-js/pull/147)) ([9a9cf98](https://github.com/midnightntwrk/midnight-js/commit/9a9cf9824584efdfbdcecd8dec40586b198fb947))
* **deps:** update dependency testcontainers to v11.5.1 ([#86](https://github.com/midnightntwrk/midnight-js/pull/86)) ([3c50c19](https://github.com/midnightntwrk/midnight-js/commit/3c50c19deded56f5d3c8388a67306b0e2402680b))
* **deps:** update dependency turbo to v2.5.6 ([#72](https://github.com/midnightntwrk/midnight-js/pull/72)) ([71f0072](https://github.com/midnightntwrk/midnight-js/commit/71f00729b453a4aee7983cbe44af4033758cc948))
* **deps:** update dependency turbo to v2.5.8 ([#161](https://github.com/midnightntwrk/midnight-js/pull/161)) ([d5e854c](https://github.com/midnightntwrk/midnight-js/commit/d5e854c6ce28e731120a7686d6c8acd0cea115b3))
* **deps:** update dependency typedoc to v0.28.12 ([#73](https://github.com/midnightntwrk/midnight-js/pull/73)) ([2b31332](https://github.com/midnightntwrk/midnight-js/commit/2b31332c3f70254f3a330c12239a06ff33133f87))
* **deps:** update dependency typedoc to v0.28.13 ([#152](https://github.com/midnightntwrk/midnight-js/pull/152)) ([f1a7bf3](https://github.com/midnightntwrk/midnight-js/commit/f1a7bf3b23572091c1ca908eae9b76dca8f5cf18))
* **deps:** update dependency typedoc-plugin-markdown to v4.8.1 ([#89](https://github.com/midnightntwrk/midnight-js/pull/89)) ([f79bebc](https://github.com/midnightntwrk/midnight-js/commit/f79bebcc8dca1d2357de2ac44fdb41bf121211a3))
* **deps:** update dependency typescript to v5.9.2 ([#90](https://github.com/midnightntwrk/midnight-js/pull/90)) ([5b5dc3d](https://github.com/midnightntwrk/midnight-js/commit/5b5dc3d7d1ddeeab8e623fb3c3d27243f1fc0bb3))
* **deps:** update dependency typescript to v5.9.3 ([#183](https://github.com/midnightntwrk/midnight-js/pull/183)) ([b96170d](https://github.com/midnightntwrk/midnight-js/commit/b96170d86a5883d5cd2115390f21683fe244b282))
* **deps:** update dependency typescript-eslint to v8.42.0 ([#91](https://github.com/midnightntwrk/midnight-js/pull/91)) ([ec535c8](https://github.com/midnightntwrk/midnight-js/commit/ec535c81809ff06dd759022dd9dfc6e25cd8e020))
* **deps:** update eslint monorepo to v9.34.0 ([#92](https://github.com/midnightntwrk/midnight-js/pull/92)) ([7ad8965](https://github.com/midnightntwrk/midnight-js/commit/7ad8965f6b35248bca27b508d59d90dc10b19c97))
* **deps:** update yarn to v4.10.0 ([#107](https://github.com/midnightntwrk/midnight-js/pull/107)) ([5a907a6](https://github.com/midnightntwrk/midnight-js/commit/5a907a64c22de4904e66be850fb18cb4ab702536))
* **deps:** update yarn to v4.10.3 ([#162](https://github.com/midnightntwrk/midnight-js/pull/162)) ([034a4b9](https://github.com/midnightntwrk/midnight-js/commit/034a4b98cd9122ea40bd22a6065f42da10eab97a))
* **deps:** update yarn to v4.9.4 ([#74](https://github.com/midnightntwrk/midnight-js/pull/74)) ([e978c67](https://github.com/midnightntwrk/midnight-js/commit/e978c67b9ce54df462aa059b180d79e7a64127df))
* enhance commitlint configuration for better validation ([#184](https://github.com/midnightntwrk/midnight-js/pull/184)) ([a7659a2](https://github.com/midnightntwrk/midnight-js/commit/a7659a2b7a6b3983c82419fffb319a96b8f938d9))
* multlple compactc versions support ([#63](https://github.com/midnightntwrk/midnight-js/pull/63)) ([dd8071b](https://github.com/midnightntwrk/midnight-js/commit/dd8071b0423c4a998188b684b6fa39015bb7b712))
* package validation ([#156](https://github.com/midnightntwrk/midnight-js/pull/156)) ([bcf83fa](https://github.com/midnightntwrk/midnight-js/commit/bcf83fae9dcd58c07922d76ae00368daf444f895))
* refactor tests to exclude edge cases from pbt ([#142](https://github.com/midnightntwrk/midnight-js/pull/142)) ([7edd198](https://github.com/midnightntwrk/midnight-js/commit/7edd1985012ac1b45081f21ef5e0614b5e56106b))
* release v2.1.0 ([0ddc623](https://github.com/midnightntwrk/midnight-js/commit/0ddc62367b7f0d3c9065e480f829c148b8d7c91e))
* **testkit-js:** change way e2e tests are executed ([#148](https://github.com/midnightntwrk/midnight-js/pull/148)) ([918dab0](https://github.com/midnightntwrk/midnight-js/commit/918dab0fb3f192acf7c2b0b8eea175c94217ef27))
* update CHANGELOG for version 2.1.0 with new features, changes, and security updates ([46071cc](https://github.com/midnightntwrk/midnight-js/commit/46071ccf25ed8322a53555445d049009e9db2a59))
* update commitlint configuration for subject and type rules ([#168](https://github.com/midnightntwrk/midnight-js/pull/168)) ([a2f2956](https://github.com/midnightntwrk/midnight-js/commit/a2f295695f1060966deca827fdc8c6d3ffaac0c1))
* update CompactC to 0.26.0 and compact-runtime to 0.9.0 ([#170](https://github.com/midnightntwrk/midnight-js/pull/170)) ([a4b1564](https://github.com/midnightntwrk/midnight-js/commit/a4b15646a3d8c0f0e6072257cd6bcb6286aa7add))
