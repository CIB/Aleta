import { readFile } from 'fs/promises';

const data = await readFile('dataset.json', 'utf-8');
const json = JSON.parse(data);

for (const item of json) {
  console.log(`Question: ${item.question}`);
  console.log('---');
  console.log(`Answer: ${item.answer}`);
  console.log('\n');
}
