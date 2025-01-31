// Simple RAG implementation to find the most relevant files for a given query
import { glob } from 'glob';
import ignore from 'ignore';
import { pipeline } from '@xenova/transformers';

// Simple RAG implementation to find the most relevant files for a given query
export class SimpleRAG {
  private embeddings: Map<string, number[]>;
  private files: Map<string, string>;
  private embedder: any;

  constructor() {
    this.embeddings = new Map();
    this.files = new Map();
  }

  async initialize() {
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async addFiles(globPattern: string) {
    const ig = await this.createGitignoreFilter();
    const files = await glob(globPattern, { ignore: ['.git/**'] });

    for (const file of files) {
      if (ig.ignores(file)) continue;
      const content = await Bun.file(file).text();
      this.files.set(file, content);
      const embedding = await this.getEmbedding(content);
      this.embeddings.set(file, embedding);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  private async createGitignoreFilter(): Promise<ReturnType<typeof ignore>> {
    const ig = ignore();
    try {
      const gitignore = await Bun.file('.gitignore').text();
      ig.add(gitignore.split('\n').filter((line) => line && !line.startsWith('#')));
    } catch {} // Ignore if no .gitignore
    return ig;
  }

  async search(query: string, topK = 5): Promise<Array<{ path: string; content: string; score: number }>> {
    const queryEmbedding = await this.getEmbedding(query);
    const results: Array<{ path: string; content: string; score: number }> = [];

    for (const [path, embedding] of this.embeddings) {
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({
        path,
        content: this.files.get(path) || '',
        score,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
