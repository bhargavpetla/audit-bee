'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAudit } from '@/context/AuditContext';
import { ALL_SECTIONS_ID, ChatMessage, ProgramSection } from '@/lib/types';
import DocumentUploader from './DocumentUploader';
import {
  Search,
  ChevronDown,
  BookOpen,
  Upload,
  Loader2,
  CheckCircle2,
  RotateCcw,
  X,
  FileText,
  Square,
} from 'lucide-react';
import BeeLogo from './BeeLogo';

export default function AuditSetupPanel() {
  const {
    guide,
    guideLoading,
    guideFileName,
    selectedSection,
    setSelectedSection,
    setGuide,
    setGuideLoading,
    documents,
    isStreaming,
    messages,
    addMessage,
    updateMessageById,
    updateChecklistItems,
    resetAudit,
    startRun,
    endRun,
    registerAbort,
    stopRun,
    isCancelled,
  } = useAudit();

  const [guideError, setGuideError] = useState('');
  const [parseStep, setParseStep] = useState('');
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    label: string;
  } | null>(null);
  const [stopping, setStopping] = useState(false);

  // Upload and parse program guide
  const onGuideDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setGuideError('');
      setGuideLoading(true);
      setParseStep('Uploading file...');

      try {
        const formData = new FormData();
        formData.append('file', file);

        setParseStep('Extracting text from document...');

        const res = await fetch('/api/parse-guide', {
          method: 'POST',
          body: formData,
        });

        setParseStep('Parsing sections and evidence items...');

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to parse guide');
        }

        const data = await res.json();

        setParseStep(`Found ${data.sections.length} sections, ${data.totalEvidence} evidence items`);

        // Small delay so user can see the final count
        await new Promise(r => setTimeout(r, 600));

        setGuide(
          { title: data.title, sections: data.sections, totalEvidence: data.totalEvidence, textLength: data.textLength, rawText: data.rawText },
          data.fileName
        );
      } catch (err) {
        setGuideError(
          err instanceof Error ? err.message : 'Failed to parse guide'
        );
      } finally {
        setGuideLoading(false);
        setParseStep('');
      }
    },
    [setGuide, setGuideLoading]
  );

  const guideDropzone = useDropzone({
    onDrop: onGuideDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
    multiple: false,
    disabled: guideLoading,
  });

  // Build flat list of section options from parsed guide
  const getSectionOptions = (): { id: string; label: string; depth: number }[] => {
    if (!guide) return [];
    const options: { id: string; label: string; depth: number }[] = [];
    const walk = (sections: typeof guide.sections, depth: number) => {
      for (const s of sections) {
        options.push({ id: s.id, label: `${s.id} — ${s.title}`, depth });
        if (s.children) walk(s.children, depth + 1);
      }
    };
    walk(guide.sections, 0);
    return options;
  };

  const sectionOptions = getSectionOptions();

  const findSection = (
    sections: ProgramSection[],
    id: string
  ): ProgramSection | undefined => {
    for (const s of sections) {
      if (s.id === id) return s;
      if (s.children) {
        const found = findSection(s.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const countEvidence = (sections: ProgramSection[]): number =>
    sections.reduce(
      (sum, s) =>
        sum + s.evidenceItems.length + countEvidence(s.children || []),
      0
    );

  const countControls = (sections: ProgramSection[]): number =>
    sections.reduce((sum, s) => sum + 1 + countControls(s.children || []), 0);

  // Count total evidence for a section (or the whole guide)
  const countSectionEvidence = (sectionId: string): number => {
    if (!guide) return 0;
    if (sectionId === ALL_SECTIONS_ID) return countEvidence(guide.sections);
    const section = findSection(guide.sections, sectionId);
    return section ? countEvidence([section]) : 0;
  };

  const totalEvidence = guide ? countEvidence(guide.sections) : 0;
  const totalControls = guide ? countControls(guide.sections) : 0;

  const normalizeId = (id: string) => id.replace(/[-\s]/g, '').toLowerCase();

  const collectEvidenceIds = (sections: ProgramSection[]): string[] => {
    const ids: string[] = [];
    const walk = (list: ProgramSection[]) => {
      for (const s of list) {
        ids.push(...s.evidenceItems.map((i) => i.id));
        if (s.children) walk(s.children);
      }
    };
    walk(sections);
    return ids;
  };

  const stripChecklist = (text: string) =>
    text.replace(/<!--CHECKLIST_UPDATE:[\s\S]*?-->/g, '').trim();

  /**
   * One request/response round trip, streamed into an existing assistant
   * message. `prefix` is text already shown in that message, so a follow-up
   * pass appends rather than replaces.
   */
  const streamPass = async (
    sectionId: string,
    userMessage: ChatMessage,
    history: ChatMessage[],
    targetMessageId: string,
    prefix = ''
  ): Promise<{
    text: string;
    items: { id: string; status: string }[];
    aborted: boolean;
  }> => {
    if (!guide) return { text: '', items: [], aborted: false };

    const controller = new AbortController();
    registerAbort(controller);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [...history, userMessage],
        documents,
        sectionId,
        guideSections: guide.sections,
        guideTitle: guide.title,
        guideRawText: guide.rawText,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let fullText = '';
    let aborted = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        updateMessageById(targetMessageId, prefix + fullText);
      }
    } catch (err) {
      // Stopping mid-stream is not a failure — keep what arrived
      if ((err as Error)?.name !== 'AbortError') throw err;
      aborted = true;
    }

    let items: { id: string; status: string }[] = [];
    const checklistMatch = fullText.match(/<!--CHECKLIST_UPDATE:([\s\S]*?)-->/);
    if (checklistMatch) {
      try {
        const updates = JSON.parse(checklistMatch[1].trim());
        if (updates.items && updates.items.length > 0) {
          updateChecklistItems(updates.items, sectionId);
          items = updates.items;
        }
      } catch (e) {
        console.error(
          '[Audit Bee] Failed to parse checklist update:',
          e,
          checklistMatch[1]
        );
      }
    } else {
      console.log('[Audit Bee] No CHECKLIST_UPDATE found in response');
    }

    const clean = stripChecklist(fullText);
    const suffix = aborted ? '\n\n_Stopped by the auditor._' : '';
    updateMessageById(targetMessageId, prefix + clean + suffix);
    return { text: clean + suffix, items, aborted };
  };

  /**
   * Run one analysis pass and stream it into its own assistant message, then a
   * targeted second pass for any evidence item the model skipped. Returns the
   * checklist updates produced, so a whole-guide run can report its coverage.
   */
  const analyseSection = async (
    sectionId: string,
    sectionLabel: string,
    history: ChatMessage[]
  ): Promise<{ id: string; status: string }[]> => {
    if (!guide) return [];

    const scope =
      sectionId === ALL_SECTIONS_ID
        ? guide.sections
        : [findSection(guide.sections, sectionId)].filter(
            (s): s is ProgramSection => !!s
          );
    const expectedIds = collectEvidenceIds(scope);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-u-${sectionId}`,
      role: 'user',
      content: `Please analyse my uploaded documents against the requirements for ${sectionLabel} and tell me what evidence is missing and how I can improve my submission.`,
      timestamp: new Date().toISOString(),
    };

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-a-${sectionId}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    addMessage(userMessage);
    addMessage(assistantMessage);

    try {
      const first = await streamPass(
        sectionId,
        userMessage,
        history,
        assistantMessage.id
      );
      const items = [...first.items];
      if (first.aborted) return items;

      // Long sections occasionally lose a few items on the way to the checklist
      // block. Ask for just those rather than leaving them unassessed.
      const seen = new Set(items.map((i) => normalizeId(i.id)));
      const unresolved = expectedIds.filter(
        (id) => !seen.has(normalizeId(id))
      );

      if (unresolved.length > 0 && unresolved.length <= 40) {
        const followUp: ChatMessage = {
          id: `msg-${Date.now()}-u2-${sectionId}`,
          role: 'user',
          content: `These evidence items have no verdict yet: ${unresolved.join(', ')}. Give a ✅/⚠️/❌ bullet for each one under a "### Remaining items" heading, following the same rules, then the checklist block covering exactly these IDs. Nothing else.`,
          timestamp: new Date().toISOString(),
        };

        const second = await streamPass(
          sectionId,
          followUp,
          [userMessage, { ...assistantMessage, content: first.text }],
          assistantMessage.id,
          first.text + '\n\n'
        );
        items.push(...second.items);
      }

      return items;
    } catch (err) {
      if (isCancelled() || (err as Error)?.name === 'AbortError') {
        // Keep whatever streamed in before the stop, and say so
        updateMessageById(
          assistantMessage.id,
          `_Analysis of ${sectionLabel} was stopped by the auditor. Any verdicts above have been kept._`
        );
        return [];
      }
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Audit Bee] Analysis error:', err);
      updateMessageById(
        assistantMessage.id,
        `Sorry, an error occurred while analysing ${sectionLabel}: ${msg}.`
      );
      return [];
    }
  };

  /**
   * Whole-guide runs are split one request per top-level section. A single
   * request covering every control point would have to emit hundreds of
   * findings and gets truncated long before it finishes.
   */
  const analyseWholeGuide = async () => {
    if (!guide) return;

    const covered = new Map<string, string>();

    const analysed: ProgramSection[] = [];

    for (let i = 0; i < guide.sections.length; i++) {
      if (isCancelled()) break;

      const section = guide.sections[i];
      setProgress({
        done: i,
        total: guide.sections.length,
        label: `${section.id} ${section.title}`,
      });

      const applied = await analyseSection(
        section.id,
        `Section ${section.id} — ${section.title}`,
        []
      );
      analysed.push(section);
      for (const item of applied) covered.set(item.id, item.status);
    }

    if (analysed.length === 0) return;

    setProgress({
      done: analysed.length,
      total: guide.sections.length,
      label: 'Building coverage summary',
    });

    // Summarise only what actually ran, so a stopped run doesn't report the
    // sections it never reached as gaps
    addMessage(buildCoverageMessage(analysed, covered, isCancelled()));
  };

  const buildCoverageMessage = (
    sections: ProgramSection[],
    covered: Map<string, string>,
    stopped = false
  ): ChatMessage => {
    // The model reproduces IDs loosely ("1.2-e1", "1.2 - E1"), matched the same
    // way the checklist merge does
    const normalize = (id: string) => id.replace(/[-\s]/g, '').toLowerCase();
    const coveredByKey = new Map<string, string>();
    for (const [id, status] of covered) coveredByKey.set(normalize(id), status);

    const tallyOf = (roots: ProgramSection[]) => {
      const t = { provided: 0, partial: 0, missing: 0, unassessed: [] as string[] };
      const walk = (list: ProgramSection[]) => {
        for (const s of list) {
          for (const item of s.evidenceItems) {
            const status = coveredByKey.get(normalize(item.id));
            if (status === 'provided') t.provided++;
            else if (status === 'partial') t.partial++;
            else if (status === 'missing') t.missing++;
            else t.unassessed.push(item.id);
          }
          if (s.children) walk(s.children);
        }
      };
      walk(roots);
      return t;
    };

    const overall = tallyOf(sections);
    const total =
      overall.provided +
      overall.partial +
      overall.missing +
      overall.unassessed.length;
    const assessed = total - overall.unassessed.length;
    const readiness =
      overall.missing === 0 && overall.partial === 0
        ? 'STRONG'
        : overall.provided >= overall.missing
          ? 'PARTIAL'
          : 'INSUFFICIENT';

    const lines = [
      stopped ? `## Coverage so far (run stopped)` : `## Whole-guide coverage`,
      ``,
      `**Readiness: ${readiness}** — ${overall.provided} provided · ${overall.partial} partial · ${overall.missing} missing of ${total} evidence items, across ${sections.length} section${sections.length === 1 ? '' : 's'} and ${countControls(sections)} control points.`,
      ``,
      `| Section | ✅ | ⚠️ | ❌ | Not assessed |`,
      `| --- | ---: | ---: | ---: | ---: |`,
    ];

    for (const section of sections) {
      const t = tallyOf([section]);
      const title =
        section.title.length > 38
          ? section.title.slice(0, 37) + '…'
          : section.title;
      lines.push(
        `| ${section.id} ${title} | ${t.provided} | ${t.partial} | ${t.missing} | ${t.unassessed.length} |`
      );
    }

    lines.push(
      `| **Total** | **${overall.provided}** | **${overall.partial}** | **${overall.missing}** | **${overall.unassessed.length}** |`
    );

    if (overall.unassessed.length > 0) {
      lines.push(
        ``,
        `${assessed} of ${total} items came back with a verdict. The rest were not returned by the model — re-run those sections on their own, or ask about them directly: ${overall.unassessed.slice(0, 25).join(', ')}${overall.unassessed.length > 25 ? ', …' : ''}`
      );
    }

    return {
      id: `msg-${Date.now()}-coverage`,
      role: 'assistant',
      content: lines.join('\n'),
      timestamp: new Date().toISOString(),
    };
  };

  const handleAnalyse = async () => {
    if (!selectedSection || documents.length === 0 || isStreaming || !guide)
      return;

    setStopping(false);
    startRun();
    try {
      if (selectedSection === ALL_SECTIONS_ID) {
        await analyseWholeGuide();
      } else {
        const sectionLabel =
          sectionOptions.find((s) => s.id === selectedSection)?.label ||
          selectedSection;
        await analyseSection(selectedSection, sectionLabel, messages);
      }
    } finally {
      setProgress(null);
      setStopping(false);
      endRun();
    }
  };

  const handleStop = () => {
    setStopping(true);
    stopRun();
  };

  return (
    <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
        <BeeLogo size={36} />
        <div>
          <h1 className="text-base font-bold text-gray-900">Audit Bee</h1>
          <p className="text-[10px] text-gray-400">
            AI-Powered Audit Assistant
          </p>
        </div>
        {guide && (
          <button
            onClick={resetAudit}
            className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
            title="Reset audit"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Step 1: Program Guide Upload */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Step 1 — Program Guide
          </label>

          {guide ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-800 truncate">
                    {guideFileName}
                  </p>
                  <p className="text-[10px] text-green-600 mt-0.5">
                    {guide.sections.length} top-level &bull; {totalControls}{' '}
                    control points &bull; {totalEvidence} evidence items
                  </p>
                </div>
                <button
                  onClick={resetAudit}
                  className="text-green-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Section summary chips */}
              <div className="mt-2 flex flex-wrap gap-1">
                {guide.sections.map((s) => (
                  <span
                    key={s.id}
                    className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-medium"
                    title={`${s.id} ${s.title}`}
                  >
                    {s.id} {s.title.length > 18 ? s.title.substring(0, 18) + '…' : s.title}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div
              {...guideDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                guideDropzone.isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-primary/30 bg-lavender-50 hover:border-primary/60'
              }`}
            >
              <input {...guideDropzone.getInputProps()} />
              {guideLoading ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  {/* Animated progress */}
                  <div className="relative w-12 h-12">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <FileText className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="w-full space-y-2">
                    <p className="text-xs text-gray-600 font-medium">
                      {parseStep || 'Processing...'}
                    </p>
                    {/* Progress bar animation */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-progress" />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      This may take a moment for large documents
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-primary/60" />
                  <p className="text-xs text-gray-600 font-medium">
                    Upload Program Guide
                  </p>
                  <p className="text-[10px] text-gray-400">PDF or DOCX</p>
                </div>
              )}
            </div>
          )}

          {guideError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {guideError}
            </p>
          )}
        </div>

        {/* Step 2: Section selector (only shown after guide is loaded) */}
        {guide && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Step 2 — Assessment Section
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-lavender-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-8"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                title={sectionOptions.find((s) => s.id === selectedSection)?.label || ''}
              >
                <option value="">Select a section...</option>
                <option value={ALL_SECTIONS_ID}>
                  All sections — every control point ({totalControls} controls,{' '}
                  {totalEvidence} items)
                </option>
                {sectionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} title={opt.label}>
                    {'\u00A0\u00A0'.repeat(opt.depth)}
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {selectedSection && (
              <p className="text-[10px] text-gray-400 px-1">
                {selectedSection === ALL_SECTIONS_ID
                  ? `${totalEvidence} evidence items across the whole guide — analysed one section at a time`
                  : `${countSectionEvidence(selectedSection)} evidence items in this section`}
              </p>
            )}
          </div>
        )}

        {/* Step 3: Document Upload (only shown after section selected) */}
        {guide && selectedSection && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Step 3 — Evidence Documents
            </label>
            <DocumentUploader />
          </div>
        )}

        {/* Analyse Button */}
        {guide && selectedSection && documents.length > 0 && (
          <div className="space-y-2">
            {isStreaming ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-semibold py-3 rounded-xl text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress
                    ? `Analysing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}...`
                    : 'Analysing...'}
                </div>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold px-4 rounded-xl transition-colors text-sm shrink-0"
                  title="Stop the analysis and keep what has been assessed so far"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  {stopping ? 'Stopping' : 'Stop'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleAnalyse}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-primary/25"
              >
                <span className="flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  {selectedSection === ALL_SECTIONS_ID
                    ? 'Analyse All Control Points'
                    : 'Analyse My Documents'}
                </span>
              </button>
            )}

            {progress && (
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${(progress.done / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  {progress.label}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
