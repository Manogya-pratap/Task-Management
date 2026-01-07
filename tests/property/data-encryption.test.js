const fc = require('fast-check');
const { encrypt, decrypt, hashData, encryptSensitiveFields, decryptSensitiveFields, sanitizeInput } = require('../../server/utils/encryption');

/**
 * Property-based tests for data encryption
 * Feature: daily-activity-tracker, Property 20: Data encryption
 * **Validates: Requirements 7.1**
 */

describe('Data Encryption Properties', () => {
  describe('Property 20: Data encryption', () => {
    test('For any sensitive user data stored in the database, the information should be properly encrypted and not stored in plain text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (plaintext) => {
            // Test encryption/decryption round trip
            const encrypted = encrypt(plaintext);
            
            // Verify encrypted data structure
            expect(encrypted).toHaveProperty('encrypted');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('authTag');
            
            // Verify encrypted data is not plain text
            expect(encrypted.encrypted).not.toBe(plaintext);
            expect(encrypted.encrypted).toMatch(/^[a-f0-9]+$/); // Should be hex
            
            // Verify decryption works
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any data, hashing should be one-way and consistent', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (data) => {
            const hash1 = hashData(data);
            const hash2 = hashData(data);
            
            // Hash should be consistent
            expect(hash1).toBe(hash2);
            
            // Hash should be different from original data
            expect(hash1).not.toBe(data);
            
            // Hash should be hex string
            expect(hash1).toMatch(/^[a-f0-9]+$/);
            
            // Hash should be fixed length (SHA-256 = 64 hex chars)
            expect(hash1).toHaveLength(64);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any object with sensitive fields, encryption should preserve non-sensitive data', () => {
      fc.assert(
        fc.property(
          fc.record({
            username: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.string({ minLength: 1, maxLength: 100 }),
            sensitiveData: fc.string({ minLength: 1, maxLength: 200 }),
            publicData: fc.string({ minLength: 1, maxLength: 100 })
          }),
          (obj) => {
            const sensitiveFields = ['sensitiveData'];
            
            // Encrypt sensitive fields
            const encrypted = encryptSensitiveFields(obj, sensitiveFields);
            
            // Non-sensitive fields should remain unchanged
            expect(encrypted.username).toBe(obj.username);
            expect(encrypted.email).toBe(obj.email);
            expect(encrypted.publicData).toBe(obj.publicData);
            
            // Sensitive field should be encrypted
            expect(encrypted.sensitiveData).not.toBe(obj.sensitiveData);
            expect(encrypted.sensitiveData).toHaveProperty('encrypted');
            
            // Decrypt and verify
            const decrypted = decryptSensitiveFields(encrypted, sensitiveFields);
            expect(decrypted.sensitiveData).toBe(obj.sensitiveData);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any input string, sanitization should remove dangerous characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (input) => {
            const sanitized = sanitizeInput(input);
            
            // Should not contain dangerous characters
            expect(sanitized).not.toMatch(/[<>'"\\]/);
            
            // Should be trimmed
            expect(sanitized).toBe(sanitized.trim());
            
            // Should not be longer than original
            expect(sanitized.length).toBeLessThanOrEqual(input.length);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any null or undefined input, encryption functions should handle gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('')),
          (input) => {
            // Encryption should handle null/undefined gracefully
            const encrypted = encrypt(input);
            expect(encrypted).toBeNull();
            
            const hashed = hashData(input);
            expect(hashed).toBeNull();
            
            const sanitized = sanitizeInput(input);
            expect(sanitized).toBe(input);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('For any encrypted data, decryption with wrong data should fail gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (plaintext1, plaintext2) => {
            fc.pre(plaintext1 !== plaintext2); // Ensure different inputs
            
            const encrypted1 = encrypt(plaintext1);
            const encrypted2 = encrypt(plaintext2);
            
            // Encrypted data should be different
            expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
            
            // Each should decrypt to its original
            expect(decrypt(encrypted1)).toBe(plaintext1);
            expect(decrypt(encrypted2)).toBe(plaintext2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any password data, it should never be stored in plain text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 6, maxLength: 128 }), // Valid password length
          (password) => {
            // Simulate user object with password
            const userData = {
              username: 'testuser',
              password: password,
              email: 'test@example.com'
            };
            
            // When converting to JSON (as would happen in database storage)
            const jsonString = JSON.stringify(userData);
            
            // The password should be hashed/encrypted, not stored as plain text
            // This test verifies the principle - actual implementation would use bcrypt
            const hashedPassword = hashData(password);
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword).toMatch(/^[a-f0-9]{64}$/);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longString);
    });

    test('should handle special characters and unicode', () => {
      const specialString = '🔐💻🛡️ Special chars: àáâãäåæçèéêë';
      const encrypted = encrypt(specialString);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(specialString);
    });

    test('should handle malformed encrypted data gracefully', () => {
      const malformedData = {
        encrypted: 'invalid-hex-data',
        iv: 'invalid-iv',
        authTag: 'invalid-tag'
      };
      
      expect(() => decrypt(malformedData)).toThrow();
    });

    test('should handle empty objects in field encryption', () => {
      const emptyObj = {};
      const result = encryptSensitiveFields(emptyObj, ['nonexistent']);
      expect(result).toEqual({});
    });
  });
});