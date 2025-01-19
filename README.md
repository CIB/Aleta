- LLM-first programming language
- Main primitive types are strings and lists/dictionaries (simple for LLMs to work with)

- Base operations:
  - Filter
  - Evaluate condition
  - AND
  - OR
  - NOT

Primitive LLM operations:

- Transform
  - Input:
    - content (string or list)
    - input type
    - output type
    - result expectation (free text)
  - Output:
    - result (string or list)

A transform in particular can be used as a condition by using a boolean output type and a result expectation that describes the condition.

- Recipe
  - Input:
    - handle (ref to entity in model)
    - input type
    - output type
    - result expectation
  - Output:
    - result (ref to entity in model)
  - State:
    - Examples (input output pairs)
    - Constraints (list of conditions for the output)
    - Conditionals (if X about input is true, then Y)

Meta-operations:

- MAP
  - Takes list and some operation
  - For each element in the list, applies the operation to compute a result
  - Returns list of results
  - (it works the same with dictionaries)
- AND
  - Returns true if all elements in the list are true
- OR
  - Returns true if at least one element in the list is true
- NOT
  - Returns true if the element is false and vice versa
- IF
  - Takes a boolean and two operations
  - If the boolean is true, applies the first operation, otherwise the second
  - Returns the result
- SWITCH CASE
  - Takes a list of pairs (item, condition)
  - For each element in the list, checks the condition
  - For the first element where the condition is true, evaluate the item and return the result
- FILTER
  - Takes a list and a condition
  - Returns a list of only those elements that satisfy the condition
- SORT
  - Takes a list and an operation
  - Returns a list sorted by the result of the operation
- TAKE

  - Takes a list and a number
  - Returns a list of the first N elements

- tree
  - every node has a type
  - nodes are key/value pairs
  - every key/value has a type
  - values can be lists with list type
  - values can be dictionaries with dictionary type
  - reference nodes by path from the root
  - tasks are nodes
  - recipes are nodes (and can be dynamically adjusted by modifying the node)
  - operations are nodes
