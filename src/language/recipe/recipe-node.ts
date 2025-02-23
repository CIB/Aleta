import { Tree } from '../../tree/tree';
import { Schema } from '../type-checker';

export interface RecipeNode {
  // The type of input the function expects
  input: Schema;

  /** TypeScript code defining the function */
  code: string;
}

export function getRecipeAtPath(tree: Tree, recipePath: string[]): RecipeNode {
  const functionConfig = tree.getJSON<RecipeNode>(recipePath);
  // TODO: Use JSON schema to validate that the function config has the correct properties
  return functionConfig;
}

export function writeRecipe(tree: Tree, recipePath: string[], recipe: RecipeNode) {
  const node = tree.insert(recipePath, recipe);
  tree.createNode([...recipePath, 'placeholders']);
  return node;
}

export function addRecipeChild(tree: Tree, recipePath: string[], key: string, child: RecipeNode) {
  const placeholderPath = [...recipePath, 'placeholders', key];
  tree.insert(placeholderPath, child);

  return placeholderPath;
}

export function getRecipeChild(tree: Tree, recipePath: string[], key: string): RecipeNode {
  const placeholderPath = [...recipePath, 'placeholders', key];
  return tree.getJSON<RecipeNode>(placeholderPath);
}
