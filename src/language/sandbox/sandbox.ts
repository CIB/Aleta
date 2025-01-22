import { Tree } from '../../tree/tree';
import { extractNodeAsObject, findModule } from '../../tree/tree-helpers';
import ts from 'typescript';
import { TreeFunction } from '../function';
import { Schema } from '../type-checker';
import { buildSandboxContext } from './sandbox-context';
import { SystemContext } from '../../system/system-context';
import { ExecutionContext } from '../execution-context';

export async function buildFunctionCode(tree: Tree, functionCode: string, typeDefinitions: string): Promise<string> {
  // Wrap the user code in an async IIFE and capture the result
  const code = `
    ${typeDefinitions}
    async function main() {
      ${functionCode}
    }
    return main();
  `;

  return code;
}

export async function runInSandbox(
  system: SystemContext,
  executionContext: ExecutionContext,
  functionPath: string[],
  functionCode: string,
  input: any,
): Promise<any> {
  const tree = system.tree;
  const { typescriptCode, c } = await buildSandboxContext(system, executionContext, functionPath, input);
  const code = await buildFunctionCode(tree, functionCode, typescriptCode);

  // First we need to transpile the code to confirm type validity
  const transpiler = new Bun.Transpiler({
    loader: 'ts',
    tsconfig: {
      compilerOptions: {},
    },
  });

  const transpiledCode = transpiler.transformSync(code);

  // Create a simple execution context using Bun
  const context = {
    ...c,
    // Add any other global variables you need
    console: {
      log: (...args: any[]) => {
        // Implement custom logging if needed
        console.log(...args);
      },
    },
  };

  // Execute the code in the context
  const fn = new Function(
    'context',
    `
    with (context) {
      return (async function() {
        ${transpiledCode}
      })();
    }
  `,
  );

  const result = await fn(context);
  return result;
}

export async function inferFunctionReturnType(
  system: SystemContext,
  executionContext: ExecutionContext,
  functionPath: string[],
): Promise<Schema> {
  const functionConfig: TreeFunction = extractNodeAsObject<TreeFunction>(system.tree, functionPath);
  const { typescriptCode, c } = await buildSandboxContext(system, executionContext, functionPath, null);
  return inferReturnType(typescriptCode, functionConfig.code);
}

/**
 * Infer the return type of a function from its code. Note that all sandboxed functions
 * return a Promise, so the Promise type is implicitly omitted.
 *
 * @param code - The code of the function to infer the return type from.
 * @returns The inferred return type as a string.
 */
export function inferReturnType(typeDefinitions: string, code: string): Schema {
  // Wrap the code in a function to get proper type inference
  // We don't use `return main()` in order to simplify the type inference
  const wrappedCode = `
      ${typeDefinitions}
      function main() {
        ${code}
      }
    `;

  // Create a virtual file system with the sandbox.ts file
  const fileName = 'sandbox.ts';

  // Create a default compiler host
  const defaultHost = ts.createCompilerHost({
    strict: true,
    noEmit: true,
  });

  // Override the getSourceFile method to provide the wrappedCode for sandbox.ts
  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile: (requestedFileName, languageVersion, onError) => {
      if (requestedFileName === fileName) {
        return ts.createSourceFile(requestedFileName, wrappedCode, languageVersion, true);
      }
      // Delegate to the default host for other files (e.g., lib.d.ts)
      return defaultHost.getSourceFile(requestedFileName, languageVersion, onError);
    },
    // Optionally, you can override other methods if needed
    // For example, you might want to handle writeFile differently
  };

  // Create the program with the custom host
  const program = ts.createProgram({
    rootNames: [fileName],
    options: {
      strict: true,
      noEmit: true,
    },
    host,
  });

  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return {};
  }

  // Find the main function
  const mainFunction = sourceFile.statements.find(
    (s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === 'main',
  );

  if (!mainFunction) {
    return {};
  }

  // Get the type of the function itself
  const functionType = checker.getTypeAtLocation(mainFunction);

  // Get the call signatures of the function
  const signatures = functionType.getCallSignatures();

  if (signatures.length === 0) {
    return {};
  }

  // Get the return type from the first signature
  const returnType = signatures[0].getReturnType();

  // Check if the return type is a Promise and extract its type parameter if it is
  const promiseType = getPromiseResolvedType(returnType, checker);

  // If it's a Promise, convert the resolved type to a string; otherwise, convert the original return type to a string
  const finalType = promiseType ? typeToJsonSchema(promiseType, checker) : typeToJsonSchema(returnType, checker);

  return finalType;
}

/**
 * Checks if a type is a Promise and returns its resolved type if it is.
 *
 * @param type - The TypeScript type to check.
 * @param checker - The TypeScript type checker.
 * @returns The resolved type if it's a Promise; otherwise, undefined.
 */
function getPromiseResolvedType(type: ts.Type, checker: ts.TypeChecker): ts.Type | undefined {
  // Check if the type is an object type
  if (!(type.flags & ts.TypeFlags.Object)) {
    return undefined;
  }

  // Safely cast to ObjectType
  const objectType = type as ts.ObjectType;

  // Check if the ObjectType has Reference flag
  if (!(objectType.objectFlags & ts.ObjectFlags.Reference)) {
    return undefined;
  }

  // Now, it's a TypeReference
  const typeReference = objectType as ts.TypeReference;

  // Get the symbol of the type reference
  const symbol = typeReference.symbol;

  // Ensure the symbol exists and is named 'Promise'
  if (!symbol || symbol.getName() !== 'Promise') {
    return undefined;
  }

  // Extract type arguments (e.g., string in Promise<string>)
  if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
    return typeReference.typeArguments[0];
  }

  return undefined;
}

function typeToJsonSchema(type: ts.Type, checker: ts.TypeChecker): any {
  if (type.flags & ts.TypeFlags.String) {
    return { type: 'string' };
  }
  if (type.flags & ts.TypeFlags.Number) {
    return { type: 'number' };
  }
  if (type.flags & ts.TypeFlags.Boolean) {
    return { type: 'boolean' };
  }
  if (type.flags & ts.TypeFlags.Null) {
    return { type: 'null' };
  }
  if (type.flags & ts.TypeFlags.Undefined) {
    return { type: 'null' }; // Treat undefined as null in JSON schema
  }
  if (type.flags & ts.TypeFlags.Any) {
    return {}; // Any type matches any schema
  }
  if (type.flags & ts.TypeFlags.Unknown) {
    return {}; // Unknown type matches any schema
  }
  if (type.flags & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;
    if (objectType.objectFlags & ts.ObjectFlags.Reference) {
      const typeReference = objectType as ts.TypeReference;
      if (typeReference.typeArguments) {
        // Handle generic types like Array<T>
        if (typeReference.symbol?.getName() === 'Array') {
          return {
            type: 'array',
            items: typeToJsonSchema(typeReference.typeArguments[0], checker),
          };
        }
      }
    }

    // Handle regular objects
    const properties: Record<string, any> = {};
    const required: string[] = [];

    checker.getPropertiesOfType(type).forEach((property) => {
      const propertyType = checker.getTypeOfSymbolAtLocation(property, property.valueDeclaration!);
      properties[property.name] = typeToJsonSchema(propertyType, checker);

      // Check if the property is optional
      if (
        !property.valueDeclaration ||
        !ts.isPropertySignature(property.valueDeclaration) ||
        !property.valueDeclaration.questionToken
      ) {
        required.push(property.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
  }

  // Fallback for unknown types
  return {};
}
