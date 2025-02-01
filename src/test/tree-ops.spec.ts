import { describe, test, beforeEach, expect } from 'bun:test';
import { Tree, path } from '../tree/tree';
import type { CreateNodeOperation, UpdateNodeOperation, DeleteNodeOperation } from '../tree/tree';
import assert from 'assert';

describe('Tree Operations', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = new Tree();
    // Create a simple test structure
    tree.applyCreateNodeOperation({
      type: 'create-node',
      path: 'test',
      nodeType: 'tree',
    });
  });

  describe('CreateNodeOperation', () => {
    test('should create new tree node', () => {
      const op: CreateNodeOperation = {
        type: 'create-node',
        path: 'test/newNode',
        nodeType: 'tree',
      };

      tree.applyCreateNodeOperation(op);
      const node = tree.getNode(path('test/newNode'));
      expect(node?.type).toBe('tree');
    });

    test('should create new list node', () => {
      const op: CreateNodeOperation = {
        type: 'create-node',
        path: 'test/listNode',
        nodeType: 'list',
      };

      tree.applyCreateNodeOperation(op);
      const list = tree.getList(path('test/listNode'));
      expect(list.type).toBe('list');
    });
  });

  describe('UpdateNodeOperation', () => {
    test('should add and remove properties', () => {
      const op: UpdateNodeOperation = {
        type: 'update-node',
        path: 'test',
        add: { newProp: 'value' },
        remove: ['nonExistingProp'],
      };

      tree.applyUpdateNodeOperation(op);
      const node = tree.getNode(path('test'));

      expect(node?.type).toBe('tree');
      assert(node?.type === 'tree');
      expect(node?.children['newProp']).toBeDefined();
      expect(node?.children['nonExistingProp']).toBeUndefined();
    });
  });

  describe('DeleteNodeOperation', () => {
    test('should remove existing node', () => {
      const op: DeleteNodeOperation = {
        type: 'delete-node',
        path: 'test',
      };

      tree.applyDeleteNodeOperation(op);
      expect(() => tree.getNode(path('test'))).toThrow('Node not found');
    });

    test('should throw when deleting non-existent node', () => {
      const op: DeleteNodeOperation = {
        type: 'delete-node',
        path: 'non/existent',
      };

      expect(() => tree.applyDeleteNodeOperation(op)).toThrow('Path non/existent: Node does not exist');
    });
  });

  describe('CreateNodeOperation Edge Cases', () => {
    test('should throw when creating tree node with numeric parent segment', () => {
      // First create a list node
      tree.applyCreateNodeOperation({
        type: 'create-node',
        path: 'test/myList',
        nodeType: 'list',
      });

      const op: CreateNodeOperation = {
        type: 'create-node',
        path: 'test/myList/0/invalid',
        nodeType: 'tree',
      };

      expect(() => tree.applyCreateNodeOperation(op)).toThrow('Path test/myList/0/invalid: Invalid list index: 0');
    });
  });

  describe('UpdateNodeOperation Edge Cases', () => {
    test('should throw when updating list node', () => {
      tree.applyCreateNodeOperation({
        type: 'create-node',
        path: 'test/myList',
        nodeType: 'list',
      });

      const op: UpdateNodeOperation = {
        type: 'update-node',
        path: 'test/myList',
        add: { newProp: 'value' },
        remove: [],
      };

      expect(() => tree.applyUpdateNodeOperation(op)).toThrow(
        'Path test/myList: Expected tree node at test/myList, but got list',
      );
    });
  });
});
