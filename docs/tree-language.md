# YAML Domain Specific Language (DSL)

We define a DSL using YAML to represent the central tree structure

## Basic Structure

ATL uses YAML syntax with special conventions for representing tree nodes, lists, modules and data:

```yaml
# Tree node with children
parent:
  child:
    grandchild: 'data value' # Data node

# List node (1-based indexing)
tasks:
  - 'Task 1' # Becomes tasks/1
  - 'Task 2' # Becomes tasks/2

# Module declaration
core/task:
  $module: true
  process_plan: |
    function process_plan(plan) {
      return $$.check_alternatives(plan)
    }
  check_alternatives: |
    function check_alternatives(plan) {
      return plan.includes('or')
    }

# Mixed node types
project:
  config:
    active: true # Data node
    thresholds: # List node
      - 10
      - 20
  src: # Tree node
    main.ts: "console.log('Hello')"
```

## Syntax Features

1. **Path-based Keys**:

   ```yaml
   'deep/path/to/node':
     child: 'value'
   ```

   Equivalent to:

   ```yaml
   deep:
     path:
       to:
         node:
           child: 'value'
   ```

2. **Node Types**:

   - **Tree Nodes**: YAML mappings (default)
   - **List Nodes**: YAML sequences (`-` syntax)
   - **Data Nodes**: Scalar values

3. **Special Properties** (prefixed with `$`):

   ```yaml
   node/path:
     $module: true # Mark as module
     $type: 'string' # Data type for validation
     $value: 42 # Explicit data value
   ```

4. **Shorthand Syntax**:

   ```yaml
   # Module shorthand
   module: core/task/process_plan
   # Equivalent to:
   core/task/process_plan:
     $module: true
   ```

## Full Example

```yaml
# Module declarations
module: personality/hobbies
module: core/utils

# Core functions
core/utils/math:
  add: |
    function add({a, b}) {
      return a + b
    }
  multiply: |
    function multiply({a, b}) {
      let result = 0
      for (let i = 0; i < b; i++) {
        result = $$.add({a, b: result})
      }
      return result
    }

# Project structure
project:
  config:
    debug: true
    log_levels: ["error", "warn"]
  src:
    main.ts: |
      import { add } from 'core/utils/math'
      console.log(add(2, 3))
```
