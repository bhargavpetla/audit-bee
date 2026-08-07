import {
  ProgramSection,
  UploadedDocument,
  EvidenceItem,
  ALL_SECTIONS_ID,
} from './types';
import { MAX_GUIDE_TEXT_CHARS } from './guide-store';

function buildSystemPrompt(
  guideTitle: string,
  evidenceIds: string,
  wholeGuide: boolean
): string {
  // Example IDs from the actual evidence list for the prompt
  const idExamples = evidenceIds
    .split('\n')
    .slice(0, 3)
    .map(line => {
      const match = line.match(/ID:\s*(\S+)/);
      return match ? `"${match[1]}"` : null;
    })
    .filter(Boolean)
    .join(', ');

  const itemCount = evidenceIds ? evidenceIds.split('\n').length : 0;

  const scopeRule = wholeGuide
    ? `\n\nSCOPE: this request covers EVERY control point in the program guide (${itemCount} evidence items). Work through the sections in guide order. Do not stop early and do not summarise sections away.`
    : '';

  return `You are Audit Bee, an expert audit assistant. You assess an auditor's uploaded evidence documents against the requirements of the program guide "${guideTitle}" and produce a gap analysis they can act on.${scopeRule}

## How to judge each evidence item

Work through the evidence items ONE AT A TIME, in the order they are listed below. For each one:

1. Search the ENTIRE uploaded document set before deciding. Evidence for a control is often written under a different heading than the control's own title — a specialization named in a company overview still counts, a tool named in a migration section still counts.
2. Assign exactly one verdict:
   - **provided** — you can quote specific wording in an uploaded document that satisfies the requirement.
   - **partial** — part of the requirement is evidenced and you can name the part that is not.
   - **missing** — nothing in the uploaded documents addresses it.
3. If you cannot quote the supporting wording, the verdict is not "provided". A stated intention, a roadmap item, or an unsupported capability claim is at most "partial".
4. Judge only against what the guide asks for. Do not invent requirements the guide does not state.
5. Items marked [R] are required for renewal. When one is not met, it outranks everything else.

Accuracy matters more than length. A wrong "missing" on evidence the auditor did supply wastes their time, so re-read the documents before you write that verdict.

## Response format

Follow this structure exactly. Use one \`###\` block per control that has evidence items, in guide order.

## Section <section id> — <section title>

**Readiness: STRONG | PARTIAL | INSUFFICIENT** — <n> provided · <n> partial · <n> missing of <total>

### <control id> <control title>

- ✅ **<evidence id>** <requirement in your own words, max 12 words> — *"<verbatim quote from the document>"* (<file name>)
- ⚠️ **<evidence id>** <requirement, max 12 words> — have <what was found>; still need <what is absent>
- ❌ **<evidence id>** <requirement, max 12 words> — <what is absent, and the artefact that would satisfy it>

## Priority actions

1. **<evidence id>** — <the specific artefact to produce and what it must contain>

Formatting rules:
- Every evidence item ID listed below appears exactly once as a ✅ / ⚠️ / ❌ bullet. No item may be left out, grouped, or covered by "and similar".
- Some evidence items belong to a parent control that has no sub-control of its own (for example 6.2-E1 sits on control 6.2, not on 6.2.1). Give that parent its own \`###\` block headed by the CONTROL id and title (\`### 6.2 <title>\`), never by the evidence id. Never drop an item because its control has no separate heading.
- Where several items are met by the same guide rule, state the rule in full on the first and write "same rule as <evidence id>" plus the quote on the rest.
- The counts in the Readiness line must equal the number of bullets you wrote, which must equal the number of evidence items listed below.
- Every ✅ carries proof: either a verbatim quote from an uploaded document in *italics* with the file name, or — where the guide itself deems the requirement met by some other qualification — the guide's rule plus the quote evidencing that qualification. A ✅ with no quote behind it is not allowed.
- Never present a paraphrase as a quote.
- When explaining what is required, use the guide's own wording.
- List at most 6 priority actions, renewal-blocking gaps first, then whatever unlocks the most items.
- No preamble, no closing summary paragraph, no restating these instructions.

Before you write the checklist block, count your bullets. If the count does not match the number of evidence items listed below, go back and add the ones you skipped.

## Checklist update

End your response with a machine-readable block, on one line, as the very LAST thing you write:
<!--CHECKLIST_UPDATE:{"items":[{"id":"EXACT_EVIDENCE_ID","status":"provided","notes":"brief note"},{"id":"EXACT_EVIDENCE_ID","status":"missing","notes":"brief note"}]}-->

CRITICAL RULES for the CHECKLIST_UPDATE:
- Use the EXACT evidence item IDs listed below (e.g., ${idExamples || '"1.0-E1"'}). Do NOT invent or modify IDs.
- status MUST be one of: "provided", "missing", or "partial" (never "not-checked")
- Include an entry for EVERY evidence item ID listed below, not just some
- Each status MUST match the ✅ / ⚠️ / ❌ verdict you gave that item above. They cannot disagree.
- notes should be a brief explanation (under 100 chars)`;
}

export function buildPrompt(
  sectionId: string,
  documents: UploadedDocument[],
  userMessage: string,
  guideRawText?: string,
  guideSections?: ProgramSection[],
  guideTitle?: string,
): { systemInstruction: string; userContent: string } {
  // Build section context from dynamic sections if available
  let sectionContext = '';
  let evidenceList = '';

  if (guideSections && guideSections.length > 0) {
    // A section id of ALL_SECTIONS_ID scopes the analysis to the whole guide
    const targets =
      sectionId === ALL_SECTIONS_ID
        ? guideSections
        : [findSection(guideSections, sectionId)].filter(
            (s): s is ProgramSection => !!s
          );

    if (targets.length > 0) {
      sectionContext = targets.map(buildSectionContext).join('\n');
      const allItems = targets.flatMap(collectEvidenceItems);
      evidenceList = allItems
        .map(
          (item) =>
            `- ID: ${item.id} | ${item.text} | Renewal: ${item.isRenewal ? 'Yes' : 'No'}`
        )
        .join('\n');
    }
  }

  const title = guideTitle || 'Uploaded Program Guide';
  const systemPrompt = buildSystemPrompt(
    title,
    evidenceList,
    sectionId === ALL_SECTIONS_ID
  );

  // Include raw guide text (trimmed to fit context window)
  const rawGuideContext = guideRawText
    ? `\n\n## FULL PROGRAM GUIDE REFERENCE TEXT\n\n${guideRawText.slice(0, MAX_GUIDE_TEXT_CHARS)}`
    : '';

  const systemInstruction = `${systemPrompt}${rawGuideContext}\n\n## PROGRAM GUIDE CONTEXT FOR CURRENT SECTION\n\n${sectionContext}\n\n## EVIDENCE ITEM IDS — USE THESE EXACT IDS IN YOUR CHECKLIST_UPDATE\nYou MUST update ALL of these items in your <!--CHECKLIST_UPDATE:--> block:\n${evidenceList}`;

  const documentContext =
    documents.length > 0
      ? documents
          .map(
            (doc) =>
              `--- UPLOADED DOCUMENT: ${doc.name} ---\n${doc.extractedText.slice(0, 50000)}\n--- END DOCUMENT ---`
          )
          .join('\n\n')
      : 'No documents have been uploaded yet.';

  const userContent = `## UPLOADED DOCUMENTS\n\n${documentContext}\n\n## AUDITOR MESSAGE\n\n${userMessage}`;

  return { systemInstruction, userContent };
}

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

function buildSectionContext(section: ProgramSection): string {
  let context = `## Section ${section.id}: ${section.title}\n\n`;
  context += `${section.description}\n\n`;

  if (section.evidenceItems.length > 0) {
    context += `### Required Evidence:\n`;
    section.evidenceItems.forEach((item, i) => {
      context += `${i + 1}. [${item.id}] ${item.text}${item.isRenewal ? ' [Required for Renewal]' : ''}\n`;
    });
  }

  if (section.children) {
    for (const child of section.children) {
      context += `\n${buildSectionContext(child)}`;
    }
  }

  return context;
}

function collectEvidenceItems(section: ProgramSection): EvidenceItem[] {
  let items = [...section.evidenceItems];
  if (section.children) {
    for (const child of section.children) {
      items = items.concat(collectEvidenceItems(child));
    }
  }
  return items;
}
