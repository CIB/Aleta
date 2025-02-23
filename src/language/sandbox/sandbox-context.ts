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

  context.c.$$getNodes = (path: string) => {
    const fullPath = [...module, ...path.split('/')];
    return tree.getJSON(fullPath);
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
    declare const $$push: (path: string, value: object) => void;
    declare const $$set: (path: string, value: object) => void;
    declare const $$get: (path: string) => any;
    declare const $$delete: (path: string) => void;
    declare const $$getNodes: (path: string) => any;
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
    getNodes: (path: string) => {
      const fullPath = path.split('/');
      return tree.getJSON(fullPath);
    },
    patchNode: (path: string, value: object) => {
      const fullPath = path.split('/');
      tree.insert(fullPath, value);
    },
    llm: (path: string, input: any) => {
      const fullPath = path.split('/');
      console.log('Full path:', fullPath);

      // Use getNodeOrList instead of get to handle both tree and list nodes
      const node = tree.getNodeOrList(fullPath);
      console.log('Node from tree:', node);

      const llmConfig = tree.getJSON<LLMCall>(fullPath);
      console.log('Extracted LLM config:', llmConfig);

      return runLLMCall(system, llmConfig, input);
    },
    call: createCallFunction(executionContext, []),
  };

  context.typescriptCode += `
    declare const $root: {
      push: (path: string, value: object) => void;
      set: (path: string, value: object) => void;
      get: (path: string) => any;
      delete: (path: string) => void;
      getNodes: (path: string) => any;
      patchNode: (path: string, value: object) => void;
      llm: (path: string, input: any) => Promise<any>;
      call: (path: string) => (input: any) => Promise<any>;
    };
  `.trim();
}
