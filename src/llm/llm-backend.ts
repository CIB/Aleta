import { CacheDriver } from './cache';
import colors from 'colors';

export class LLMApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface LLMOptions {
  model?: string;
  verbose?: boolean;
  cache?: boolean;
  json?: boolean;
}

export abstract class LLMBackend {
  constructor(
    private cacheDriver: CacheDriver,
    private hasJsonMode: boolean,
  ) {}

  abstract promptImpl(text: string, options: LLMOptions): Promise<string>;
  public availableModels: string[] = [];

  async prompt(question: string, options: LLMOptions): Promise<string> {
    if (options.model && !this.availableModels.includes(options.model)) {
      throw new Error(`Model ${options.model} is not available`);
    }

    const verbose = options.verbose !== undefined ? options.verbose : true;
    const useCache = options.cache !== undefined ? options.cache : true;

    // Check if the question is in cache
    let cachedAnswer = this.cacheDriver.getCachedAnswer(question, options);
    if (cachedAnswer) {
      if (verbose) {
        if (verbose) {
          console.log(colors.cyan('Requesting'), colors.green(question));
        }
        console.log(colors.yellow('Cached response:'), colors.green(cachedAnswer));
      }
      return cachedAnswer;
    }

    let answer = await this.promptImpl(question, options);
    if (options.json && !this.hasJsonMode) {
      answer = await this.emulateJsonMode(question, answer, options);
    }

    if (verbose) {
      console.log(colors.yellow('API Response:'), colors.green(answer));
    }
    if (useCache) {
      this.cacheDriver.putAnswerInCache(question, options, answer);
    }
    return answer;
  }

  async promptJSON(question: string, options: LLMOptions): Promise<any> {
    options.json = true;
    const answerString = await this.prompt(question, options);
    // By setting json to true, we expect the promptImpl to only return valid JSON
    // Thus, at this location, we can parse it without any additional checks
    return JSON.parse(answerString);
  }

  async emulateJsonMode(question: string, response: string, options: LLMOptions): Promise<string> {
    let nextResponse = response;
    let i = 0;
    for (i = 0; i < 10; i++) {
      let parsedResponse = this.parseJSONResponse(nextResponse);
      if (parsedResponse) {
        return parsedResponse;
      }

      nextResponse = await this.promptImpl(
        'Below is a prompt along with its response. Please convert the given response to valid JSON:\n\nPrompt:\n' +
          question +
          '\n\nResponse:\n' +
          response +
          '\n\nPlease respond with the response from before converted to valid JSON.',
        options,
      );
    }
    throw new Error('Failed to parse JSON response after 10 attempts');
  }

  parseJSONResponse(response: string): string | undefined {
    // Try to find the first opening { and parse the JSON from there
    const firstOpenBracket = response.indexOf('{');
    response = response.slice(firstOpenBracket);

    // Try to also trim anything after the JSON object
    const lastCloseBracket = response.lastIndexOf('}');
    response = response.slice(0, lastCloseBracket + 1);

    try {
      const parsedResponse = JSON.parse(response.trim());
      return response;
    } catch (error) {
      return undefined;
    }
  }
}
