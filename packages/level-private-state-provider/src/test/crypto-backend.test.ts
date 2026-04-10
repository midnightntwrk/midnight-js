import { resolveCryptoBackend } from '../crypto-backend';
import { NobleCryptoBackend } from '../crypto-backend-noble';
import { WebCryptoCryptoBackend } from '../crypto-backend-webcrypto';

describe('resolveCryptoBackend', () => {
  test('returns NobleCryptoBackend when noble is requested', () => {
    const backend = resolveCryptoBackend('noble');
    expect(backend).toBeInstanceOf(NobleCryptoBackend);
  });

  test('returns WebCryptoCryptoBackend when webcrypto is requested', () => {
    const backend = resolveCryptoBackend('webcrypto');
    expect(backend).toBeInstanceOf(WebCryptoCryptoBackend);
  });

  test('auto-detects WebCrypto when available (default in Node.js)', () => {
    const backend = resolveCryptoBackend();
    expect(backend).toBeInstanceOf(WebCryptoCryptoBackend);
  });

  test('throws when webcrypto requested but unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(() => resolveCryptoBackend('webcrypto')).toThrow(
        'Web Crypto API is not available',
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });

  test('falls back to noble when WebCrypto unavailable and no preference', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      const backend = resolveCryptoBackend();
      expect(backend).toBeInstanceOf(NobleCryptoBackend);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });
});
