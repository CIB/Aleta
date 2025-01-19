/**
 * Parses a JSON response string, removing comments and trimming lines.
 * @param response - The JSON response string to parse.
 * @returns The parsed JSON object.
 */
export function parseJSONResponse(response: string): any {
  const parsedResponse = JSON.parse(response.trim());

  return parsedResponse;
}

export function parseTextResponse(response: string): string {
  // If the first line of the response ends with a :, we can usually assume ChatGPT is prefacing
  // the reply with a title and ignore this part.
  if (response.split('\n')[0].endsWith(':')) {
    response = response.split('\n').slice(1).join('\n').trim();
  }

  return response;
}
