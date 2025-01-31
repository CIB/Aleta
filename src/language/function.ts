import { assertType, Schema } from './type-checker';
import { ExecutionContext } from './execution-context';
import { inferFunctionReturnType, inferReturnType, runInSandbox } from './sandbox/sandbox';
import { Tree } from '../tree/tree';
import assert from 'assert';
import { extractNodeAsObject } from '../tree/tree-helpers';
import { SystemContext } from '../system/system-context';

export interface TreeFunction {
  // The type of input the function expects
  input: Schema;

  /** TypeScript code defining the function */
  code: string;

  /** Whether the function has side effects */
  sideEffects?: boolean;
}

export function getFunctionAtPath(tree: Tree, functionPath: string[]): TreeFunction {
  const functionConfig = extractNodeAsObject<TreeFunction>(tree, functionPath);
  // TODO: Use JSON schema to validate that the function config has the correct properties
  return functionConfig;
}

export function writeFunction(tree: Tree, functionPath: string[], func: TreeFunction) {
  return tree.patchNode(functionPath, func);
}

export async function runFunction(
  executionContext: ExecutionContext,
  functionPath: string[],
  input: any,
): Promise<any> {
  const functionConfig = getFunctionAtPath(executionContext.system.tree, functionPath);
  // Validate input type
  try {
    assertType(input, functionConfig.input);
  } catch (e) {
    let message = `Input type mismatch:\n`;
    message += `\nFunction: ${functionPath.join('/')}\n`;
    message += `\nInput: ${JSON.stringify(input)}\n`;
    message += `\nExpected type: ${JSON.stringify(functionConfig.input)}\n`;
    throw new Error(message);
  }

  const result = await runInSandbox(
    executionContext.system,
    executionContext,
    functionPath,
    functionConfig.code,
    input,
  );

  // Get the expected output type
  const expectedOutputType = await inferFunctionReturnType(executionContext.system, executionContext, functionPath);
  // Validate output type
  assertType(result, expectedOutputType);

  return result;
}
