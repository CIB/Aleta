import { expect, test, describe } from 'bun:test';
import { Schema, validateType } from '../language/type-checker';

describe('Type Checker', () => {
  // Simple string type tests
  describe('Simple Types', () => {
    test('validates string type', () => {
      expect(validateType('hello', 'string')).toEqual({ valid: true });
      expect(validateType(42, 'string')).toEqual({
        valid: false,
        errors: ['Expected string at root'],
      });
    });

    test('validates number type', () => {
      expect(validateType(42, 'number')).toEqual({ valid: true });
      expect(validateType('42', 'number')).toEqual({
        valid: false,
        errors: ['Expected number at root'],
      });
    });

    test('validates boolean type', () => {
      expect(validateType(true, 'boolean')).toEqual({ valid: true });
      expect(validateType('true', 'boolean')).toEqual({
        valid: false,
        errors: ['Expected boolean at root'],
      });
    });

    test('validates any type', () => {
      expect(validateType('anything', 'any')).toEqual({ valid: true });
      expect(validateType(42, 'any')).toEqual({ valid: true });
      expect(validateType({ foo: 'bar' }, 'any')).toEqual({ valid: true });
    });
  });

  // Array type tests
  describe('Array Types', () => {
    test('validates string arrays', () => {
      expect(validateType(['a', 'b', 'c'], 'string[]')).toEqual({
        valid: true,
      });
      expect(validateType([1, 2, 3], 'string[]')).toEqual({
        valid: false,
        errors: ['Expected string at /0', 'Expected string at /1', 'Expected string at /2'],
      });
    });

    test('validates number arrays', () => {
      expect(validateType([1, 2, 3], 'number[]')).toEqual({ valid: true });
      expect(validateType(['1', '2'], 'number[]')).toEqual({
        valid: false,
        errors: ['Expected number at /0', 'Expected number at /1'],
      });
    });
  });

  // JSON Schema tests
  describe('JSON Schema', () => {
    test('validates complex object schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name'],
      };

      expect(
        validateType(
          {
            name: 'John',
            age: 30,
            tags: ['developer', 'javascript'],
          },
          schema,
        ),
      ).toEqual({ valid: true });

      expect(
        validateType(
          {
            age: 'invalid',
            tags: [123],
          },
          schema,
        ),
      ).toEqual({
        valid: false,
        errors: ["must have required property 'name' at root", 'Expected number at /age', 'Expected string at /tags/0'],
      });
    });
  });

  // Error cases
  describe('Error Cases', () => {
    test('throws error for unsupported type', () => {
      expect(() => validateType('test', 'unsupported' as Schema)).toThrow('Unsupported type: unsupported');
    });
  });
});
