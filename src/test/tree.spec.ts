import { expect, test, describe, beforeEach } from 'bun:test';
import { Tree, PathError, TreeNode, ListNode, DataNode, MergeError } from '../tree/tree';
import { extractNodeAsObject } from '../tree/tree-helpers';

describe('Tree Operations', () => {
  let tree: Tree;

  describe('ensurePath', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should return root for empty path', () => {
      const result = tree.ensurePath([]);
      expect(result).toBe(tree.root);
    });

    test('should create and return single level node', () => {
      const result = tree.ensurePath(['test'], { skipLast: false });
      expect(result.name).toBe('test');
      expect(result.type).toBe('tree');
      expect(tree.root.children['test']).toBe(result);
    });

    test('should create nested structure and return leaf node', () => {
      const result = tree.ensurePath(['level1', 'level2', 'level3'], { skipLast: false });

      // Verify the full structure
      const level1 = tree.root.children['level1'];
      expect(level1).toBeDefined();
      expect(level1.name).toBe('level1');

      const level2 = (level1 as TreeNode).children['level2'];
      expect(level2).toBeDefined();
      expect(level2.name).toBe('level2');

      expect((level2 as TreeNode).children['level3']).toBe(result);
      expect(result.name).toBe('level3');
    });

    test('should return existing node without modification', () => {
      // Create initial structurefalse
      const existingNode = tree.patchNode(['existing', 'node']);
      console.log(JSON.stringify(tree.root, null, 2));

      // Get existing node
      const result = tree.ensurePath(['existing', 'node'], { skipLast: false });

      // Verify it's the same node
      expect(result).toBe(existingNode);
    });

    test('should handle numeric path segments as list indices', () => {
      const result = tree.ensurePath(['items', '1'], { skipLast: false });
      expect(tree.root.children['items'].type).toBe('list');
      expect((tree.root.children['items'] as ListNode).children[0]).toBe(result);
    });

    test('should throw when mixing list and tree nodes', () => {
      // Create list structure
      tree.ensurePath(['items', '0']);

      expect(() => tree.ensurePath(['items', 'key'])).toThrow(
        'Path items/key: Expected tree node at items because next segment is not numeric',
      );
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should create and get tree nodes', () => {
      tree.patchNode(['config']);
      const node = tree.getNodeOrList(['config']);
      expect(node.type).toBe('tree');
      expect((node as TreeNode).children).toEqual({});
    });

    test('should create and get list nodes', () => {
      tree.patchList(['tasks']);
      const node = tree.getNodeOrList(['tasks']);
      expect(node.type).toBe('list');
      expect((node as ListNode).children).toEqual([]);
    });

    test('should throw PathError for invalid paths', () => {
      expect(() => tree.getNodeOrList(['nonexistent'])).toThrow(PathError);
    });
  });

  // List Operations
  describe('List Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should handle list operations correctly', () => {
      tree.push(['tasks'], { node: 'task1', input: null, output: null });
      tree.push(['tasks'], { node: 'task2', input: null, output: null });

      const list = tree.getNodeOrList(['tasks']) as ListNode;
      expect(list.children.length).toBe(2);

      const task1 = extractNodeAsObject(tree, ['tasks', '1']);
      expect(task1).toEqual({ node: 'task1', input: null, output: null });
      const task2 = extractNodeAsObject(tree, ['tasks', '2']);
      expect(task2).toEqual({ node: 'task2', input: null, output: null });
    });

    test('should throw PathError for invalid list operations', () => {
      tree.patchNode(['config']);
      expect(() => tree.push(['config'], { node: 'task1', input: null, output: null })).toThrow(PathError);
    });
  });

  // Data Operations
  describe('Data Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should set and get data correctly', () => {
      tree.set(['config', 'timeout'], 5000);
      const value = tree.get(['config', 'timeout']);
      expect(value).toBe(5000);
    });

    test('should throw PathError for invalid data access', () => {
      tree.patchNode(['config']);
      expect(() => tree.get(['config', 'nonexistent'])).toThrow(PathError);
    });
  });

  // Merge Operations
  describe('Merge Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should merge objects correctly', () => {
      tree.merge(['config'], { timeout: 5000, debug: true });
      expect(tree.get(['config', 'timeout'])).toBe(5000);
      expect(tree.get(['config', 'debug'])).toBe(true);
    });

    test('should merge arrays correctly', () => {
      tree.patchList(['tasks']);
      tree.merge(['tasks'], ['task1', 'task2']);
      const list = tree.getNodeOrList(['tasks']) as ListNode;
      expect(list.children.length).toBe(2);
    });
  });

  // Delete Operations
  describe('Delete Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should delete nodes correctly', () => {
      tree.set(['config', 'timeout'], 5000);
      tree.delete(['config', 'timeout']);
      expect(() => tree.get(['config', 'timeout'])).toThrow(PathError);
    });

    test('should throw PathError when deleting nonexistent nodes', () => {
      expect(() => tree.delete(['nonexistent'])).toThrow(PathError);
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should handle root node correctly', () => {
      const root = tree.getNodeOrList([]);
      expect(root.type).toBe('tree');
    });

    test('should handle nested structures correctly', () => {
      tree.patchNode(['users', '1', 'profile']);
      tree.set(['users', '1', 'profile', 'name'], 'John');
      tree.patchList(['users', '1', 'tasks']);
      tree.push(['users', '1', 'tasks'], { node: 'task1', input: null, output: null });

      const profile = tree.getNodeOrList(['users', '1', 'profile']);
      expect(profile.type).toBe('tree');

      const tasks = tree.getNodeOrList(['users', '1', 'tasks']);
      expect(tasks.type).toBe('list');
    });

    // Test numeric path segment handling
    test('should create list nodes for numeric segments', () => {
      tree.patchNode(['items', '1', 'details']);
      const parent = tree.getNodeOrList(['items']);
      expect(parent.type).toBe('list');
      const child = tree.getNodeOrList(['items', '1']);
      expect(child.type).toBe('tree');
    });

    test('should throw when mixing list and tree nodes incorrectly', () => {
      // Create list structure
      tree.patchList(['items']);
      tree.push(['items'], { node: 'item1', input: null, output: null });

      // Should throw when trying to create tree node at list
      expect(() => tree.patchNode(['items'])).toThrow(PathError);
    });

    test('should handle mixed numeric and string paths', () => {
      tree.patchNode(['users', '1', 'profile', 'name']);
      const users = tree.getNodeOrList(['users']);
      expect(users.type).toBe('list');
      const profile = tree.getNodeOrList(['users', '1', 'profile']);
      expect(profile.type).toBe('tree');
    });

    // Add more specific list index tests
    test('should handle list indices correctly', () => {
      tree.patchList(['items']);
      tree.push(['items'], { node: 'item1', input: null, output: null });
      tree.push(['items'], { node: 'item2', input: null, output: null });

      // Get the list node
      const list = tree.getNodeOrList(['items']);
      expect(list.type).toBe('list');
      expect((list as ListNode).children.length).toBe(2);

      // Access data through the list's children
      const item0 = (list as ListNode).children[0];
      expect(item0.type).toBe('tree');
      const item1Node = extractNodeAsObject(tree, ['items', '1']);
      expect(item1Node).toEqual({ node: 'item1', input: null, output: null });

      const item1 = (list as ListNode).children[1];
      expect(item1.type).toBe('tree');
      const item2Node = extractNodeAsObject(tree, ['items', '2']);
      expect(item2Node).toEqual({ node: 'item2', input: null, output: null });
    });

    // Test path validation
    test('should validate paths correctly', () => {
      // Valid paths
      tree.patchNode(['valid', 'path']);
      tree.patchList(['valid', 'items']);
    });

    test('should preserve exact values', () => {
      // Test number preservation
      tree.set(['numbers', 'test'], 5000);
      expect(tree.get(['numbers', 'test'])).toBe(5000);

      // Test string preservation
      tree.set(['strings', 'test'], 'exact');
      expect(tree.get(['strings', 'test'])).toBe('exact');

      // Test object preservation
      const obj = { key: 'value' };
      tree.set(['objects', 'test'], obj);
      expect(tree.get(['objects', 'test'])).toEqual(obj);

      // Test array preservation
      const arr = [1, 2, 3];
      tree.set(['arrays', 'test'], arr);
      expect(tree.get(['arrays', 'test'])).toEqual(arr);
    });
  });
});

// Additional Edge Cases and Failure Tests
describe('Additional Edge Cases and Failure Tests', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should reject paths with invalid characters', () => {
    expect(() => tree.patchNode(['invalid/path'])).toThrow(PathError);
    expect(() => tree.patchNode(['invalid\\path'])).toThrow(PathError);
    expect(() => tree.patchNode(['invalid:path'])).toThrow(PathError);
  });

  test('should handle very deep nesting', () => {
    const deepPath = new Array(100).fill('level');
    tree.patchNode(deepPath);
    const node = tree.getNodeOrList(deepPath);
    expect(node.type).toBe('tree');
  });

  test('should handle large lists', () => {
    tree.patchList(['largeList']);
    for (let i = 0; i < 1000; i++) {
      tree.push(['largeList'], { node: `item${i}`, input: null, output: null });
    }
    const list = tree.getNodeOrList(['largeList']) as ListNode;
    expect(list.children.length).toBe(1000);
  });

  test('should reject invalid list indices', () => {
    tree.patchList(['items']);
    expect(() => tree.getNodeOrList(['items', 'not_a_number'])).toThrow(PathError);
    expect(() => tree.getNodeOrList(['items', '0'])).toThrow(PathError);
    expect(() => tree.getNodeOrList(['items', '-1'])).toThrow(PathError);
    expect(() => tree.getNodeOrList(['items', '999'])).toThrow(PathError);
  });

  test('should preserve data types', () => {
    const date = new Date();
    tree.set(['test', 'date'], date);
    const retrieved = tree.get(['test', 'date']);
    expect(retrieved instanceof Date).toBe(true);
    expect(retrieved.getTime()).toBe(date.getTime());
  });

  test('should handle empty values', () => {
    tree.set(['empty', 'null'], null);
    tree.set(['empty', 'undefined'], undefined);
    tree.set(['empty', 'emptyString'], '');
    expect(tree.get(['empty', 'null'])).toBeNull();
    expect(tree.get(['empty', 'undefined'])).toBeUndefined();
    expect(tree.get(['empty', 'emptyString'])).toBe('');
  });

  test('should reject invalid merge operations', () => {
    tree.patchNode(['config']);
    expect(() => tree.merge(['config'], 'not an object or array' as any)).toThrow(MergeError);
    expect(() => tree.merge(['config'], 123 as any)).toThrow(MergeError);
  });
});

// Path Validation and Type Checking (Indirect)
describe('Path Validation and Type Checking (Indirect)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should create correct node types based on path structure', () => {
    tree.patchNode(['config', 'settings']);
    const configNode = tree.getNodeOrList(['config']);
    expect(configNode.type).toBe('tree');

    tree.patchNode(['items', '1', 'details']);
    const itemsNode = tree.getNodeOrList(['items']);
    expect(itemsNode.type).toBe('list');
  });

  test('should validate paths through public methods', () => {
    expect(() => tree.patchNode(['myobj', 'path'])).not.toThrow();
    expect(() => tree.patchList(['mylist', '0'])).not.toThrow();

    expect(() => tree.patchNode(['myobj', '0', 'path'])).toThrow(PathError);
    expect(() => tree.patchList(['mylist', 'path', '0'])).toThrow(PathError);
  });

  test('should handle mixed type paths correctly', () => {
    tree.patchNode(['mixed', '1', 'path']);
    const listNode = tree.getNodeOrList(['mixed', '1']);
    expect(listNode.type).toBe('tree');

    expect(() => tree.patchNode(['mixed', '1', '1'])).toThrow(PathError);
  });

  test('should validate path segments with special characters', () => {
    expect(() => tree.patchNode(['invalid*path'])).toThrow(PathError);
    expect(() => tree.patchNode(['invalid?path'])).toThrow(PathError);
    expect(() => tree.patchNode(['invalid#path'])).toThrow(PathError);
  });

  test('should reject empty path segments', () => {
    expect(() => tree.patchNode(['valid', '', 'path'])).toThrow(PathError);
    expect(() => tree.patchNode([''])).toThrow(PathError);
  });

  test('should handle maximum path length', () => {
    const longPath = new Array(1000).fill('level');
    expect(() => tree.patchNode(longPath)).not.toThrow();
  });

  test('should validate numeric path segments', () => {
    tree.patchList(['numbers']);
    tree.patchNode(['numbers', '1']);

    expect(() => tree.getNodeOrList(['numbers', '1'])).not.toThrow();
    expect(() => tree.getNodeOrList(['numbers', '1.5'])).toThrow(PathError);
    expect(() => tree.getNodeOrList(['numbers', '01'])).not.toThrow(PathError);
    expect(() => tree.getNodeOrList(['numbers', '-0'])).toThrow(PathError);
  });

  test('should maintain type consistency', () => {
    tree.patchNode(['consistent', 'types']);
    expect(() => tree.patchNode(['consistent', 'types', '0'])).toThrow(PathError);
    expect(() => tree.patchNode(['consistent', 'types', 'sub', '0'])).not.toThrow();
  });
});
