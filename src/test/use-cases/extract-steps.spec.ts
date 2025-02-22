import { describe, beforeEach } from 'bun:test';
import { Tree, path as p } from '../../tree/tree';

import { ExecutionContext } from '../../language/execution-context';
import { SystemContext } from '../../system/system-context';
import { Schema } from 'ajv';
import { test } from 'bun:test';
import { runFunction } from '../../language/function';
import { createTestSystemContext } from '../../system/test-system-context';

describe('ExecutionContext', () => {
  let tree: Tree;
  let system: SystemContext;
  let context: ExecutionContext;

  beforeEach(() => {
    system = createTestSystemContext();
    tree = system.tree;
    context = new ExecutionContext(system, ['stackframe']);

    const parseResponseSchema: Schema = {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        response: { type: 'string' },
      },
      required: ['prompt', 'response'],
    };

    // Set up extract steps module
    tree.createModule(p('core/task/processResponse'));
    const node = tree.getNodeOrList(p('core/task/processResponse'));
    console.log('Node!!', node);

    // Prompt helper to
    tree.patchNode(p('core/task/processResponse/alternativesOrSteps'), {
      input: parseResponseSchema,
      output: 'boolean',
      llm: `
            You are a helpful assistant that extracts steps from a task.
            You will be given a prompt and a response.
            The result should be true if the response contains a list of alternatives that should be tried out independently, false if it contains a series of linear steps that should be executed one after the other.
        `,
    });

    tree.patchNode(p('core/task/processResponse/extractAlternatives'), {
      input: parseResponseSchema,
      output: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      llm: `
            You are a helpful assistant that extracts steps from a task.
            You will be given a prompt and a response containing a list of alternatives.
            Please respond with the list of alternatives, where each item contains the full text of that alternatives. You can use the \n character to represent multi-line items.
        `,
    });

    tree.patchNode(p('core/task/processResponse/parseAlternatives'), {
      input: parseResponseSchema,
      code: `
        const alternatives = $$llm('extractAlternatives', input);

        // TODO: Remove irrelevant items, do cleanup, etc.

        return alternatives;
      `,
    });

    tree.patchNode(p('core/task/processResponse/extractSteps'), {
      input: parseResponseSchema,
      output: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      llm: `
            You are a helpful assistant that extracts steps from a task.
            You will be given a prompt and a response containing a list of steps.
            Please respond with the list of steps, where each item contains the full text of that step. You can use the \n character to represent multi-line items. Ensure to keep the steps in the same order as in the input.
        `,
    });

    tree.patchNode(p('core/task/processResponse/parseSteps'), {
      input: parseResponseSchema,
      code: `
        const steps = $$llm('extractSteps', input);

        // TODO: Remove irrelevant items, do cleanup, etc.

        return steps;
      `,
    });

    tree.merge(p('core/task/processResponse'), {
      input: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          response: { type: 'string' },
        },
        required: ['prompt', 'response'],
      },
      code: `
        const isAlternatives = await $$llm('alternativesOrSteps', {
            prompt: input.prompt,
            response: input.response,
        });

        if (isAlternatives) {
          return $$call('parseAlternatives')(input);
        } else {
          return $$call('parseSteps')(input);
        }
      `,
    });

    const node2 = tree.getNodeOrList(p('core/task/processResponse'));
    console.log('Node2!!', node2);
  });

  test(
    'run the processPromptResponse function',
    async () => {
      const result = await runFunction(context, p('core/task/processResponse'), {
        prompt: 'Is it possible to set up ssh accounts for other users on an M2 mac studio?',
        response: `Yes, you can set up SSH accounts for other users on an M1 Mac Studio. Here's how:

1. Open the Terminal app: You can find this in the Applications/Utilities folder or use Spotlight to search for it.
2. Create a new user account using the \`sudo\` command: \`sudo /usr/sbin/useradd -s /usr/bin/false newuser\`
3. Set a password for the new user: \`sudo passwd newuser\`
4. Verify that the new user is present with the \`ls /Users\` command
5. Switch to the new user with \`su - newuser\`
6. Configure SSH by creating a new configuration file at \`/etc/ssh/sshd_config.d/newuser.conf\` with the contents:
\`\`\`
Match User newuser
    ForceCommand internal-ls
\`\`\`
This sets up the new user to run the \`internal-ls\` command when they log in via SSH.

7. Restart the SSH service: \`sudo killall sshd\`

Now you should be able to connect to your Mac Studio using SSH as the \`newuser\` account.

Note: You may need to restart your Mac or reboot the SSH service for changes to take effect. If you're having trouble, try restarting the SSH service or running \`sudo killall sshd\` from the Terminal app. Good luck! 😊
`,
      });

      console.log(result);
    },
    { timeout: 300000 },
  );
});
