import { expect, test, describe } from 'bun:test';
import { PathSegmentError, Tree } from '../tree/tree';
import { runInSandbox, inferReturnType } from '../language/sandbox/sandbox';
import { createTestSystemContext } from '../system/test-system-context';
import { SystemContext } from '../system/system-context';
import { beforeEach } from 'bun:test';
import { ExecutionContext } from '../language/execution-context';

describe('Sandbox', () => {
  let system: SystemContext;
  let tree: Tree;
  let executionContext: ExecutionContext;

  beforeEach(async () => {
    system = await createTestSystemContext();
    tree = system.tree;
    executionContext = new ExecutionContext(system, ['stackframe']);
  });

  test('should execute simple code in sandbox', async () => {
    tree.set(['config', 'timeout'], 5000);
    tree.set(['user', 'name'], 'John');

    const result = await runInSandbox(
      system,
      executionContext,
      [],
      `
      const timeout = $$\`config/timeout\`;
      const name = $$\`user/name\`;
      return \`\${name} has \${timeout}ms timeout\`;
    `,
      undefined,
    );

    expect(result).toBe('John has 5000ms timeout');
  });

  test('should execute async code in sandbox', async () => {
    tree.set(['config', 'timeout'], 5000);
    tree.set(['user', 'name'], 'John');

    const result = await runInSandbox(
      system,
      executionContext,
      [],
      `
      async function fetchData() {
        return new Promise(resolve => {
          setTimeout(() => resolve('Doe'), 100);
        });
      }
      
      const timeout = $$\`config/timeout\`;
      const name = $$\`user/name\`;
      const lastName = await fetchData();
      return \`\${name} \${lastName} has \${timeout}ms timeout\`;
    `,
      undefined,
    );

    expect(result).toBe('John Doe has 5000ms timeout');
  });

  describe('Type Inference', () => {
    test('should infer primitive return types', () => {
      const returnType = inferReturnType(
        ``,
        `
        return 42;
      `,
      );
      expect(returnType).toEqual({ type: 'number' });
    });

    test('should infer promise return types', () => {
      const returnType = inferReturnType(
        ``,
        `return new Promise<string>(resolve => {
          setTimeout(() => resolve('done'), 100);
        });
      `,
      );
      expect(returnType).toEqual({ type: 'string' });
    });

    test('should infer complex return types', () => {
      const returnType = inferReturnType(
        ``,
        `
        return {
          name: $$\`user/name\`,
          timeout: $$\`config/timeout\`,
          active: true
        };
      `,
      );
      expect(returnType).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {},
          timeout: {},
          active: { type: 'boolean' },
        },
        required: ['name', 'timeout', 'active'],
      });
    });

    test('should return unknown for invalid code', () => {
      const returnType = inferReturnType(
        ``,
        `
        invalid syntax here
      `,
      );
      expect(returnType).toEqual({});
    });
  });

  describe('Side Effects', () => {
    test('should handle set operation', async () => {
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
        executionContext,
        [],
        `
        $$set('config/timeout', 10000);
        return $$\`config/timeout\`;
      `,
        undefined,
      );

      expect(result).toBe(10000);
      expect(tree.get(['config', 'timeout'])).toBe(10000);
    });

    test('should handle push operation', async () => {
      tree.createList(['items']);

      const result = await runInSandbox(
        system,
        executionContext,
        [],
        `
        $$push('items', { id: 1, name: 'item1' });
        $$push('items', { id: 2, name: 'item2' });
        return $$\`items/1/id\`;
      `,
        undefined,
      );

      expect(result).toEqual(1);
    });

    test('should handle delete operation', async () => {
      tree.set(['config', 'timeout', 'value'], 5000);

      const promise = runInSandbox(
        system,
        executionContext,
        [],
        `
        $$delete('config/timeout');
        return $$\`config/timeout\`;
      `,
        undefined,
      );

      expect(promise).rejects.toThrow(PathSegmentError);
      expect(() => tree.get(['config', 'timeout'])).toThrow(PathSegmentError);
    });

    test('should handle get operation', async () => {
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
        executionContext,
        [],
        `
        const timeout = $$get('config/timeout');
        return timeout;
      `,
        undefined,
      );

      expect(result).toBe(5000);
    });
  });

  describe('Root Operations', () => {
    test('should handle root set operation', async () => {
      tree.set(['config', 'timeout'], 5000);

      await runInSandbox(
        system,
        executionContext,
        [],
        `
        $root.set('config/timeout', 5000);
      `,
        undefined,
      );

      expect(tree.get(['config', 'timeout'])).toBe(5000);
    });

    test('should handle root get operation', async () => {
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
        executionContext,
        [],
        `
        return $root.get('config/timeout');
      `,
        undefined,
      );

      expect(result).toBe(5000);
    });

    test('should handle root push operation', async () => {
      tree.createList(['items']);

      await runInSandbox(
        system,
        executionContext,
        [],
        `
        $root.push('items', { id: 1, name: 'item1' });
        $root.push('items', { id: 2, name: 'item2' });
      `,
        undefined,
      );

      expect(tree.get(['items', '1', 'id'])).toEqual(1);
      expect(tree.get(['items', '2', 'id'])).toEqual(2);
    });

    test('should handle root delete operation', async () => {
      tree.set(['config', 'timeout'], 5000);

      await runInSandbox(
        system,
        executionContext,
        [],
        `
        $root.delete('config/timeout');
      `,
        undefined,
      );

      expect(
        runInSandbox(
          system,
          executionContext,
          [],
          `
          return $root.get('config/timeout');
        `,
          undefined,
        ),
      ).rejects.toThrow(PathSegmentError);
    });

    test('should handle root getNodes operation', async () => {
      tree.set(['config', 'timeout'], 5000);
      tree.set(['config', 'retries'], 3);

      const result = await runInSandbox(
        system,
        executionContext,
        [],
        `
        return $root.getNodes('config');
      `,
        undefined,
      );

      expect(result).toEqual({
        timeout: 5000,
        retries: 3,
      });
    });
  });

  test('should handle LLM calls through root.llm', async () => {
    // Set up an LLM template in the tree
    tree.insert(['llm_templates', 'reverse_string'], {
      llm: 'Reverse the string: hello',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    });

    const result = await runInSandbox(
      system,
      executionContext,
      [],
      `
      return await $root.llm('llm_templates/reverse_string', 'hello');
    `,
      undefined,
    );

    expect(result).toBe('olleh');
  });

  test('should handle LLM calls through llm', async () => {
    tree.createModule(['module']);

    // Set up an LLM template in the tree
    tree.insert(['module', 'llm_templates', 'reverse_string'], {
      llm: 'Reverse the string.',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    });

    const result = await runInSandbox(
      system,
      executionContext,
      ['module'],
      `
      return await $$llm('llm_templates/reverse_string', 'hello');
    `,
      undefined,
    );

    expect(result).toBe('olleh');
  });
});
