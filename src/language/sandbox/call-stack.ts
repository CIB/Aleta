import { ExecutionContext } from '../execution-context';
import { runFunction } from '../function';

export function createCallFunction(executionContext: ExecutionContext, basePath: string[]) {
  return (accessPath: string) => {
    const splitPath = accessPath.split('/');
    const fullPath = [...basePath, ...splitPath];
    return (input: any) => {
      const frame = executionContext.pushFrame(fullPath.join('/'), input);
      return runFunction(frame, fullPath, input);
    };
  };
}
