import { describe, it, expect } from 'vitest';
import {
  validateExamName,
  validateEmail,
  validatePassword,
  validateScore,
  sanitizeInput,
  containsScript,
  ValidationError,
} from '../../utils/validation';

describe('validation utils', () => {
  describe('validateExamName', () => {
    it('should pass for valid exam name', () => {
      expect(() => validateExamName('初二期中历史考试')).not.toThrow();
    });

    it('should throw for empty name', () => {
      expect(() => validateExamName('')).toThrow(ValidationError);
      expect(() => validateExamName('   ')).toThrow(ValidationError);
    });

    it('should throw for too long name', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateExamName(longName)).toThrow(ValidationError);
    });

    it('should throw for script injection', () => {
      expect(() => validateExamName('<script>alert("xss")</script>')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should pass for valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
    });

    it('should throw for invalid email format', () => {
      expect(() => validateEmail('invalid-email')).toThrow(ValidationError);
      expect(() => validateEmail('test@')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should pass for strong password', () => {
      expect(() => validatePassword('StrongPass123!')).not.toThrow();
    });

    it('should throw for weak password', () => {
      expect(() => validatePassword('weak')).toThrow(ValidationError);
      expect(() => validatePassword('12345678')).toThrow(ValidationError);
    });
  });

  describe('validateScore', () => {
    it('should pass for valid score', () => {
      expect(() => validateScore(85, 100)).not.toThrow();
    });

    it('should throw for invalid score', () => {
      expect(() => validateScore(-5, 100)).toThrow(ValidationError);
      expect(() => validateScore(105, 100)).toThrow(ValidationError);
      expect(() => validateScore(NaN, 100)).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });
  });

  describe('containsScript', () => {
    it('should detect script tags', () => {
      expect(containsScript('<script>alert("xss")</script>')).toBe(true);
      expect(containsScript('javascript:alert("xss")')).toBe(true);
      expect(containsScript('onclick="alert()"')).toBe(true);
      expect(containsScript('normal text')).toBe(false);
    });
  });
});