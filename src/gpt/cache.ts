import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const CACHE_FILE = path.join(process.cwd(), 'gpt-cache.json');

export function getCacheKey(question: string) {
  return crypto.createHash('sha256').update(question).digest('hex');
}

export const readCache = (): Record<string, { question: string; answer: string }> => {
  try {
    const data = fs.readFileSync(CACHE_FILE, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return an empty object if the file does not exist
  }
};

export const writeCache = (question: string, answer: string): void => {
  const cache = readCache();
  const cacheKey = getCacheKey(question);
  cache[cacheKey] = { question, answer }; // Update the cache object with the new question-answer pair
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); // Write the updated cache back to the file
};
