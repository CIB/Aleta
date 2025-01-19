This document will elaborate on LLM templates, as the configurable scope can get quite complex.

## Basic structure

The basic structure of an llm template node is:

```yaml
my_template:
  input: string[]
  output: string[]
  llm:
```

- We specify the type of the `input` and the `output` of the call.
- The core of the LLM prompt is contained in the `llm` key.

But as per usual, prompting the LLM often requires more details to get the desired output. Instead of adding this extra info in the core prompt, we make available some additional keys to provide such information in a structured way.

## Examples (multi-shot learning)

Sometimes giving concrete examples can help the LLM understand what is needed without lengthy descriptions.

```yaml
my_call:
  input: string[]
  output: string[]
  examples:
    - input: 'foo'
      output: 'bar'
    - input: 'baz'
      output: 'qux'
  llm: 'foobar'
```

## Constraints

Often when prompting the LLM with a generic description, we will get outputs that don't match what we want. To get the LLM to avoid generating such outputs, we can specify constraints that describe what we want in more detail.

```yaml
my_call:
  input: string[]
  output: string[]
  constraints:
    - 'Provide the summary in less than 100 words'
    - 'Write the description in a way that a non-technical person can understand'
  llm: 'foobar'
```

By providing these constraints separately from the core prompt, we can also verify that the output respects the conditions after the LLM call.

A constraint for the output type will be automatically generated and doesn't have to be specified manually. The validity of the output will be checked with a type-checker after the LLM call.
