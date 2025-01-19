#!/usr/bin/env bun
import yaml from "yaml";
import { file } from "bun";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Please provide a YAML file path");
  process.exit(1);
}

try {
  const content = await file(filePath).text();
  const parsed = yaml.parse(content);
  console.log(JSON.stringify(parsed, null, 2));
} catch (error) {
  console.error(`Error processing ${filePath}:`, error.message);
  process.exit(1);
}
