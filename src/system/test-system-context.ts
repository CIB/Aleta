import { TestCacheDriver } from '../llm/cache';
import { OpenAIBackend } from '../llm/openai-backend';
import { SystemContext } from './system-context';

export function createTestSystemContext(): SystemContext {
  return new SystemContext(
    new OpenAIBackend(new TestCacheDriver(), 'https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY || '', [
      'gpt-4o-mini',
      'gpt-4o',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1',
    ]),
  );
}
