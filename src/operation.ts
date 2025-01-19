import { parseJSONResponse } from "./gpt/ollama";
import { getOllamaCompletion } from "./gpt/ollama";
import {
  BaseType,
  extractJSONResponse,
  toTypescriptType,
  validateType,
} from "./types";

export interface TransformOperation {
  inputType: BaseType;
  outputType: BaseType;
  resultExpectation: string;
}

export async function evaluateTransformOperation(
  operation: TransformOperation,
  input: any
) {
  if (!validateType(operation.inputType, input)) {
    throw new Error("Invalid input type");
  }

  let prompt = `Given the following input: ${JSON.stringify(input)}\n\n`;
  prompt += `Please produce an output according to the following expectation:`;
  prompt += `\n\n${operation.resultExpectation}`;

  prompt += `\n\nThe output should be a JSON object conforming to the following type: ${toTypescriptType(
    operation.outputType
  )}`;

  const response = await getOllamaCompletion(prompt);

  const parsed = parseJSONResponse(response);
  const extracted = extractJSONResponse(operation.outputType, parsed);

  if (!validateType(operation.outputType, extracted)) {
    throw new Error("Invalid output type");
  }

  return extracted;
}
