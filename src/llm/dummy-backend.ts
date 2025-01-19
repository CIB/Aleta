import { LLMBackend, LLMOptions } from './llm-backend';
import { CacheDriver } from './cache';

export class DummyBackend extends LLMBackend {
  public availableModels: string[] = ['deepseek/deepseek-chat', 'gpt-4o-mini', 'gpt-4o'];

  constructor(
    cacheDriver: CacheDriver,
    private defaultResponse: string,
  ) {
    super(cacheDriver, true);
  }

  async promptImpl(prompt: string, options: LLMOptions): Promise<string> {
    return this.defaultResponse;
  }
}
