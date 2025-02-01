## Tree structure

The main place for aleta to store data and gain access to external entities is the central tree. This tree stores all information, including:

- Function definitions
- LLM templates
- Task trees
- Knowledge bases (types, recipes, personality)
- External API/tool definitions
- Project/codebase representations

Items in the tree can be referenced by path, e.g. `personality/hobbies/coding`.

### Modules and function definitions in the tree

It is possible to declare nodes in the tree as "modules". This has the effect that any children of the tree can use the module context without specifying the full path. This is very useful for example for functions, which can access helper functions in the same module without having to specify the full path each time. It also makes moving the contents of the module in the tree easier, as the internal module references won't break from changing the base path.

#### Example

```yaml
module function core/task/process_plan: |
  function process_plan(plan: string): string {
      const isAlternatives = $$`check_alternatives`(plan)
      [...]
  }
function core/task/process_plan/check_alternatives: |
  function check_alternatives(plan: string): boolean {
      [...]
  }
```

In this example, the `process_plan` function can access the `check_alternatives` function without having to specify the full path, by simply using the $$ value to access the module context.

### Serialization

In the short term, we will implement serialization using JSON or yaml files. In the long term, a database should be used to store the tree structure.

### Tree operations

To manipulate the tree structure, we define a few TypeScript functions.

#### node(path: string)

Creates a node at the given path in the string. If the parent structure does not exist, it will be created and populated as per the path segment (nodes for strings, lists for numbers). If some node on the path doesn't match (e.g. a list where a node was expected), an error will be thrown.

#### list(path: string)

Creates a list at the given path. Same rules as for `node` apply.

#### `push(path: string, value: any)`

Pushes a value to the end of the list at the given path. If the path doesn't exist, it will be created as a list. If the path exists but is not a list, an error will be thrown.

#### `pop(path: string)`

Pops the last value from the list at the given path. If the path doesn't exist, an error will be thrown. If the path exists but is not a list, an error will be thrown.

#### `set(path: string, value: any)`

Sets an attribute value at the given path. If the parent node does not exist, it will be created as a node. Same rules as for `node` apply. If the path already exists but is not a node, an error will be thrown.

#### `get(path: string)`

Gets an attribute value at the given path. If the path doesn't exist, an error will be thrown.

#### `merge(path: string, value: object | array)`

Merges a value into the node at the given path. If the parent node does not exist, it will be created as a node. Same rules as for `node` apply. If the path already exists but does not match the value type, an error will be thrown.

#### `delete(path: string)`

Deletes the node, list or attribute at the given path. If the item does not exist, an error will be thrown.

### Tree Versioning

We store each mutation operation to the tree (create, update, merge, etc.) in a log in chronological order. Later, the log can be used to restore a previous version of the tree.

### Tree Serialization

In order to serialize the tree, we simply store a full list of all tree operations in chronological order in JSON format and write it to disk. In future, we may also use a database to store this list. Additionally, it may make sense to keep "checkpoints" of the tree at different points in time, to speed up restoring an older version of the tree by starting from the last checkpoint, rather than the empty state.
