// At the core of the reasoning system is a tree.
// Most things can be represented as nodes in the tree.
// Nodes can be referenced uniquely by their path.

import { isInteger } from 'lodash';
import { Schema } from '../language/type-checker';
import { validateType } from '../types';
import { createLogger } from '@/utils/log';

const logger = createLogger('CORE');

export function path(path: string): string[] {
  return path.split('/');
}

export class PathError extends Error {
  constructor(
    public path: string[],
    message: string,
  ) {
    super(`Path ${path.join('/')}: ${message}`);
    this.name = 'PathError';
  }
}

export class MergeError extends Error {
  constructor(
    public path: string[],
    message: string,
  ) {
    super(`Path ${path.join('/')}: ${message}`);
    this.name = 'MergeError';
  }
}

export interface BaseNode {
  name: string;
}

export interface DataNode extends BaseNode {
  type: 'data';
  valueType: Schema;
  value: any;
}

export interface TreeNode extends BaseNode {
  type: 'tree';
  children: Record<string, NodeUnion>;
  isModule: boolean;
}

export interface ListNode extends BaseNode {
  type: 'list';
  valueType: string; // The path of the type in the tree
  children: NodeUnion[];
}

export type NodeUnion = DataNode | TreeNode | ListNode;

export type UpdateNodeOperation = {
  type: 'update-node';
  path: string;
  add: Record<string, any>;
  remove: string[];
};

export type CreateNodeOperation = {
  type: 'create-node';
  nodeType: 'tree' | 'list';
  path: string;
};

export type DeleteNodeOperation = {
  type: 'delete-node';
  path: string;
};

export type TreeOperationItem = UpdateNodeOperation | CreateNodeOperation | DeleteNodeOperation;
export type TreeOperation = TreeOperationItem[];

/**
 * Core tree data structure for the reasoning system.
 *
 * The tree consists of three types of nodes:
 * - TreeNode: Represents a branch with named children
 * - ListNode: Represents an ordered collection of nodes
 * - DataNode: Represents a leaf node containing data
 *
 * Nodes are referenced by their path, which is an array of strings.
 * Numeric path segments indicate list indices.
 */
export class Tree {
  public root: TreeNode;
  public operationLog: TreeOperation[];

  public applyUpdateNodeOperation(operation: UpdateNodeOperation): void {
    const { path: modPath, add, remove } = operation;
    const node = this.getNode(path(modPath));
    if (!node) {
      throw new Error(`Node not found: ${modPath}`);
    }
    if (node.type !== 'tree') {
      throw new Error(`Expected tree node at ${modPath}`);
    }
    for (const key of remove) {
      delete node.children[key];
    }
    for (const [key, value] of Object.entries(add)) {
      node.children[key] = value;
    }
  }

  public applyCreateNodeOperation(operation: CreateNodeOperation): void {
    const { path: modPath, nodeType } = operation;

    if (nodeType === 'tree') {
      const parent = this.ensurePath(path(modPath), { skipLast: true });
      const lastSegment = path(modPath)[path(modPath).length - 1];
      const index = this.segmentToIndex(lastSegment);
      if (index === null) {
        parent.children[lastSegment] = {
          type: 'tree',
          name: lastSegment,
          children: {},
          isModule: false,
        };
      } else {
        parent.children[index] = {
          type: 'tree',
          name: lastSegment,
          children: {},
          isModule: false,
        };
      }
    } else if (nodeType === 'list') {
      this.patchList(path(modPath));
    }
  }

  public applyDeleteNodeOperation(operation: DeleteNodeOperation): void {
    const { path: modPath } = operation;
    this.delete(path(modPath));
  }

  /**
   * Creates a new Tree instance with an empty root node
   */
  constructor() {
    this.root = {
      type: 'tree',
      name: 'root',
      isModule: true,
      children: {},
    };
  }

  /**
   * Retrieves a TreeNode or ListNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns TreeNode or ListNode at the specified path
   * @throws PathError if path is invalid or node not found
   */
  getNodeOrList(path: string[]): TreeNode | ListNode {
    let current: NodeUnion = this.root;

    for (const [i, segment] of path.entries()) {
      if (current.type === 'data') {
        throw new PathError(path, 'Cannot traverse through data node');
      } else if (current.type === 'list') {
        const listNode = current as ListNode;
        const index = this.segmentToIndex(segment);

        if (index === null || index === 'error' || index > listNode.children.length) {
          throw new PathError(path, `Invalid list index: ${segment}`);
        }

        current = listNode.children[index];
        if (!current) {
          throw new PathError(path, `Node not found: ${path.slice(0, i + 1).join('/')}`);
        }
      } else if (current.type === 'tree') {
        const treeNode = current as TreeNode;

        // If the path segment can be parsed as an integer, throw an error
        const index = this.segmentToIndex(segment);
        if (index !== null) {
          throw new PathError(path, `We are trying to index a tree node using a list index. This is not allowed.`);
        }

        current = treeNode.children[segment];
        if (!current) {
          console.log('tree', this.root);
          throw new PathError(path, `Node not found: ${path.slice(0, i + 1).join('/')}`);
        }
      }
    }

    if (current.type === 'data') {
      throw new PathError(path, 'Cannot return data node');
    }

    return current;
  }

  /**
   * Validates that a node conforms to the expected schema
   * @param node - Node to validate
   * @returns true if node is valid
   * @throws Error if node type is unknown or invalid
   */
  validateNode(node: NodeUnion): boolean {
    const types = this.root.children.types as TreeNode;
    const typeNode = types.children[node.type];
    if (!typeNode) {
      throw new Error(`Unknown node type: ${node.type}`);
    }

    if (node.type === 'data') {
      const dataNode = node as DataNode;
      return this.validateValue(dataNode.value, dataNode.valueType);
    } else {
      const treeNode = node as TreeNode;

      // Recursively validate children
      for (const child of Object.values(treeNode.children)) {
        this.validateNode(child);
      }
    }

    return true;
  }

  private validateValue(value: any, type: Schema): boolean {
    return validateType(value, type).valid;
  }

  getNode(path: string[]): NodeUnion | null {
    const nodeOrList = this.getNodeOrList(path);
    if (nodeOrList.type !== 'tree') {
      throw new PathError(path, `Expected tree node at ${path.join('/')}, but got ${nodeOrList.type}`);
    }
    return nodeOrList;
  }

  getList(path: string[]): ListNode {
    const nodeOrList = this.getNodeOrList(path);
    if (nodeOrList.type !== 'list') {
      throw new PathError(path, `Expected list node at ${path.join('/')}, but got ${nodeOrList.type}`);
    }
    return nodeOrList;
  }

  private segmentToIndex(segment: string): number | 'error' | null {
    const index = parseFloat(segment);
    if (isNaN(index)) {
      return null;
    }
    if (!isInteger(index)) {
      return 'error';
    }
    if (index < 1) {
      return 'error';
    }
    return index - 1;
  }

  private putChild(parent: TreeNode | ListNode, path: string[], segment: string, child: NodeUnion): void {
    const index = this.segmentToIndex(segment);
    if (index === 'error') {
      throw new PathError(path, `Invalid list index: ${segment} in ${path.join('/')}`);
    }

    if (index !== null && parent.type !== 'list') {
      throw new PathError(path, `Expected list at ${path.slice(0, -1).join('/')}`);
    } else if (index === null && parent.type !== 'tree') {
      throw new PathError(path, `Expected tree at ${path.slice(0, -1).join('/')}`);
    }

    let segmentToUse = index !== null ? index.toString() : segment;

    parent.children[segmentToUse] = child;
  }

  setNode(path: string[], node: NodeUnion): void {
    if (path.length === 0) {
      throw new Error('Cannot set root node');
    }

    // Validate the node before inserting
    this.validateNode(node);

    const lastSegment = path[path.length - 1];

    // Navigate to parent node
    const parent = this.getNodeOrList(path.slice(0, -1));

    // Set the node
    this.putChild(parent, path, lastSegment, node);
  }

  toJSON(): any {
    const types = this.root.children.types as TreeNode;
    return {
      types: types.children,
      root: this.root,
    };
  }

  static fromJSON(json: any): Tree {
    const tree = new Tree();
    tree.root = json.root;
    return tree;
  }

  // Save to file
  async save(filepath: string): Promise<void> {
    const json = this.toJSON();
    await Bun.write(filepath, JSON.stringify(json, null, 2));
  }

  // Load from file
  static async load(filepath: string): Promise<Tree> {
    const content = await Bun.file(filepath).text();
    const json = JSON.parse(content);
    return Tree.fromJSON(json);
  }

  private validatePathSegment(segment: string): void {
    if (segment.length === 0) {
      throw new PathError([segment], 'Path segment cannot be empty');
    }
    if (/[\/\\:*?"<>|#]/.test(segment)) {
      throw new PathError([segment], `Invalid character in path segment: ${segment}`);
    }
  }

  private validatePath(path: string[]): void {
    for (const segment of path) {
      this.validatePathSegment(segment);
    }
  }

  /**
   * Ensures that all nodes along a path exist, creating them if necessary.
   *
   * Analogous to `mkdir -p` for file systems.
   *
   * This function handles the creation of intermediate nodes based on the next
   * path segment:
   * - Creates a ListNode if the next segment is numeric
   * - Creates a TreeNode if the next segment is not numeric
   *
   * @param path - The full path to ensure exists
   * @param skipLast - If this is true, we will skip the last segment, and only use it for type verification
   * @returns The parent node of the last path segment
   * @throws PathError if:
   *   - A list node is expected but a tree node exists
   *   - A tree node is expected but a list node exists
   *
   * @example
   * // Creates intermediate nodes as needed
   * ensurePath(['users', '0', 'profile']);
   * // Creates:
   * // - 'users' as TreeNode (next segment is numeric)
   * // - '0' as ListNode (next segment is not numeric)
   * // Returns the parent node of 'profile'
   */
  public ensurePath(path: string[], options: { skipLast: boolean } = { skipLast: true }): TreeNode {
    const { skipLast } = options;
    if (path.length === 0) {
      return this.root;
    }

    this.validatePath(path);

    let current: TreeNode = this.root;
    // Handle all segments, excluding the last one
    for (const [i, segment] of path.entries()) {
      if (i === path.length - 1 && skipLast) continue;
      this.validatePathSegment(segment);

      const nextSegment = path[i + 1];
      const isNextSegmentNumeric = nextSegment !== undefined && !isNaN(parseInt(nextSegment));

      let currentSegment: string | number = segment;
      const potentialInt = parseInt(currentSegment);
      if (!isNaN(potentialInt)) {
        if (potentialInt < 1) {
          throw new PathError(path, `Invalid list index: ${segment}`);
        }
        currentSegment = potentialInt - 1;
      }

      if (!current.children[currentSegment]) {
        // Create list node if next segment is numeric, tree node otherwise
        current.children[currentSegment] = isNextSegmentNumeric
          ? {
              type: 'list',
              name: segment,
              valueType: 'any',
              children: [],
            }
          : {
              type: 'tree',
              name: segment,
              children: {},
              isModule: false,
            };
      }

      const next = current.children[currentSegment];
      if (isNextSegmentNumeric && next.type !== 'list') {
        throw new PathError(path, `Expected list node at ${segment} because next segment is numeric`);
      }
      if (!isNextSegmentNumeric && next.type !== 'tree') {
        throw new PathError(path, `Expected tree node at ${segment} because next segment is not numeric`);
      }

      current = next as TreeNode;
    }

    return current;
  }

  createModule(path: string[]): TreeNode {
    const node = this.patchNode(path);
    node.isModule = true;
    return node;
  }

  /**
   * Creates or retrieves a TreeNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns TreeNode at the specified path
   * @throws PathError if path is invalid or node type mismatch
   */
  patchNode(path: string[], initialValue?: object): TreeNode {
    if (path.length === 0) {
      return this.root;
    }

    const parent = this.ensurePath(path, { skipLast: true });
    let lastSegment: number | string = path[path.length - 1];
    const potentialInt = parseInt(lastSegment);
    if (!isNaN(potentialInt)) {
      lastSegment = potentialInt - 1;
    }

    if (!parent.children[lastSegment]) {
      parent.children[lastSegment] = {
        type: 'tree',
        name: lastSegment.toString(),
        children: {},
        isModule: false,
      };
    }

    const node = parent.children[lastSegment];
    if (node.type !== 'tree') {
      throw new PathError(path, `Expected tree node at ${lastSegment}`);
    }

    if (initialValue) {
      this.merge(path, initialValue);
    }

    return node as TreeNode;
  }

  /**
   * Creates or retrieves a ListNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns ListNode at the specified path
   * @throws PathError if path is invalid or node type mismatch
   */
  patchList(path: string[]): ListNode {
    if (path.length === 0) {
      throw new PathError(path, 'Cannot create list at root');
    }

    const parent = this.ensurePath(path, { skipLast: true });
    const lastSegment = path[path.length - 1];

    if (!parent.children[lastSegment]) {
      parent.children[lastSegment] = {
        type: 'list',
        name: lastSegment,
        valueType: 'any',
        children: [],
      };
    }

    const node = parent.children[lastSegment];
    if (node.type !== 'list') {
      throw new PathError(path, `Expected list node at ${lastSegment}`);
    }

    return node as ListNode;
  }

  /**
   * Adds a value to the end of a list node
   * @param path - Path to the target list node
   * @param value - Value to add to the list
   * @returns The full path to the new element in the list
   * @throws PathError if path is invalid or target is not a list
   */
  push(path: string[], value: object): string[] {
    const list = this.patchList(path);
    const index = list.children.length + 1;
    this.merge([...path, index.toString()], value);
    return [...path, list.children.length.toString()];
  }

  /**
   * Sets a data value at the specified path
   * @param path - Path to the target node
   * @param value - Value to set
   * @throws PathError if path is invalid
   */
  set(path: string[], value: any): void {
    console.log('Setting value:', { path, value });
    if (path.length === 0) {
      throw new PathError(path, 'Cannot set root node');
    }

    const parentPath = path.slice(0, -1);
    const name = path[path.length - 1];
    const parent = this.patchNode(parentPath);

    parent.children[name] = {
      type: 'data',
      name,
      valueType: 'any',
      value,
    };
  }

  /**
   * Retrieves a data value from the specified path
   * @param path - Path to the target node
   * @returns Value at the specified path
   * @throws PathError if path is invalid or node is not a data node
   */
  get(path: string[]): any {
    console.log('Getting value:', { path });
    const parentPath = path.slice(0, -1);
    const node = this.getNodeOrList(parentPath);
    const name = path[path.length - 1];
    if (!node.children[name]) {
      throw new PathError(path, `Attribute not found: ${name}`);
    }
    const attribute = node.children[name];

    if (attribute.type === 'data') {
      return attribute.value;
    }
    throw new PathError(path, `Expected data node at ${parentPath.join('/')}`);
  }

  /**
   * Merges an object or array into the tree at the specified path
   * @param path - Path to merge into
   * @param value - Object or array to merge
   * @throws PathError if path is invalid or value is not mergeable
   */
  merge(path: string[], value: object | any[]): void {
    // TODO: We should consider handling recursive / deep merge
    this.validatePath(path);

    if (Array.isArray(value)) {
      const list = this.patchList(path);
      list.children.push(
        ...value.map(
          (val, i) =>
            ({
              type: 'data',
              name: (list.children.length + i).toString(),
              valueType: 'any',
              value: val,
            }) as DataNode,
        ),
      );
    } else if (typeof value === 'object') {
      const node = this.patchNode(path);
      for (const [key, val] of Object.entries(value)) {
        node.children[key] = {
          type: 'data',
          name: key,
          valueType: 'any',
          value: val,
        };
      }
    } else {
      throw new MergeError(path, `Invalid merge value: ${value}`);
    }
  }

  /**
   * Deletes a node at the specified path
   * @param path - Path to the node to delete
   * @throws PathError if path is invalid or node doesn't exist
   */
  delete(path: string[]): void {
    if (path.length === 0) {
      throw new PathError(path, 'Cannot delete root node');
    }

    const parentPath = path.slice(0, -1);
    const name = path[path.length - 1];
    const parent = this.patchNode(parentPath);

    if (!parent.children[name]) {
      throw new PathError(path, 'Node does not exist');
    }

    delete parent.children[name];
  }
}
