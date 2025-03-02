import { parse } from 'yaml';
import { Tree } from './tree';

type YamlNode = Record<string, any> | any[];

export class DslParser {
  private tree: Tree;
  private currentPath: string[] = [];

  constructor(tree?: Tree) {
    this.tree = tree || new Tree();
  }

  public parse(yamlContent: string): Tree {
    this.tree = new Tree(); // Reset tree for fresh parse
    return this.parseInto(yamlContent, []);
  }

  private processNode(path: string[], node: YamlNode): void {
    if (Array.isArray(node)) {
      this.processListNode(path, node);
    } else if (typeof node === 'object' && node !== null) {
      this.processTreeNode(path, node);
    } else {
      // Handle primitive values directly
      this.tree.set(path, node);
    }
  }

  private processTreeNode(path: string[], node: Record<string, any>): void {
    // Handle special properties first
    if ('$module' in node && node.$module) {
      this.tree.createModule(path);
    } else {
      this.tree.createNode(path);
    }

    // Process child nodes
    for (const [key, value] of Object.entries(node)) {
      if (key === '$module') continue; // Skip special properties

      const childPath = key.includes('/') ? [...path, ...key.split('/')] : [...path, key];

      // Handle primitive values directly
      if (typeof value !== 'object' || value === null) {
        this.tree.set(childPath, value);
      } else {
        this.processNode(childPath, value);
      }
    }
  }

  private processListNode(path: string[], items: any[]): void {
    this.tree.createList(path);
    items.forEach((item, index) => {
      const itemPath = [...path, (index + 1).toString()];
      this.processNode(itemPath, item);
    });
  }

  /**
   * Parses YAML content and merges it into an existing tree at a specific path
   * @param yamlContent - The YAML content to parse
   * @param path - The path where the content should be merged
   * @returns The modified tree
   */
  public parseInto(yamlContent: string, path: string[]): Tree {
    // Handle empty content
    if (yamlContent.trim() === '') {
      return this.tree;
    }

    const data = parse(yamlContent);

    // Handle null/undefined from empty YAML
    if (data === null || data === undefined) {
      return this.tree;
    }

    // Ensure the parent path exists
    this.tree.ensurePath(path, { skipLast: true });

    // Process the node at the specified path
    this.processNode(path, data);
    return this.tree;
  }
}
