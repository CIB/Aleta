core/task/process_answer
core/task/process_answer/string_to_steps
core/task/process_answer/string_to_alternatives

tasks/1/collect_info/points/1/issues_with_histoire

// Summarizes a lengthy collection (e.g. a list) given the context of something we're trying to achieve
core/task/summarize

```yaml
function core/task/summarize: |
  function (collection: string[], context: TaskNode): string {
    return collection.join(", ");
  }
llm core/task/summarize/prompt:
  input:
    - item: string
    - context: string
  output: string
  examples:
    - input:
        item: "The new office space has excellent natural lighting and a well-equipped kitchen area. Server response times have increased by 300% during peak hours, affecting thousands of users. The team recently had a successful holiday party with great catering. Database backups are failing silently on weekends, putting data at risk. The parking situation has improved since we added 50 new spots. Load balancer logs show multiple instances of cascade failures. The office plants are thriving thanks to the new automatic watering system. Critical security patches haven't been applied to production servers for 3 months."
        context: 'Investigating critical system performance and reliability issues'
      output: '300% slower response times during peaks, silent backup failures on weekends, cascade failures in load balancing, and 3-month backlog of security patches'
    - input:
        item: 'The marketing team launched a successful social media campaign reaching 1M views. Customer support tickets about payment failures have doubled this month. Our new coffee machine in the break room is amazing. The payment gateway is showing a 15% error rate, up from 2% last month.'
        context: 'Investigating critical system performance and reliability issues'
      output: '15% error rate in payment gateway, 2x increase in customer support tickets, 2% increase in payment failures'
```

```
TS Context
   Types
     TaskNode
     FunctionNode
   values
     local
     root
     module
```

Inspection: Retrieve types from tree to pass into TS context

- Keep data in typed nodes
- "rotate" the context around nodes for iterative prompting
- Feed type of nodes into TS contexts of prompts and TS compiler typechecking

"Bootstrapping"

- In a first step, we will only have functions and LLM calls that take explicit parameters and return explicit outputs
- In a next step, we will implement functionalities to make full use of dynamically passing in context to LLMs and functions
  - Task tree with subtasks
  - Split a process up into multiple steps, activate/deactivate different items for each step to put into the context
  - Summarize some given data using some given task as reference for what data to keep

Proposal: Split between a function and a task / recipe

- A function only takes explicit inputs as parameters, and based only on this data and internal computations / prompts, it has to yield a result
- A task takes nodes in the tree as input, and is able to fetch new data from the tree, make external calls, modify the tree, create subtasks, etc.
- A task in particular is also able to rewrite functions to make them more suitable to solve the task in case the function gave a bad result

Overview (again):

1. We build functions that take explicit inputs and produce outputs based on a very simple understanding
2. We build a typed tree structure to create "tasks" and "subtasks" and attach data to them in a dynamic way
3. By using the functions from step 1, we run an execution plan:

- We create data and data containers to store our working information
- We build task step plans, hypotheses and alternatives to solve the task
- We run micro-agents to test ideas, get data from internal/external sources, and take actions
- We step down into subtasks to break down the problem into smaller parts
- We store everything we do in an execution log, and run introspection jobs to find high-level issues in our approach

More details on micro-agent jobs:

1. Step-wise progression: We break down the job into a few steps. For each step, we collect specific context for that step, and feed it to the step solver.
2. Hypothesis generation/testing: We create a hypothesis for the current task, and test it
3. Data collection: We find data from the tree and function calls, and store it in the task's data with correct typing
4. Validity checking: We examine the results of some previous job execution (e.g. function call), and if we find an issue, we start a job to fix the source of the issue (e.g. rewrite the function)
5. Alternative progression: We take a list of alternative options, and we dive down into each of them individually

Differences between tasks and jobs:

1. Each task has to reconstruct its context from scratch by pulling in data from various sources
2. Jobs generally share the context of their task and co-jobs. At most they may create their own temporary data (without recursion), or deactivate some context data that is irrelevant for the job.
3. We could also call tasks agents, and jobs micro-agents.

Question: Do we really need the typed tree structure for functions, or is it enough to just pass data with parameters and return values there? In which context will we work with the tree structure, other than tasks/jobs?

Use cases of the tree structure:

- Storing function definitions and LLM call definitions
- Storing data in a typed way, so that we can pass it around and use it in different contexts
- Storing the task tree, including custom data for each node, and custom data for particular sub-algorithms (like for example, when we ask the LLM for a plan, and then split that plan which is a single string into multiple steps, the steps would be stored as a list of nodes in the tree)
- ? unsure ? storing the "call tree" for a task execution, or function execution
- Creating knowledge bases, such as a list of existing "types" (like "Docker Container"), existing "recipes" to solve problems, personality, TODOs
- External API / "Tool" definitions
- Instance definitions, e.g. a node could represent a docker container that can be accessed using tool use
- Projects, like representing a directory with source code in the tree (for example, a python project to perform tts could be represented this way)

Consider:
How to use typescript code to represent ideas in the course of task execution? For example, for the problems like splitting an LLM plan string into steps from before, we may be able to use typescript code to represent the problem rather than just natural language and the tree structure.

TODO: As we will likely use the tree structure to store tasks, etc., we need a good way to examine parts of the tree as the task is being processed

Maybe an interactive web client with a tree viewer pane at the top, and a prompt pane at the bottom to describe what we want to look at in natural language?

This tool could also be used to in general debug the task execution and get info on it in a tree view

Difference task recipe vs low level recipe:

1. A task recipe is something very high level and unspecific, that was created from previously solving tasks, and will help solve new tasks of a similar nature
2. A low level recipe is used internally for housekeeping of task processing itself. For example, selecting between alternatives, generating concrete actions to take within the reasoning system, rotating the context to include different data, etc.
