import { SimpleRAG } from './simple-rag';

const rag = new SimpleRAG();
await rag.initialize();
await rag.addFiles('**/*.ts'); // Add all TypeScript files
await rag.addFiles('**/*.md'); // Add all documentation files
const results = await rag.search('How does the central tree work?');
console.log(results);
process.exit(0);
