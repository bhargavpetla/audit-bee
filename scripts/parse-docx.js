// Standalone script to parse DOCX - runs outside webpack bundling
const fs = require('fs');
const mammoth = require('mammoth');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node parse-docx.js <path>');
  process.exit(1);
}

const buffer = fs.readFileSync(inputPath);
mammoth.extractRawText({ buffer }).then(result => {
  process.stdout.write(result.value);
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
