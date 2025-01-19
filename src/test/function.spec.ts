import { expect, test, describe, beforeEach } from 'bun:test';
import { Tree } from '../tree/tree';
import { runFunction } from '../language/function';
import { ExecutionContext } from '../language/execution-context';
import { Schema } from '../language/type-checker';
import { SystemContext } from '../system/system-context';

describe('Function Execution', () => {
  let tree: Tree;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    const system = new SystemContext();
    tree = system.tree;
    executionContext = new ExecutionContext(system, []);
  });

  test('should run simple function', async () => {
    // Write a function to the tree
    tree.patchNode(['functions', 'add']);
    tree.merge(['functions', 'add'], {
      input: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
      code: `
        const { a, b } = input;
        return a + b;
      `,
    });

    const result = await runFunction(executionContext, ['functions', 'add'], { a: 2, b: 3 });

    expect(result).toBe(5);
  });

  test('should validate function input', async () => {
    tree.patchNode(['functions', 'add']);
    tree.merge(['functions', 'add'], {
      input: {
        type: 'object',
        properties: { a: { type: 'number' }, b: { type: 'number' } },
        required: ['a', 'b'],
      },
      code: `
        const { a, b } = input;
        return a + b;
      `,
    });

    await expect(runFunction(executionContext, ['functions', 'add'], { a: '2', b: 3 })).rejects.toThrow();
  });

  test('should handle async functions', async () => {
    tree.patchNode(['functions', 'asyncAdd']);
    tree.merge(['functions', 'asyncAdd'], {
      input: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
      code: `
        const { a, b } = input;
        return new Promise(resolve => {
          setTimeout(() => resolve(a + b), 10);
        });
      `,
    });

    const result = await runFunction(executionContext, ['functions', 'asyncAdd'], { a: 3, b: 4 });

    expect(result).toBe(7);
  });
});