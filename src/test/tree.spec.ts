import { expect, test, describe, beforeEach } from 'bun:test';
import {
  Tree,
  PathSegmentError,
  TreeNode,
  ListNode,
  DataNode,
  MergeError,
  PathNotFoundError,
  PathTypeMismatchError,
} from '../tree/tree';
import { extractNodeAsObject, findModule } from '../tree/tree-helpers';

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
      const existingNode = tree.createNode(['existing', 'node']);
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

    test('a should throw when mixing list and tree nodes', () => {
      // Create list structure
      tree.ensurePath(['items', '1']);

      expect(() => tree.ensurePath(['items', 'key'])).toThrow(
        'Path items/key: Expected tree but found list at />>>items<<</key',
      );
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should create and get tree nodes', () => {
      tree.createNode(['config']);
      const node = tree.getNodeOrList(['config']);
      expect(node.type).toBe('tree');
      expect((node as TreeNode).children).toEqual({});
    });

    test('should create and get list nodes', () => {
      tree.createList(['tasks']);
      const node = tree.getNodeOrList(['tasks']);
      expect(node.type).toBe('list');
      expect((node as ListNode).children).toEqual([]);
    });

    test('should throw PathError for invalid paths', () => {
      expect(() => tree.getNodeOrList(['nonexistent'])).toThrow(PathNotFoundError);
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
      tree.createNode(['config']);
      expect(() => tree.push(['config'], { node: 'task1', input: null, output: null })).toThrow(PathSegmentError);
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
      tree.createNode(['config']);
      expect(() => tree.get(['config', 'nonexistent'])).toThrow(PathSegmentError);
    });
  });

  // Merge Operations
  describe('Merge Operations', () => {
    beforeEach(() => {
      tree = new Tree();
    });

    test('should merge objects correctly', () => {
      tree.insertObject(['config'], { timeout: 5000, debug: true });
      expect(tree.get(['config', 'timeout'])).toBe(5000);
      expect(tree.get(['config', 'debug'])).toBe(true);
    });

    test('should merge arrays correctly', () => {
      tree.createList(['tasks']);
      tree.insert(['tasks'], ['task1', 'task2']);
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
      tree.set(['config', 'timeout', 'value'], 5000);
      tree.delete(['config', 'timeout']);
      expect(() => tree.get(['config', 'timeout'])).toThrow(PathSegmentError);
    });

    test('should throw PathError when deleting nonexistent nodes', () => {
      expect(() => tree.delete(['nonexistent'])).toThrow(PathNotFoundError);
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
      tree.createNode(['users', '1', 'profile']);
      tree.set(['users', '1', 'profile', 'name'], 'John');
      tree.createList(['users', '1', 'tasks']);
      tree.push(['users', '1', 'tasks'], { node: 'task1', input: null, output: null });

      const profile = tree.getNodeOrList(['users', '1', 'profile']);
      expect(profile.type).toBe('tree');

      const tasks = tree.getNodeOrList(['users', '1', 'tasks']);
      expect(tasks.type).toBe('list');
    });

    // Test numeric path segment handling
    test('should create list nodes for numeric segments', () => {
      tree.createNode(['items', '1', 'details']);
      const parent = tree.getNodeOrList(['items']);
      expect(parent.type).toBe('list');
      const child = tree.getNodeOrList(['items', '1']);
      expect(child.type).toBe('tree');
    });

    test('should throw when mixing list and tree nodes incorrectly', () => {
      // Create list structure
      tree.createList(['items']);
      tree.push(['items'], { node: 'item1', input: null, output: null });

      // Should throw when trying to create tree node at list
      expect(() => tree.createNode(['items'])).toThrow(PathTypeMismatchError);
    });

    test('should handle mixed numeric and string paths', () => {
      tree.createNode(['users', '1', 'profile', 'name']);
      const users = tree.getNodeOrList(['users']);
      expect(users.type).toBe('list');
      const profile = tree.getNodeOrList(['users', '1', 'profile']);
      expect(profile.type).toBe('tree');
    });

    // Add more specific list index tests
    test('should handle list indices correctly', () => {
      tree.createList(['items']);
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
      tree.createNode(['valid', 'path']);
      tree.createList(['valid', 'items']);
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
    expect(() => tree.createNode(['invalid/path'])).toThrow(PathSegmentError);
    expect(() => tree.createNode(['invalid\\path'])).toThrow(PathSegmentError);
    expect(() => tree.createNode(['invalid:path'])).toThrow(PathSegmentError);
  });

  test('should handle very deep nesting', () => {
    const deepPath = new Array(100).fill('level');
    tree.createNode(deepPath);
    const node = tree.getNodeOrList(deepPath);
    expect(node.type).toBe('tree');
  });

  test('should handle large lists', () => {
    tree.createList(['largeList']);
    for (let i = 0; i < 1000; i++) {
      tree.push(['largeList'], { node: `item${i}`, input: null, output: null });
    }
    const list = tree.getNodeOrList(['largeList']) as ListNode;
    expect(list.children.length).toBe(1000);
  });

  test('should reject invalid list indices', () => {
    tree.createList(['items']);
    expect(() => tree.getNodeOrList(['items', 'not_a_number'])).toThrow(PathTypeMismatchError);
    expect(() => tree.getNodeOrList(['items', '0'])).toThrow(PathSegmentError);
    expect(() => tree.getNodeOrList(['items', '-1'])).toThrow(PathSegmentError);
    expect(() => tree.getNodeOrList(['items', '999'])).toThrow(PathSegmentError);
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
    tree.createNode(['config']);
    expect(() => tree.insertObject(['config'], 'not an object or array' as any)).toThrow(MergeError);
    expect(() => tree.insertObject(['config'], 123 as any)).toThrow(MergeError);
  });
});

// Path Validation and Type Checking (Indirect)
describe('Path Validation and Type Checking (Indirect)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should create correct node types based on path structure', () => {
    tree.createNode(['config', 'settings']);
    const configNode = tree.getNodeOrList(['config']);
    expect(configNode.type).toBe('tree');

    tree.createNode(['items', '1', 'details']);
    const itemsNode = tree.getNodeOrList(['items']);
    expect(itemsNode.type).toBe('list');
  });

  test('should validate paths through public methods', () => {
    tree.createNode(['myobj', 'path']);
    tree.createList(['mylist', '1']);

    expect(() => tree.createNode(['myobj', '0', 'path'])).toThrow(PathTypeMismatchError);
    expect(() => tree.createList(['mylist', 'path', '0'])).toThrow(PathTypeMismatchError);
  });

  test('should handle mixed type paths correctly', () => {
    tree.createNode(['mixed', '1', 'path']);
    const listNode = tree.getNodeOrList(['mixed', '1']);
    expect(listNode.type).toBe('tree');

    expect(() => tree.createNode(['mixed', '1', '1'])).toThrow(PathTypeMismatchError);
  });

  test('should validate path segments with special characters', () => {
    expect(() => tree.createNode(['invalid*path'])).toThrow(PathSegmentError);
    expect(() => tree.createNode(['invalid?path'])).toThrow(PathSegmentError);
    expect(() => tree.createNode(['invalid#path'])).toThrow(PathSegmentError);
  });

  test('should reject empty path segments', () => {
    expect(() => tree.createNode(['valid', '', 'path'])).toThrow(PathSegmentError);
    expect(() => tree.createNode([''])).toThrow(PathSegmentError);
  });

  test('should handle maximum path length', () => {
    const longPath = new Array(1000).fill('level');
    expect(() => tree.createNode(longPath)).not.toThrow();
  });

  test('should validate numeric path segments', () => {
    tree.createList(['numbers']);
    tree.createNode(['numbers', '1']);

    expect(() => tree.getNodeOrList(['numbers', '1'])).not.toThrow();
    expect(() => tree.getNodeOrList(['numbers', '1.5'])).toThrow(PathSegmentError);
    expect(() => tree.getNodeOrList(['numbers', '01'])).not.toThrow(PathSegmentError);
    expect(() => tree.getNodeOrList(['numbers', '-0'])).toThrow(PathSegmentError);
  });

  test('should maintain type consistency', () => {
    tree.createNode(['consistent', 'types']);
    expect(() => tree.createNode(['consistent', 'types', '1'])).toThrow(PathTypeMismatchError);
    expect(() => tree.createNode(['consistent', 'types', 'sub', '1'])).not.toThrow();
  });
});

describe('Module Functionality', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should create a module node', () => {
    const modulePath = ['core', 'module'];
    tree.createModule(modulePath);

    const node = tree.getNodeOrList(modulePath);
    expect(node.type).toBe('tree');
    expect((node as TreeNode).isModule).toBe(true);
  });

  test('should turn existing node into a module', () => {
    const modulePath = ['core', 'module'];
    tree.createNode(modulePath);
    tree.createModule(modulePath);

    const node = tree.getNodeOrList(modulePath);
    expect(node.type).toBe('tree');
    expect((node as TreeNode).isModule).toBe(true);
  });

  test('should allow patching nodes within a module', () => {
    const modulePath = ['core', 'module'];
    tree.createModule(modulePath);

    const childPath = [...modulePath, 'child'];
    tree.createNode(childPath);

    const childNode = tree.getNodeOrList(childPath);
    expect(childNode.type).toBe('tree');
  });

  test('should get correct module from child node', () => {
    const modulePath = ['core', 'module'];
    tree.createModule(modulePath);

    const childPath = [...modulePath, 'child'];
    tree.createNode(childPath);

    const module = findModule(tree, childPath);
    expect(module).toEqual(modulePath);
  });

  test('should preserve isModule flag when patching node', () => {
    const modulePath = ['core', 'module'];
    tree.createModule(modulePath);

    // Patch the node with new properties
    tree.createNode(modulePath);
    tree.set([...modulePath, 'newProperty'], 'value');

    const node = tree.getNodeOrList(modulePath);
    expect(node.type).toBe('tree');
    expect((node as TreeNode).isModule).toBe(true);
    expect((node as TreeNode).children['newProperty']).toBeDefined();
  });

  test('should preserve isModule flag when patching child nodes', () => {
    const modulePath = ['core', 'module'];
    tree.createModule(modulePath);

    const childPath = [...modulePath, 'child'];
    tree.createNode(childPath);
    tree.set([...childPath, 'childProperty'], 'value');

    const moduleNode = tree.getNodeOrList(modulePath);
    const childNode = tree.getNodeOrList(childPath);

    expect(moduleNode.type).toBe('tree');
    expect((moduleNode as TreeNode).isModule).toBe(true);
    expect(childNode.type).toBe('tree');
    expect((childNode as TreeNode).children['childProperty']).toBeDefined();
  });
});

describe('Node Construction', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should properly wrap data values in DataNode structures', () => {
    // Test object wrapping
    tree.set(['config', 'settings'], { timeout: 5000 });
    const settingsNode = tree.getDataNode(['config', 'settings']);
    expect(settingsNode.type).toBe('data');
    expect((settingsNode as DataNode).value).toEqual({ timeout: 5000 });

    // Test primitive value wrapping
    tree.set(['config', 'timeout'], 5000);
    const timeoutNode = tree.getDataNode(['config', 'timeout']);
    expect(timeoutNode.type).toBe('data');
    expect((timeoutNode as DataNode).value).toBe(5000);

    // Test array wrapping
    tree.set(['config', 'allowedHosts'], ['host1', 'host2']);
    const hostsNode = tree.getDataNode(['config', 'allowedHosts']);
    expect(hostsNode.type).toBe('data');
    expect((hostsNode as DataNode).value).toEqual(['host1', 'host2']);

    // Test nested object structure
    const complexValue = {
      server: {
        host: 'localhost',
        port: 8080,
      },
      features: ['auth', 'logging'],
    };
    tree.set(['config', 'complex'], complexValue);
    const complexNode = tree.getDataNode(['config', 'complex']);
    expect(complexNode.type).toBe('data');
    expect((complexNode as DataNode).value).toEqual(complexValue);
  });

  test('should maintain proper node structure when extracting objects', () => {
    // Create a complex structure by setting individual properties
    tree.createNode(['config', 'settings']);
    tree.set(['config', 'settings', 'timeout'], 5000);
    tree.set(['config', 'settings', 'features'], ['auth', 'logging']);
    tree.createNode(['config', 'settings', 'server']);
    tree.set(['config', 'settings', 'server', 'host'], 'localhost');
    tree.set(['config', 'settings', 'server', 'port'], 8080);

    // Extract the object
    const extracted = extractNodeAsObject<{
      timeout: number;
      features: string[];
      server: { host: string; port: number };
    }>(tree, ['config', 'settings']);

    // Verify the structure
    expect(extracted).toEqual({
      timeout: 5000,
      features: ['auth', 'logging'],
      server: {
        host: 'localhost',
        port: 8080,
      },
    });

    // Verify the underlying node structure
    const settingsNode = tree.getNodeOrList(['config', 'settings']);
    expect(settingsNode.type).toBe('tree');
    const timeoutNode = tree.getDataNode(['config', 'settings', 'timeout']);
    expect(timeoutNode.type).toBe('data');
    expect(timeoutNode.value).toBe(5000);
  });
});

describe('Node Retrieval', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
    tree.set(['config', 'timeout'], 5000);
    tree.createNode(['config', 'settings']);
    tree.createList(['tasks']);
  });

  test('getNodeUnion should return any type of node', () => {
    const timeoutNode = tree.getNodeUnion(['config', 'timeout']);
    expect(timeoutNode.type).toBe('data');

    const settingsNode = tree.getNodeUnion(['config', 'settings']);
    expect(settingsNode.type).toBe('tree');

    const tasksNode = tree.getNodeUnion(['tasks']);
    expect(tasksNode.type).toBe('list');
  });

  test('getNodeOrList should return only tree or list nodes', () => {
    const settingsNode = tree.getNodeOrList(['config', 'settings']);
    expect(settingsNode.type).toBe('tree');

    const tasksNode = tree.getNodeOrList(['tasks']);
    expect(tasksNode.type).toBe('list');

    expect(() => tree.getNodeOrList(['config', 'timeout'])).toThrow(PathTypeMismatchError);
  });

  test('getDataNode should return only data nodes', () => {
    const timeoutNode = tree.getDataNode(['config', 'timeout']);
    expect(timeoutNode.type).toBe('data');
    expect(timeoutNode.value).toBe(5000);

    expect(() => tree.getDataNode(['config', 'settings'])).toThrow(PathTypeMismatchError);
    expect(() => tree.getDataNode(['tasks'])).toThrow(PathTypeMismatchError);
  });
});

describe('Object Insertion', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  test('should insert flat object correctly', () => {
    const obj = {
      timeout: 5000,
      debug: true,
      host: 'localhost',
    };

    tree.insertObject(['config'], obj);

    expect(tree.get(['config', 'timeout'])).toBe(5000);
    expect(tree.get(['config', 'debug'])).toBe(true);
    expect(tree.get(['config', 'host'])).toBe('localhost');
  });

  test('should insert nested object correctly', () => {
    const obj = {
      server: {
        host: 'localhost',
        port: 8080,
      },
      features: ['auth', 'logging'],
    };

    tree.insertObject(['config'], obj);

    expect(tree.get(['config', 'server', 'host'])).toBe('localhost');
    expect(tree.get(['config', 'server', 'port'])).toBe(8080);
    expect(tree.get(['config', 'features', '1'])).toEqual('auth');
  });

  test('should handle complex nested structures', () => {
    const obj = {
      config: {
        server: {
          host: 'localhost',
          ports: [8080, 8081],
        },
        features: {
          auth: {
            enabled: true,
            providers: ['local', 'google'],
          },
        },
      },
    };

    tree.insertObject(['root'], obj);

    expect(tree.get(['root', 'config', 'server', 'host'])).toBe('localhost');
    expect(tree.get(['root', 'config', 'server', 'ports', '1'])).toEqual(8080);
    expect(tree.get(['root', 'config', 'features', 'auth', 'enabled'])).toBe(true);
    expect(tree.get(['root', 'config', 'features', 'auth', 'providers', '1'])).toEqual('local');
  });

  test('a should throw error for non-object values', () => {
    expect(() => tree.insertObject(['config'], null as any)).toThrow('Can only insert objects');
    expect(() => tree.insertObject(['config'], 123 as any)).toThrow('Can only insert objects');
    expect(() => tree.insertObject(['config'], 'string' as any)).toThrow('Can only insert objects');
  });

  test('a should handle empty objects', () => {
    tree.insertObject(['empty'], {});
    const node = tree.getNodeOrList(['empty']);
    expect(node.type).toBe('tree');
    expect((node as TreeNode).children).toEqual({});
  });

  test('a should handle arrays of objects', () => {
    const obj = {
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    };

    tree.insertObject(['data'], obj);

    const users = tree.getNodeOrList(['data', 'users']);
    expect(users.type).toBe('list');

    const alice = extractNodeAsObject(tree, ['data', 'users', '1']);
    expect(alice).toEqual({ name: 'Alice', age: 30 });

    const bob = extractNodeAsObject(tree, ['data', 'users', '2']);
    expect(bob).toEqual({ name: 'Bob', age: 25 });
  });

  test('a should handle arrays of primitives', () => {
    const obj = {
      numbers: [1, 2, 3],
    };

    tree.insertObject(['data'], obj);

    const numbers = tree.getNodeOrList(['data', 'numbers']);
    expect(numbers.type).toBe('list');

    expect(tree.get(['data', 'numbers', '1'])).toBe(1);
    expect(tree.get(['data', 'numbers', '2'])).toBe(2);
    expect(tree.get(['data', 'numbers', '3'])).toBe(3);
  });
});

describe('Insertion Methods', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
  });

  describe('_insertDataNode', () => {
    test('should insert data node at specified path', () => {
      tree.set(['config', 'timeout'], 5000);
      expect(tree.get(['config', 'timeout'])).toBe(5000);
    });

    test('should create parent nodes if they dont exist', () => {
      tree.set(['config', 'timeout'], 5000);
      expect(tree.get(['config', 'timeout'])).toBe(5000);
    });

    test('should throw error for empty path', () => {
      expect(() => tree._insertDataNode([], 'value')).toThrow('Cannot insert data at root');
    });
  });

  describe('_insertObjectRecursive', () => {
    test('should handle flat objects', () => {
      const obj = { timeout: 5000, debug: true };
      tree._insertObjectRecursive(['config'], obj);
      expect(tree.get(['config', 'timeout'])).toBe(5000);
      expect(tree.get(['config', 'debug'])).toBe(true);
    });

    test('should handle nested objects', () => {
      const obj = { server: { host: 'localhost', port: 8080 } };
      tree._insertObjectRecursive(['config'], obj);
      expect(tree.get(['config', 'server', 'host'])).toBe('localhost');
      expect(tree.get(['config', 'server', 'port'])).toBe(8080);
    });

    test('b should handle arrays of objects', () => {
      const obj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
      tree._insertObjectRecursive(['data'], obj);
      expect(tree.get(['data', 'users', '1', 'name'])).toBe('Alice');
      expect(tree.get(['data', 'users', '2', 'name'])).toBe('Bob');
    });

    test('b should handle arrays of primitives', () => {
      const obj = { numbers: [1, 2, 3] };
      tree._insertObjectRecursive(['data'], obj);
      expect(tree.get(['data', 'numbers', '1'])).toBe(1);
      expect(tree.get(['data', 'numbers', '2'])).toBe(2);
      expect(tree.get(['data', 'numbers', '3'])).toBe(3);
    });
  });

  describe('insertObject', () => {
    test('should insert flat object and apply operations', () => {
      const obj = { timeout: 5000, debug: true };
      tree.insertObject(['config'], obj);

      const timeoutNode = tree.getDataNode(['config', 'timeout']);
      expect(timeoutNode.valueType).toBe('number');
      expect(timeoutNode.value).toBe(5000);

      const debugNode = tree.getDataNode(['config', 'debug']);
      expect(debugNode.valueType).toBe('boolean');
      expect(debugNode.value).toBe(true);
    });

    test('should insert nested object and apply operations', () => {
      const obj = { server: { host: 'localhost', port: 8080 } };
      tree.insertObject(['config'], obj);

      const hostNode = tree.getDataNode(['config', 'server', 'host']);
      expect(hostNode.valueType).toBe('string');
      expect(hostNode.value).toBe('localhost');

      const portNode = tree.getDataNode(['config', 'server', 'port']);
      expect(portNode.valueType).toBe('number');
      expect(portNode.value).toBe(8080);
    });

    test('b should throw error for non-object values', () => {
      expect(() => tree.insertObject(['config'], null as any)).toThrow('Can only insert objects');
      expect(() => tree.insertObject(['config'], 123 as any)).toThrow('Can only insert objects');
      expect(() => tree.insertObject(['config'], 'string' as any)).toThrow('Can only insert objects');
    });

    test('b should handle empty objects', () => {
      tree.insertObject(['empty'], {});
      const node = tree.getNodeOrList(['empty']);
      expect(node.type).toBe('tree');
      expect((node as TreeNode).children).toEqual({});
    });
  });
});
