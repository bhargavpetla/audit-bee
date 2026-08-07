'use client';

import { useState } from 'react';
import { ProgramSection, EvidenceItem } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type StatusFilter = 'all' | EvidenceItem['status'];

interface Props {
  sections: ProgramSection[];
  /** Make top-level blocks foldable — keeps a whole-guide checklist navigable */
  collapsible?: boolean;
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

const STATUS_STYLES: Record<EvidenceItem['status'], string> = {
  provided: 'bg-green-100 text-green-700',
  missing: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  'not-checked': 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<EvidenceItem['status'], string> = {
  provided: 'Provided',
  missing: 'Missing',
  partial: 'Partial',
  'not-checked': 'Not Checked',
};

function StatusBadge({ status }: { status: EvidenceItem['status'] }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// Collect all evidence items recursively
function collectAllEvidence(sections: ProgramSection[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const walk = (list: ProgramSection[]) => {
    for (const section of list) {
      items.push(...section.evidenceItems);
      if (section.children) walk(section.children);
    }
  };
  walk(sections);
  return items;
}

function countControlPoints(sections: ProgramSection[]): number {
  let count = 0;
  const walk = (list: ProgramSection[]) => {
    for (const section of list) {
      count++;
      if (section.children) walk(section.children);
    }
  };
  walk(sections);
  return count;
}

/** Does this subtree still contain anything once the filter is applied? */
function hasVisibleItems(section: ProgramSection, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (section.evidenceItems.some((i) => i.status === filter)) return true;
  return (section.children || []).some((c) => hasVisibleItems(c, filter));
}

function SummaryBar({
  sections,
  filter,
  onFilterChange,
}: {
  sections: ProgramSection[];
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
}) {
  const all = collectAllEvidence(sections);
  if (all.length === 0) return null;

  const counts = {
    provided: all.filter((i) => i.status === 'provided').length,
    partial: all.filter((i) => i.status === 'partial').length,
    missing: all.filter((i) => i.status === 'missing').length,
    'not-checked': all.filter((i) => i.status === 'not-checked').length,
  };
  const total = all.length;

  const filters: { key: StatusFilter; label: string; count: number; tone: string }[] = [
    { key: 'all', label: 'All', count: total, tone: 'text-gray-600' },
    { key: 'provided', label: 'Provided', count: counts.provided, tone: 'text-green-600' },
    { key: 'partial', label: 'Partial', count: counts.partial, tone: 'text-amber-600' },
    { key: 'missing', label: 'Missing', count: counts.missing, tone: 'text-red-600' },
    { key: 'not-checked', label: 'Not checked', count: counts['not-checked'], tone: 'text-gray-400' },
  ];

  return (
    <div className="mb-3 bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-600">
          Evidence Progress
        </span>
        <span className="text-[10px] text-gray-400">
          {countControlPoints(sections)} controls &bull; {total} items
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full flex">
          {counts.provided > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(counts.provided / total) * 100}%` }}
            />
          )}
          {counts.partial > 0 && (
            <div
              className="bg-amber-400 transition-all"
              style={{ width: `${(counts.partial / total) * 100}%` }}
            />
          )}
          {counts.missing > 0 && (
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${(counts.missing / total) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Filters double as the legend */}
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            disabled={f.count === 0 && f.key !== 'all'}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              filter === f.key
                ? 'border-primary bg-primary/10 text-primary'
                : `border-transparent bg-lavender-50 hover:bg-lavender-200 ${f.tone}`
            }`}
          >
            {f.label} {f.count}
          </button>
        ))}
      </div>
    </div>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <div className="flex items-start gap-2 bg-lavender-50 rounded-lg px-3 py-2 border border-gray-100">
      <StatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-mono text-gray-400">{item.id}</span>
          {item.isRenewal && (
            <span
              className="text-[9px] font-bold text-primary bg-primary/10 w-4 h-4 rounded flex items-center justify-center"
              title="Required for Renewal"
            >
              R
            </span>
          )}
          <StatusBadge status={item.status} />
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">{item.text}</p>
        {item.aiNotes && (
          <p className="text-[10px] text-gray-400 mt-1 italic">{item.aiNotes}</p>
        )}
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  depth = 0,
  filter,
}: {
  section: ProgramSection;
  depth?: number;
  filter: StatusFilter;
}) {
  const items =
    filter === 'all'
      ? section.evidenceItems
      : section.evidenceItems.filter((i) => i.status === filter);
  const children = (section.children || []).filter((c) =>
    hasVisibleItems(c, filter)
  );

  return (
    <div className={depth > 0 ? 'ml-2' : ''}>
      <div className="flex items-center gap-2 mb-2 mt-3">
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
          {section.id}
        </span>
        <h4 className="text-xs font-semibold text-gray-700 leading-tight">
          {section.title}
        </h4>
      </div>

      {section.description && (
        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
          {section.description.slice(0, 150)}
          {section.description.length > 150 ? '...' : ''}
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {items.map((item) => (
            <EvidenceRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {children.map((child) => (
        <SectionBlock
          key={child.id}
          section={child}
          depth={depth + 1}
          filter={filter}
        />
      ))}
    </div>
  );
}

/** A top-level block that can be folded away, used when the whole guide is shown */
function CollapsibleSection({
  section,
  filter,
}: {
  section: ProgramSection;
  filter: StatusFilter;
}) {
  const [open, setOpen] = useState(true);
  const items = collectAllEvidence([section]);
  const done = items.filter((i) => i.status !== 'not-checked').length;

  return (
    <div className="border-b border-gray-100 last:border-b-0 pb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 py-2 text-left group"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
          {section.id}
        </span>
        <span className="text-xs font-semibold text-gray-700 leading-tight flex-1 min-w-0 truncate group-hover:text-primary transition-colors">
          {section.title}
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">
          {done}/{items.length}
        </span>
      </button>

      {open && (
        <div className="pl-1">
          {section.evidenceItems.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {(filter === 'all'
                ? section.evidenceItems
                : section.evidenceItems.filter((i) => i.status === filter)
              ).map((item) => (
                <EvidenceRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {(section.children || [])
            .filter((c) => hasVisibleItems(c, filter))
            .map((child) => (
              <SectionBlock
                key={child.id}
                section={child}
                depth={1}
                filter={filter}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceChecklist({ sections, collapsible }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const visible = sections.filter((s) => hasVisibleItems(s, filter));

  return (
    <div>
      <SummaryBar
        sections={sections}
        filter={filter}
        onFilterChange={setFilter}
      />

      {visible.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          No evidence items with this status.
        </p>
      ) : collapsible ? (
        visible.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            filter={filter}
          />
        ))
      ) : (
        visible.map((section) => (
          <SectionBlock key={section.id} section={section} filter={filter} />
        ))
      )}
    </div>
  );
}
