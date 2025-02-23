import { Tree } from './tree';

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
