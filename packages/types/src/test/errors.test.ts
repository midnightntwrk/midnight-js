import { describe, expect, it } from 'vitest';
import { ProofServerResponseError, isProofServerResponseError } from '../errors';

describe('ProofServerResponseError', () => {
  it('should construct correctly with all properties', () => {
    const error = new ProofServerResponseError('http://localhost:8080/prove', 500, 'Internal Server Error');
    
    expect(error.name).toBe('ProofServerResponseError');
    expect(error.url).toBe('http://localhost:8080/prove');
    expect(error.statusCode).toBe(500);
    expect(error.statusText).toBe('Internal Server Error');
    expect(error.message).toBe('Failed Proof Server response: url="http://localhost:8080/prove", code="500", status="Internal Server Error"');
  });

  describe('isProofServerResponseError', () => {
    it('should return true for ProofServerResponseError instances', () => {
      const error = new ProofServerResponseError('http://localhost', 404, 'Not Found');
      expect(isProofServerResponseError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isProofServerResponseError(new Error('test'))).toBe(false);
      expect(isProofServerResponseError(null)).toBe(false);
      expect(isProofServerResponseError(undefined)).toBe(false);
      expect(isProofServerResponseError({ name: 'ProofServerResponseError' })).toBe(false);
    });
  });
});
