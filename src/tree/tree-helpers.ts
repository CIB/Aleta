import { ListNode, Tree, TreeNode } from './tree';

export function nodeToObject<T extends object>(node: TreeNode): T {
  const rval: object = {};
  for (const key in node.children) {
    if (node.children[key].type === 'data') {
      rval[key] = node.children[key].value;
    }
  }
  return rval as T;
}

export function extractNodeAsObject<T extends object>(tree: Tree, path: string[]): T {
  const node = tree.getNodeOrList(path);
  if (node.type !== 'tree') {
    throw new Error(`Node at ${path.join('/')} is not a tree node`);
  }
  return nodeToObject(node);
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
