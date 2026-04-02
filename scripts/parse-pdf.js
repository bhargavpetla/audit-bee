// Standalone script to parse PDF - runs outside webpack bundling
const fs = require('fs');
const pdfParse = require('pdf-parse');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node parse-pdf.js <path>');
  process.exit(1);
}

const buffer = fs.readFileSync(inputPath);
pdfParse(buffer).then(data => {
  process.stdout.write(data.text);
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
