'use client';

import { ProgramSection, EvidenceItem } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
} from 'lucide-react';

interface Props {
  section: ProgramSection;
}

function StatusIcon({ status }: { status: EvidenceItem['status'] }) {
  switch (status) {
    case 'provided':
      return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
    case 'missing':
      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    case 'partial':
      return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
    default:
      return <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
  }
}

function StatusBadge({ status }: { status: EvidenceItem['status'] }) {
  const styles = {
    provided: 'bg-green-100 text-green-700',
    missing: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    'not-checked': 'bg-gray-100 text-gray-500',
  };

  const labels = {
    provided: 'Provided',
    missing: 'Missing',
    partial: 'Partial',
    'not-checked': 'Not Checked',
  };

  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// Collect all evidence items recursively
function collectAllEvidence(section: ProgramSection): EvidenceItem[] {
  let items = [...section.evidenceItems];
  if (section.children) {
    for (const child of section.children) {
      items = items.concat(collectAllEvidence(child));
    }
  }
  return items;
}

function SummaryBar({ section }: { section: ProgramSection }) {
  const all = collectAllEvidence(section);
  if (all.length === 0) return null;

  const provided = all.filter(i => i.status === 'provided').length;
  const partial = all.filter(i => i.status === 'partial').length;
  const missing = all.filter(i => i.status === 'missing').length;
  const notChecked = all.filter(i => i.status === 'not-checked').length;
  const total = all.length;

  const pctProvided = (provided / total) * 100;
  const pctPartial = (partial / total) * 100;
  const pctMissing = (missing / total) * 100;

  return (
    <div className="mb-3 bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-600">
          Evidence Progress
        </span>
        <span className="text-[10px] text-gray-400">
          {total} items
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full flex">
          {pctProvided > 0 && (
            <div className="bg-green-500 transition-all" style={{ width: `${pctProvided}%` }} />
          )}
          {pctPartial > 0 && (
            <div className="bg-amber-400 transition-all" style={{ width: `${pctPartial}%` }} />
          )}
          {pctMissing > 0 && (
            <div className="bg-red-400 transition-all" style={{ width: `${pctMissing}%` }} />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {provided > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-600">
            <CheckCircle2 className="w-3 h-3" /> {provided} Provided
          </span>
        )}
        {partial > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertCircle className="w-3 h-3" /> {partial} Partial
          </span>
        )}
        {missing > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-600">
            <XCircle className="w-3 h-3" /> {missing} Missing
          </span>
        )}
        {notChecked > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Circle className="w-3 h-3" /> {notChecked} Not Checked
          </span>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ section, depth = 0 }: { section: ProgramSection; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-2' : ''}>
      <div className="flex items-center gap-2 mb-2 mt-3">
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
          {section.id}
        </span>
        <h4 className="text-xs font-semibold text-gray-700 leading-tight">{section.title}</h4>
      </div>

      {section.description && (
        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
          {section.description.slice(0, 150)}
          {section.description.length > 150 ? '...' : ''}
        </p>
      )}

      {section.evidenceItems.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {section.evidenceItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 bg-lavender-50 rounded-lg px-3 py-2 border border-gray-100"
            >
              <StatusIcon status={item.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-mono text-gray-400">{item.id}</span>
                  {item.isRenewal && (
                    <span className="text-[9px] font-bold text-primary bg-primary/10 w-4 h-4 rounded flex items-center justify-center" title="Required for Renewal">
                      R
                    </span>
                  )}
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {item.text}
                </p>
                {item.aiNotes && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    {item.aiNotes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {section.children?.map((child) => (
        <SectionBlock key={child.id} section={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function EvidenceChecklist({ section }: Props) {
  return (
    <div>
      <SummaryBar section={section} />
      <SectionBlock section={section} />
    </div>
  );
}
