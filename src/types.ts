export interface StringType {
  type: "string";
}

export interface BooleanType {
  type: "boolean";
}

export interface ListType {
  type: "list";
  itemType: BaseType;
}

export interface DictionaryType {
  type: "dictionary";
  valueType: BaseType;
}

export type BaseType = StringType | BooleanType | ListType | DictionaryType;

export function validateType(type: BaseType, value: any) {
  if (type.type === "string") {
    return typeof value === "string";
  } else if (type.type === "boolean") {
    return typeof value === "boolean";
  } else if (type.type === "list") {
    return (
      Array.isArray(value) &&
      value.every((item) => validateType(type.itemType, item))
    );
  } else if (type.type === "dictionary") {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.values(value).every((item) => validateType(type.valueType, item))
    );
  }
}

export function toTypescriptType(type: BaseType) {
  if (type.type === "string") {
    // The model is trained to return objects for JSON, we wrap it
    return "{ result: string }";
  } else if (type.type === "boolean") {
    return "{ result: boolean }";
  } else if (type.type === "list") {
    return `{ result: Array<${toTypescriptTypeNested(type.itemType)}> }`;
  } else if (type.type === "dictionary") {
    return `Record<string, ${toTypescriptTypeNested(type.valueType)}>`;
  }
}

export function toTypescriptTypeNested(type: BaseType) {
  if (type.type === "string") {
    return "string";
  } else if (type.type === "boolean") {
    return "boolean";
  } else if (type.type === "list") {
    return `Array<${toTypescriptType(type.itemType)}>`;
  } else if (type.type === "dictionary") {
    return `Record<string, ${toTypescriptType(type.valueType)}>`;
  }
}

export function extractJSONResponse(baseType: BaseType, response: any) {
  if (baseType.type === "string") {
    return response.result;
  } else if (baseType.type === "boolean") {
    return response.result;
  } else if (baseType.type === "list") {
    return response.result;
  } else if (baseType.type === "dictionary") {
    return response;
  }
}
