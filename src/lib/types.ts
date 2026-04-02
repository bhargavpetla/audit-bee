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

export interface ParsedGuide {
  title: string;
  rawText?: string;
  sections: ProgramSection[];
  totalEvidence?: number;
  textLength?: number;
}
