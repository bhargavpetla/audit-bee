export interface EvidenceItem {
  id: string;
  text: string;
  isRenewal: boolean;
  status: 'not-checked' | 'provided' | 'missing' | 'partial';
  aiNotes?: string;
}

export interface ProgramSection {
  id: string;
  title: string;
  description: string;
  evidenceItems: EvidenceItem[];
  children?: ProgramSection[];
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt';
  extractedText: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

/**
 * Sentinel section id meaning "every section in the guide". Used by the section
 * picker, the context panel and the analysis runner.
 */
export const ALL_SECTIONS_ID = '__ALL__';

export interface ParsedGuide {
  title: string;
  rawText?: string;
  sections: ProgramSection[];
  totalEvidence?: number;
  textLength?: number;
}
