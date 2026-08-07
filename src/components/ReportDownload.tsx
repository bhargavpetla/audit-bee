'use client';

import { useState } from 'react';
import { useAudit } from '@/context/AuditContext';
import { ProgramSection, ReportMeta } from '@/lib/types';
import { Download, Loader2, X } from 'lucide-react';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "…Checklist v4.2" / "…version 2.2" → "4.2" */
function guessVersion(title: string): string {
  const match = title.match(/v(?:ersion)?\s*\.?\s*(\d+(?:\.\d+)*)/i);
  return match ? match[1] : '1.0';
}

function countOpenItems(sections: ProgramSection[]): number {
  let n = 0;
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      n += s.evidenceItems.filter(
        (i) => i.status === 'missing' || i.status === 'partial'
      ).length;
      if (s.children) walk(s.children);
    }
  };
  walk(sections);
  return n;
}

function countAssessed(sections: ProgramSection[]): number {
  let n = 0;
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      n += s.evidenceItems.filter((i) => i.status !== 'not-checked').length;
      if (s.children) walk(s.children);
    }
  };
  walk(sections);
  return n;
}

export default function ReportDownload() {
  const { guide, guideFileName } = useAudit();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [meta, setMeta] = useState<ReportMeta>({
    programName: '',
    partner: '',
    auditDate: today(),
    criteriaVersion: '',
    preparedBy: '',
    submissionDate: today(),
    language: 'English',
  });

  if (!guide) return null;

  const assessed = countAssessed(guide.sections);
  const openItems = countOpenItems(guide.sections);

  const openDialog = () => {
    setError('');
    setMeta((m) => ({
      ...m,
      programName: m.programName || guide.title,
      criteriaVersion:
        m.criteriaVersion || guessVersion(`${guide.title} ${guideFileName}`),
    }));
    setOpen(true);
  };

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: guide.sections, meta }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.partner || 'Partner'} - Full Audit Gap Report.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build report');
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof ReportMeta,
    placeholder = '',
    type = 'text'
  ) => (
    <label className="block">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <input
        type={type}
        value={meta[key]}
        placeholder={placeholder}
        onChange={(e) => setMeta({ ...meta, [key]: e.target.value })}
        className="mt-1 w-full bg-lavender-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </label>
  );

  return (
    <>
      <button
        onClick={openDialog}
        disabled={assessed === 0}
        title={
          assessed === 0
            ? 'Run an analysis first — the report is built from the checklist'
            : `Download the gap report (${openItems} open action items)`
        }
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-lavender-50 text-gray-600 hover:bg-lavender-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Gap Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Full Audit Gap Report
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {openItems} open action item{openItems === 1 ? '' : 's'} from{' '}
                  {assessed} assessed evidence items
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {field('Program name', 'programName')}
              {field('Partner', 'partner', 'Partner name')}
              {field('Prepared by', 'preparedBy', 'Auditor name')}
              {field('Audit date', 'auditDate', '', 'date')}
              {field('Report submission date', 'submissionDate', '', 'date')}
              {field('Criteria version', 'criteriaVersion', 'e.g. 4.2')}
              {field('Working language', 'language')}
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">
                {error}
              </p>
            )}

            <button
              onClick={download}
              disabled={busy}
              className="mt-4 w-full bg-primary hover:bg-primary-hover disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download .docx
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
