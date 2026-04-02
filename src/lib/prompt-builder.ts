import { ProgramSection, UploadedDocument, EvidenceItem } from './types';

function buildSystemPrompt(guideTitle: string, evidenceIds: string): string {
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

  return `You are Audit Bee, an expert AI audit assistant. You help auditors complete program assessments by analyzing evidence documents against program guide requirements.

You are working with the program guide: "${guideTitle}"

When an auditor uploads documents and selects an assessment section, you must:
1. Read their uploaded documents and identify what evidence has been provided.
2. Cross-reference against the required evidence for that control point from the program guide.
3. List clearly what evidence is MISSING or INSUFFICIENT.
4. Provide specific best practice guidance on how to improve findings for that section.
5. Be direct, specific, and actionable. Do not be generic.

Always reference the control number (e.g., "Control X.Y.Z requires..."). Always cite what the program guide says.

When performing a gap analysis, structure your response using this format:

## Evidence Gap Analysis — Control [X.X.X]: [Title]

### What You Have Provided
- [list what was found in uploaded docs]

### What is Missing
- [specific missing items from required evidence list]

### Best Practice Recommendations
- [specific suggestions to improve the submission]

### Overall Readiness: [STRONG / PARTIAL / INSUFFICIENT]

After your analysis, you MUST include a machine-readable checklist update at the very end of your response in this EXACT format (no spaces around colons, no line breaks inside the JSON):
<!--CHECKLIST_UPDATE:{"items":[{"id":"EXACT_EVIDENCE_ID","status":"provided","notes":"brief note"},{"id":"EXACT_EVIDENCE_ID","status":"missing","notes":"brief note"}]}-->

CRITICAL RULES for the CHECKLIST_UPDATE:
- You MUST use the EXACT evidence item IDs listed in the EVIDENCE ITEM IDS section below (e.g., ${idExamples || '"1.0-E1"'}). Do NOT invent or modify IDs.
- status MUST be one of: "provided", "missing", or "partial" (never "not-checked")
- You MUST include an entry for EVERY evidence item ID listed in the section, not just some
- The checklist update must be the very LAST thing in your response
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
    const section = findSection(guideSections, sectionId);
    if (section) {
      sectionContext = buildSectionContext(section);
      const allItems = collectEvidenceItems(section);
      evidenceList = allItems
        .map(
          (item) =>
            `- ID: ${item.id} | ${item.text} | Renewal: ${item.isRenewal ? 'Yes' : 'No'}`
        )
        .join('\n');
    }
  }

  const title = guideTitle || 'Uploaded Program Guide';
  const systemPrompt = buildSystemPrompt(title, evidenceList);

  // Include raw guide text (trimmed to fit context window)
  const rawGuideContext = guideRawText
    ? `\n\n## FULL PROGRAM GUIDE REFERENCE TEXT\n\n${guideRawText.slice(0, 80000)}`
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
