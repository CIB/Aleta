import { expect, test, describe, beforeEach } from 'bun:test';
import { LLMCall, runLLMCall } from '../language/llm-call';
import { createTestSystemContext } from '../system/test-system-context';
import { SystemContext } from '../system/system-context';

describe('runLLMCall', () => {
  let system: SystemContext;

  beforeEach(() => {
    system = createTestSystemContext();
  });

  test('should handle basic string input/output', async () => {
    const config: LLMCall = {
      llm: 'Reverse the string',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    };

    const result = await runLLMCall(system, config, 'hello');
    expect(result).toBe('olleh');
  });

  test('should handle object input/output', async () => {
    const config = {
      llm: 'Format the user information',
      input: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['firstName', 'lastName', 'age'],
      },
      output: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          isAdult: { type: 'boolean' },
        },
        required: ['fullName', 'isAdult'],
      },
      examples: [],
      constraints: [],
    };

    const result = await runLLMCall(system, config, {
      firstName: 'John',
      lastName: 'Doe',
      age: 25,
    });

    expect(result).toEqual({
      fullName: 'John Doe',
      isAdult: true,
    });
  });

  test('should handle examples for multi-shot learning', async () => {
    const config: LLMCall = {
      llm: 'Convert temperature from Celsius to Fahrenheit',
      input: 'number',
      output: 'number',
      examples: [
        { input: '0', output: '32' },
        { input: '100', output: '212' },
      ],
      constraints: [],
    };

    const result = await runLLMCall(system, config, 25);
    expect(result).toBe(77);
  });

  test('should handle constraints', async () => {
    const config: LLMCall = {
      llm: 'Write a short description of a cat',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: ['The description should be exactly 10 words long', 'Use simple language'],
    };

    const result = await runLLMCall(system, config, 'cat');
    const wordCount = result.split(' ').length;
    expect(wordCount).toBe(10);
  });

  test('should throw error for invalid input', async () => {
    const config: LLMCall = {
      llm: 'Reverse the string',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    };

    expect(runLLMCall(system, config, 123)).rejects.toThrow();
  });

  test('should throw error for invalid output', async () => {
    const config: LLMCall = {
      llm: 'Reverse the string',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    };

    // Mock the system to return invalid output
    system.prompt = async () => JSON.stringify({ result: 123 });

    expect(runLLMCall(system, config, 'hello')).rejects.toThrow();
  });

  test('should throw error for invalid object input structure', async () => {
    const config: LLMCall = {
      llm: 'Format the user information',
      input: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['firstName', 'lastName', 'age'],
      },
      output: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          isAdult: { type: 'boolean' },
        },
        required: ['fullName', 'isAdult'],
      },
      examples: [],
      constraints: [],
    };

    // Input is missing the required 'age' field
    const invalidInput = {
      firstName: 'John',
      lastName: 'Doe',
    };

    expect(runLLMCall(system, config, invalidInput)).rejects.toThrow();
  });
});
