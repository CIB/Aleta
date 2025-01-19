- Use replacement rules list X -> list X, this will make it easier to add many rules without increasing the complexity of the recipe

- Add "few shot learning" as a native concept, where we build multiple examples of possible problem-solution pairs to avoid focusing in too much on a single example

- Recipes with "branches" (if checks) that get expanded and refined over time as new problems are solved and issues with the LLM solutions are discovered

- Build models using logic programming (like prolog, LEAN, etc.) and allow to iteratively refine such models by ingesting data / solving problems

```yaml
root:
  types:
    task:
      properties:
        name: string
        references: Reference[]
        plan: string[]
      description: 'A task to be solved'
  tools:
    ask_llm:
      description: 'Ask the LLM to solve a problem'
      parameters:
        - prompt: 'The prompt to ask the LLM'
    ask_claude:
      description: 'Ask the Claude AI to solve a problem'
      parameters:
        - prompt: 'The prompt to ask the Claude AI'
    bash:
      description: 'Run a bash command'
      parameters:
        - command: 'The command to run'
  recipes:
    fix_jest_test_failure:
      description: 'Fix a Jest test failure'
      steps:
        - ask_llm:
            prompt: 'What is the problem with the Jest test?'
  tasks:
    1:
      name: 'Debug and fix failing tests'
      references: 'root/docker_containers/development_container'
      stepIndex: 0
      plan:
        - get list of failing tests
        - for each test:
            - recipe fix_jest_test_failure
  docker_containers:
    development_container:
      image: 'node:18'
      command_history:
        - 'npm install'
        - 'npm run test'
```

Operations on nodes:

List node:

- Filter
- Map
- Reduce

General operation:

- Input type
- Input path
- Output type
- Output path (or none for in-place operation)

- Operations combined from mini-operations

  - Filter conditions on the plan list
    - Can refine the condition over time with e.g. examples
  - Add if-else branches and refine both their conditions and their number over time

- Define complex "types"
  - Define their tree node structure
  - Add metadata about them e.g. as text description

Example composite operation:

```yaml
process_task_plan:
  input: string[]
  output: string[]
  in_place: true
  code: [...]
  do:
    - if is_list_of_alternatives($input):
        - return parse_alternatives($input)
    - else if is_list_of_commands($input):
        - return process_commands($input)

  module:
    process_commands:
      input: string
      output: string[]
      code: [...]

    parse_commands:
      input: string
      output: string[]
      examples:
        1:
          input: "1. npm install\n2. npm run test"
          output: ['npm install', 'npm run test']
      do:
        - return <$input is a string containing a list of commands, please convert them to a list> as string[]

    is_irrelevant_command:
      input:
        command: string
        index: number
        all_commands: string[]
      examples:
        introduction_command:
          - 'open the terminal'
          - 'connect to the docker container'
          - 'navigate to the project directory'
      do:
        - if <$input is an introduction command like $introduction_commands>:
            - return true
        - else if <$input is a summary of the previous commands>:
            - return true
        - else:
            - return false
```

How we implement the evaluation is yet to be determined. But the important part is that sub-commands are defined in the tree and can be modified individually as part of the learning process.

Special types:

- CustomType
- Reference
- Tool

Alternative syntax

```typescript
function processCommands(input: string): string[] {
  const output: string[] = [];
  const commands = $['./parse_commands'](input);
  for (const command of commands) {
    if (!$['functions/is_irrelevant_command'](command)) {
      output.push(command);
    }
  }
  return output;
}
```

input:
command: string
index: number
all_commands: string[]
examples:
introduction_command: - "open the terminal" - "connect to the docker container" - "navigate to the project directory"
do: - if <$input is an introduction command like $introduction_commands>:
        - return true
    - else if <$input is a summary of the previous commands>: - return true - else: - return false

Building blocks:

- LLM Calls
  - If statements consisting of natural language descriptions
  - Description
  - Conditions / constraints
  - Examples (can be refined through usage)
  - Type boundaries for both input and output
- Functions (TypeScript code, can drive LLM calls and do decision logic based on strictly typed results)
  - Function with input and output type
  - Program logic with explicit calls to other building blocks (other functions, LLM calls)
  - References to inputs, outputs and tree nodes used in the code
- Driver logic (uses lower-level building blocks + an iteration over the main tree to drive the overall execution)
  - Use predefined functions to set up tasks and work on them iteratively
  - Create "knowledge nodules" in the tree using predefined functions to collect relevant information for a specific task
  - In the tree we also create a subtree that works kind of like a "stack" where we can keep temporary data as we advance task execution
- Introspection
  - We can also start a new independent task that takes an existing stack as input to do introspection on the way we tried to solve the issue
  - This can be used to identify issues with the execution plan
  - Potential measures when issues arise:
    - Try to "correct" a building block in the execution plan, for example by adding examples, refining a description, etc.
    - Alert a human supervisor and let them "jump into" the introspection task (this is different from jumping into the original task, instead of helping to solve this particular issue, the human will help to solve the process of solving issues of a similar type in the future)
- Task-recipe relationship:
  - Each task is a real problem to solve. A recipe can be constructed from a set of solved tasks. Then once the recipe exists, it can partake in the solution of new tasks. In other words, there's a sort of transformation between tasks and recipes in both directions.

## Execution Log

- Collect logs of every action in the process of an execution (of a task for example), including delving into subtasks, calling LLMs, calling functions, rotating the context around nodes and variables
- Include a summarized task description at the start of the log to explain what all the actions are intended to achieve
- We can use the log for "correcting" the execution plan, for example to detect cycles (loops) or dead ends in the plan
- We will also store _all_ logs in an archive, as the data can later serve as the basis for training data for fine-tuning a new LLM specifically for our system

## Planning as code

- Ask the LLM to create plans and represent them as code
- Convert the code to data structures to store in the central tree
- Operate on the plan by iteratively accessing the created data structure and "moving forward"

## Reasoning about invariants in code

A really good example of how humans use "invariants" or assumptions / reasoning in coding is: https://www.youtube.com/watch?v=KWB-gDVuy_I

It would be good if Lleta could develop its own reasoning mechanisms to understand code in such ways.

## Evaluating team member performance

- Break up their gitlab activity into distinct work items
- Iterate over each work item, and check how much effort may have gone into the solution
- Create hypotheses and keep questioning them ("how may this have been more work than at first glance?")
