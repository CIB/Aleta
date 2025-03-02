## buildAlternatives()

```typescript
function buildAlternatives(output: string) {
  const isAlternatives = $check('Is this LLM output a list of alternatives?', 'boolean', { output });
  if (!isAlternatives) {
    return null;
  }

  const alternatives = $do('Extract the list of alternatives from the LLM output', 'string[]', { output });
  const realAlternatives = alternatives.filter((alternative) =>
    $check('Is $alternative a real separate line of thinking that we should explore?', 'boolean', {
      alternative,
      alternatives,
    }),
  );
  return realAlternatives;
}
```

## buildSteps()

```typescript
function buildSteps(output: string) {
  const isSteps = $check('Is this LLM output a list of steps?', 'boolean', { output });
  if (!isSteps) {
    return null;
  }

  const steps = $do('Extract the list of steps from the LLM output', 'string[]', { output });
  const realSteps = steps.filter((step) =>
    $check('Is $step a real step that we can practically execute?', 'boolean', {
      step,
      steps,
    }),
  );
  return realSteps;
}
```
