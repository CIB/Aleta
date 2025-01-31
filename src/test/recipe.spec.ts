import { expect, test, describe, beforeEach } from 'bun:test';
import { SystemContext } from '../system/system-context';
import { buildNodeForConstructRecipe } from '../language/recipe/construct-recipe';
import { getRecipeAtPath } from '../language/recipe/recipe-node';
import { createTestSystemContext } from '../system/test-system-context';
import { Tree } from '../tree/tree';
import { ExecutionContext } from '../language/execution-context';
import { runFunction } from '../language/function';
import { path as p } from '../tree/tree';
describe('Recipe Construction', () => {
  let system: SystemContext;
  let tree: Tree;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    system = createTestSystemContext();
    tree = system.tree;
    executionContext = new ExecutionContext(system, []);
  });

  test('should construct basic recipe through LLM', async () => {
    // Execute recipe construction
    await runFunction(executionContext, p('core/recipe/construct'), {
      path: 'test/greetUser',
      recipeDescription: '1. Get current user\n2. Greet user',
      recipeInputType: 'string',
    });

    // Verify created recipe
    const recipe = getRecipeAtPath(tree, p('test/greetUser'));
    console.log('recipe', recipe.code);
    expect(recipe.input).toEqual('string');
    expect(recipe.code).toContain(
      "const currentUser = $do('Get current user', 'string', { input });\nconst greeting = $do('Greet user', 'string', { currentUser });",
    );

    // Verify placeholder nodes
    // const getCurrentUser = tree.get(p('test/greetUser/placeholders/Get current user'));
    // const greetUser = tree.get(p('test/greetUser/placeholders/Greet user'));
    // expect(getCurrentUser).toBeDefined();
    // expect(greetUser).toBeDefined();
  });

  test('should handle complex recipe structure', async () => {
    // Mock LLM response for multi-step recipe

    await runFunction(executionContext, ['core', 'recipe', 'construct'], {
      path: 'test/processItems',
      recipeDescription: '1. Get list of websites\n2. Convert each website to markdown\n3. Combine results',
      recipeInputType: '{ searchTerm: string }',
    });

    const recipe = getRecipeAtPath(tree, ['test', 'processItems']);
    let expectedResult = `const websites = $do('Get list of websites', 'string[]', { searchTerm: input.searchTerm });\nconst markdowns = websites.map(website => $do('Convert website to markdown', 'string', { website }));\nconst combinedResult = $do('Combine results', 'string', { markdowns });`;
    expect(recipe.code).toContain(expectedResult);
  });
});
