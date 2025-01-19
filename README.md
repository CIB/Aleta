WARNING: This project is currently in the early prototyping / concept phase. Proceed with caution before running any code contained in this repository.

# LLeta - LLM-first Programming System

LLeta is an AI-first programming system that handles code and data in a unified and standardized manner, allowing simplified development of LLM agents with introspection capabilities. LLeta's mission is enabling developers to build intelligent systems that can reason, adapt, and solve complex problems.

## Key Features

- **Tree-based Data Structure**: All data and operations are stored in a central tree structure, allowing for easy reference and manipulation
- **LLM Integration**: Native support for LLM calls with structured prompts, examples, and constraints
- **Type Safety**: Strong typing system for both data and operations
- **Modular Design**: Functions and modules can reference each other without full path specifications
- **Task Management**: Built-in support for task decomposition and execution tracking
- **Extensibility**: Ability to define custom types, recipes, and operations
- **Self-reinforcment**: As LLeta's capabilities to solve programming tasks improve, it can also apply those improvements to its own codebase

## Core Concepts

### Tree Structure

The central tree stores all information including:

- Function definitions
- LLM templates
- Task trees
- Knowledge bases (types, recipes, personality)
- External API/tool definitions
- Project/codebase representations

Items in the tree can be referenced by path, e.g. `personality/hobbies/coding`.

### Functions

Functions can be defined in TypeScript and stored in the tree. They can:

- Accept typed inputs
- Produce typed outputs
- Reference other functions and LLM templates
- Interact with the central tree (read and write)

Example:

```yaml
utils/set_timeout:
  input: number
  code: |
    $$set('config/timeout', input);
    return $$\`config/timeout\`;
```

### LLM Integration

LLeta provides native support for LLM calls with:

- Structured prompt templates
- Type boundaries for input/output
- Example-based refinement
- Constraint enforcement

Example LLM template:

```yaml
llm utils/reverse_string:
  input: string
  output: string
  examples:
    - input: 'Foo bar'
      output: 'rab ooF'
    - input: 'Hello, world!'
      output: '!dlrow ,olleH'
  prompt: 'Reverse the string'
```
