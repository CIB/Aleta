# Execution Tree

Unlike a regular program execution, where the details of the execution flow matter very little and can be lost instantly, lleta's execution tree needs to be preserved for introspection and debugging purposes.

In other words, for each function call, we have to intercept the call and manually manage stack frames (with debugging info).

We define a custom `StackFrame` object for this purpose. It will contain central tree context, local variables, function call parameters, return value, parent and children references, logging about the execution of the function, etc.

((Future idea: Store the execution tree in the central tree?))

## Stack Frames

```yaml
stack:
  children:
    - name: my_function
      context: core/task/my_function
      parameters:
        input: 'foo'
      children:
        - name: other_function
          context: core/task/other_function
          parameters:
            input: 'bar'
    - name: my_function_2
      context: core/task/my_function_2
      parameters:
        input: 'baz'
      return: 'qux'
      children:
        - name: other_function_2
          context: core/task/other_function_2
          parameters:
            input: 'qux'
```

## TypeScript Execution Context Technology Stack

To enable safe and type-aware execution of TypeScript code within our execution tree, we'll use the following technologies:

1. **TypeScript Compilation**:

   - Bun's built-in TypeScript transpiler
   - Features:
     - Fast compilation without separate build step
     - Support for modern TypeScript features
     - Automatic type checking
     - Module resolution from the central tree

2. **Sandboxing**:

   - vm2 (NodeVM) for secure execution
   - Features:
     - Strict process isolation
     - Memory limits
     - Controlled global access
     - Async operation support
     - Custom require restrictions

3. **Context Management**:

   - Custom context builder
   - Features:
     - Automatic type injection from central tree
     - Module context ($$) resolution
     - Local/root context merging
     - Type-safe variable passing

4. **Execution Tree Integration**:
   - Custom execution frame manager
   - Features:
     - Type context preservation between calls
     - Result logging and storage
     - Error handling and recovery
     - Stack trace preservation

#### Example type context injection

```typescript
// Generate type definitions from central tree
const typeDefinitions = `
type TaskNode = ${getTypeFromTree('TaskNode')};
type FunctionNode = ${getTypeFromTree('FunctionNode')};
`;

// Generate runtime context
const runtimeContext = `
const $$ = {
  local: ${JSON.stringify(currentFrame.localVariables)},
  root: ${JSON.stringify(rootContext)},
  module: ${JSON.stringify(moduleContext)}
};
`;

// Combine with user code
const fullCode = `
${typeDefinitions}
${runtimeContext}
${userCode}
`;

// Transpile with type checking
const transpiler = new Bun.Transpiler({
  loader: 'ts',
  tsconfig: {
    compilerOptions: {
      strict: true,
      noImplicitAny: true,
      // Other strict type checking options
    },
  },
});

const jsCode = await transpiler.transform(fullCode);
```

#### 2. Context Injection with vm2

```typescript
const vm = new NodeVM({
  sandbox: {
    // Custom globals
    __context: {
      types: typeDefinitions,
      values: runtimeContext,
    },
  },
  require: {
    external: false, // No external modules
    builtin: [], // No Node.js builtins
    root: false, // No filesystem access
  },
  wrapper: 'none',
  eval: false, // No eval
  wasm: false, // No WebAssembly
});

// Execute with context
const result = vm.run(jsCode, 'vm.js');
```
