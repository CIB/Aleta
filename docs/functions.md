# Overview

We define some logical operations as YAML data structures. The logic is expressed through tree-like mappings with standardized keys. All executable units are “nodes,” in the tree structure, and complex logic is built by nesting these nodes. Each node can accept inputs, produce outputs, and contain conditional logic, as well as references to related logic nodes.

## Basic Function Structure

A basic function is implemented using TypeScript. We will parse the input/output type definitions from the code.

Example:

```yaml
my_function:
  input: string
  code: |
    return input.toUpperCase();
```

## Calling functions

Functions can be referenced from other functions using the central tree. Accessing functions from the same module in the tree is even easier, as we can just specify the relative path in the module.

```yaml
my_function_2:
  input: string
  code: |
    return $$`my_function`(input);
```

## Storing data

Functions that allow side-effects can also store data directly in the central tree. For example, to store data in the `thoughts` node of the current module:

```yaml
consider_thoughts:
  input: string
  sideEffects: true
  code: |
    if (foo) {
        $$push(`thoughts`, "bar");
    }
```
