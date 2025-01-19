import ollama from "ollama";
import colors from "colors";
import * as fs from "fs/promises";
import * as path from "path";

export async function getOllamaCompletion(prompt: string, verbose = true) {
  if (verbose) console.log(colors.cyan("Requesting"), colors.green(prompt));

  const model = "qwen2.5-coder:14b";

  const response = await ollama.generate({
    model,
    prompt,
    options: {
      temperature: 0.9,
    },
  });

  // Log the interaction to a JSON file
  const logEntry = {
    timestamp: new Date().toISOString(),
    model,
    prompt,
    response: response.response,
  };

  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "ollama-interactions.json");

  try {
    // Create logs directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });

    // Read existing logs or start with empty array
    let logs: (typeof logEntry)[] = [];
    try {
      const fileContent = await fs.readFile(logFile, "utf8");
      logs = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is invalid JSON, start with empty array
    }

    // Append new entry and write back to file
    logs.push(logEntry);
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error(colors.red("Error logging interaction:"), error);
  }

  if (verbose)
    console.log(colors.yellow("Response:"), colors.green(response.response));
  return response.response;
}

/**
 * Parses a JSON response string, removing comments and trimming lines.
 * @param response - The JSON response string to parse.
 * @returns The parsed JSON object.
 */
export function parseJSONResponse(response: string): any {
  // Try to find the first opening { and parse the JSON from there
  const firstOpenBracket = response.indexOf("{");
  response = response.slice(firstOpenBracket);

  // Try to also trim anything after the JSON object
  const lastCloseBracket = response.lastIndexOf("}");
  response = response.slice(0, lastCloseBracket + 1);

  const parsedResponse = JSON.parse(response.trim());

  return parsedResponse;
}
