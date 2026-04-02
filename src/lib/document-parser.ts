import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function runScript(scriptName: string, buffer: Buffer, ext: string): string {
  const tmpPath = join(tmpdir(), `audit-bee-${Date.now()}.${ext}`);
  try {
    writeFileSync(tmpPath, buffer);
    const scriptPath = join(process.cwd(), 'scripts', scriptName);
    return execFileSync('node', [scriptPath, tmpPath], {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60000,
    });
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

export async function parsePDF(buffer: Buffer): Promise<string> {
  return runScript('parse-pdf.js', buffer, 'pdf');
}

export async function parseDOCX(buffer: Buffer): Promise<string> {
  return runScript('parse-docx.js', buffer, 'docx');
}

export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer);
    case 'docx':
    case 'doc':
      return parseDOCX(buffer);
    case 'txt':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
