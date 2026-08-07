'use client';

import { useAudit } from '@/context/AuditContext';
import { ProgramSection, ALL_SECTIONS_ID } from '@/lib/types';
import EvidenceChecklist from './EvidenceChecklist';
import ReportDownload from './ReportDownload';
import { ClipboardList, FileText, Info } from 'lucide-react';
import { useState } from 'react';

function findSection(
  sections: ProgramSection[],
  id: string
): ProgramSection | undefined {
  for (const section of sections) {
    if (section.id === id) return section;
    if (section.children) {
      const found = findSection(section.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export default function ContextPanel() {
  const { guide, selectedSection, documents } = useAudit();
  const [activeTab, setActiveTab] = useState<'checklist' | 'documents'>(
    'checklist'
  );

  const showingAll = selectedSection === ALL_SECTIONS_ID;

  // The checklist renders a list of roots: the whole guide, or the one section
  const checklistSections: ProgramSection[] = !guide
    ? []
    : showingAll
      ? guide.sections
      : [findSection(guide.sections, selectedSection)].filter(
          (s): s is ProgramSection => !!s
        );

  return (
    <div className="w-[350px] bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-900">Context Panel</h2>
          <ReportDownload />
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'checklist'
                ? 'bg-primary text-white'
                : 'bg-lavender-50 text-gray-500 hover:bg-lavender-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Evidence Checklist
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'documents'
                ? 'bg-primary text-white'
                : 'bg-lavender-50 text-gray-500 hover:bg-lavender-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documents ({documents.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {activeTab === 'checklist' ? (
          checklistSections.length > 0 ? (
            <EvidenceChecklist
              sections={checklistSections}
              collapsible={showingAll}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Info className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">
                {!guide
                  ? 'Upload a program guide to see evidence requirements.'
                  : 'Select an assessment section to view the evidence checklist.'}
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">
                  No documents uploaded yet.
                </p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-lavender-50 rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {doc.name}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-medium ml-auto">
                      {doc.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                    {doc.extractedText.slice(0, 500)}
                    {doc.extractedText.length > 500 ? '...' : ''}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {doc.extractedText.length.toLocaleString()} characters
                    extracted
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
