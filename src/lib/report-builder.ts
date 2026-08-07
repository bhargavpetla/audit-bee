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
} from 'docx';
import { ProgramSection, EvidenceItem, ReportMeta } from './types';

interface ActionItem {
  requirement: string;
  description: string;
}

/**
 * Every evidence item still open becomes an action item. Items accepted on the
 * auditor's attestation are "provided" and so fall out here, which is the
 * intended behaviour — an observation the auditor made is not a gap.
 */
function collectActionItems(sections: ProgramSection[]): ActionItem[] {
  const items: ActionItem[] = [];

  const walk = (list: ProgramSection[]) => {
    for (const section of list) {
      for (const item of section.evidenceItems) {
        if (item.status !== 'missing' && item.status !== 'partial') continue;
        items.push({
          requirement: `${section.id} ${section.title}`.trim() + `\n${item.id}`,
          description: describe(item),
        });
      }
      if (section.children) walk(section.children);
    }
  };

  walk(sections);
  return items;
}

function describe(item: EvidenceItem): string {
  const verdict = item.status === 'partial' ? 'Partially met' : 'Not met';
  const renewal = item.isRenewal ? ' (required for renewal)' : '';
  const finding = item.aiNotes ? `\nFinding: ${item.aiNotes}` : '';
  return `${item.text}\n${verdict}${renewal}.${finding}`;
}

function bold(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 200, after: 120 },
  });
}

function plain(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 120 },
  });
}

function bullet(children: TextRun[]): Paragraph {
  return new Paragraph({ children, bullet: { level: 0 }, spacing: { after: 60 } });
}

/** Multi-line cell text — docx has no \n, each line is its own paragraph */
function cell(text: string, opts: { bold?: boolean; columnSpan?: number } = {}) {
  return new TableCell({
    columnSpan: opts.columnSpan,
    children: text.split('\n').map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, bold: opts.bold })],
        })
    ),
  });
}

export async function buildGapReport(
  sections: ProgramSection[],
  meta: ReportMeta
): Promise<Buffer> {
  const actionItems = collectActionItems(sections);

  const tableRows: TableRow[] = [
    new TableRow({
      children: [cell('Action Items', { bold: true, columnSpan: 2 })],
    }),
    new TableRow({
      children: [cell('Requirement'), cell('Description')],
    }),
  ];

  if (actionItems.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          cell('None'),
          cell('No open action items were identified during the audit.'),
        ],
      })
    );
  } else {
    for (const item of actionItems) {
      tableRows.push(
        new TableRow({
          children: [cell(item.requirement), cell(item.description)],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        children: [
          // Title block
          new Paragraph({
            children: [
              new TextRun({ text: meta.programName, bold: true, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Full Audit', bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Gap Report', bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // Header fields
          plain(`Partner: ${meta.partner}`),
          plain(`Audit Date: ${meta.auditDate}`),
          plain(`Audit Process and Criteria: Version ${meta.criteriaVersion}`),
          plain(`Prepared by: ${meta.preparedBy}`),
          plain(`Report Submission Date: ${meta.submissionDate}`),

          // Introduction
          bold('Introduction'),
          plain(
            `The audit was conducted to the requirements of the ${meta.programName} Audit Process and Checklist version ${meta.criteriaVersion}.`
          ),
          new Paragraph({
            children: [
              new TextRun('The working language of the audit was: '),
              new TextRun({ text: meta.language, bold: true }),
            ],
            spacing: { after: 120 },
          }),

          // Objectives and methodology
          bold('Audit Objectives and Methodology'),
          plain('The objectives of this audit were:'),
          bullet([
            new TextRun(
              `To assess the Partner’s capabilities in relation to the requirements of the ${meta.programName} Program.`
            ),
          ]),
          bullet([
            new TextRun(
              'To share and encourage best practices and identify opportunities for Partner’s improvement.'
            ),
          ]),
          bullet([
            new TextRun(
              'To collect and provide information on Partner’s capabilities, practices, and plans.'
            ),
          ]),
          plain(
            `The audit assessed the Partner’s operational capabilities against program requirements for a ${meta.programName}. This was assessed through discussion with Partner personnel and by reviewing selected processes and procedures, including demonstrations of tools and technologies used by the Partner to meet ${meta.programName} requirements. Throughout the audit, considerable effort was made to make the event valuable for the Partner by identifying opportunities for improvement and highlighting Partner’s strengths and best practices.`
          ),
          plain('The audit concluded with a review of the audit findings.'),
          new Paragraph({
            children: [
              new TextRun(
                'The following open action items were identified during the remote audit. You have up to '
              ),
              new TextRun({ text: '48 business hours', italics: true }),
              new TextRun(
                ' to acknowledge receipt and to schedule a Gap Review Meeting. '
              ),
              new TextRun({
                text: 'The Gap Review Meeting must take place within thirty (30) calendar days of the Gap Report issue date',
                bold: true,
              }),
              new TextRun('.'),
            ],
            spacing: { after: 120 },
          }),

          // Open action items
          bold('Open Action items'),
          plain('The following Action Items were identified during the audit:'),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Closure instructions
          bold('Instructions for Closure of Action Items'),
          bullet([
            new TextRun(
              'Partner must acknowledge receipt of Gap Report and schedule a Gap Review Meeting with the auditor '
            ),
            new TextRun({
              text: 'within 48 hours business hours',
              italics: true,
            }),
            new TextRun('.'),
          ]),
          bullet([
            new TextRun({
              text: 'The Gap Review Meeting must take place within thirty (30) calendar days (inclusive of weekends and holidays) of the Gap Report being issued',
              bold: true,
            }),
            new TextRun('.'),
          ]),
          bullet([
            new TextRun('The Gap Review Meeting is done remotely and '),
            new TextRun({
              text: 'may not exceed 3 hours in duration',
              bold: true,
            }),
            new TextRun('.'),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
