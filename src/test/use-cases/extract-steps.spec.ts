import { expect, test, describe, beforeEach } from 'bun:test';
import { PathError, Tree, path as p } from '../../tree/tree';
import { SystemContext } from '../../system/system-context';
import { ExecutionContext } from '../../language/execution-context';

describe('ExecutionContext', () => {
  let tree: Tree;
  let context: ExecutionContext;

  beforeEach(() => {
    const system = new SystemContext();
    tree = system.tree;
    context = new ExecutionContext(system, ['stackframe']);

    // Set up extract steps module
    tree.createModule(p('core/task/extractSteps'));

    tree.patchNode(p('core/task/extractSteps/alternatives_or_steps'), {
      input: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          response: { type: 'string' },
        },
        required: ['prompt', 'response'],
      },
      output: 'boolean',
      llm: `
            You are a helpful assistant that extracts steps from a task.
            You will be given a prompt and a response.
            The result should be true if the response contains a list of alternatives that should be tried out independently, false if it contains a series of linear steps that should be executed one after the other.
        `,
    });

    // Store extractSteps function at the root of the module
    tree.merge(p('core/task/extractSteps'), {
      input: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          response: { type: 'string' },
        },
        required: ['prompt', 'response'],
      },
      code: `
        const isAlternatives = await $$llm('alternatives_or_steps', {
            prompt: input.prompt,
            response: input.response,
        });
        return isAlternatives;
      `,
    });
  });
});
