// At the core of the reasoning system is a tree.
// Most things can be represented as nodes in the tree.
// Nodes can be referenced uniquely by their path.

import { cloneDeep, flatten, isInteger } from 'lodash';
import { Schema } from '../language/type-checker';
import { validateType } from '../types';
import { createLogger } from '@/utils/log';
import { diff, applyChangeset, type Changeset } from 'json-diff-ts';

const logger = createLogger('CORE');

export function path(path: string): string[] {
  return path.split('/');
}

export class PathSegmentError extends Error {
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

interface TreeParentAndIndex {
  type: 'tree';
  parent: TreeNode;
  index: string;
}

interface ListParentAndIndex {
  type: 'list';
  parent: ListNode;
  index: number;
}

export type ParentAndIndex = TreeParentAndIndex | ListParentAndIndex;

export class PathNotFoundError extends Error {
  constructor(
    public path: string[],
    message: string,
  ) {
    super(`Path ${path.join('/')}: ${message}`);
    this.name = 'PathNotFoundError';
  }
}

export class PathTypeMismatchError extends Error {
  constructor(
    public path: string[],
    public pathSegment: number,
    public expectedType: string,
    public actualType: string,
  ) {
    const debugString =
      path.slice(0, pathSegment).join('/') +
      '/>>>' +
      path[pathSegment] +
      '<<</' +
      path.slice(pathSegment + 1).join('/');
    super(`Path ${path.join('/')}: Expected ${expectedType} but found ${actualType} at ${debugString}`);
    this.name = 'PathTypeMismatchError';
  }
}

export type AnyPathError = PathSegmentError | PathTypeMismatchError | PathNotFoundError;

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
  public lastVersion: TreeNode;
  public diffLog: Changeset[] = [];

  public setCheckpoint(): void {
    // Store diff between current state and last version
    const currentDiff = diff(this.lastVersion, this.root);
    this.diffLog.push(cloneDeep(currentDiff));

    this.lastVersion = cloneDeep(this.root);
  }

  public restore(checkpoint: number): Tree {
    // Validate checkpoint index
    if (!Number.isInteger(checkpoint) || checkpoint < 0 || checkpoint >= this.diffLog.length) {
      throw new Error(`Invalid checkpoint index: ${checkpoint}. Must be between 0 and ${this.diffLog.length - 1}`);
    }

    const newTree = new Tree();
    // Restore the tree by applying the diffs
    const changeset = flatten(this.diffLog.slice(0, checkpoint));
    applyChangeset(newTree.root, changeset);
    newTree.lastVersion = cloneDeep(newTree.root);
    return newTree;
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

  /**
   * Retrieves any type of node at the specified path
   * @param path - Array of path segments to the target node
   * @returns NodeUnion at the specified path
   * @throws PathError if path is invalid or node not found
   */
  public getNodeUnion(path: string[]): NodeUnion {
    let current: NodeUnion = this.root;
    for (const [i, segment] of path.entries()) {
      if (current.type === 'data') {
        // i - 1 because `current` was set in the last iteration
        throw new PathTypeMismatchError(path, i - 1, 'tree|list', current.type);
      } else if (current.type === 'list') {
        const listNode = current as ListNode;
        const index = this.segmentToIndex(segment);

        if (index === null) {
          throw new PathTypeMismatchError(path, i, 'tree', current.type);
        } else if (index === 'error' || index > listNode.children.length) {
          throw new PathSegmentError(path, `Invalid list index: ${segment}`);
        }

        current = listNode.children[index];
        if (!current) {
          throw new PathNotFoundError(path, `Node not found: ${path.slice(0, i + 1).join('/')}`);
        }
      } else if (current.type === 'tree') {
        const treeNode = current as TreeNode;

        // If the path segment can be parsed as an integer, throw an error
        const index = this.segmentToIndex(segment);
        if (index !== null) {
          throw new PathTypeMismatchError(path, i, 'list', current.type);
        }

        current = treeNode.children[segment];
        if (!current) {
          throw new PathNotFoundError(path, `Node not found: ${path.slice(0, i + 1).join('/')}`);
        }
      }
    }
    return current;
  }

  /**
   * Retrieves a TreeNode or ListNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns TreeNode or ListNode at the specified path
   * @throws PathError if path is invalid or node is a data node
   */
  getNodeOrList(path: string[]): TreeNode | ListNode {
    const node = this.getNodeUnion(path);
    if (node.type === 'data') {
      throw new PathTypeMismatchError(path, path.length - 1, 'tree|list', node.type);
    }
    return node;
  }

  /**
   * Retrieves a DataNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns DataNode at the specified path
   * @throws PathError if path is invalid or node is not a data node
   */
  getDataNode(path: string[]): DataNode {
    const node = this.getNodeUnion(path);
    if (node.type !== 'data') {
      throw new PathTypeMismatchError(path, path.length - 1, 'data', node.type);
    }
    return node;
  }

  getDataNodeOptional(path: string[]): DataNode | null {
    try {
      return this.getDataNode(path);
    } catch (e) {
      if (e instanceof PathNotFoundError) {
        return null;
      } else {
        throw e;
      }
    }
  }

  getNode(path: string[]): TreeNode {
    const nodeOrList = this.getNodeOrList(path);
    if (nodeOrList.type !== 'tree') {
      throw new PathTypeMismatchError(path, path.length - 1, 'tree', nodeOrList.type);
    }
    return nodeOrList;
  }

  getNodeOptional(path: string[]): TreeNode | null {
    try {
      return this.getNode(path);
    } catch (e) {
      if (e instanceof PathNotFoundError) {
        return null;
      } else {
        throw e;
      }
    }
  }

  getList(path: string[]): ListNode {
    const nodeOrList = this.getNodeOrList(path);
    if (nodeOrList.type !== 'list') {
      throw new PathSegmentError(path, `Expected list node at ${path.join('/')}, but got ${nodeOrList.type}`);
    }
    return nodeOrList;
  }

  getListOptional(path: string[]): ListNode | null {
    try {
      return this.getList(path);
    } catch (e) {
      if (e instanceof PathNotFoundError) {
        return null;
      } else {
        throw e;
      }
    }
  }

  private validatePathSegment(segment: string): void {
    if (segment.length === 0) {
      throw new PathSegmentError([segment], 'Path segment cannot be empty');
    }
    if (/[\/\\:*?"<>|#]/.test(segment)) {
      throw new PathSegmentError([segment], `Invalid character in path segment: ${segment}`);
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
    for (const [i, segment] of path.entries()) {
      if (i === path.length - 1 && skipLast) continue;
      this.validatePathSegment(segment);

      const nextSegment = path[i + 1];
      const isNextSegmentNumeric = nextSegment !== undefined && !isNaN(parseInt(nextSegment));

      let currentSegment: string | number = segment;
      const potentialInt = parseInt(currentSegment);
      if (!isNaN(potentialInt)) {
        if (potentialInt < 1) {
          throw new PathSegmentError(path, `Invalid list index: ${segment}`);
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
      // If we have a next segment, do some basic type checks on the current segment
      if (nextSegment !== undefined) {
        if (isNextSegmentNumeric && next.type !== 'list') {
          throw new PathTypeMismatchError(path, i, 'list', next.type);
        }
        if (!isNextSegmentNumeric && next.type !== 'tree') {
          throw new PathTypeMismatchError(path, i, 'tree', next.type);
        }
      }

      current = next as TreeNode;
    }

    return current;
  }

  public getParentAndIndex(
    path: string[],
    options: { createParents: boolean } = { createParents: false },
  ): ParentAndIndex {
    if (path.length === 0) {
      throw new PathSegmentError(path, 'Cannot create node at root');
    }

    const parentPath = path.slice(0, -1);
    const lastSegment = path[path.length - 1];

    let parent: TreeNode | ListNode;
    if (options.createParents) {
      // Automatically create missing parent nodes
      parent = this.ensurePath(path, { skipLast: true });
    } else {
      // Strict mode - parent must exist
      try {
        parent = this.getNodeOrList(parentPath);
      } catch (e) {
        if (e instanceof PathNotFoundError) {
          throw new PathNotFoundError(parentPath, `Parent node does not exist and createParents is false`);
        }
        throw e;
      }
    }

    // Handle list vs tree node creation based on last segment
    const index = this.segmentToIndex(lastSegment);

    if (index !== null) {
      // List node case
      if (parent.type !== 'list') {
        throw new PathTypeMismatchError(path, path.length - 1, 'list', parent.type);
      }
      if (index === 'error') {
        throw new PathSegmentError(path, `Invalid list index: ${lastSegment}`);
      }
      return { type: 'list', parent, index };
    } else {
      // Tree node case
      if (parent.type !== 'tree') {
        throw new PathTypeMismatchError(path, path.length - 1, 'tree', parent.type);
      }
      return { type: 'tree', parent, index: lastSegment };
    }
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
    this.lastVersion = cloneDeep(this.root);
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

  private putChild(parent: TreeNode | ListNode, path: string[], segment: string, child: NodeUnion): void {
    const index = this.segmentToIndex(segment);
    if (index === 'error') {
      throw new PathSegmentError(path, `Invalid list index: ${segment} in ${path.join('/')}`);
    }

    if (index !== null && parent.type !== 'list') {
      throw new PathSegmentError(path, `Expected list at ${path.slice(0, -1).join('/')}`);
    } else if (index === null && parent.type !== 'tree') {
      throw new PathSegmentError(path, `Expected tree at ${path.slice(0, -1).join('/')}`);
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
    function serializeNode(node: NodeUnion): any {
      const base = {
        type: node.type,
        name: node.name,
      };

      switch (node.type) {
        case 'data':
          return {
            ...base,
            valueType: node.valueType,
            value: node.value,
          };
        case 'tree':
          return {
            ...base,
            isModule: node.isModule,
            children: Object.fromEntries(
              Object.entries(node.children).map(([key, child]) => [key, serializeNode(child)]),
            ),
          };
        case 'list':
          return {
            ...base,
            valueType: node.valueType,
            children: node.children.map((child) => serializeNode(child)),
          };
        default:
          throw new Error(`Unknown node type: ${(node as any).type}`);
      }
    }

    return serializeNode(this.root);
  }

  static fromJSON(json: any): Tree {
    function deserializeNode(data: any): NodeUnion {
      switch (data.type) {
        case 'data':
          return {
            type: 'data',
            name: data.name,
            valueType: data.valueType,
            value: data.value,
          };
        case 'tree':
          return {
            type: 'tree',
            name: data.name,
            isModule: data.isModule,
            children: Object.fromEntries(
              Object.entries(data.children).map(([key, child]) => [key, deserializeNode(child)]),
            ),
          };
        case 'list':
          return {
            type: 'list',
            name: data.name,
            valueType: data.valueType,
            children: (data.children || []).map(deserializeNode),
          };
        default:
          throw new Error(`Unknown node type: ${data.type}`);
      }
    }

    const tree = new Tree();
    const root = deserializeNode(json) as TreeNode;
    tree.root = root;
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

  createModule(path: string[]): TreeNode {
    const node = this.createNode(path);
    node.isModule = true;
    return node;
  }

  /**
   * Recursively inserts a JavaScript object into the tree structure
   * @param path - Path where the object should be inserted
   * @param object - The object to insert
   */
  insertObject(path: string[], object: object): void {
    if (typeof object !== 'object' || object === null) {
      throw new MergeError(path, 'Can only insert objects');
    }

    this._insertObjectRecursive(path, object);
  }

  insert(path: string[], value: any): void {
    this._insertItemRecursive(path, value);
  }

  public _insertDataNode(
    path: string[],
    value: any,
    options: { createParents: boolean } = { createParents: false },
  ): void {
    if (path.length === 0) {
      throw new PathSegmentError(path, 'Cannot insert data at root');
    }

    // We assume the parent has been created already as part of the recursive process
    const { parent, index } = this.getParentAndIndex(path, { createParents: options.createParents });

    let valueType: Schema = 'any';
    if (typeof value === 'string') {
      valueType = 'string';
    } else if (typeof value === 'number') {
      valueType = 'number';
    } else if (typeof value === 'boolean') {
      valueType = 'boolean';
    }

    const dataNode: DataNode = {
      type: 'data',
      name: index.toString(),
      valueType,
      value,
    };

    parent.children[index] = dataNode;
  }

  public _insertItemRecursive(currentPath: string[], obj: any): void {
    if (Array.isArray(obj)) {
      this._insertArrayRecursive(currentPath, obj);
    } else if (typeof obj === 'object' && obj !== null) {
      this._insertObjectRecursive(currentPath, obj);
    } else {
      this._insertDataNode(currentPath, obj);
    }
  }

  public _insertArrayRecursive(currentPath: string[], obj: any[]): void {
    // Create the array if it doesn't exist
    const existingNode = this.getListOptional(currentPath);
    if (!existingNode) {
      this.createList(currentPath);
    }

    for (const [i, item] of obj.entries()) {
      const itemPath = [...currentPath, (i + 1).toString()];
      this._insertItemRecursive(itemPath, item);
    }
  }

  public _insertObjectRecursive(currentPath: string[], obj: object): void {
    const existingNode = this.getNodeOptional(currentPath);
    if (!existingNode) {
      this.createNode(currentPath);
    } else if (existingNode.type !== 'tree') {
      throw new PathTypeMismatchError(currentPath, currentPath.length - 1, 'tree', existingNode.type);
    }

    // Handle regular object
    for (const [key, value] of Object.entries(obj)) {
      const childPath = [...currentPath, key];
      this._insertItemRecursive(childPath, value);
    }
  }

  /**
   * Creates or retrieves a TreeNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns TreeNode at the specified path
   * @throws PathError if path is invalid or node type mismatch
   */
  createNode(path: string[]): TreeNode {
    if (path.length === 0) {
      return this.root;
    }

    let existingNode = this.ensurePath(path, { skipLast: false });
    if (existingNode && existingNode.type !== 'tree') {
      throw new PathTypeMismatchError(path, path.length - 1, 'tree', existingNode.type);
    }

    if (!existingNode) {
      // Ensure the parent path matches the last segment
      const { parent, index } = this.getParentAndIndex(path, { createParents: true });
      parent.children[index] = {
        type: 'tree',
        name: index.toString(),
        children: {},
        isModule: false,
      };
    }

    return this.getNode(path);
  }

  /**
   * Creates or retrieves a ListNode at the specified path
   * @param path - Array of path segments to the target node
   * @returns ListNode at the specified path
   * @throws PathError if path is invalid or node type mismatch
   */
  createList(path: string[]): ListNode {
    if (path.length === 0) {
      throw new PathSegmentError(path, 'Cannot create list at root');
    }

    let existingNode = this.getListOptional(path);

    if (!existingNode) {
      // Ensure the parent path matches the last segment
      const { parent, index } = this.getParentAndIndex(path, { createParents: true });
      parent.children[index] = {
        type: 'list',
        name: index.toString(),
        children: [],
        valueType: 'any',
      };
    }

    return this.getList(path);
  }

  /**
   * Adds a value to the end of a list node
   * @param path - Path to the target list node
   * @param value - Value to add to the list
   * @returns The full path to the new element in the list
   * @throws PathError if path is invalid or target is not a list
   */
  push(path: string[], value: any): string[] {
    // Check if the list exists
    let index: number;
    let list: ListNode | null = null;
    try {
      list = this.getList(path);
      index = list.children.length;
    } catch (e) {
      if (e instanceof PathNotFoundError) {
        // Do nothing, we will create the list later
      } else {
        throw e;
      }
    }
    index = list ? list.children.length : 0;
    // We start counting at 1
    const itemPath = [...path, (index + 1).toString()];

    if (!list) {
      this.createList(path);
    }

    this._insertItemRecursive(itemPath, value);

    return itemPath;
  }

  nodeExists(path: string[]): boolean {
    try {
      this.getNodeOrList(path);
      return true;
    } catch (e) {
      if (e instanceof PathNotFoundError) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Sets a data value at the specified path
   * @param path - Path to the target node
   * @param value - Value to set
   * @throws PathError if path is invalid
   */
  set(path: string[], value: any): void {
    this._insertDataNode(path, value, { createParents: true });
  }

  /**
   * Retrieves a data value from the specified path
   * @param path - Path to the target node
   * @returns Value at the specified path
   * @throws PathError if path is invalid or node is not a data node
   */
  get(path: string[]): any {
    const { index, parent } = this.getParentAndIndex(path, { createParents: false });
    if (!parent) {
      throw new PathNotFoundError(path, `Parent not found for ${path.join('/')}`);
    }
    if (!parent.children[index]) {
      throw new PathSegmentError(path, `Attribute not found: ${index}`);
    }
    const attribute = parent.children[index];

    if (attribute.type === 'data') {
      return attribute.value;
    }
    throw new PathSegmentError(path, `Expected data node at ${path.join('/')}`);
  }

  /**
   * Deletes a node at the specified path
   * @param path - Path to the node to delete
   * @throws PathError if path is invalid or node doesn't exist
   */
  delete(path: string[]): void {
    if (path.length === 0) {
      throw new PathSegmentError(path, 'Cannot delete root node');
    }

    const { parent, index } = this.getParentAndIndex(path, { createParents: false });
    if (!parent) {
      throw new PathNotFoundError(path, `Parent not found for ${path.join('/')}`);
    }
    if (!parent.children[index]) {
      throw new PathNotFoundError(path, `Attribute not found: ${path.join('/')}`);
    }
    delete parent.children[index];
  }

  public getJSON<T = any>(path: string[]): T {
    const node = this.getNodeUnion(path);
    return this.convertNodeToJSON(node);
  }

  private convertNodeToJSON(node: NodeUnion): any {
    switch (node.type) {
      case 'data':
        return node.value;
      case 'tree': {
        const obj: Record<string, any> = {};
        for (const [key, child] of Object.entries(node.children)) {
          obj[key] = this.convertNodeToJSON(child);
        }
        return obj;
      }
      case 'list':
        return node.children.map((child) => this.convertNodeToJSON(child));
      default:
        throw new Error(`Unexpected node type: ${(node as any).type}`);
    }
  }
}
