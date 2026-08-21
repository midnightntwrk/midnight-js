[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../README.md) / compact-runtime

# compact-runtime

## Classes

- [CompactError](classes/CompactError.md)
- [CompactTypeBytes](classes/CompactTypeBytes.md)
- [CompactTypeEnum](classes/CompactTypeEnum.md)
- [CompactTypeMerkleTreePath](classes/CompactTypeMerkleTreePath.md)
- [CompactTypeUnsignedInteger](classes/CompactTypeUnsignedInteger.md)
- [CompactTypeVector](classes/CompactTypeVector.md)
- [ContractInterfaceMismatchError](classes/ContractInterfaceMismatchError.md)

## Interfaces

- [CallProofData](interfaces/CallProofData.md)
- [CircuitContext](interfaces/CircuitContext.md)
- [CircuitResults](interfaces/CircuitResults.md)
- [CommunicationCommitmentData](interfaces/CommunicationCommitmentData.md)
- [CompactType](interfaces/CompactType.md)
- [ConstructorContext](interfaces/ConstructorContext.md)
- [ConstructorResult](interfaces/ConstructorResult.md)
- [ContractStateProvider](interfaces/ContractStateProvider.md)
- [EncodedCoinPublicKey](interfaces/EncodedCoinPublicKey.md)
- [EncodedContractAddress](interfaces/EncodedContractAddress.md)
- [EncodedQualifiedShieldedCoinInfo](interfaces/EncodedQualifiedShieldedCoinInfo.md)
- [EncodedRecipient](interfaces/EncodedRecipient.md)
- [EncodedShieldedCoinInfo](interfaces/EncodedShieldedCoinInfo.md)
- [EncodedZswapLocalState](interfaces/EncodedZswapLocalState.md)
- [JubjubPoint](interfaces/JubjubPoint.md)
- [JubjubSchnorrSignature](interfaces/JubjubSchnorrSignature.md)
- [MerkleTreeDigest](interfaces/MerkleTreeDigest.md)
- [MerkleTreePath](interfaces/MerkleTreePath.md)
- [MerkleTreePathEntry](interfaces/MerkleTreePathEntry.md)
- [PartialProofData](interfaces/PartialProofData.md)
- [ProofData](interfaces/ProofData.md)
- [Recipient](interfaces/Recipient.md)
- [Secp256k1Point](interfaces/Secp256k1Point.md)
- [WitnessContext](interfaces/WitnessContext.md)
- [ZswapLocalState](interfaces/ZswapLocalState.md)

## Type Aliases

- [CallProofDataTrace](type-aliases/CallProofDataTrace.md)
- [CircuitId](type-aliases/CircuitId.md)
- [ContractReferenceLocations](type-aliases/ContractReferenceLocations.md)
- [EmptyPublicLedger](type-aliases/EmptyPublicLedger.md)
- [LogEvent](type-aliases/LogEvent.md)
- [PublicLedgerSegments](type-aliases/PublicLedgerSegments.md)
- [SparseCompactADT](type-aliases/SparseCompactADT.md)
- [SparseCompactArrayLikeADT](type-aliases/SparseCompactArrayLikeADT.md)
- [SparseCompactCellADT](type-aliases/SparseCompactCellADT.md)
- [SparseCompactContractAddress](type-aliases/SparseCompactContractAddress.md)
- [SparseCompactListADT](type-aliases/SparseCompactListADT.md)
- [SparseCompactMapADT](type-aliases/SparseCompactMapADT.md)
- [SparseCompactSetADT](type-aliases/SparseCompactSetADT.md)
- [SparseCompactStruct](type-aliases/SparseCompactStruct.md)
- [SparseCompactType](type-aliases/SparseCompactType.md)
- [SparseCompactValue](type-aliases/SparseCompactValue.md)
- [SparseCompactVector](type-aliases/SparseCompactVector.md)

## Variables

- [Bytes32Descriptor](variables/Bytes32Descriptor.md)
- [checkRuntimeVersion](variables/checkRuntimeVersion.md)
- [CompactTypeBoolean](variables/CompactTypeBoolean.md)
- [CompactTypeField](variables/CompactTypeField.md)
- [CompactTypeJubjubPoint](variables/CompactTypeJubjubPoint.md)
- [CompactTypeJubjubSchnorrSignature](variables/CompactTypeJubjubSchnorrSignature.md)
- [CompactTypeMerkleTreeDigest](variables/CompactTypeMerkleTreeDigest.md)
- [CompactTypeMerkleTreePathEntry](variables/CompactTypeMerkleTreePathEntry.md)
- [CompactTypeOpaqueString](variables/CompactTypeOpaqueString.md)
- [CompactTypeOpaqueUint8Array](variables/CompactTypeOpaqueUint8Array.md)
- [CompactTypeSecp256k1Base](variables/CompactTypeSecp256k1Base.md)
- [CompactTypeSecp256k1Point](variables/CompactTypeSecp256k1Point.md)
- [CompactTypeSecp256k1Scalar](variables/CompactTypeSecp256k1Scalar.md)
- [CONTRACT\_ADDRESS\_BYTE\_LENGTH](variables/CONTRACT_ADDRESS_BYTE_LENGTH.md)
- [ContractAddressDescriptor](variables/ContractAddressDescriptor.md)
- [contractDependencies](variables/contractDependencies.md)
- [copyCircuitContext](variables/copyCircuitContext.md)
- [createCallContext](variables/createCallContext.md)
- [createCircuitContext](variables/createCircuitContext.md)
- [createConstructorContext](variables/createConstructorContext.md)
- [createInitialQueryContext](variables/createInitialQueryContext.md)
- [crossContractCall](variables/crossContractCall.md)
- [decodeRecipient](variables/decodeRecipient.md)
- [decodeZswapLocalState](variables/decodeZswapLocalState.md)
- [~~DUMMY\_ADDRESS~~](variables/DUMMY_ADDRESS.md)
- [emptyRunningCost](variables/emptyRunningCost.md)
- [emptyZswapLocalState](variables/emptyZswapLocalState.md)
- [encodeRecipient](variables/encodeRecipient.md)
- [encodeZswapLocalState](variables/encodeZswapLocalState.md)
- [FIELD\_MODULUS](variables/FIELD_MODULUS.md)
- [finalizeCallProofData](variables/finalizeCallProofData.md)
- [fromHex](variables/fromHex.md)
- [hasCoinCommitment](variables/hasCoinCommitment.md)
- [HEX\_REGEX\_NO\_PREFIX](variables/HEX_REGEX_NO_PREFIX.md)
- [JUBJUB\_SCALAR\_MODULUS](variables/JUBJUB_SCALAR_MODULUS.md)
- [MAX\_FIELD](variables/MAX_FIELD.md)
- [MAX\_JUBJUB\_SCALAR](variables/MAX_JUBJUB_SCALAR.md)
- [MAX\_SECP256K1\_BASE](variables/MAX_SECP256K1_BASE.md)
- [MAX\_SECP256K1\_SCALAR](variables/MAX_SECP256K1_SCALAR.md)
- [MaxUint8Descriptor](variables/MaxUint8Descriptor.md)
- [queryLedgerState](variables/queryLedgerState.md)
- [sampleJubjubSchnorrSk](variables/sampleJubjubSchnorrSk.md)
- [SECP256K1\_BASE\_MODULUS](variables/SECP256K1_BASE_MODULUS.md)
- [SECP256K1\_SCALAR\_MODULUS](variables/SECP256K1_SCALAR_MODULUS.md)
- [ShieldedCoinInfoDescriptor](variables/ShieldedCoinInfoDescriptor.md)
- [ShieldedCoinRecipientDescriptor](variables/ShieldedCoinRecipientDescriptor.md)
- [toHex](variables/toHex.md)
- [versionString](variables/versionString.md)
- [ZswapCoinPublicKeyDescriptor](variables/ZswapCoinPublicKeyDescriptor.md)

## Functions

- [addField](functions/addField.md)
- [alignedConcat](functions/alignedConcat.md)
- [assert](functions/assert.md)
- [assertDefined](functions/assertDefined.md)
- [assertIsContractAddress](functions/assertIsContractAddress.md)
- [assertUndefined](functions/assertUndefined.md)
- [constructJubjubPoint](functions/constructJubjubPoint.md)
- [convertBigintToBytes](functions/convertBigintToBytes.md)
- [convertBytesToField](functions/convertBytesToField.md)
- [convertBytesToUint](functions/convertBytesToUint.md)
- [convertNumericToJubjubScalar](functions/convertNumericToJubjubScalar.md)
- [createWitnessContext](functions/createWitnessContext.md)
- [createZswapInput](functions/createZswapInput.md)
- [createZswapOutput](functions/createZswapOutput.md)
- [degradeToTransient](functions/degradeToTransient.md)
- [ecAdd](functions/ecAdd.md)
- [ecMul](functions/ecMul.md)
- [ecMulGenerator](functions/ecMulGenerator.md)
- [ecNeg](functions/ecNeg.md)
- [hashToCurve](functions/hashToCurve.md)
- [isContractAddress](functions/isContractAddress.md)
- [isEncodedContractAddress](functions/isEncodedContractAddress.md)
- [jubjubPointX](functions/jubjubPointX.md)
- [jubjubPointY](functions/jubjubPointY.md)
- [jubjubSampleScalar](functions/jubjubSampleScalar.md)
- [jubjubSchnorrSign](functions/jubjubSchnorrSign.md)
- [jubjubSchnorrVerify](functions/jubjubSchnorrVerify.md)
- [jubjubSchnorrVerifyingKey](functions/jubjubSchnorrVerifyingKey.md)
- [keccak256](functions/keccak256.md)
- [mulField](functions/mulField.md)
- [ownPublicKey](functions/ownPublicKey.md)
- [persistentCommit](functions/persistentCommit.md)
- [persistentHash](functions/persistentHash.md)
- [secp256k1Add](functions/secp256k1Add.md)
- [secp256k1BaseAdd](functions/secp256k1BaseAdd.md)
- [secp256k1BaseInv](functions/secp256k1BaseInv.md)
- [secp256k1BaseMul](functions/secp256k1BaseMul.md)
- [secp256k1BaseNeg](functions/secp256k1BaseNeg.md)
- [secp256k1Mul](functions/secp256k1Mul.md)
- [secp256k1MulGenerator](functions/secp256k1MulGenerator.md)
- [secp256k1PointX](functions/secp256k1PointX.md)
- [secp256k1PointY](functions/secp256k1PointY.md)
- [secp256k1ScalarAdd](functions/secp256k1ScalarAdd.md)
- [secp256k1ScalarInv](functions/secp256k1ScalarInv.md)
- [secp256k1ScalarMul](functions/secp256k1ScalarMul.md)
- [secp256k1ScalarNeg](functions/secp256k1ScalarNeg.md)
- [subField](functions/subField.md)
- [toBinaryRepr](functions/toBinaryRepr.md)
- [transientCommit](functions/transientCommit.md)
- [transientHash](functions/transientHash.md)
- [typeError](functions/typeError.md)
- [upgradeFromTransient](functions/upgradeFromTransient.md)

## References

### AlignedValue

Re-exports [AlignedValue](../onchain-runtime/type-aliases/AlignedValue.md)

***

### Alignment

Re-exports [Alignment](../onchain-runtime/type-aliases/Alignment.md)

***

### AlignmentAtom

Re-exports [AlignmentAtom](../onchain-runtime/type-aliases/AlignmentAtom.md)

***

### AlignmentSegment

Re-exports [AlignmentSegment](../onchain-runtime/type-aliases/AlignmentSegment.md)

***

### bigIntModFr

Re-exports [bigIntModFr](../onchain-runtime/functions/bigIntModFr.md)

***

### bigIntToValue

Re-exports [bigIntToValue](../onchain-runtime/functions/bigIntToValue.md)

***

### BlockContext

Re-exports [BlockContext](../onchain-runtime/type-aliases/BlockContext.md)

***

### CallContext

Re-exports [CallContext](../onchain-runtime/type-aliases/CallContext.md)

***

### ChargedState

Re-exports [ChargedState](../onchain-runtime/classes/ChargedState.md)

***

### CoinCommitment

Re-exports [CoinCommitment](../onchain-runtime/type-aliases/CoinCommitment.md)

***

### CoinPublicKey

Re-exports [CoinPublicKey](../onchain-runtime/type-aliases/CoinPublicKey.md)

***

### communicationCommitment

Re-exports [communicationCommitment](../onchain-runtime/functions/communicationCommitment.md)

***

### CommunicationCommitment

Re-exports [CommunicationCommitment](../onchain-runtime/type-aliases/CommunicationCommitment.md)

***

### CommunicationCommitmentRand

Re-exports [CommunicationCommitmentRand](../onchain-runtime/type-aliases/CommunicationCommitmentRand.md)

***

### communicationCommitmentRandomness

Re-exports [communicationCommitmentRandomness](../onchain-runtime/functions/communicationCommitmentRandomness.md)

***

### ContractAddress

Re-exports [ContractAddress](../onchain-runtime/type-aliases/ContractAddress.md)

***

### ContractMaintenanceAuthority

Re-exports [ContractMaintenanceAuthority](../onchain-runtime/classes/ContractMaintenanceAuthority.md)

***

### ContractOperation

Re-exports [ContractOperation](../onchain-runtime/classes/ContractOperation.md)

***

### ContractState

Re-exports [ContractState](../onchain-runtime/classes/ContractState.md)

***

### CostModel

Re-exports [CostModel](../onchain-runtime/classes/CostModel.md)

***

### decodeCoinPublicKey

Re-exports [decodeCoinPublicKey](../onchain-runtime/functions/decodeCoinPublicKey.md)

***

### decodeContractAddress

Re-exports [decodeContractAddress](../onchain-runtime/functions/decodeContractAddress.md)

***

### decodeQualifiedShieldedCoinInfo

Re-exports [decodeQualifiedShieldedCoinInfo](../onchain-runtime/functions/decodeQualifiedShieldedCoinInfo.md)

***

### decodeRawTokenType

Re-exports [decodeRawTokenType](../onchain-runtime/functions/decodeRawTokenType.md)

***

### decodeShieldedCoinInfo

Re-exports [decodeShieldedCoinInfo](../onchain-runtime/functions/decodeShieldedCoinInfo.md)

***

### decodeUserAddress

Re-exports [decodeUserAddress](../onchain-runtime/functions/decodeUserAddress.md)

***

### DomainSeparator

Re-exports [DomainSeparator](../onchain-runtime/type-aliases/DomainSeparator.md)

***

### dummyContractAddress

Re-exports [dummyContractAddress](../onchain-runtime/functions/dummyContractAddress.md)

***

### dummyUserAddress

Re-exports [dummyUserAddress](../onchain-runtime/functions/dummyUserAddress.md)

***

### DustTokenType

Re-exports [DustTokenType](../onchain-runtime/type-aliases/DustTokenType.md)

***

### Effects

Re-exports [Effects](../onchain-runtime/type-aliases/Effects.md)

***

### encodeCoinPublicKey

Re-exports [encodeCoinPublicKey](../onchain-runtime/functions/encodeCoinPublicKey.md)

***

### encodeContractAddress

Re-exports [encodeContractAddress](../onchain-runtime/functions/encodeContractAddress.md)

***

### EncodedStateValue

Re-exports [EncodedStateValue](../onchain-runtime/type-aliases/EncodedStateValue.md)

***

### encodeQualifiedShieldedCoinInfo

Re-exports [encodeQualifiedShieldedCoinInfo](../onchain-runtime/functions/encodeQualifiedShieldedCoinInfo.md)

***

### encodeRawTokenType

Re-exports [encodeRawTokenType](../onchain-runtime/functions/encodeRawTokenType.md)

***

### encodeShieldedCoinInfo

Re-exports [encodeShieldedCoinInfo](../onchain-runtime/functions/encodeShieldedCoinInfo.md)

***

### encodeUserAddress

Re-exports [encodeUserAddress](../onchain-runtime/functions/encodeUserAddress.md)

***

### entryPointHash

Re-exports [entryPointHash](../onchain-runtime/functions/entryPointHash.md)

***

### Fr

Re-exports [Fr](../onchain-runtime/type-aliases/Fr.md)

***

### GatherResult

Re-exports [GatherResult](../onchain-runtime/type-aliases/GatherResult.md)

***

### Key

Re-exports [Key](../onchain-runtime/type-aliases/Key.md)

***

### leafHash

Re-exports [leafHash](../onchain-runtime/functions/leafHash.md)

***

### maxAlignedSize

Re-exports [maxAlignedSize](../onchain-runtime/functions/maxAlignedSize.md)

***

### maxField

Re-exports [maxField](../onchain-runtime/functions/maxField.md)

***

### Nonce

Re-exports [Nonce](../onchain-runtime/type-aliases/Nonce.md)

***

### Nullifier

Re-exports [Nullifier](../onchain-runtime/type-aliases/Nullifier.md)

***

### Op

Re-exports [Op](../onchain-runtime/type-aliases/Op.md)

***

### proofDataIntoSerializedPreimage

Re-exports [proofDataIntoSerializedPreimage](../onchain-runtime/functions/proofDataIntoSerializedPreimage.md)

***

### PublicAddress

Re-exports [PublicAddress](../onchain-runtime/type-aliases/PublicAddress.md)

***

### QualifiedShieldedCoinInfo

Re-exports [QualifiedShieldedCoinInfo](../onchain-runtime/type-aliases/QualifiedShieldedCoinInfo.md)

***

### QueryContext

Re-exports [QueryContext](../onchain-runtime/classes/QueryContext.md)

***

### QueryResults

Re-exports [QueryResults](../onchain-runtime/classes/QueryResults.md)

***

### rawTokenType

Re-exports [rawTokenType](../onchain-runtime/functions/rawTokenType.md)

***

### RawTokenType

Re-exports [RawTokenType](../onchain-runtime/type-aliases/RawTokenType.md)

***

### RunningCost

Re-exports [RunningCost](../onchain-runtime/type-aliases/RunningCost.md)

***

### runProgram

Re-exports [runProgram](../onchain-runtime/functions/runProgram.md)

***

### runtimeCoinCommitment

Re-exports [runtimeCoinCommitment](../onchain-runtime/functions/runtimeCoinCommitment.md)

***

### sampleContractAddress

Re-exports [sampleContractAddress](../onchain-runtime/functions/sampleContractAddress.md)

***

### sampleRawTokenType

Re-exports [sampleRawTokenType](../onchain-runtime/functions/sampleRawTokenType.md)

***

### sampleSigningKey

Re-exports [sampleSigningKey](../onchain-runtime/functions/sampleSigningKey.md)

***

### sampleUserAddress

Re-exports [sampleUserAddress](../onchain-runtime/functions/sampleUserAddress.md)

***

### ShieldedCoinInfo

Re-exports [ShieldedCoinInfo](../onchain-runtime/type-aliases/ShieldedCoinInfo.md)

***

### ShieldedTokenType

Re-exports [ShieldedTokenType](../onchain-runtime/type-aliases/ShieldedTokenType.md)

***

### Signature

Re-exports [Signature](../onchain-runtime/type-aliases/Signature.md)

***

### signatureVerifyingKey

Re-exports [signatureVerifyingKey](../onchain-runtime/functions/signatureVerifyingKey.md)

***

### SignatureVerifyingKey

Re-exports [SignatureVerifyingKey](../onchain-runtime/type-aliases/SignatureVerifyingKey.md)

***

### signData

Re-exports [signData](../onchain-runtime/functions/signData.md)

***

### SigningKey

Re-exports [SigningKey](../onchain-runtime/type-aliases/SigningKey.md)

***

### signingKeyFromBip340

Re-exports [signingKeyFromBip340](../onchain-runtime/functions/signingKeyFromBip340.md)

***

### StateBoundedMerkleTree

Re-exports [StateBoundedMerkleTree](../onchain-runtime/classes/StateBoundedMerkleTree.md)

***

### StateMap

Re-exports [StateMap](../onchain-runtime/classes/StateMap.md)

***

### StateValue

Re-exports [StateValue](../onchain-runtime/classes/StateValue.md)

***

### TokenType

Re-exports [TokenType](../onchain-runtime/type-aliases/TokenType.md)

***

### Transcript

Re-exports [Transcript](../onchain-runtime/type-aliases/Transcript.md)

***

### UnshieldedTokenType

Re-exports [UnshieldedTokenType](../onchain-runtime/type-aliases/UnshieldedTokenType.md)

***

### UserAddress

Re-exports [UserAddress](../onchain-runtime/type-aliases/UserAddress.md)

***

### Value

Re-exports [Value](../onchain-runtime/type-aliases/Value.md)

***

### valueToBigInt

Re-exports [valueToBigInt](../onchain-runtime/functions/valueToBigInt.md)

***

### verifySignature

Re-exports [verifySignature](../onchain-runtime/functions/verifySignature.md)

***

### VmResults

Re-exports [VmResults](../onchain-runtime/classes/VmResults.md)

***

### VmStack

Re-exports [VmStack](../onchain-runtime/classes/VmStack.md)
