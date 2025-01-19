import { CacheDriver } from './cache';
import { LLMApiError, LLMBackend } from './llm-backend';
import axios from 'axios';

export class OpenAIBackend extends LLMBackend {
  constructor(
    cacheDriver: CacheDriver,
    public url: string,
    private apiKey: string,
    models: string[],
  ) {
    super(cacheDriver, false);
    this.availableModels = models;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async promptImpl(
    question: string,
    options: {
      model?: string;
      verbose?: boolean;
      cache?: boolean;
      json?: boolean;
    } = {},
  ): Promise<string> {
    const model = options.model || 'deepseek/deepseek-chat';

    const data = {
      model,
      response_format: undefined as undefined | { type: 'json_object' },
      messages: [{ role: 'user', content: question }],
    };

    if (options.json === undefined || options.json) {
      data.response_format = { type: 'json_object' };
    }

    try {
      let response;
      let numberOfTries = 0;
      while (!response) {
        try {
          response = await axios.post(`${this.url}/chat/completions`, data, {
            headers: this.headers(),
          });
        } catch (error) {
          if (numberOfTries++ > 5) {
            throw error;
          }
        }
      }
      const responseContent = response.data.choices[0].message.content;
      return responseContent;
    } catch (error) {
      throw new LLMApiError(`${error}`);
    }
  }
}