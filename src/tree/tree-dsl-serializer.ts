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

    // Use serializePath logic to get the base structure
    const baseStructure = this.convertNodeToSerializable(root);

    // Extract root's children as top-level entries
    const result = { ...baseStructure };
    delete result.$module; // Remove root-level module marker if present

    // Post-process to collapse single-child chains
    const processedResult = this.collapseSingleChildChains(result);

    return this.yamlStringify(processedResult);
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

  private yamlStringify(data: any): string {
    // Create a YAML document
    const doc = YAML.parseDocument(YAML.stringify(data));

    // Recursively process all nodes
    const processNode = (node: any) => {
      if (node.type === 'SCALAR' && typeof node.value === 'string') {
        // Only use block style for multi-line strings
        if (node.value.includes('\n')) {
          node.type = 'BLOCK_LITERAL';
        } else {
          node.type = 'PLAIN';
        }
      }
      if (node.items) {
        node.items.forEach(processNode);
      }
      if (node.value) {
        processNode(node.value);
      }
    };

    // Process the document content
    doc.contents && processNode(doc.contents);

    return doc.toString({
      defaultKeyType: 'PLAIN' as const,
      lineWidth: 0,
    });
  }

  /**
   * Serializes only a specific path and its children
   * @param tree - The tree to serialize from
   * @param path - The path to serialize
   * @returns YAML string containing only the specified subtree
   */
  public serializePath(tree: Tree, path: string[]): string {
    const node = tree.getNodeUnion(path);
    const subtree = this.convertNodeToSerializable(node);
    return this.yamlStringify(subtree);
  }

  private convertNodeToSerializable(node: NodeUnion): any {
    switch (node.type) {
      case 'data':
        return node.value;
      case 'tree': {
        const obj: Record<string, any> = {};
        if (node.isModule) {
          obj.$module = true;
        }
        for (const [key, child] of Object.entries(node.children)) {
          obj[key] = this.convertNodeToSerializable(child);
        }
        return obj;
      }
      case 'list':
        return node.children.map((child) => this.convertNodeToSerializable(child));
      default:
        throw new Error(`Unexpected node type: ${(node as any).type}`);
    }
  }
}
