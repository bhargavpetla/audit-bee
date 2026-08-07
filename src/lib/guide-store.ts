// Simple in-memory store for the parsed guide raw text
// This avoids sending 95KB+ back and forth between client and server

/**
 * How much of a guide's raw text travels to the client and into the model's
 * context. At 80k the later sections of a full program guide were cut off, so
 * they were analysed without their own reference text — this covers a typical
 * 100-page guide whole and still leaves the model's context window mostly free.
 */
export const MAX_GUIDE_TEXT_CHARS = 300_000;

let storedRawText: string = '';

export function setGuideRawText(text: string) {
  storedRawText = text;
}

export function getGuideRawText(): string {
  return storedRawText;
}
