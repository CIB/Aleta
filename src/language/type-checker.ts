import Ajv, { SchemaObject } from 'ajv';
import addFormats from 'ajv-formats';
import { compile } from 'json-schema-to-typescript';

export type SimpleSchema = 'string' | 'number' | 'boolean' | 'integer' | 'null' | 'any';
export type SchemaArray = 'string[]' | 'number[]' | 'boolean[]' | 'integer[]' | 'null[]' | 'any[]';
export type Schema = SimpleSchema | SchemaArray | SchemaObject;

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

function parseSimpleType(typeStr: SimpleSchema | SchemaArray): object {
  // Handle array types (e.g., "string[]", "number[]")
  if (typeStr.endsWith('[]')) {
    const itemType = typeStr.slice(0, -2);
    return {
      type: 'array',
      items: { type: itemType },
    };
  }

  // Handle basic types
  const basicTypes = ['string', 'number', 'boolean', 'integer', 'null', 'any'];
  if (basicTypes.includes(typeStr)) {
    return typeStr === 'any' ? {} : { type: typeStr };
  }

  throw new Error(`Unsupported type: ${typeStr}`);
}

export function normalizeSchema(schema: Schema): object {
  if (schema === undefined) {
    return { type: 'null' };
  }
  if (typeof schema === 'string') {
    return parseSimpleType(schema);
  }
  return schema;
}

export function validateType(value: unknown, schema: Schema): { valid: boolean; errors?: string[] } {
  const jsonSchema = normalizeSchema(schema);

  const validate = ajv.compile(jsonSchema);
  const valid = validate(value);

  if (!valid && validate.errors) {
    // Return all errors instead of just the first one
    const errors = validate.errors.map((error) =>
      error.keyword === 'type'
        ? `Expected ${error.params.type} at ${error.instancePath || 'root'}`
        : `${error.message} at ${error.instancePath || 'root'}`,
    );

    return { valid: false, errors };
  }

  return { valid: true };
}

export function assertType(value: unknown, schema: Schema): void {
  const { valid, errors } = validateType(value, schema);
  if (!valid) {
    throw new Error(`Type validation failed: ${errors?.join(', ')}`);
  }
}

export function isObjectSchema(schema: Schema): boolean {
  const jsonSchema = normalizeSchema(schema);

  // Use a type guard to check if jsonSchema has a 'type' property
  if (typeof jsonSchema === 'object' && 'type' in jsonSchema) {
    return (jsonSchema as { type: string }).type === 'object';
  }

  return false;
}

export async function schemaToTypeScript(schema: Schema): Promise<string> {
  const jsonSchema = normalizeSchema(schema);
  const result = await compile(jsonSchema, 'InputType', {
    additionalProperties: false,
  });

  // Strip out `export` keywords
  return result.replace(/export\s+/, '');
}
