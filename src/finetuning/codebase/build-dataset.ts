import { glob } from 'glob';
import { FileCacheDriver } from '../../llm/cache';
import { LLMBackend } from '../../llm/llm-backend';
import { OpenAIBackend } from '../../llm/openai-backend';
import { SimpleRAG } from './simple-rag';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';

export class DatasetBuilder {
  backend: LLMBackend;
  outputFilePath = 'dataset.json';
  rag: SimpleRAG;

  constructor() {
    this.backend = new OpenAIBackend(
      new FileCacheDriver(),
      'https://openrouter.ai/api/v1',
      process.env.OPENROUTER_API_KEY!,
      ['deepseek/deepseek-chat', 'deepseek/deepseek-r1-distill-llama-70b'],
    );
    this.rag = new SimpleRAG();
  }

  async initialize() {
    await this.rag.initialize();
    await this.rag.addFiles('**/*.md');
    await this.rag.addFiles('**/*.ts');
  }

  async generateQuestion(sourceDocument: string) {
    const query = `Please be creative and generate a question about how something from the documentation is implemented. The question should specifically ask about code examples with a description. Here is the document:
\`\`\`
${sourceDocument}
\`\`\`
  
  Create the question in the following JSON format:

{ "question": "<my question>" }`;

    const response = await this.backend.promptImpl(query, {
      model: 'deepseek/deepseek-r1-distill-llama-70b',
      json: true,
    });
    return JSON.parse(response).question;
  }

  async generateAnswer(question: string, sourceDocument: string) {
    // First retrieve relevant files with RAG
    const relevantFiles = await this.rag.search(question);

    // Combine file contents up to ~4000 characters
    let combinedContent = '';
    for (const file of relevantFiles) {
      if (combinedContent.length + file.content.length > 4000) {
        // If adding this file would exceed the limit, add only what fits
        const remainingChars = 4000 - combinedContent.length;
        combinedContent += '\n' + file.content.slice(0, remainingChars);
        break;
      }
      combinedContent += '\n' + file.content;
    }

    // Trim any extra whitespace
    combinedContent = combinedContent.trim();

    const query = `${question}\n\nHere are some relevant code files. Ensure to include some code examples from the following files if applicable:\n${combinedContent}\n\nPlease provide the answer in the following JSON format: { "answer": "<my answer>" }`;
    const response = await this.backend.promptImpl(query, {
      model: 'deepseek/deepseek-r1-distill-llama-70b',
      json: true,
    });
    return JSON.parse(response).answer;
  }

  async generateDataset(n: number) {
    const dataset: { question: string; answer: string }[] = [];

    const files = await glob('./docs/**/*.md');
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        file,
        content: await readFile(file, 'utf-8'),
      })),
    );

    for (let i = 0; i < n; i++) {
      const content = fileContents[i % fileContents.length];
      const question = await this.generateQuestion(content.content);
      const answer = await this.generateAnswer(question, content.content);
      dataset.push({ question, answer });
    }

    await writeFile(this.outputFilePath, JSON.stringify(dataset, null, 2));
  }
}

const builder = new DatasetBuilder();
await builder.initialize();
await builder.generateDataset(10);
