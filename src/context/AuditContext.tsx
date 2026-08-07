'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  ChatMessage,
  UploadedDocument,
  ProgramSection,
  ParsedGuide,
  EvidenceItem,
} from '@/lib/types';

interface ChecklistUpdate {
  id: string;
  status: 'provided' | 'missing' | 'partial';
  notes?: string;
}

interface AuditContextType {
  // Guide state
  guide: ParsedGuide | null;
  guideLoading: boolean;
  guideFileName: string;

  // Audit state
  selectedSection: string;
  documents: UploadedDocument[];
  messages: ChatMessage[];
  isStreaming: boolean;

  // Actions
  setGuide: (guide: ParsedGuide, fileName: string) => void;
  setSelectedSection: (id: string) => void;
  addDocument: (doc: UploadedDocument) => void;
  removeDocument: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  updateMessageById: (id: string, content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setGuideLoading: (loading: boolean) => void;
  updateChecklistItems: (
    updates: ChecklistUpdate[],
    scopeSectionId?: string
  ) => void;
  resetAudit: () => void;
}

const AuditContext = createContext<AuditContextType | null>(null);

function deepCloneSections(sections: ProgramSection[]): ProgramSection[] {
  return JSON.parse(JSON.stringify(sections));
}

function findSectionById(
  sections: ProgramSection[],
  id: string
): ProgramSection | undefined {
  for (const section of sections) {
    if (section.id === id) return section;
    if (section.children) {
      const found = findSectionById(section.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function AuditProvider({ children }: { children: ReactNode }) {
  const [guide, setGuideState] = useState<ParsedGuide | null>(null);
  const [guideFileName, setGuideFileName] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const setGuide = useCallback((parsed: ParsedGuide, fileName: string) => {
    setGuideState({
      ...parsed,
      sections: deepCloneSections(parsed.sections),
    });
    setGuideFileName(fileName);
    setSelectedSection('');
    setMessages([]);
  }, []);

  const addDocument = useCallback((doc: UploadedDocument) => {
    setDocuments((prev) => [...prev, doc]);
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant') {
          newMessages[i] = { ...newMessages[i], content };
          break;
        }
      }
      return newMessages;
    });
  }, []);

  const updateMessageById = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );
  }, []);

  const updateChecklistItems = useCallback(
    (updates: ChecklistUpdate[], scopeSectionId?: string) => {
    setGuideState((prev) => {
      if (!prev) return prev;
      const newSections = deepCloneSections(prev.sections);
      let anyUpdated = false;

      const normalizeId = (id: string) => id.replace(/\s+/g, '').toLowerCase();

      const updateInSections = (sections: ProgramSection[]) => {
        for (const section of sections) {
          for (const item of section.evidenceItems) {
            // Exact match first
            let update = updates.find((u) => u.id === item.id);
            // Fallback: normalized match (handles whitespace, case differences)
            if (!update) {
              const normItemId = normalizeId(item.id);
              update = updates.find((u) => normalizeId(u.id) === normItemId);
            }
            // Fallback: partial match (AI might use "1.1-E1" vs "1.1-e1" or "1.1 - E1")
            if (!update) {
              update = updates.find((u) => {
                const uBase = u.id.replace(/[-\s]/g, '').toLowerCase();
                const iBase = item.id.replace(/[-\s]/g, '').toLowerCase();
                return uBase === iBase;
              });
            }
            if (update) {
              item.status = update.status;
              if (update.notes) item.aiNotes = update.notes;
              anyUpdated = true;
            }
          }
          if (section.children) updateInSections(section.children);
        }
      };

      updateInSections(newSections);

      // If no items matched by ID, fall back to matching by order — but only
      // inside the section that was analysed, so a batch run covering one
      // section can never overwrite statuses belonging to another.
      if (!anyUpdated && updates.length > 0 && scopeSectionId) {
        const scope = findSectionById(newSections, scopeSectionId);
        const allItems: EvidenceItem[] = [];
        const collectItems = (sections: ProgramSection[]) => {
          for (const section of sections) {
            for (const item of section.evidenceItems) {
              allItems.push(item);
            }
            if (section.children) collectItems(section.children);
          }
        };
        collectItems(scope ? [scope] : newSections);

        // Apply updates by order if count roughly matches
        if (updates.length <= allItems.length) {
          for (let i = 0; i < updates.length && i < allItems.length; i++) {
            allItems[i].status = updates[i].status;
            if (updates[i].notes) allItems[i].aiNotes = updates[i].notes;
          }
        }
      }

      return { ...prev, sections: newSections };
    });
    },
    []
  );

  const resetAudit = useCallback(() => {
    setGuideState(null);
    setGuideFileName('');
    setSelectedSection('');
    setDocuments([]);
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return (
    <AuditContext.Provider
      value={{
        guide,
        guideLoading,
        guideFileName,
        selectedSection,
        documents,
        messages,
        isStreaming,
        setGuide,
        setSelectedSection,
        addDocument,
        removeDocument,
        addMessage,
        updateLastAssistantMessage,
        updateMessageById,
        setIsStreaming,
        setGuideLoading,
        updateChecklistItems,
        resetAudit,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
}
