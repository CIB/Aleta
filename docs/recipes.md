Recipes are an intermediate step between LLM output describing behavior and a concrete code implementation. They are written as TypeScript code, but they use key placeholder statements that allow to abstract part of the logic and iteratively refine the concretiziation of the behavior. They also allow to get "little views" into a more complex behavior, by examining only parts that reference the rest of the behavior using abstract names.

Thus, in many ways, recipes and placeholders provide similar benefits to simple functions. However, they make the gradual process of programming more explicit, by allowing to represent function calls in a more abstract way and refining them step by step.

Example:

```typescript
const changedFiles = $do('Get a complete list of all changes', 'string[]');
const changedContents = $do('Get the contents of all changed files', 'string[]', { changedFiles });
const summaries = $do('Create a summary of the changes for each file', 'string[]', { changedContents });
const mergeRequestDescription = $do('Create a description of the merge request based on all the summaries', 'string', {
  summaries,
});
```

The recipe will be represented as a node in the central tree, with a `code` property containing the TypeScript code. The placeholder names like `Get a complete list of all changes` will be represented as child nodes of the recipe node, allowing to describe the behavior in more detail as the recipe is refined.
