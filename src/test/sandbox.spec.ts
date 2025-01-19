import { expect, test, describe } from 'bun:test';
import { PathError } from '../tree/tree';
import { runInSandbox, inferReturnType } from '../language/sandbox/sandbox';
import { createTestSystemContext } from '../system/test-system-context';

describe('Sandbox', () => {
  test('should execute simple code in sandbox', async () => {
    const system = createTestSystemContext();
    const tree = system.tree;
    tree.set(['config', 'timeout'], 5000);
    tree.set(['user', 'name'], 'John');

    const result = await runInSandbox(
      system,
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
    const system = createTestSystemContext();
    const tree = system.tree;
    tree.set(['config', 'timeout'], 5000);
    tree.set(['user', 'name'], 'John');

    const result = await runInSandbox(
      system,
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
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
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
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.patchList(['items']);

      const result = await runInSandbox(
        system,
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
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);

      const promise = runInSandbox(
        system,
        [],
        `
        $$delete('config/timeout');
        return $$\`config/timeout\`;
      `,
        undefined,
      );

      expect(promise).rejects.toThrow(PathError);
      expect(() => tree.get(['config', 'timeout'])).toThrow(PathError);
    });

    test('should handle get operation', async () => {
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
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
      const system = createTestSystemContext();
      const tree = system.tree;

      await runInSandbox(
        system,
        [],
        `
        $root.set('config/timeout', 5000);
      `,
        undefined,
      );

      expect(tree.get(['config', 'timeout'])).toBe(5000);
    });

    test('should handle root get operation', async () => {
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);

      const result = await runInSandbox(
        system,
        [],
        `
        return $root.get('config/timeout');
      `,
        undefined,
      );

      expect(result).toBe(5000);
    });

    test('should handle root push operation', async () => {
      const system = createTestSystemContext();
      const tree = system.tree;

      await runInSandbox(
        system,
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
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);

      await runInSandbox(
        system,
        [],
        `
        $root.delete('config/timeout');
      `,
        undefined,
      );

      expect(
        runInSandbox(
          system,
          [],
          `
          return $root.get('config/timeout');
        `,
          undefined,
        ),
      ).rejects.toThrow(PathError);
    });

    test('should handle root getNodes operation', async () => {
      const system = createTestSystemContext();
      const tree = system.tree;
      tree.set(['config', 'timeout'], 5000);
      tree.set(['config', 'retries'], 3);

      const result = await runInSandbox(
        system,
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
    const system = createTestSystemContext('{ "result": "olleh" }');
    const tree = system.tree;

    // Set up an LLM template in the tree
    tree.patchNode(['llm_templates', 'reverse_string'], {
      llm: 'Reverse the string: hello',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    });

    const result = await runInSandbox(
      system,
      [],
      `
      return await $root.llm('llm_templates/reverse_string', 'hello');
    `,
      undefined,
    );

    expect(result).toBe('olleh');
  });

  test('should handle LLM calls through llm', async () => {
    const system = createTestSystemContext('{ "result": "olleh" }');
    const tree = system.tree;

    tree.createModule(['module']);

    // Set up an LLM template in the tree
    tree.patchNode(['module', 'llm_templates', 'reverse_string'], {
      llm: 'Reverse the string.',
      input: 'string',
      output: 'string',
      examples: [],
      constraints: [],
    });

    const result = await runInSandbox(
      system,
      ['module'],
      `
      return await $$llm('llm_templates/reverse_string', 'hello');
    `,
      undefined,
    );

    expect(result).toBe('olleh');
  });
});
