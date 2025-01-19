import { expect, test, describe, beforeEach } from 'bun:test';
import { ExecutionContext, getFrameAtPath } from '../language/execution-context';
import { PathError, Tree } from '../tree/tree';
import { SystemContext } from '../system/system-context';

describe('ExecutionContext', () => {
  let tree: Tree;
  let context: ExecutionContext;

  beforeEach(() => {
    const system = new SystemContext();
    tree = system.tree;
    context = new ExecutionContext(system, ['stackframe']);
  });

  test('should create new context with empty frame path', () => {
    expect(context.framePath).toEqual(['stackframe']);
  });

  test('should push new frame and create new context', () => {
    const newContext = context.pushFrame('testNode', 'inputValue');

    // Verify new context has correct frame path
    expect(newContext.framePath).toEqual(['stackframe', 'children', '1']);

    // Verify tree structure
    const frame = getFrameAtPath(tree, newContext.framePath);
    expect(frame).toEqual({
      node: 'testNode',
      input: 'inputValue',
      output: null,
    });
  });

  test('should get current frame', () => {
    const newContext = context.pushFrame('testNode', 'inputValue');

    expect(newContext.framePath).toEqual(['stackframe', 'children', '1']);

    const frame = newContext.getCurrentFrame();

    expect(frame).toEqual({
      node: 'testNode',
      input: 'inputValue',
      output: null,
    });
  });

  test('should handle nested frames', () => {
    const context1 = context.pushFrame('node1', 'input1');
    const context2 = context1.pushFrame('node2', 'input2');

    // Verify frame paths
    expect(context1.framePath).toEqual(['stackframe', 'children', '1']);
    expect(context2.framePath).toEqual(['stackframe', 'children', '1', 'children', '1']);

    // Verify nested frame structure
    const frame1 = getFrameAtPath(tree, context1.framePath);
    const frame2 = getFrameAtPath(tree, context2.framePath);

    expect(frame1).toEqual({
      node: 'node1',
      input: 'input1',
      output: null,
    });

    expect(frame2).toEqual({
      node: 'node2',
      input: 'input2',
      output: null,
    });
  });

  test('getFrameAtPath should throw for invalid path', () => {
    expect(() => getFrameAtPath(tree, ['invalid'])).toThrow(PathError);
  });
});
