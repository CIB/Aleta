import { LLMCall, runLLMCall } from '../language/llm-call';
import { SystemContext } from '../system/system-context';

const system = new SystemContext();
await system.init();

const llmCall: LLMCall = {
  llm: 'Reverse the string.',
  input: 'string',
  output: 'string',
  examples: [],
  constraints: [],
};

const result = await runLLMCall(system, llmCall, 'hello', { model: 'deepseek/deepseek-chat' });

console.log(result);
