import { Dictionary } from 'lodash';
import { Tree } from '../../tree/tree';
import { findModule } from '../../tree/tree-helpers';
import { getFunctionAtPath, runFunction, TreeFunction } from '../function';
import { schemaToTypeScript } from '../type-checker';
import { SystemContext } from '../../system/system-context';
import { LLMCall, runLLMCall } from '../llm-call';
import { ExecutionContext } from '../execution-context';
import { createCallFunction } from './call-stack';

export interface SandboxContext {
  typescriptCode: string;
  c: Dictionary<any>;
}

export async function buildSandboxContext(
  system: SystemContext,
  executionContext: ExecutionContext,
  functionPath: string[],
  input: any,
): Promise<SandboxContext> {
  const context: SandboxContext = {
    typescriptCode: '',
    c: {},
  };
  const tree = system.tree;

  await addInputToContext(context, getFunctionAtPath(tree, functionPath), input);
  await addModuleToContext(context, tree, functionPath);
  await addModuleTreeManipulationToContext(system, context, executionContext, tree, functionPath);
  await addTreeManipulationToContext(system, context, executionContext, tree, functionPath);
  return context;
}

export async function addInputToContext(context: SandboxContext, functionConfig: TreeFunction, input: any) {
  const inputTypeDefinition = await schemaToTypeScript(functionConfig.input);
  const defineInput = `${inputTypeDefinition}\ndeclare const input: InputType;\n`;
  context.typescriptCode += defineInput;
  context.c.input = input;
}

export async function addModuleToContext(context: SandboxContext, tree: Tree, functionPath: string[]) {
  const module = findModule(tree, functionPath);

  function accessModule(accessPath: string): any {
    const splitPath = accessPath.split('/');
    const fullPath = [...module, ...splitPath];
    return tree.get(fullPath);
  }

  context.typescriptCode += `
        declare const $$: {};
      `.trim();
  context.c.$$ = (strings: TemplateStringsArray, ...values: any[]) => {
    const path = String.raw(strings, ...values);
    return accessModule(path);
  };
}

export async function addModuleTreeManipulationToContext(
  system: SystemContext,
  context: SandboxContext,
  executionContext: ExecutionContext,
  tree: Tree,
  functionPath: string[],
) {
  const module = findModule(tree, functionPath);

  context.c.$$merge = (path: string, value: object) => {
    const fullPath = [...module, ...path.split('/')];
    tree.insertObject(fullPath, value);
  };

  context.c.$$getTree = (path: string) => {
    const fullPath = [...module, ...path.split('/')];
    return tree.getJSON(fullPath);
  };

  context.c.$$exists = (path: string) => {
    const fullPath = [...module, ...path.split('/')];
    return tree.nodeExists(fullPath);
  };

  context.c.$$push = (path: string, value: object) => {
    const fullPath = [...module, ...path.split('/')];
    tree.push(fullPath, value);
  };

  context.c.$$set = (path: string, value: object) => {
    const fullPath = [...module, ...path.split('/')];
    tree.set(fullPath, value);
  };

  context.c.$$get = (path: string) => {
    const fullPath = [...module, ...path.split('/')];
    return tree.get(fullPath);
  };

  context.c.$$delete = (path: string) => {
    const fullPath = [...module, ...path.split('/')];
    tree.delete(fullPath);
  };

  context.c.$$patchNode = (path: string, value: object) => {
    const fullPath = [...module, ...path.split('/')];
    tree.insert(fullPath, value);
  };

  context.c.$$llm = (path: string, input: any) => {
    const fullPath = [...module, ...path.split('/')];
    const llmConfig = tree.getJSON<LLMCall>(fullPath);
    return runLLMCall(system, llmConfig, input);
  };

  context.c.$$call = createCallFunction(executionContext, module);

  context.typescriptCode += `
    declare const $$merge: (path: string, value: object) => void;
    declare const $$getTree: (path: string) => any;
    declare const $$exists: (path: string) => boolean;
    declare const $$push: (path: string, value: object) => void;
    declare const $$set: (path: string, value: object) => void;
    declare const $$get: (path: string) => any;
    declare const $$delete: (path: string) => void;
    declare const $$patchNode: (path: string, value: object) => void;
    declare const $$llm: (path: string, input: any) => Promise<any>;
    declare const $$call: (path: string) => (input: any) => Promise<any>;
  `.trim();
}

export async function addTreeManipulationToContext(
  system: SystemContext,
  context: SandboxContext,
  executionContext: ExecutionContext,
  tree: Tree,
  functionPath: string[],
) {
  context.c.$root = {
    merge: (path: string, value: object) => {
      const fullPath = path.split('/');
      tree.insertObject(fullPath, value);
    },
    getTree: (path: string) => {
      const fullPath = path.split('/');
      return tree.getJSON(fullPath);
    },
    exists: (path: string) => {
      const fullPath = path.split('/');
      return tree.nodeExists(fullPath);
    },
    push: (path: string, value: object) => {
      const fullPath = path.split('/');
      tree.push(fullPath, value);
    },
    set: (path: string, value: object) => {
      const fullPath = path.split('/');
      tree.set(fullPath, value);
    },
    get: (path: string) => {
      const fullPath = path.split('/');
      return tree.get(fullPath);
    },
    delete: (path: string) => {
      const fullPath = path.split('/');
      tree.delete(fullPath);
    },
    patchNode: (path: string, value: object) => {
      const fullPath = path.split('/');
      tree.insert(fullPath, value);
    },
    llm: (path: string, input: any) => {
      const fullPath = path.split('/');
      const llmConfig = tree.getJSON<LLMCall>(fullPath);
      return runLLMCall(system, llmConfig, input);
    },
    call: createCallFunction(executionContext, []),
  };

  context.typescriptCode += `
    declare const $root: {
      merge: (path: string, value: object) => void;
      getTree: (path: string) => any;
      exists: (path: string) => boolean;
      push: (path: string, value: object) => void;
      set: (path: string, value: object) => void;
      get: (path: string) => any;
      delete: (path: string) => void;
      patchNode: (path: string, value: object) => void;
      llm: (path: string, input: any) => Promise<any>;
      call: (path: string) => (input: any) => Promise<any>;
    };
  `.trim();
}
