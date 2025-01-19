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

export async function runFunction(
  executionContext: ExecutionContext,
  functionPath: string[],
  input: any,
): Promise<any> {
  const functionConfig = getFunctionAtPath(executionContext.system.tree, functionPath);
  // Validate input type
  assertType(input, functionConfig.input);

  const result = await runInSandbox(executionContext.system, functionPath, functionConfig.code, input);

  // Get the expected output type
  const expectedOutputType = await inferFunctionReturnType(executionContext.system, functionPath);

  // Validate output type
  assertType(result, expectedOutputType);

  return result;
}
