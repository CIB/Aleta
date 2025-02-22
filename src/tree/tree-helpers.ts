import { ListNode, Tree, TreeNode } from './tree';

export function nodeToObject<T extends object>(node: TreeNode): T {
  const rval: Record<string, any> = {};
  console.log('Node children:', node.children);

  console.log('node', node);

  // Handle all children, regardless of type
  for (const key in node.children) {
    const child = node.children[key];
    console.log(`Processing child ${key}:`, child);

    if (child.type === 'data') {
      rval[key] = child.value;
      console.log(`Added data value for ${key}:`, child.value);
    } else if (child.type === 'tree') {
      // Recursively handle tree nodes
      rval[key] = nodeToObject(child);
      console.log(`Added tree node for ${key}:`, child);
    } else if (child.type === 'list') {
      // Handle list nodes
      rval[key] = nodeToList(child, [key]);
      console.log(`Added list node for ${key}:`, child);
    } else {
      throw new Error(`Unknown child type ${(child as any).type} for key ${key}`);
    }
  }

  // Handle direct properties (for LLM templates)
  if (typeof node === 'object') {
    for (const key in node) {
      if (key !== 'type' && key !== 'name' && key !== 'children' && key !== 'isModule') {
        rval[key] = node[key];
        console.log(`Added direct property ${key}:`, node[key]);
      }
    }
  }

  return rval as T;
}

export function extractNodeAsObject<T extends object>(tree: Tree, path: string[]): T {
  const node = tree.getNodeOrList(path);
  console.log('Node before conversion:', JSON.stringify(node, null, 2));
  if (node.type !== 'tree') {
    throw new Error(`Node at ${path.join('/')} is not a tree node`);
  }
  const result = nodeToObject(node);
  console.log('Node after conversion:', JSON.stringify(result, null, 2));
  return result;
}

export function extractDataList<T>(tree: Tree, path: string[]): T[] {
  const listNode = tree.getNodeOrList(path);
  if (listNode.type !== 'list') {
    throw new Error(`Node at ${path.join('/')} is not a list node`);
  }

  return nodeToList(listNode, path);
}

export function nodeToList<T>(node: ListNode, path: string[]): T[] {
  return node.children.map((child, i) => {
    if (child.type !== 'data') {
      throw new Error(`Child is not a data node at ${path.join('/')}/${i + 1}`);
    }
    return child.value as T;
  });
}

export function findModule(tree: Tree, path: string[]): string[] {
  // We start at the end of the path and work our way up to the root
  for (let i = path.length; i >= 0; i--) {
    const node = tree.getNodeOrList(path.slice(0, i));
    if (node.type === 'tree' && node.isModule) {
      return path.slice(0, i);
    }
  }
  return [];
}
