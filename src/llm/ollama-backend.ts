import { LLMBackend, LLMOptions } from './llm-backend';
import ollama from 'ollama';
import fs from 'fs/promises';
import { CacheDriver } from './cache';
export class OllamaBackend extends LLMBackend {
  public availableModels: string[] = ['qwen2.5-coder:14b'];
  constructor(
    cacheDriver: CacheDriver,
    public url: string,
    hasJsonMode = false,
  ) {
    super(cacheDriver, hasJsonMode);
  }

  async promptImpl(prompt: string, options: LLMOptions): Promise<string> {
    const model = 'qwen2.5-coder:14b';

    // TODO: Implement JSON mode (for example, retry mechanism until a valid JSON is returned)

    const response = await ollama.generate({
      model,
      prompt,
      options: {
        temperature: 0.9,
      },
    });

    return response.response;
  }
}
