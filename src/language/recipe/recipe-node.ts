import { Tree } from '../../tree/tree';
import { extractNodeAsObject } from '../../tree/tree-helpers';
import { Schema } from '../type-checker';

export interface RecipeNode {
  // The type of input the function expects
  input: Schema;

  /** TypeScript code defining the function */
  code: string;
}

export function getRecipeAtPath(tree: Tree, recipePath: string[]): RecipeNode {
  const functionConfig = extractNodeAsObject<RecipeNode>(tree, recipePath);
  // TODO: Use JSON schema to validate that the function config has the correct properties
  return functionConfig;
}

export function writeRecipe(tree: Tree, recipePath: string[], recipe: RecipeNode) {
  const node = tree.patchNode(recipePath, recipe);
  tree.patchNode([...recipePath, 'placeholders']);
  return node;
}

export function addRecipeChild(tree: Tree, recipePath: string[], key: string, child: RecipeNode) {
  const placeholderPath = [...recipePath, 'placeholders', key];
  tree.patchNode(placeholderPath, child);

  return placeholderPath;
}

export function getRecipeChild(tree: Tree, recipePath: string[], key: string): RecipeNode {
  const placeholderPath = [...recipePath, 'placeholders', key];
  return extractNodeAsObject<RecipeNode>(tree, placeholderPath);
}
