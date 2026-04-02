// Simple in-memory store for the parsed guide raw text
// This avoids sending 95KB+ back and forth between client and server

let storedRawText: string = '';

export function setGuideRawText(text: string) {
  storedRawText = text;
}

export function getGuideRawText(): string {
  return storedRawText;
}
