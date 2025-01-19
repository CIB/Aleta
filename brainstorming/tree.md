- Tree consists of nodes with children and a root node.
- Every node in the tree has a type, when modifying the children of a node, the children have to keep adhering to the parent's type.
- Nodes can be referenced with the path in the tree
- When a reference is variable (the string is given as a variable, not static), then it still has to be typed, and any path substituted for the variable has to match the type (that is, the node at that location has to match the type)

## Tree

A tree is a structure of nodes, where each node can have multiple children. Each node is also assigned a type, and the children of a node have to adhere to the type of the parent node.

```yaml
root:
  docker_containers:
    development_container:
      image: 'node:18'
      name: 'development'
      command_history:
        - 'npm install'
        - 'npm run test'
```

## Types

Each node is also given a type. The type can either be a data type (in which case the node is a leaf node), or a tree node type. Tree node types are themselves stored in the tree.

```yaml
root:
  types:
    docker_container:
      image: 'string'
      name: 'string'
      command_history: 'string[]'
  docker_containers:
    development_container:
      image: 'node:18'
      name: 'development'
      command_history:
        - 'npm install'
        - 'npm run test'
```

## Node List Types

In some cases we may want to store collections of nodes in the tree that all share the same type. In this case we can also store a list of nodes as a value in the tree.

```yaml
root:
  types:
    llm_examples:
      - input: 'string' # If we want to specify a list type, we simply use a list with a single element
        output: 'string'
  recipes:
    reverse_string:
      description: 'Reverse a string'
      examples:
        - input: 'hello'
          output: 'olleh'
        - input: 'world'
          output: 'dlrow'
```

## Module

A module is a grouping in the tree in which members can reference each other by name without having to specify the full path in the tree.

## TODO

### Tree Types and Tree Constraints

In the future, non-leaf nodes should also have types. We need to think of a type system that allows us to specify the structure of the tree. But types are just one type of logical constraint. We should add general "constraints" to the tree. This way, when working on tasks step-by-step, we can communiate constraints about the data between steps. By attaching the constraints to the tree itself, we can be aware of them at any point when writing data.
