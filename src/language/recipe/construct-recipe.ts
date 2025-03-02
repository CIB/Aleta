import { SystemContext } from '../../system/system-context';
import * as fs from 'fs/promises';
import { join } from 'path';
import { DslParser } from '@/tree/tree-dsl';

export async function buildNodeForConstructRecipe(system: SystemContext) {
  const tree = system.tree;

  const fileContent = await fs.readFile(join(__dirname, 'construct-recipe.yml'), 'utf8');
  // Parse it into the root of the tree
  new DslParser(tree).parseInto(fileContent, []);
}
