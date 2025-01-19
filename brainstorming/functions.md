# Overview

We define some logical operations as YAML data structures. The logic is expressed through tree-like mappings with standardized keys. All executable units are “nodes,” in the tree structure, and complex logic is built by nesting these nodes. Each node can accept inputs, produce outputs, and contain conditional logic, as well as references to related logic nodes.

## Basic Function Structure

A basic function typically includes:

- `input`: Defines the expected inputs (often typed).
- `output`: Defines the expected outputs (often typed).
- `do`: A list of steps to execute in order.
- `return`: Special step to produce the node’s output and end execution.

Example:

```yaml
my_function:
  input: [string]
  output: [string]
  do:
    - return: 'This is a processed output'
```

## Conditional Logic

Conditions are expressed through a structured “if” block. Each if block contains:

- `condition`: A string representing the logic to be evaluated.
- `then`: A list of actions to perform if the condition is true.
- `else_if`: A list of additional conditions to check if previous conditions fail.
- `else`: A list of actions if no conditions are true.

Example:

```yaml
do:
  - if: '@/is_list_of_alternatives($input)'
    then:
      - return "@/parse_alternatives($input)"
  - else if: '@/is_list_of_commands($input)'
    then:
      - return "@/process_commands($input)"
  - else:
      - return "[]"
```

## Returning Results

Returning Results

A return step ends execution of the current node and provides the final output. It is typically placed inside then, else_if, else, or directly under do if no conditions are needed.

```yaml
do:
  - return "Final result"
```

## Calling functions

Functions can be called by their name. Either there is a single argument, or the arguments have to be passed by name.

```yaml
do:
  - parse_alternatives(alternatives: $input, context: $context)
```

## Variable assignments

Statements can also be variable assignments.

```yaml
do:
  - $alternatives = parse_alternatives($input)
  - if: $alternatives
    then:
      - return $alternatives
```

## Grouping Related Logic

Nodes can be grouped under a parent node, where the parent is considered the "main" function of the group. This parent node may call its children as needed. Each grouped child node is nested under a parent key, maintaining a clean and structured hierarchy.

Example:

```yaml
process_task_plan:
  input: [string]
  output: [string]

  do:
    - if: is_alternative($input)
      then: return "parse_alternatives($input)"
    - else if: is_command_list($input)
      then: return process_commands($input)
    - else: return []

  module:
    process_commands:
      input: string
      output: [string]
      llm: convert $input to commands list

    parse_alternatives:
      input: string
      output: [string]
      llm: convert $input to alternatives list
```

In this structure, process_task_plan is the main node. It calls either process_commands or parse_alternatives, both defined under related_logic. This keeps related logic together and organized under a single, higher-level node.

## LLM Calls

LLM calls are expressed through the `llm` key. The value is a string that will be passed to the LLM as a prompt. The string can use variables, such as `$input`, etc.

Example:

```yaml
parse_alternatives:
  input: string
  output: [string]
  llm: convert $input to alternatives list
```

## TypeScript functions

For more complex logic (that is also less easy to modify), we can define a TypeScript function that will be used to execute the logic.

Example:

```yaml
parse_alternatives:
  input: string
  output: [string]
  code: |
    export function parse_alternatives(input: string): string[] {
      return input.split(',').map(s => s.trim());
    }
```
