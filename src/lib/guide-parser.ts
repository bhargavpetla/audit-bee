import { ProgramSection, EvidenceItem, ParsedGuide } from './types';

/**
 * Parses raw text from any program guide PDF and extracts
 * sections, subsections, descriptions, and evidence items dynamically.
 * Works with various guide formats (Google MSP, Oracle MSE, ISO, SOC, etc.)
 */
export function parseGuideText(rawText: string): ParsedGuide {
  const title = extractTitle(rawText);
  const sections = extractSections(rawText);
  return { title, sections };
}

function extractTitle(rawText: string): string {
  const lines = rawText.split('\n');
  // Strategy 1: Look for common title patterns in the first 80 lines
  for (const line of lines.slice(0, 80)) {
    const t = line.trim();
    if (!t || t.length < 5 || t.length > 150) continue;
    if (t.match(/^\d+$/) || t.match(/^page\s/i)) continue;
    if (
      t.match(/assessment/i) ||
      t.match(/checklist/i) ||
      t.match(/program guide/i) ||
      t.match(/requirements/i) ||
      t.match(/audit framework/i) ||
      t.match(/compliance/i) ||
      t.match(/capabilities/i) ||
      t.match(/partner\s+/i) ||
      t.match(/certification/i) ||
      t.match(/standard/i) ||
      t.match(/framework/i) ||
      t.match(/specification/i)
    ) {
      if (t.match(/confidential/i)) continue;
      return t;
    }
  }
  // Strategy 2: Use the longest non-trivial line in the first 20 lines
  let best = '';
  for (const line of lines.slice(0, 20)) {
    const t = line.trim();
    if (t.length > best.length && t.length > 10 && t.length < 150 && !t.match(/^\d+$/)) {
      best = t;
    }
  }
  return best || 'Uploaded Program Guide';
}

function extractSections(text: string): ProgramSection[] {
  const lines = text.split('\n');

  interface RawSection {
    id: string;
    title: string;
    startLine: number;
    content: string[];
  }

  // Detect TOC region: lines with trailing page numbers separated by dots/spaces
  const tocEndLine = findTocEnd(lines);

  const rawSections: RawSection[] = [];

  // 4-level product items (e.g., 4.1.1.1 Product Name)
  const productItems: { sectionId: string; product: string; isRenewal: boolean }[] = [];

  for (let i = tocEndLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Skip common noise/headers
    if (isNoiseLine(trimmed)) continue;

    // 4-level product items: "4.1.1.1 Product Name x" or "4.1.1.1 Product Name"
    const productMatch = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\s+(.+?)(\s+x)?\s*$/);
    if (productMatch) {
      const prodId = productMatch[1];
      const prodName = productMatch[2].trim();
      const isR = !!productMatch[3];
      if (prodName.length > 3 && !prodName.match(/^\d/)) {
        productItems.push({ sectionId: prodId, product: prodName, isRenewal: isR });
      }
      continue;
    }

    // Top-level: "X.0 Title words"
    const topMatch = trimmed.match(/^(\d+)\.0\s+(.+)$/);
    if (topMatch) {
      const possibleTitle = topMatch[2].trim();
      if (isTocLine(possibleTitle)) continue;
      if (possibleTitle.length < 3) continue;

      rawSections.push({
        id: topMatch[1] + '.0',
        title: cleanTitle(possibleTitle),
        startLine: i,
        content: [],
      });
      continue;
    }

    // Sub-section: "X.Y Title" or "X.Y.Z Title" (2 or 3 level)
    const idWithTitle = trimmed.match(/^(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
    if (idWithTitle) {
      const sectionId = idWithTitle[1];
      const inlineTitle = idWithTitle[2].trim();

      // Skip 4-level IDs (handled above)
      if (sectionId.split('.').length > 3) continue;
      // Skip TOC lines
      if (isTocLine(inlineTitle)) continue;
      // Skip table header lines
      if (isTableHeader(trimmed)) continue;
      // Skip lines that are clearly continuation text (very long with sentence patterns)
      if (inlineTitle.length > 120 && inlineTitle.match(/\.\s/)) continue;

      rawSections.push({
        id: sectionId,
        title: cleanTitle(inlineTitle),
        startLine: i,
        content: [],
      });
      continue;
    }

    // Section ID on its own line: "X.Y" or "X.Y.Z"
    const idOnly = trimmed.match(/^(\d+\.\d+(?:\.\d+)?)\s*$/);
    if (idOnly) {
      const sectionId = idOnly[1];
      if (sectionId.split('.').length > 3) continue;

      const titleText = lookAheadForTitle(lines, i);
      if (titleText) {
        rawSections.push({
          id: sectionId,
          title: cleanTitle(titleText),
          startLine: i,
          content: [],
        });
      }
      continue;
    }

    // Also detect "Section X:" or "X. Title" style (common in non-numbered guides)
    const altSection = trimmed.match(/^(?:Section\s+)?(\d+)\.\s+(.{3,80})$/);
    if (altSection && !rawSections.some(s => s.id === altSection[1] + '.0')) {
      const possibleTitle = altSection[2].trim();
      if (!isTocLine(possibleTitle) && !possibleTitle.match(/^\d/)) {
        rawSections.push({
          id: altSection[1] + '.0',
          title: cleanTitle(possibleTitle),
          startLine: i,
          content: [],
        });
      }
    }
  }

  // If we found no sections at all, try a simpler approach
  if (rawSections.length === 0) {
    return extractSectionsFallback(lines);
  }

  // Collect content between sections
  for (let s = 0; s < rawSections.length; s++) {
    const start = rawSections[s].startLine;
    const end = s + 1 < rawSections.length ? rawSections[s + 1].startLine : lines.length;
    rawSections[s].content = lines.slice(start, end);
  }

  // Extract evidence and descriptions
  const processed: Map<string, ProgramSection> = new Map();

  for (const raw of rawSections) {
    const evidenceItems = extractEvidenceItems(raw.id, raw.content);
    const description = extractDescription(raw.content, raw.title);

    processed.set(raw.id, {
      id: raw.id,
      title: raw.title,
      description,
      evidenceItems,
    });
  }

  // Handle product knowledge items (4-level IDs)
  addProductItems(processed, productItems);

  // Build hierarchy
  return buildHierarchy(processed);
}

/**
 * Find the end of the Table of Contents.
 * TOC lines typically have title text followed by dots/spaces and a page number.
 */
function findTocEnd(lines: string[]): number {
  let tocLineCount = 0;
  let lastTocLine = 0;

  for (let i = 0; i < Math.min(lines.length, 200); i++) {
    const t = lines[i].trim();
    // TOC patterns: "Section Title ..... 12" or "Section Title    12"
    if (t.match(/\.{3,}\s*\d{1,3}\s*$/) || t.match(/\s{3,}\d{1,3}\s*$/)) {
      tocLineCount++;
      lastTocLine = i;
    }
  }

  // If we found a clear TOC (5+ lines with page numbers), skip past it
  if (tocLineCount >= 5) {
    return lastTocLine + 1;
  }

  // Otherwise look for the first real section heading after any intro text
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    // First "1.0" or "1.1" that isn't a TOC line
    if (t.match(/^1\.0\s+\S+/) && !t.match(/\s{2,}\d{1,3}\s*$/) && !t.match(/\.{3,}/)) {
      return i;
    }
    if (t.match(/^1\.\d\s+\S+/) && !t.match(/\s{2,}\d{1,3}\s*$/) && !t.match(/\.{3,}/)) {
      return Math.max(0, i - 2);
    }
  }

  return 0;
}

function isNoiseLine(line: string): boolean {
  if (line.match(/^page\s+\d+/i)) return true;
  if (line.match(/confidential/i) && line.length < 50) return true;
  if (line.match(/^\d+\s*$/) && line.length < 5) return true; // standalone page numbers
  if (line.match(/^(copyright|all rights reserved)/i)) return true;
  return false;
}

function isTocLine(text: string): boolean {
  if (text.match(/\s{2,}\d{1,3}\s*$/)) return true;
  if (text.match(/\.{3,}\s*\d{1,3}\s*$/)) return true;
  if (text.match(/\t\d{1,3}\s*$/)) return true;
  return false;
}

function isTableHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes('evidence required') && lower.includes('item') ||
    lower.includes('met y/n') ||
    lower.includes('met (y/n)') ||
    lower.includes('item requirement description') ||
    (lower.includes('item') && lower.includes('product') && lower.includes(' r'))
  );
}

/**
 * Extract evidence items from section content.
 * Tries multiple strategies:
 * 1. Look for "Evidence Required" header (structured checklists)
 * 2. Look for bullet points / numbered requirements
 * 3. Look for "must/shall/should" requirement sentences
 * 4. Fall back to treating the description as a single evidence item
 */
function extractEvidenceItems(sectionId: string, contentLines: string[]): EvidenceItem[] {
  // Strategy 1: Structured "Evidence Required" block
  const structured = extractStructuredEvidence(sectionId, contentLines);
  if (structured.length > 0) return structured;

  // Strategy 2: Bullet points and numbered lists
  const bullets = extractBulletEvidence(sectionId, contentLines);
  if (bullets.length > 0) return bullets;

  // Strategy 3: Requirement sentences (must/shall/should/provide/demonstrate)
  const requirements = extractRequirementSentences(sectionId, contentLines);
  if (requirements.length > 0) return requirements;

  // Strategy 4: If the section has meaningful description text, treat it as a single evidence item
  const descText = contentLines
    .slice(1) // skip the section heading line
    .map(l => l.trim())
    .filter(l => l && !isNoiseLine(l) && !isTableHeader(l) && !l.match(/^(\d+\.)+\d*\s*$/))
    .join(' ')
    .trim();

  if (descText.length > 30) {
    // Truncate very long descriptions
    const text = descText.length > 300 ? descText.substring(0, 297) + '...' : descText;
    return [{
      id: `${sectionId}-E1`,
      text,
      isRenewal: false,
      status: 'not-checked',
    }];
  }

  return [];
}

/**
 * Strategy 1: Look for "Evidence Required" header and parse evidence blocks
 */
function extractStructuredEvidence(sectionId: string, contentLines: string[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const content = contentLines.join('\n');

  const evidenceStart = content.indexOf('Evidence Required');
  if (evidenceStart === -1) return items;

  const evidenceText = content.substring(evidenceStart);
  const evidenceLines = evidenceText.split('\n');

  let currentEvidence = '';
  let isRenewal = false;
  let evidenceCount = 0;

  for (let i = 1; i < evidenceLines.length; i++) {
    const line = evidenceLines[i].trim();

    if (!line) continue;
    if (isNoiseLine(line)) continue;
    if (line === 'Evidence Required' || line === 'R' || line === 'Met Y/N' || line === 'R Met Y/N') continue;
    if (line.match(/^Section\s+\d+\.\d+\.x/)) break;
    if (isTableHeader(line)) break;
    if (line.includes('Voluntary advanced capabilities')) break;

    // Renewal marker
    if (line === 'x' || line === 'X') {
      isRenewal = true;
      continue;
    }

    if (startsNewEvidence(line)) {
      if (currentEvidence) {
        evidenceCount++;
        items.push({
          id: `${sectionId}-E${evidenceCount}`,
          text: cleanText(currentEvidence),
          isRenewal,
          status: 'not-checked',
        });
      }
      currentEvidence = line;
      isRenewal = false;
    } else if (currentEvidence) {
      currentEvidence += ' ' + line;
    }
  }

  if (currentEvidence) {
    evidenceCount++;
    items.push({
      id: `${sectionId}-E${evidenceCount}`,
      text: cleanText(currentEvidence),
      isRenewal,
      status: 'not-checked',
    });
  }

  return items;
}

/**
 * Strategy 2: Extract bullet point / numbered list evidence items
 */
function extractBulletEvidence(sectionId: string, contentLines: string[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  let count = 0;

  for (const line of contentLines) {
    const t = line.trim();
    // Match bullet points: "- text", "• text", "* text"
    const bulletMatch = t.match(/^[-•*]\s+(.{15,})$/);
    // Match numbered items: "1. text", "a) text", "(1) text"
    const numberedMatch = t.match(/^(?:\d+[.)]\s+|[a-z][.)]\s+|\(\d+\)\s+)(.{15,})$/);

    const itemText = bulletMatch?.[1] || numberedMatch?.[1];
    if (itemText) {
      count++;
      items.push({
        id: `${sectionId}-E${count}`,
        text: cleanText(itemText),
        isRenewal: false,
        status: 'not-checked',
      });
    }
  }

  return items;
}

/**
 * Strategy 3: Extract requirement sentences containing must/shall/should/provide/demonstrate
 */
function extractRequirementSentences(sectionId: string, contentLines: string[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  let count = 0;

  // Join all content and split into sentences
  const fullText = contentLines
    .slice(1) // skip heading
    .map(l => l.trim())
    .filter(l => l && !isNoiseLine(l))
    .join(' ');

  // Split on sentence boundaries
  const sentences = fullText.split(/(?<=[.!])\s+/);

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.length < 20) continue;

    // Match requirement language
    if (
      s.match(/\b(must|shall|should|required|provide|demonstrate|submit|evidence|document|ensure)\b/i) &&
      !s.match(/^(this|the following|note|see|refer)/i)
    ) {
      count++;
      items.push({
        id: `${sectionId}-E${count}`,
        text: cleanText(s.length > 300 ? s.substring(0, 297) + '...' : s),
        isRenewal: false,
        status: 'not-checked',
      });
    }
  }

  return items;
}

function startsNewEvidence(line: string): boolean {
  if (line.length < 15) return false;
  const starters = [
    'Provide', 'Demonstrate', 'Documentation', 'Documented', 'Include',
    'Technology', 'A ', 'An ', 'The ', 'Partner must', 'Partner ',
    'Present', 'Show', 'Description', 'Describe', 'Utilizing',
    'Each technology', 'Capability', 'Evidence ', 'At least',
    'Defined', 'Maintain', 'Established', 'Records', 'Examples',
    'Details', 'List', 'Overview', 'Confirm', 'Submit', 'Valid',
    'Proof', 'Copy', 'Current', 'Signed', 'Written', 'Complete',
    'Annual', 'Quarterly', 'Monthly', 'Report', 'Audit',
    'Certificate', 'Policy', 'Procedure', 'Process', 'Plan',
  ];

  for (const starter of starters) {
    if (line.startsWith(starter)) return true;
  }

  // Generic pattern: Capitalized word followed by requirement-like text
  if (line.match(/^[A-Z][a-z]+ (must|should|the|a |an |of |or |for |documentation|evidence|records|examples|process|at least|that |how |their |with )/i)) {
    return true;
  }

  return false;
}

function addProductItems(
  processed: Map<string, ProgramSection>,
  productItems: { sectionId: string; product: string; isRenewal: boolean }[]
): void {
  if (productItems.length === 0) return;

  // Group by 3-level parent
  const productsByParent = new Map<string, typeof productItems>();
  for (const p of productItems) {
    const parts = p.sectionId.split('.');
    const parentId = parts.slice(0, 3).join('.');
    if (!productsByParent.has(parentId)) productsByParent.set(parentId, []);
    productsByParent.get(parentId)!.push(p);
  }

  for (const [parentId, products] of productsByParent) {
    let parentSection = processed.get(parentId);
    if (!parentSection) {
      parentSection = { id: parentId, title: '', description: '', evidenceItems: [] };
      processed.set(parentId, parentSection);
    }
    for (const prod of products) {
      parentSection.evidenceItems.push({
        id: prod.sectionId,
        text: `Demonstrate technical proficiency in ${prod.product}`,
        isRenewal: prod.isRenewal,
        status: 'not-checked',
      });
    }
  }

  // Create 2-level parents if needed
  const twoLevelParents = new Set<string>();
  for (const parentId of productsByParent.keys()) {
    twoLevelParents.add(parentId.split('.').slice(0, 2).join('.'));
  }
  for (const twoLevel of twoLevelParents) {
    if (!processed.has(twoLevel)) {
      processed.set(twoLevel, {
        id: twoLevel,
        title: `Section ${twoLevel}`,
        description: '',
        evidenceItems: [],
      });
    }
  }
}

function buildHierarchy(processed: Map<string, ProgramSection>): ProgramSection[] {
  // Sort all section IDs by depth (deepest first)
  const allIds = Array.from(processed.keys()).sort((a, b) => {
    return b.split('.').length - a.split('.').length;
  });

  for (const id of allIds) {
    const section = processed.get(id)!;
    const parts = id.split('.');

    if (parts.length >= 3) {
      // X.Y.Z -> parent X.Y
      const parentId = parts.slice(0, 2).join('.');
      const parent = processed.get(parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        if (!parent.children.find(c => c.id === section.id)) {
          parent.children.push(section);
        }
      }
    } else if (parts.length === 2 && parts[1] !== '0') {
      // X.Y -> parent X.0
      const parentId = parts[0] + '.0';
      const parent = processed.get(parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        if (!parent.children.find(c => c.id === section.id)) {
          parent.children.push(section);
        }
      }
    }
  }

  // Sort children recursively
  const sortChildren = (sections: ProgramSection[]) => {
    sections.sort((a, b) => {
      const pa = a.id.split('.').map(Number);
      const pb = b.id.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
      }
      return 0;
    });
    for (const s of sections) {
      if (s.children) sortChildren(s.children);
    }
  };

  // Return top-level sections
  const topLevel: ProgramSection[] = [];
  for (const [id, section] of processed) {
    const parts = id.split('.');
    // Top-level: X.0 format
    if (parts.length === 2 && parts[1] === '0') {
      topLevel.push(section);
    }
    // Also include X.Y sections that have no X.0 parent
    else if (parts.length === 2 && parts[1] !== '0') {
      const parentId = parts[0] + '.0';
      if (!processed.has(parentId)) {
        topLevel.push(section);
      }
    }
  }

  // If no X.0 style sections found, all sections are top-level
  if (topLevel.length === 0) {
    for (const section of processed.values()) {
      topLevel.push(section);
    }
  }

  sortChildren(topLevel);
  return topLevel;
}

/**
 * Fallback section extraction for guides that don't use numbered section IDs.
 * Looks for heading-like patterns (ALL CAPS, bold markers, or short capitalized lines).
 */
function extractSectionsFallback(lines: string[]): ProgramSection[] {
  const sections: ProgramSection[] = [];
  let sectionCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.length < 3) continue;

    // Detect heading-like lines: ALL CAPS, or short lines that look like titles
    const isHeading =
      (t === t.toUpperCase() && t.length > 5 && t.length < 80 && t.match(/[A-Z]/)) ||
      (t.length < 60 && t.match(/^[A-Z][A-Za-z\s&,-]+$/) && !t.match(/\./));

    if (isHeading) {
      sectionCount++;
      const id = `${sectionCount}.0`;

      // Collect content until next heading
      const contentLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextT = lines[j].trim();
        if (nextT && (
          (nextT === nextT.toUpperCase() && nextT.length > 5 && nextT.length < 80 && nextT.match(/[A-Z]/)) ||
          (nextT.length < 60 && nextT.match(/^[A-Z][A-Za-z\s&,-]+$/) && !nextT.match(/\./))
        )) {
          break;
        }
        contentLines.push(lines[j]);
        j++;
      }

      const evidenceItems = extractEvidenceItems(id, [t, ...contentLines]);
      const description = contentLines
        .map(l => l.trim())
        .filter(l => l && !isNoiseLine(l))
        .join(' ')
        .trim()
        .substring(0, 500);

      sections.push({
        id,
        title: t.length > 60 ? t.substring(0, 57) + '...' : t,
        description,
        evidenceItems,
      });
    }
  }

  return sections;
}

function lookAheadForTitle(lines: string[], startLine: number): string {
  const titleParts: string[] = [];
  let j = startLine + 1;
  while (j < Math.min(startLine + 8, lines.length)) {
    const nextLine = lines[j].trim();
    j++;
    if (!nextLine) {
      if (titleParts.length > 0) break;
      continue;
    }
    if (isNoiseLine(nextLine)) continue;
    if (nextLine.match(/^\d+\.\d/)) break;
    if (isTableHeader(nextLine)) break;
    if (titleParts.length > 0 && nextLine.length > 100) break;
    if (titleParts.length > 0 && nextLine.match(/^(Partner|The |This |A |An |To )/)) break;

    titleParts.push(nextLine);
    if (titleParts.join(' ').length > 120 || titleParts.length >= 4) break;
  }
  return titleParts.join(' ').trim();
}

function extractDescription(contentLines: string[], title: string): string {
  const content = contentLines.join('\n');
  const titleIdx = content.indexOf(title);
  if (titleIdx === -1) return '';

  // Find the end of description (before evidence section or next heading)
  const start = titleIdx + title.length;
  let end = content.length;

  // Look for evidence markers
  const evidenceIdx = content.indexOf('Evidence Required', start);
  if (evidenceIdx !== -1) end = evidenceIdx;

  // Also check for bullet-point regions
  const bulletIdx = content.indexOf('\n- ', start);
  if (bulletIdx !== -1 && bulletIdx < end) end = Math.min(end, start + 500);

  const description = content
    .substring(start, Math.min(end, start + 600))
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l && !isNoiseLine(l) && !isTableHeader(l) &&
      l !== 'Item' && l !== 'Requirement' && l !== 'Description'
    )
    .join(' ')
    .trim();

  return description.length > 600 ? description.substring(0, 597) + '...' : description;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s{2,}\d{1,3}\s*$/, '') // trailing page numbers with multiple spaces
    .replace(/\.{3,}\s*\d{1,3}\s*$/, '') // trailing dots + page number
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+x\s*$/, '') // trailing "x" renewal marker
    .trim();
}
