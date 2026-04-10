import type { CryptoBackend } from './crypto-backend';

const AUTH_TAG_LENGTH = 16;

export class WebCryptoCryptoBackend implements CryptoBackend {
  randomBytes(length: number): Uint8Array {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  }

  async sha256(data: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  async pbkdf2(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
  ): Promise<Uint8Array> {
    const baseKey = await globalThis.crypto.subtle.importKey(
      'raw',
      password,
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const derived = await globalThis.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      keyLength * 8,
    );
    return new Uint8Array(derived);
  }

  async aesGcmEncrypt(
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw', key, 'AES-GCM', false, ['encrypt'],
    );
    const result = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
      cryptoKey,
      plaintext,
    );
    const resultBytes = new Uint8Array(result);
    const ciphertext = resultBytes.slice(0, resultBytes.length - AUTH_TAG_LENGTH);
    const authTag = resultBytes.slice(resultBytes.length - AUTH_TAG_LENGTH);
    return { ciphertext, authTag };
  }

  async aesGcmDecrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    authTag: Uint8Array,
  ): Promise<Uint8Array> {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw', key, 'AES-GCM', false, ['decrypt'],
    );
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);
    const result = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: AUTH_TAG_LENGTH * 8 },
      cryptoKey,
      combined,
    );
    return new Uint8Array(result);
  }
}
