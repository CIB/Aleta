import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { LLMOptions } from './llm-backend';

/** We abstract the cache implementation behind a driver class. For example, this will allow us to store the cache
 *  inside the central tree later. It also allows us to easily inject a mock cache for testing.
 */
export abstract class CacheDriver {
  getCacheKey(question: string, options: LLMOptions) {
    // This way of constructing the key assumes that if we have two separate APIs (like Ollama and OpenAI)
    // but they both use the same model, they will give the same result. Should be fine to assume this.
    const key = `model:${options.model}-json:${options.json}-cache:${options.cache}:::${question}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  abstract getCachedAnswer(question: string, options: LLMOptions): string | undefined;
  abstract putAnswerInCache(question: string, options: LLMOptions, answer: string): void;
}

export class FileCacheDriver extends CacheDriver {
  private CACHE_FILE = path.join(process.cwd(), 'gpt-cache.json');
  private cache: Record<string, { question: string; answer: string; options: LLMOptions }> = {};

  readCacheFile() {
    try {
      const data = fs.readFileSync(this.CACHE_FILE, { encoding: 'utf8' });
      this.cache = JSON.parse(data);
    } catch (error) {
      this.cache = {};
    }
  }

  writeCacheFile() {
    fs.writeFileSync(this.CACHE_FILE, JSON.stringify(this.cache, null, 2));
  }

  getCachedAnswer(question: string, options: LLMOptions): string | undefined {
    this.readCacheFile();
    const cacheKey = this.getCacheKey(question, options);
    return this.cache[cacheKey]?.answer;
  }

  putAnswerInCache(question: string, options: LLMOptions, answer: string) {
    this.readCacheFile();
    const cacheKey = this.getCacheKey(question, options);
    this.cache[cacheKey] = { question, options, answer };
    this.writeCacheFile();
  }
}

export class TemporaryCacheDriver extends CacheDriver {
  private cache: Record<string, { question: string; answer: string; options: LLMOptions }> = {};

  getCachedAnswer(question: string, options: LLMOptions): string | undefined {
    return this.cache[this.getCacheKey(question, options)]?.answer;
  }

  putAnswerInCache(question: string, options: LLMOptions, answer: string) {
    const cacheKey = this.getCacheKey(question, options);
    this.cache[cacheKey] = { question, options, answer };
  }

  populateCache(items: [string, string][], options: LLMOptions) {
    for (const [question, answer] of items) {
      this.putAnswerInCache(question, options, answer);
    }
  }
}
