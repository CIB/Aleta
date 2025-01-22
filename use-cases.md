These are use cases that can be implemented later on top of the core system.

- When working on code (like a file) and encountering issues during tests, start building a list of requirements for the code to work correctly based on what we learned
- Given a task involving the team, start collecting information and coordinating with the team to solve it. Get status updates and align about possible solutions as the team advanced on the task.
- "When creating a Dockerfile, first add new dependencies to the end of the file for faster buildings with caching. Once the file is successfully built, move the new dependencies to the beginning of the file to optimize the build process."
- Building concepts for solving an issue, like iteratively changing a Dockerfile until the build passes
- Building more detailed ways of solving issues correctly, like instead of directly applying a suggested solution, creating hypotheses about this suggestion, and using subtasks to test them
- Using docker or similar to build "trees" of changes, where each path down the tree represents a different way of solving the issue using different code changes
- When dealing with steps, for example "Run this python script", convert the steps to bash commands that can be executed in a single bash command

- Keep track of future work (for example TODO items in the codebase, or open questions to the business team), periodically check on them, and if something changes (like some other code change required for the TODO being implemented, or someone from the business team answers the question), notify someone on the dev team to advance the work

- 1. Check if something is supposed to be a button
- 2. If so, ensure it has accessibility attributes
- 3. If it lacks accessibility attributes, find out what the button does and add the attributes

Code review:

1. Create context including summary and diff
2. For each file, generate a list of issues
3. For each issue, create a task to either disregard it or solve it

## Private/public thought:

- A recipe that takes a prompt as input, and decides whether it should be executed on a public API, or on a private/local instance

## Self perception:

- A node with a summary of the system's personality, with subnodes for details about individual aspects, refining down recursively to go into more detail
- Sometimes while solving recipes, the subtask tree may delve into the personality tree to color the way the task gets solved with the system's particular personality traits

## Risk estimation in software development

1. Read up about public incidents in the software development industry, and particularly in similar software applications to the ones being developed by the team
2. Use these examples to create generic best practices and counter-examples for the team to consider
3. Iterate over these items and compare them to the software code (as needed, do an iterative deep dive into the codebase to find relevant information)

## Unstuck Code Solving Task

When trying to solve a coding related task, and getting stuck, aleta should be able to examine the steps taken so far, and find issues in the approach, and re-plan the approach from scratch. The current approach and its results should be summarized so they can be recalled later when re-solving the task with the new approach.

## Code debug

1. Read involved module code and write small tests to understand the code in each module
2. Build a list of modules that are involved in the functionality which has a bug
3. Combine the knowledge about the modules, the code path the functionality takes, and the description of the bug to create a hypothesis about the bug
4. Use the same info from 3. to test the hypothesis
5. Once tested, use the hypothesis to fix the bug

## Program source code modularity

Aleta should over time learn how to structure code bases well, and which criteria they should fulfill to be modular. Furthermore, as the codebase grows, aleta should be able to refactor the codebase to split modules into smaller modules, while keeping the same functionality.

## Rewrite internal recipes

While at the start, internal recipes (for solving tasks at a low level etc.) will be builtin, over time as they get improved, we may have enough data that aleta may learn about how to improve the recipes and create new ones. This should also involve some kind of versioning, and evaluation of different versions of the recipes to compare them.

## Generating fine-tuning training data

In the course of operation, aleta will often face problems in the style of: Get a task with natural language description, do some recursive solving using tasks, and finally generate a response. In many cases, we may be able to throw out the intermediate steps at the end, and use the prompt + result as training data for later fine-tuning of a custom model for aleta.

## "Drill back" issue resolving for wrong solutions provided by aleta

1. Identity the issue with help of human
2. Use stack trace and tree versioning to identity original issue
3. Use recipe to refine issue
4. Ask human to confirm if this is the actual issue
5. If it is the issue, propose a fix (e.g. updating recipe with new cases)
6. Also, if the issue we found is caused by another issue even deeper, we may need to recurse one level deeper

## Split recipe

When a recipe has become too big with too many cases, it may be that it is handling several separate types of problem. In this case, build a way to split a recipe into multiple recipes, each handling one of the types of problems the original recipe was handling.

## Accessing trello

1. Give general instructions of how to access the board, API key, and link to API docs
2. Aleta will research the API autonomously and build recipes to access the board, read tasks, update tasks, etc.

## Fix type issue in code after surrounding code is changed

Let's assume we have a function in the tree at foo/bar/myfunc. In the beginning it works fine, but as we change the surrounding tree, later when we call `myfunc`, a type error is raised because something about the surrounding data changed.

What we can do here is use the tree history to look at the surrounding data when the function used to work, and then compare that to the new state. Then we may be able to automatically create a solution that is still correct to the initial purpose of the function.

## Iterative tasks

Creating loops over documents and the like, and performing actions. For example, iterating over all documents for a project, and extracting a list of features.

## Binary search debugging

1. Identify / hypothesize about minor changes to the code that will produce a specific result when the application is run
2. Create various versions of the program with the changes ON and OFF, run the program, and compare the results to the expectations
3. Use the results to drive a deep dive of finding exactly the ON/OFF settings to achieve a desired result, or to disprove a hypothesis
4. Finally come to a conclusion taking all the runs into account

## Monitor AWS Cloudwatch events

1. Create an API connection to Cloudwatch, give it the access key, account name and logs group name
2. Create a recipe to collect events from the logs group, build patterns of what "good" traffic vs "bad" traffic looks like
3. Take action, such as alerting users on slack, or banning IPs

## Entity recognition

1. In the context of working on tasks, we may identify entities in the process in order to structure the ideas we're working with
2. For example, when preparing for an auction on the auction system (where aleta may want to upscale servers in preparation), we can identify the auction as an entity, and store properties like "IS_ONLIVE", "START_TIME", etc.

## Creating structured task execution plans

To structure a task logically, we may define task "control flow commands" and organize them in TypeScript code. This would be similar to pseudocode, but executable more easily.

```typescript
const s3BucketExists = $task('Check if S3 bucket exists');
if (!s3BucketExists) {
  const s3Bucket = $task('Create S3 bucket');
}
$task('Upload files to S3 bucket');
```

## Dry run

1. Take as input a collection and a description of what to do for each item
2. Create a function to execute on each item that performs the task, but instead of actually changing something, just collect the actions that would be performed
3. Show the user the dry-run actions
4. If the user is satisfied, re-run the function in non-dry-run mode

## Test-driven development

1. Interactively identify the functionality that should be worked on with the developer
2. Based on the shared understanding, create a plain language test descriptoin
3. Implement the functionality
4. Build the test according to the plain language description using the implemented API

## TTS Text Replacement

1. Given an input text, replace text sequences within it to make the TTS output sound better
2. For example replace "10k" with "ten thousand"
3. We can store such replacement rules in the recipe (in the central tree), and based on user feedback we can add new replacement rules

## Roleplay

1. Given a prompt, we create a task to describe the world the player is in
2. As part of this task, we generate a tree-based world representation in the central tree, similar to procedural generation in roguelikes
3. After creating and refining / validating this world representation against itself, we build a text description from it to show to the player

For example, we can create sub-nodes in the tree for the story for each character, and store details about them like their appearance. Similar for places we encounter, like a village as a node, with houses, people, roads etc. as sub-nodes.

## Merge request deep dive

Below is a prompt I gave to another AI agent system while experimenting. This prompt represents a good use case for aleta. A prompt like this should be translated to an execution plan, potentially with pseudo-code to describe the control flow and steps.

```
Please get yourself a complete list of all changes. Maybe you can write it to a file so you can reference it later. Then use that to step-by-step understand the changes, and finally create a summary.
```

So for example, this could generate an execution plan like this:

```typescript
let changedFiles;
const changedContents = $task('Get a complete list of all changes', changedFiles);
let summaries: string[] = [];
for (const fileChanges of changedContents) {
  const changeSummary = $task('Create a summary of the changes for this file', fileChanges);
  summaries.push(changeSummary);
}
$task('Create a description of the merge request based on all the summaries');
```
