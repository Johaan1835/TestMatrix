import { pipeline } from '@xenova/transformers';

let extractor;

async function init() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
}

async function getEmbedding(text) {
  await init();
  const output = await extractor(text, { pooling: 'mean', normalize: true });

  // Return a flat Float64Array or Array of floats
  return Array.from(output.data); // Ensures it's a plain JS array for pg to handle
}

export default getEmbedding;
