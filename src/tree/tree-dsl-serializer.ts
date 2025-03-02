import YAML from 'yaml';
import { Tree } from './tree';
import { NodeUnion, TreeNode, ListNode, DataNode } from './tree';

export class DslSerializer {
  public serialize(tree: Tree): string {
    const root = tree.getNode([]);

    // Check if the tree is empty
    if (Object.keys(root.children).length === 0) {
      return '';
    }

    const result: Record<string, any> = {};

    // Serialize root's children as top-level entries
    for (const [key, child] of Object.entries(root.children)) {
      result[key] = this.serializeNode(child);
    }

    // Post-process to collapse single-child chains
    const processedResult = this.collapseSingleChildChains(result);

    const yamlOutput = YAML.stringify(processedResult, {
      defaultKeyType: 'PLAIN' as const,
      defaultStringType: 'BLOCK_LITERAL' as const,
      lineWidth: 0,
      sortMapEntries: (a, b) => {
        if (a.key === '$module') return -1;
        if (b.key === '$module') return 1;
        return String(a.key).localeCompare(String(b.key));
      },
    });

    return yamlOutput;
  }

  private collapseSingleChildChains(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if this is a single-child node that can be collapsed
        const childKeys = Object.keys(value);
        if (childKeys.length === 1 && !('$module' in value)) {
          const [childKey] = childKeys;
          // Only collapse if the child is an object, not a primitive
          if (typeof value[childKey] === 'object' && value[childKey] !== null) {
            const collapsedValue = this.collapseSingleChildChains(value[childKey]);
            result[`${key}/${childKey}`] = collapsedValue;
          } else {
            // If it's a primitive, keep the structure intact
            result[key] = { [childKey]: value[childKey] };
          }
        } else {
          // Can't collapse, process children normally
          result[key] = this.collapseSingleChildChains(value);
        }
      } else {
        // Not an object, keep as-is
        result[key] = value;
      }
    }

    return result;
  }

  private serializeNode(node: NodeUnion): any {
    switch (node.type) {
      case 'tree':
        return this.serializeTreeNode(node);
      case 'list':
        return this.serializeListNode(node);
      case 'data':
        return this.serializeDataNode(node);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private serializeTreeNode(node: TreeNode): Record<string, any> {
    const obj: Record<string, any> = {};

    // Handle module declaration
    if (node.isModule) {
      obj.$module = true;
    }

    // Serialize children recursively
    for (const [childKey, childNode] of Object.entries(node.children)) {
      obj[childKey] = this.serializeNode(childNode);
    }

    return obj;
  }

  private serializeListNode(node: ListNode): any[] {
    return node.children.map((child) => this.serializeNode(child));
  }

  private serializeDataNode(node: DataNode): any {
    // Preserve multi-line strings and special types
    return node.value;
  }
}
