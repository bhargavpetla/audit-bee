import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  PageBreak,
  VerticalAlign,
  BorderStyle,
} from 'docx';
import { ProgramSection, EvidenceItem, ReportMeta } from './types';

/**
 * Palette lifted from the Full Audit Final Report template so a generated
 * report sits alongside a hand-written one without looking foreign.
 */
const COLOUR = {
  sectionHeading: 'B4C6E7', // major headings and scorecard header rows
  tableHeading: '8EAADB', // action item + checklist table headers
  noteBox: 'D9E2F3', // scoring methodology callout
  requirements: 'D9D9D9', // grey "# of Requirements" cells
  score: 'C5E0B3', // green "Partner Score" cells
  total: 'A6A6A6', // total row
  target: '7CBF33', // target / minimum row
};

const CHECKED = '☒'; // ☒
const UNCHECKED = '☐'; // ☐

interface ControlRow {
  section: ProgramSection;
  path: string;
}

interface Tally {
  controls: number;
  evidence: number;
  renewal: number;
  met: number;
  partial: number;
  notMet: number;
  notChecked: number;
}

function emptyTally(): Tally {
  return {
    controls: 0,
    evidence: 0,
    renewal: 0,
    met: 0,
    partial: 0,
    notMet: 0,
    notChecked: 0,
  };
}

function tally(roots: ProgramSection[]): Tally {
  const t = emptyTally();
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      t.controls++;
      for (const item of s.evidenceItems) {
        t.evidence++;
        if (item.isRenewal) t.renewal++;
        if (item.status === 'provided') t.met++;
        else if (item.status === 'partial') t.partial++;
        else if (item.status === 'missing') t.notMet++;
        else t.notChecked++;
      }
      if (s.children) walk(s.children);
    }
  };
  walk(roots);
  return t;
}

/** Every control that carries evidence items, in guide order */
function flattenControls(roots: ProgramSection[]): ControlRow[] {
  const rows: ControlRow[] = [];
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      if (s.evidenceItems.length > 0) rows.push({ section: s, path: s.id });
      if (s.children) walk(s.children);
    }
  };
  walk(roots);
  return rows;
}

function scorePercent(t: Tally): string {
  const assessed = t.met + t.partial + t.notMet;
  if (assessed === 0) return '—';
  return `${Math.round(((t.met + t.partial * 0.5) / assessed) * 100)}%`;
}

// ---------------------------------------------------------------- primitives

function text(value: string, opts: Partial<{ bold: boolean; size: number; color: string; font: string }> = {}) {
  return new TextRun({ text: value, ...opts });
}

function para(
  value: string,
  opts: Partial<{ bold: boolean; size: number; after: number; before: number; align: (typeof AlignmentType)[keyof typeof AlignmentType] }> = {}
): Paragraph {
  return new Paragraph({
    children: [text(value, { bold: opts.bold, size: opts.size })],
    alignment: opts.align,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
  });
}

/** Full-width shaded band used for every major heading in the template */
function heading(value: string): Paragraph {
  return new Paragraph({
    children: [text(value, { bold: true, size: 26 })],
    shading: { type: ShadingType.CLEAR, fill: COLOUR.sectionHeading },
    spacing: { before: 320, after: 160 },
  });
}

function bullet(value: string): Paragraph {
  return new Paragraph({
    children: [text(value)],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function numbered(index: number, value: string): Paragraph {
  return new Paragraph({
    children: [text(`${index}. `, { bold: true }), text(value)],
    spacing: { after: 80 },
  });
}

function cell(
  value: string | Paragraph[],
  opts: Partial<{
    fill: string;
    bold: boolean;
    columnSpan: number;
    rowSpan: number;
    width: number;
    align: (typeof AlignmentType)[keyof typeof AlignmentType];
  }> = {}
): TableCell {
  const children =
    typeof value === 'string'
      ? value.split('\n').map(
          (line) =>
            new Paragraph({
              children: [text(line, { bold: opts.bold })],
              alignment: opts.align,
            })
        )
      : value;

  return new TableCell({
    children,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    width: opts.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
  });
}

function table(rows: TableRow[]): Table {
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/** "Met ☒ Yes ☐ No" style line, with the glyph font the template uses */
function checkboxLine(label: string, options: { name: string; on: boolean }[]) {
  const runs: TextRun[] = [text(label + '\t', { bold: true })];
  for (const opt of options) {
    runs.push(
      text(opt.on ? CHECKED : UNCHECKED, { font: 'MS Gothic' }),
      text(` ${opt.name}     `)
    );
  }
  return new Paragraph({ children: runs });
}

// ------------------------------------------------------------------ sections

function coverPage(meta: ReportMeta): Paragraph[] {
  const title = (value: string) =>
    new Paragraph({
      children: [text(value, { bold: true, size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    });

  const line = (value: string) =>
    new Paragraph({
      children: [text(value, { size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    });

  return [
    new Paragraph({ text: '', spacing: { after: 1600 } }),
    title(meta.programName),
    title('Full Audit'),
    title('Final Report'),
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({
      children: [text(meta.partner, { bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    line(`Audit Date: ${meta.auditDate}`),
    line(`Gap Review Meeting Date: ${meta.gapReviewDate || 'NA'}`),
    line(`Audit Process and Checklist: Version ${meta.criteriaVersion}`),
    new Paragraph({ text: '', spacing: { after: 600 } }),
    line(`Prepared by: ${meta.preparedBy}`),
    line(`Report Submission Date: ${meta.submissionDate}`),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function introduction(meta: ReportMeta): (Paragraph | Table)[] {
  return [
    heading('Introduction'),
    para(
      `The audit was conducted to the requirements of the ${meta.programName} Audit Checklist version ${meta.criteriaVersion}.`
    ),
    new Paragraph({
      children: [
        text('The working language of the audit was: '),
        text(meta.language, { bold: true }),
      ],
      spacing: { after: 120 },
    }),

    heading('Audit Objectives and Methodology'),
    para('The objectives of this audit were:'),
    bullet(
      `To assess the Partner’s capabilities in relation to the requirements of the ${meta.programName} Program.`
    ),
    bullet(
      'To share and encourage best practices and identify opportunities for Partner’s improvement.'
    ),
    bullet(
      'To collect and provide information on Partner’s capabilities, practices, and plans.'
    ),
    para(
      `The audit assessed the Partner’s operational capabilities against program requirements for a ${meta.programName}. This was assessed through discussion with Partner personnel and by reviewing selected processes and procedures, including demonstrations of tools and technologies used by the Partner to meet ${meta.programName} requirements. Throughout the audit, considerable effort was made to make the event valuable for the Partner by identifying opportunities for improvement and highlighting Partner’s strengths and best practices.`
    ),
    para('The audit concluded with a review of the audit findings.'),
  ];
}

function executiveSummary(
  sections: ProgramSection[],
  meta: ReportMeta
): (Paragraph | Table)[] {
  const t = tally(sections);
  const renewalGaps = countRenewalGaps(sections);
  const attested = countAttested(sections);

  const verdict =
    t.notMet === 0 && t.partial === 0
      ? 'All assessed requirements were met.'
      : t.met >= t.notMet
        ? 'The Partner meets the majority of the program requirements, with a defined set of gaps to close.'
        : 'A significant proportion of the program requirements were not evidenced at the time of the audit.';

  const out: (Paragraph | Table)[] = [
    heading('Executive Summary'),
    para(
      `${meta.partner} was audited against the ${meta.programName} Audit Checklist version ${meta.criteriaVersion} on ${meta.auditDate}. The audit covered ${sections.length} requirement sections, ${t.controls} control points and ${t.evidence} individual evidence requirements.`
    ),
    para(
      `Of the ${t.met + t.partial + t.notMet} requirements assessed, ${t.met} were met, ${t.partial} were partially met and ${t.notMet} were not met. ${verdict}`
    ),
  ];

  if (renewalGaps > 0) {
    out.push(
      para(
        `${renewalGaps} of the requirements not fully met are flagged in the checklist as required for renewal and must be closed before the Partner can be recommended.`
      )
    );
  }

  if (attested > 0) {
    out.push(
      para(
        `${attested} requirement${attested === 1 ? ' was' : 's were'} accepted on the auditor's direct observation during the live review rather than on submitted documentation. These are identified in the checklist as validated by demonstration.`
      )
    );
  }

  if (t.notChecked > 0) {
    out.push(
      para(
        `${t.notChecked} requirement${t.notChecked === 1 ? '' : 's'} in the checklist ${t.notChecked === 1 ? 'was' : 'were'} not assessed during this audit and remain${t.notChecked === 1 ? 's' : ''} open.`
      )
    );
  }

  return out;
}

function countRenewalGaps(sections: ProgramSection[]): number {
  let n = 0;
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      n += s.evidenceItems.filter(
        (i) => i.isRenewal && (i.status === 'missing' || i.status === 'partial')
      ).length;
      if (s.children) walk(s.children);
    }
  };
  walk(sections);
  return n;
}

function countAttested(sections: ProgramSection[]): number {
  let n = 0;
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      n += s.evidenceItems.filter((i) => i.attested).length;
      if (s.children) walk(s.children);
    }
  };
  walk(sections);
  return n;
}

function scorecard(sections: ProgramSection[]): (Paragraph | Table)[] {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('Requirements Section', {
          fill: COLOUR.sectionHeading,
          bold: true,
          rowSpan: 2,
          width: 30,
        }),
        cell('# of Requirements', {
          fill: COLOUR.sectionHeading,
          bold: true,
          columnSpan: 3,
          align: AlignmentType.CENTER,
        }),
        cell('Partner Score', {
          fill: COLOUR.sectionHeading,
          bold: true,
          columnSpan: 4,
          align: AlignmentType.CENTER,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('Controls', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Evidence', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Renewal', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Met', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Partial', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Not Met', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
        cell('Score', { fill: COLOUR.sectionHeading, bold: true, align: AlignmentType.CENTER }),
      ],
    }),
  ];

  for (const section of sections) {
    const t = tally([section]);
    rows.push(
      new TableRow({
        children: [
          cell(`${section.id}  ${section.title}`, { fill: COLOUR.requirements }),
          cell(String(t.controls), { fill: COLOUR.requirements, align: AlignmentType.CENTER }),
          cell(String(t.evidence), { fill: COLOUR.requirements, align: AlignmentType.CENTER }),
          cell(String(t.renewal), { fill: COLOUR.requirements, align: AlignmentType.CENTER }),
          cell(String(t.met), { fill: COLOUR.score, align: AlignmentType.CENTER }),
          cell(String(t.partial), { fill: COLOUR.score, align: AlignmentType.CENTER }),
          cell(String(t.notMet), { fill: COLOUR.score, align: AlignmentType.CENTER }),
          cell(scorePercent(t), { fill: COLOUR.score, align: AlignmentType.CENTER }),
        ],
      })
    );
  }

  const total = tally(sections);
  rows.push(
    new TableRow({
      children: [
        cell('Total', { fill: COLOUR.total, bold: true }),
        cell(String(total.controls), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(String(total.evidence), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(String(total.renewal), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(String(total.met), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(String(total.partial), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(String(total.notMet), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
        cell(scorePercent(total), { fill: COLOUR.total, bold: true, align: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        cell('Required Minimum', { fill: COLOUR.target, bold: true }),
        cell('—', { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell(String(total.evidence), { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell(String(total.renewal), { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell(String(total.evidence), { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell('0', { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell('0', { fill: COLOUR.target, align: AlignmentType.CENTER }),
        cell('100%', { fill: COLOUR.target, align: AlignmentType.CENTER }),
      ],
    })
  );

  return [
    heading('Partner Audit Scorecard'),
    new Paragraph({
      children: [text('Scoring methodology:', { bold: true })],
      shading: { type: ShadingType.CLEAR, fill: COLOUR.noteBox },
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [
        text(
          'The control point, evidence requirement and renewal-flagged counts for each section are listed in the grey columns.'
        ),
      ],
      shading: { type: ShadingType.CLEAR, fill: COLOUR.noteBox },
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [
        text(
          'Partner results are listed in the green columns. Score counts a partially met requirement as one half.'
        ),
      ],
      shading: { type: ShadingType.CLEAR, fill: COLOUR.noteBox },
      spacing: { after: 200 },
    }),
    table(rows),
  ];
}

function strengths(sections: ProgramSection[]): (Paragraph | Table)[] {
  const controls = flattenControls(sections)
    .map((row) => ({
      row,
      items: row.section.evidenceItems,
    }))
    .filter(
      ({ items }) =>
        items.length > 0 && items.every((i) => i.status === 'provided')
    )
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 6);

  const out: (Paragraph | Table)[] = [
    heading('Strengths'),
    para('The following organizational strengths were noted during the audit:'),
  ];

  if (controls.length === 0) {
    out.push(para('No fully met control points were identified in this audit.'));
    return out;
  }

  controls.forEach(({ row, items }, i) => {
    const note = items.find((it) => it.aiNotes)?.aiNotes;
    out.push(
      numbered(
        i + 1,
        `${row.section.id} ${row.section.title} — all ${items.length} evidence requirement${items.length === 1 ? '' : 's'} met.${note ? ` ${note}` : ''}`
      )
    );
  });

  return out;
}

function opportunities(sections: ProgramSection[]): (Paragraph | Table)[] {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('Requirement', { fill: COLOUR.tableHeading, bold: true, width: 30 }),
        cell('Description', { fill: COLOUR.tableHeading, bold: true, width: 70 }),
      ],
    }),
  ];

  const partials: { control: ProgramSection; item: EvidenceItem }[] = [];
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      for (const item of s.evidenceItems) {
        if (item.status === 'partial') partials.push({ control: s, item });
      }
      if (s.children) walk(s.children);
    }
  };
  walk(sections);

  const out: (Paragraph | Table)[] = [
    heading('Opportunities for Improvement'),
    para(
      'The following Opportunities for Improvement were identified during the audit:'
    ),
  ];

  if (partials.length === 0) {
    out.push(para('None.'));
    return out;
  }

  partials.forEach(({ control, item }) => {
    rows.push(
      new TableRow({
        children: [
          cell(`${control.id} ${control.title}\n${item.id}`),
          cell(
            `${item.text}\nPartially met${item.isRenewal ? ' (required for renewal)' : ''}.${item.aiNotes ? `\nFinding: ${item.aiNotes}` : ''}`
          ),
        ],
      })
    );
  });

  out.push(table(rows));
  return out;
}

function actionItems(sections: ProgramSection[]): (Paragraph | Table)[] {
  const gaps: { control: ProgramSection; item: EvidenceItem }[] = [];
  const walk = (list: ProgramSection[]) => {
    for (const s of list) {
      for (const item of s.evidenceItems) {
        if (item.status === 'missing') gaps.push({ control: s, item });
      }
      if (s.children) walk(s.children);
    }
  };
  walk(sections);

  const out: (Paragraph | Table)[] = [
    heading('Action Items'),
    para('The following Action Items were identified during the audit:'),
  ];

  if (gaps.length === 0) {
    out.push(para('None.'));
    return out;
  }

  const groups = [
    {
      name: 'Renewal',
      criteria: 'Must be met — required for renewal',
      entries: gaps.filter((g) => g.item.isRenewal),
    },
    {
      name: 'Standard',
      criteria: 'Must be met to complete the assessment',
      entries: gaps.filter((g) => !g.item.isRenewal),
    },
  ];

  for (const group of groups) {
    if (group.entries.length === 0) continue;

    const rows: TableRow[] = [
      new TableRow({
        children: [
          cell('Category', { fill: COLOUR.tableHeading, bold: true, width: 12 }),
          cell('Passing Score Criteria', {
            fill: COLOUR.tableHeading,
            bold: true,
            width: 20,
          }),
          cell('Action Item', {
            fill: COLOUR.tableHeading,
            bold: true,
            columnSpan: 3,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell(group.name, {
            fill: COLOUR.requirements,
            bold: true,
            rowSpan: group.entries.length + 1,
          }),
          cell(group.criteria, {
            fill: COLOUR.requirements,
            rowSpan: group.entries.length + 1,
          }),
          cell('Requirement', { fill: COLOUR.requirements, bold: true, width: 22 }),
          cell('Description', { fill: COLOUR.requirements, bold: true, width: 36 }),
          cell('Status', { fill: COLOUR.requirements, bold: true, width: 10 }),
        ],
      }),
    ];

    for (const { control, item } of group.entries) {
      rows.push(
        new TableRow({
          children: [
            cell(`${control.id} ${control.title}\n${item.id}`),
            cell(
              `${item.text}${item.aiNotes ? `\nFinding: ${item.aiNotes}` : ''}`
            ),
            cell('Open'),
          ],
        })
      );
    }

    out.push(table(rows), para(''));
  }

  return out;
}

function checklist(
  sections: ProgramSection[],
  meta: ReportMeta
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    heading(`${meta.programName} Full Audit Checklist`),
  ];

  for (const section of sections) {
    const rows: TableRow[] = [
      new TableRow({
        children: [
          cell(`${section.id} ${section.title}`, {
            fill: COLOUR.tableHeading,
            bold: true,
            columnSpan: 3,
          }),
        ],
      }),
    ];

    for (const { section: control } of flattenControls([section])) {
      const items = control.evidenceItems;
      const allMet = items.every((i) => i.status === 'provided');
      const anyAttested = items.some((i) => i.attested);
      const anyAssessed = items.some((i) => i.status !== 'not-checked');
      const renewalCount = items.filter((i) => i.isRenewal).length;

      rows.push(
        new TableRow({
          children: [
            cell(`${control.id}\t${control.title}`, {
              fill: COLOUR.requirements,
              bold: true,
              columnSpan: 3,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell(
              `Evidence: ${items.length}${renewalCount > 0 ? `   Renewal: ${renewalCount}` : ''}`,
              { fill: COLOUR.requirements, bold: true, width: 24 }
            ),
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: COLOUR.requirements },
              width: { size: 26, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                checkboxLine('Met', [
                  { name: 'Yes', on: allMet && anyAssessed },
                  { name: 'No', on: anyAssessed && !allMet },
                ]),
              ],
            }),
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: COLOUR.requirements },
              width: { size: 50, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                checkboxLine('Validated', [
                  { name: 'Process', on: false },
                  { name: 'Evidence', on: anyAssessed && !anyAttested },
                  { name: 'Demonstration', on: anyAttested },
                ]),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            cell(notesFor(items), {
              fill: COLOUR.requirements,
              columnSpan: 3,
            }),
          ],
        })
      );
    }

    out.push(table(rows), para(''));
  }

  return out;
}

const VERDICT: Record<EvidenceItem['status'], string> = {
  provided: 'Met',
  partial: 'Partially met',
  missing: 'Not met',
  'not-checked': 'Not assessed',
};

function notesFor(items: EvidenceItem[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({ children: [text('Additional Notes:', { bold: true })] }),
  ];

  for (const item of items) {
    paragraphs.push(
      new Paragraph({
        children: [
          text(`${item.id}${item.isRenewal ? ' [R]' : ''} — `, { bold: true }),
          text(`${VERDICT[item.status]}. `),
          text(item.text),
        ],
        spacing: { before: 60 },
      })
    );
    if (item.aiNotes) {
      paragraphs.push(
        new Paragraph({
          children: [text(`Finding: ${item.aiNotes}`, { size: 18 })],
          indent: { left: 240 },
        })
      );
    }
    if (item.auditorNote) {
      paragraphs.push(
        new Paragraph({
          children: [
            text('Auditor observation: ', { bold: true, size: 18 }),
            text(item.auditorNote, { size: 18 }),
          ],
          indent: { left: 240 },
        })
      );
    }
  }

  return paragraphs;
}

// ---------------------------------------------------------------------- main

export async function buildFinalReport(
  sections: ProgramSection[],
  meta: ReportMeta
): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [
      {
        children: [
          ...coverPage(meta),
          ...introduction(meta),
          ...executiveSummary(sections, meta),
          ...scorecard(sections),
          ...strengths(sections),
          ...opportunities(sections),
          ...actionItems(sections),
          ...checklist(sections, meta),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
