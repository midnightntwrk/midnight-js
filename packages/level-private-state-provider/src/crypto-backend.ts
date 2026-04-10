import { NobleCryptoBackend } from './crypto-backend-noble';
import { WebCryptoCryptoBackend } from './crypto-backend-webcrypto';

export interface CryptoBackend {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  pbkdf2(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
  ): Promise<Uint8Array>;
  aesGcmEncrypt(
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }>;
  aesGcmDecrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    authTag: Uint8Array,
  ): Promise<Uint8Array>;
}

export type CryptoBackendType = 'webcrypto' | 'noble';

export const isWebCryptoAvailable = (): boolean =>
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.subtle !== 'undefined';

export const resolveCryptoBackend = (preference?: CryptoBackendType): CryptoBackend => {
  if (preference === 'noble') {
    return new NobleCryptoBackend();
  }
  if (preference === 'webcrypto') {
    if (!isWebCryptoAvailable()) {
      throw new Error(
        'Web Crypto API is not available. Use the \'noble\' crypto backend or run in a secure context (HTTPS or localhost).',
      );
    }
    return new WebCryptoCryptoBackend();
  }

  if (isWebCryptoAvailable()) {
    return new WebCryptoCryptoBackend();
  }
  return new NobleCryptoBackend();
};
