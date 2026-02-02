/**
 * Unit tests for encryption utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  encryptPII,
  decryptPII,
  encryptCustomerPII,
  maskPII,
  formatIDNumberForDisplay,
  formatPhoneForDisplay,
  hashCustomerPII,
  type CustomerPII,
} from '../encryption'
import { EncryptionFailedError, DecryptionFailedError } from '@/lib/errors'

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('Encryption Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encryptPII', () => {
    it('should encrypt plaintext successfully', async () => {
      const mockEncrypted = 'ZW5jcnlwdGVkX2RhdGE=' // base64 for "encrypted_data"
      mockSupabase.rpc.mockResolvedValue({
        data: mockEncrypted,
        error: null,
      })

      const result = await encryptPII('John Doe')

      expect(result).toBe(mockEncrypted)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('encrypt_pii', {
        plaintext: 'John Doe',
      })
    })

    it('should throw EncryptionFailedError for empty string', async () => {
      await expect(encryptPII('')).rejects.toThrow(EncryptionFailedError)
      await expect(encryptPII('   ')).rejects.toThrow(EncryptionFailedError)
    })

    it('should throw EncryptionFailedError on database error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Encryption failed' },
      })

      await expect(encryptPII('test')).rejects.toThrow(EncryptionFailedError)
    })
  })

  describe('decryptPII', () => {
    it('should decrypt ciphertext successfully', async () => {
      const mockDecrypted = 'John Doe'
      mockSupabase.rpc.mockResolvedValue({
        data: mockDecrypted,
        error: null,
      })

      const result = await decryptPII('ZW5jcnlwdGVkX2RhdGE=')

      expect(result).toBe(mockDecrypted)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrypt_pii', {
        ciphertext: 'ZW5jcnlwdGVkX2RhdGE=',
      })
    })

    it('should throw DecryptionFailedError for empty string', async () => {
      await expect(decryptPII('')).rejects.toThrow(DecryptionFailedError)
    })

    it('should throw DecryptionFailedError on database error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Decryption failed' },
      })

      await expect(decryptPII('encrypted')).rejects.toThrow(DecryptionFailedError)
    })
  })

  describe('encryptCustomerPII', () => {
    const mockPII: CustomerPII = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      address: '123 Main St, London',
      phone: '07700900001',
      email: 'john.doe@example.com',
      id_type: 'passport',
      id_number: 'AB1234567',
    }

    it('should encrypt all PII fields', async () => {
      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'encrypt_pii') {
          return Promise.resolve({
            data: 'encrypted_value',
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: { message: 'Unknown function' } })
      })

      const result = await encryptCustomerPII(mockPII)

      expect(result).toEqual({
        first_name_bytea: 'encrypted_value',
        last_name_bytea: 'encrypted_value',
        date_of_birth_bytea: 'encrypted_value',
        address_bytea: 'encrypted_value',
        phone_bytea: 'encrypted_value',
        email_bytea: 'encrypted_value',
        id_type_bytea: 'encrypted_value',
        id_number_bytea: 'encrypted_value',
      })

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(8)
    })

    it('should handle optional fields as null', async () => {
      const piiWithoutOptional: CustomerPII = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '07700900002',
        id_number: 'CD9876543',
      }

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'encrypt_pii') {
          return Promise.resolve({
            data: 'encrypted_value',
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: { message: 'Unknown function' } })
      })

      const result = await encryptCustomerPII(piiWithoutOptional)

      expect(result).toEqual({
        first_name_bytea: 'encrypted_value',
        last_name_bytea: 'encrypted_value',
        date_of_birth_bytea: null,
        address_bytea: null,
        phone_bytea: 'encrypted_value',
        email_bytea: null,
        id_type_bytea: null,
        id_number_bytea: 'encrypted_value',
      })
    })

    it('should throw EncryptionFailedError on failure', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Encryption failed' },
      })

      await expect(encryptCustomerPII(mockPII)).rejects.toThrow(EncryptionFailedError)
    })
  })

  describe('maskPII', () => {
    it('should mask PII showing only first N characters', () => {
      expect(maskPII('John Doe', 2)).toBe('Jo******')
      expect(maskPII('password123', 3)).toBe('pas********')
    })

    it('should handle short strings', () => {
      expect(maskPII('AB', 2)).toBe('**')
      expect(maskPII('A', 2)).toBe('*')
      expect(maskPII('', 2)).toBe('')
    })

    it('should default to showing 2 characters', () => {
      expect(maskPII('John Doe')).toBe('Jo******')
    })
  })

  describe('formatIDNumberForDisplay', () => {
    it('should show only last 4 characters', () => {
      expect(formatIDNumberForDisplay('AB123456789')).toBe('*******6789')
      expect(formatIDNumberForDisplay('123456789')).toBe('*****6789')
    })

    it('should handle short ID numbers', () => {
      expect(formatIDNumberForDisplay('AB12')).toBe('AB12')
      expect(formatIDNumberForDisplay('123')).toBe('123')
    })

    it('should handle empty string', () => {
      expect(formatIDNumberForDisplay('')).toBe('')
    })
  })

  describe('formatPhoneForDisplay', () => {
    it('should show first 3 and last 4 digits', () => {
      expect(formatPhoneForDisplay('07700900123')).toBe('077****0123')
      expect(formatPhoneForDisplay('01234567890')).toBe('012****7890')
    })

    it('should handle short phone numbers', () => {
      expect(formatPhoneForDisplay('07700900')).toBe('077****0900')
      expect(formatPhoneForDisplay('1234567')).toBe('1234567')
    })

    it('should handle empty string', () => {
      expect(formatPhoneForDisplay('')).toBe('')
    })
  })

  describe('hashCustomerPII', () => {
    it('should generate consistent hash for same data', async () => {
      const pii = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
      }

      const hash1 = await hashCustomerPII(pii)
      const hash2 = await hashCustomerPII(pii)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hash
    })

    it('should normalize data (case insensitive)', async () => {
      const pii1 = {
        first_name: 'JOHN',
        last_name: 'DOE',
        date_of_birth: '1990-01-15',
      }
      const pii2 = {
        first_name: 'john',
        last_name: 'doe',
        date_of_birth: '1990-01-15',
      }

      const hash1 = await hashCustomerPII(pii1)
      const hash2 = await hashCustomerPII(pii2)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different data', async () => {
      const pii1 = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
      }
      const pii2 = {
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1990-01-15',
      }

      const hash1 = await hashCustomerPII(pii1)
      const hash2 = await hashCustomerPII(pii2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle missing date_of_birth', async () => {
      const pii = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: undefined,
      }

      const hash = await hashCustomerPII(pii)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
