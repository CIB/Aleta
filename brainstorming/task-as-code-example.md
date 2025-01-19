# Prompt:

Is there a library or builtin tool to make it possible to build the code context (existing types, values, etc.) to type check and run a dynamic typescript string in

# Response:

1. Using ts-morph for Type Context

ts-morph is a library that provides a programmatic way to work with TypeScript ASTs. You can use it to parse and analyze TypeScript code and integrate contextual type information.
Steps:

    Load the existing code context into a ts-morph project.
    Add the dynamic TypeScript string as a new file or snippet.
    Use ts-morph to type-check the new code against the context.

import { Project } from "ts-morph";

const project = new Project();
project.createSourceFile("context.ts", `  type User = { id: number, name: string };
  const user: User = { id: 1, name: "Alice" };`);

const dynamicCode = `
  const message = \`Hello, \${user.name}\`;
`;

const file = project.createSourceFile("dynamic.ts", dynamicCode, { overwrite: true });
const diagnostics = project.getPreEmitDiagnostics();
if (diagnostics.length > 0) {
console.error(project.formatDiagnosticsWithColorAndContext(diagnostics));
} else {
console.log("No type errors!");
}

2. Using eval with TypeScript Compilation

For runtime execution, compile the TypeScript string dynamically and execute it. You can use typescript for compilation and eval for execution. Be cautious with eval, especially if the code comes from untrusted sources.
Example:

import ts from "typescript";

const dynamicCode = `
  const user = { id: 1, name: "Alice" };
  console.log(\`Hello, \${user.name}\`);
`;

// Compile the TypeScript code to JavaScript
const transpiled = ts.transpile(dynamicCode);

// Run the transpiled code
eval(transpiled);

3. Using vm2 for Safer Execution

If you need a safer execution environment, consider using vm2. It provides an isolated VM where you can inject specific context.
Example:

import { VM } from "vm2";

const context = { user: { id: 1, name: "Alice" } };
const dynamicCode = `
  const message = \`Hello, \${user.name}\`;
message;
`;

const vm = new VM({
sandbox: context,
});

try {
const result = vm.run(dynamicCode);
console.log(result); // Output: Hello, Alice
} catch (err) {
console.error("Error running dynamic code:", err);
}

4. Using Babel for Complex Context

For more sophisticated scenarios where you need to transform or extend context dynamically, Babel can help with preprocessing and transforming TypeScript to JavaScript.
Recommendations

    Use ts-morph for advanced type-checking needs.
    For runtime execution, combine ts.transpile with vm2 for safe and flexible execution.
    Be mindful of security implications, especially with untrusted code. Always sanitize and validate inputs.

# Response parsing

```typescript
export const alternatives = [
  'Use ts-morph for advanced type-checking needs.',
  'Using eval with TypeScript Compilation.',
  'Using vm2 for safer execution.',
  'Using Babel for complex context.',
  'Recommendations: Use ts-morph for advanced type-checking needs. For runtime execution, combine ts.transpile with vm2 for safe and flexible execution. Be mindful of security implications, especially with untrusted code. Always sanitize and validate inputs.',
];

export const conditions = {
  'advanced type-checking needs': 'ts-morph',
  'runtime execution': 'ts.transpile with vm2',
};

export const conditionsToCheck = ['advanced type-checking needs', 'runtime execution'];

export const thoughtItems = ['Be mindful of security implications', 'Always sanitize and validate inputs'];
```

Representing it as a tree instead:

```yaml
processed_alternatives:
  - alternatives:
      - Use ts-morph for advanced type-checking needs.
      - Using eval with TypeScript Compilation.
      - Using vm2 for safer execution.
      - Using Babel for complex context.
  - conditions:
      - advanced type-checking needs: ts-morph
      - runtime execution: ts.transpile with vm2
  - thoughts:
      - Be mindful of security implications
      - Always sanitize and validate inputs
```

Example way to process "thoughts" when later evaluating these alternatives:

1. For each item in thoughts, generate a prompt, something like "Create an action to evaluate whether thought X is being considered properly"
2. We then have several action types to pick from, e.g. "Create hypothesis", "Evaluate condition", "Get external data", etc.
