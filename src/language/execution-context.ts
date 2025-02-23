import { Tree } from '../tree/tree';
import { SystemContext } from '../system/system-context';

export type InputType = object | string | number | boolean | null;

export class ExecutionContext {
  constructor(
    public system: SystemContext,
    public framePath: string[],
  ) {}

  async executeStatement(statement: string) {
    return statement;
  }

  pushFrame(node: string, input: InputType): ExecutionContext {
    const newFramePath = this.system.tree.push([...this.framePath, 'children'], {
      node,
      input,
      output: null,
    });

    return new ExecutionContext(this.system, newFramePath);
  }

  getCurrentFrame(): ExecutionTreeFrame {
    return getFrameAtPath(this.system.tree, this.framePath);
  }
}

export function getFrameAtPath(tree: Tree, path: string[]): ExecutionTreeFrame {
  const frameNode = tree.getNodeOrList(path);
  if (frameNode.type !== 'tree') {
    throw new Error(`Frame is not a tree node at ${path.join('/')}`);
  }

  // TODO: use JSON schema and ajv to validate that the frame has the correct properties

  const frameObject = tree.getJSON<ExecutionTreeFrame>(path);
  return frameObject;
}

export interface ExecutionTreeFrame {
  /** Path to the function node */
  node: string;
  input: InputType;
  output: InputType;
  children?: ExecutionTreeFrame[];
}
