import { SystemContext } from '../../system/system-context';
import { writeFunction } from '../function';
import { LLMCall } from '../llm-call';
import { path as p } from '../../tree/tree';

const recipeInput1 = `1. Get a complete list of all changes
2. Get the contents of all changed files
3. For each file, create a summary of the changes
4. Create a description of the merge request based on all the summaries`;

const recipeExample1 = `
const changedFiles = $do('Get a complete list of all changes', 'string[]');
const changedContents = $do('Get the contents of all changed files', 'string[]', { changedFiles });
const summaries = changedContents.map(content => $do('Create a summary of the changes for the file', 'string', { content }));
const mergeRequestDescription = $do('Create a description of the merge request based on all the summaries', 'string', {
  summaries,
});`;

export function buildNodeForConstructRecipe(system: SystemContext) {
  const tree = system.tree;
  const path = p('core/recipe/construct');
  tree.patchNode(path);
  tree.createModule(path);

  writeFunction(tree, path, {
    input: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
        },
        recipeInputType: { type: 'string' },
        recipeDescription: { type: 'string' },
      },
      required: ['path', 'recipeDescription'],
    },
    code: `
        const recipe = await $$llm('llm_recipe', { recipeDescription: input.recipeDescription, recipeInputType: input.recipeInputType });
        $root.patchNode(input.path, {
          input: input.recipeInputType,
          code: recipe,
        });
    `,
  });

  const llmRecipe: LLMCall = {
    llm: 'Construct a recipe for the given path and description. The recipe can also access an `input` variable of type `recipeInputType`',
    input: {
      type: 'object',
      properties: {
        recipeDescription: { type: 'string' },
        recipeInputType: { type: 'string' },
      },
      required: ['recipeDescription', 'recipeInputType'],
    },
    output: 'string',
    examples: [{ input: recipeInput1, output: recipeExample1 }],
    constraints: [],
  };

  tree.patchNode([...path, 'llm_recipe'], llmRecipe);
}
