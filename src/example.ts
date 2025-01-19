import { evaluateTransformOperation, TransformOperation } from "./operation";

const testTransformation: TransformOperation = {
  inputType: { type: "string" },
  outputType: { type: "string" },
  resultExpectation: "The output should be the input string in uppercase",
};

await evaluateTransformOperation(testTransformation, "hello world");

const testTransformation2: TransformOperation = {
  inputType: { type: "string" },
  outputType: { type: "boolean" },
  resultExpectation:
    "The output should be true if the input string is 'hello' and false otherwise",
};

await evaluateTransformOperation(testTransformation2, "hello");
await evaluateTransformOperation(testTransformation2, "hello!");
