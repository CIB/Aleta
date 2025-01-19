import assert from 'assert';
import { CacheDriver, TemporaryCacheDriver } from '../llm/cache';
import { LLMBackend, LLMOptions } from '../llm/llm-backend';
import { OpenAIBackend } from '../llm/openai-backend';
import { Tree } from '../tree/tree';
import type { Dictionary } from 'lodash';

export interface LLMOptionsWithBackend extends LLMOptions {
  backend?: string;
}

/** The context for the AI system. Stores state, such as the tree, and the LLM backends to use. */
export class SystemContext {
  tree: Tree;
  backends: Dictionary<LLMBackend> = {};
  cache: CacheDriver = new TemporaryCacheDriver();

  constructor() {
    assert(process.env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY is not set');
    this.tree = new Tree();
    this.backends.default = new OpenAIBackend(
      this.cache,
      'https://openrouter.ai/api/v1',
      process.env.OPENROUTER_API_KEY,
      ['gpt-4o-mini', 'gpt-4o', 'deepseek/deepseek-chat'],
    );
  }

  async prompt(question: string, options: LLMOptionsWithBackend = {}) {
    if (!options.backend) {
      options.backend = 'default';
    }
    const backend = this.backends[options.backend];
    return backend.prompt(question, options);
  }
}
