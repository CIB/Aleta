import axios from 'axios';
import colors from 'colors';
import { getCacheKey, readCache, writeCache } from './cache'; // Import caching functions

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const headers = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
};

export async function getChatCompletion(
  question: string,
  options: {
    model?: string;
    verbose?: boolean;
    cache?: boolean;
    json?: boolean;
  } = {},
): Promise<string> {
  const model = options.model || 'gpt-4o-mini';
  const verbose =
    options.verbose !== undefined ? options.verbose : true;
  const useCache = options.cache !== undefined ? options.cache : true;
  const cacheKey = getCacheKey(question);
  const cache = readCache(); // Read cache

  if (verbose) {
    console.log(colors.cyan('Requesting'), colors.green(question));
  }

  // Check if the question is in cache
  if (useCache && cache[cacheKey]) {
    if (verbose) {
      console.log(
        colors.yellow('Cached response:'),
        colors.green(cache[cacheKey].answer),
      );
    }
    return cache[cacheKey].answer;
  }

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
        response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          data,
          {
            headers,
          },
        );
      } catch (error) {
        if (numberOfTries++ > 5) {
          throw error;
        }
      }
    }
    const responseContent = response.data.choices[0].message.content;
    if (verbose) {
      console.log(
        colors.yellow('Response:'),
        colors.green(responseContent),
      );
    }

    // Update cache with new question-answer pair
    writeCache(question, responseContent);

    return responseContent;
  } catch (error) {
    console.error(colors.red('Error:'), error);
    return '';
  }
}
