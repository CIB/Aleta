import { z, ZodObject } from 'zod';
import { assertType, isObjectSchema, normalizeSchema, Schema, validateType } from './type-checker';
import assert from 'assert';
import { LLMOptionsWithBackend, SystemContext } from '../system/system-context';

export interface LLMCall {
  // The type of input the LLM call expects
  input: Schema;

  // The type of output the LLM call will produce
  output: Schema;

  // Optional examples for multi-shot learning
  examples: Array<{
    input: string;
    output: string;
  }>;

  // Optional constraints that describe requirements for the output
  constraints: string[];

  // The core prompt for the LLM
  llm: string;
}

export async function runLLMCall(
  system: SystemContext,
  config: LLMCall,
  input: any,
  options: LLMOptionsWithBackend = {},
): Promise<any> {
  // Build the complete prompt
  let prompt = config.llm;
  prompt += `\n\n`;
  assertType(input, config.input);

  if (input instanceof ZodObject) {
    prompt += `The variables from the prompt above have the following values:\n`;
    prompt += JSON.stringify(input);
    prompt += `\n\n`;
  } else {
    prompt += `The input is: ${JSON.stringify(input)}\n\n`;
  }

  // Add examples if they exist
  if (config.examples && config.examples.length > 0) {
    prompt +=
      `Here are some input/output examples of the expected result:\n\n` +
      JSON.stringify(config.examples) +
      `\n\nNow handle this input similarly:\n`;
  }

  // If the output type is not an object, we need to wrap it in an object
  let wrapped = false;
  const normalizedOutput = normalizeSchema(config.output);
  let outputWrapped = normalizedOutput;
  if (!isObjectSchema(normalizedOutput)) {
    wrapped = true;
    // Replace the schema with a wrapped schema
    outputWrapped = {
      type: 'object',
      properties: { result: normalizedOutput },
      required: ['result'],
    };
  }

  const constraints = (config.constraints || []).concat([
    `Please provide the output in a JSON format matching the following JSON schema: ${JSON.stringify(outputWrapped)}`,
  ]);

  prompt += `Additional constraints for the output:\n`;
  for (const constraint of constraints) {
    prompt += `\n- ${constraint}`;
  }

  try {
    const response = await system.prompt(prompt, { json: true });
    const output = JSON.parse(response);

    assertType(output, outputWrapped);

    if (wrapped) {
      assert('result' in output, 'Expected result to be wrapped in an object');
      // We wrapped what we expect from the LLM, so we need to unwrap it
      return output.result;
    }

    return output;
  } catch (error) {
    throw new Error(`LLM call failed: ${error.message}`);
  }
}
