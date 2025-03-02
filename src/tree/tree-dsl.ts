import { parse } from 'yaml';
import { Tree } from './tree';

type YamlNode = Record<string, any> | any[];

export class DslParser {
  private tree: Tree;
  private currentPath: string[] = [];

  constructor() {
    this.tree = new Tree();
  }

  public parse(yamlContent: string): Tree {
    // Handle empty content
    if (yamlContent.trim() === '') {
      return new Tree();
    }

    const data = parse(yamlContent);

    // Handle null/undefined from empty YAML
    if (data === null || data === undefined) {
      return new Tree();
    }

    this.processNode([], data);
    return this.tree;
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
}
