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
    // A title starts a line, not a wrapped fragment of a sentence
    if (!/^[A-Z0-9]/.test(t)) continue;
    if (
      t.match(/^regulation\s|^directive\s|^council regulation/i) ||
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

  // Question-based guides (a "<Name> Questions" table per section) carry no
  // decimal IDs in the body at all, so the numbered-heading logic below finds
  // only incidental numbering such as a revision history.
  const questionSections = extractQuestionSections(lines);
  if (questionSections.length > 0) return questionSections;

  // Legal instruments (regulations, directives, standards) are organised into
  // Chapters, Articles and Annexes, with requirements as numbered paragraphs
  // whose text runs on from the number rather than sitting under a heading.
  const regulationSections = extractRegulationSections(lines);
  if (regulationSections.length > 0) return regulationSections;

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

  // "N. Title" is only a heading in guides that don't use decimal IDs at all.
  // In a decimal guide it is an ordinary numbered list inside a requirement.
  const usesDecimalIds = lines
    .slice(tocEndLine)
    .some((l) => /^\s*\d+\.\d+(\.\d+)?\s+\S/.test(l));

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

    // Product-grid rows where the product ID is not at the start of the line,
    // e.g. "Storage and database 4.1.2.2 Cloud SQL x". The leading text belongs
    // to the parent section title and is picked up by the look-ahead.
    if (!trimmed.match(/^\d/) && trimmed.length < 160) {
      const embedded = collectInlineProducts(trimmed);
      if (embedded.length > 0) {
        productItems.push(...embedded);
        continue;
      }
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
      let inlineTitle = idWithTitle[2].trim();

      // Skip 4-level IDs (handled above)
      if (sectionId.split('.').length > 3) continue;
      // Skip TOC lines
      if (isTocLine(inlineTitle)) continue;
      // Skip table header lines
      if (isTableHeader(trimmed)) continue;
      // Skip lines that are clearly continuation text (very long with sentence patterns)
      if (inlineTitle.length > 120 && inlineTitle.match(/\.\s/)) continue;

      // Product-grid rows put the first product on the same line as its parent
      // ID, e.g. "4.1.2  4.1.2.1 Cloud Storage x". Harvest the product and take
      // the real title from the following lines.
      const trailingProducts = collectInlineProducts(inlineTitle);
      if (trailingProducts.length > 0) {
        productItems.push(...trailingProducts);
        inlineTitle = stripInlineProducts(inlineTitle);
      }

      if (!inlineTitle) {
        const titleText = stripInlineProducts(lookAheadForTitle(lines, i));
        if (!titleText) continue;
        inlineTitle = titleText;
      }

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

      const titleText = stripInlineProducts(lookAheadForTitle(lines, i));
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
    if (usesDecimalIds) continue;
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
  // Sections whose only "evidence" is their own intro prose, not a real
  // requirement list — pruned below if their sub-controls carry the real items
  const descriptionOnly = new Set<string>();

  for (const raw of rawSections) {
    const extracted = extractEvidenceItems(raw.id, raw.content);
    const evidenceItems = extracted.items;
    if (extracted.fromDescription) descriptionOnly.add(raw.id);
    const description = extractDescription(raw.content, raw.title);

    // The same ID can appear more than once — appendix cross-references such as
    // "1.0 through 7.0 of this document" are indistinguishable from a heading by
    // pattern alone. The real heading always comes first, so later repeats are
    // dropped rather than merged (merging drags appendix prose in as evidence).
    if (processed.has(raw.id)) continue;

    processed.set(raw.id, {
      id: raw.id,
      title: raw.title,
      description,
      evidenceItems,
    });
  }

  // Handle product knowledge items (4-level IDs)
  addProductItems(processed, productItems, lines);

  // Build hierarchy
  const topLevel = buildHierarchy(processed);
  pruneDescriptionOnlyEvidence(topLevel, descriptionOnly);
  return topLevel;
}

/**
 * A parent control whose sub-controls hold the real "Evidence Required" table
 * should not also carry a pseudo-item made from its own intro paragraph. Those
 * duplicates read as separate requirements the auditor has to satisfy, and the
 * model routinely skips them because the same content is already covered by the
 * child. The text is kept as the section's description instead.
 */
function pruneDescriptionOnlyEvidence(
  sections: ProgramSection[],
  descriptionOnly: Set<string>
): void {
  const subtreeHasEvidence = (section: ProgramSection): boolean =>
    (section.children || []).some(
      (c) => c.evidenceItems.length > 0 || subtreeHasEvidence(c)
    );

  const walk = (list: ProgramSection[]) => {
    for (const section of list) {
      if (
        descriptionOnly.has(section.id) &&
        section.evidenceItems.length > 0 &&
        subtreeHasEvidence(section)
      ) {
        if (!section.description) {
          section.description = section.evidenceItems[0].text;
        }
        section.evidenceItems = [];
      }
      if (section.children) walk(section.children);
    }
  };

  walk(sections);
}

const ANNEX_RE = /^ANNEX\s+([IVXL]+)\s*$/;
const CHAPTER_RE = /^CHAPTER\s+([IVXL]+)\s*$/;
const ARTICLE_RE = /^Article\s+(\d+)\s*$/;
/** "1.  text", "10.2.  text", or the number alone with its text on the next line */
const REQUIREMENT_RE = /^(\d+(?:\.\d+)*)\.\s*(.*)$/;
const SUBPOINT_RE = /^\(([a-z]{1,2}|[ivxl]{1,4})\)\s*(.+)$/;

/** Page furniture in an official journal or standard */
function isInstrumentNoise(line: string): boolean {
  if (/official journal of the european union/i.test(line)) return true;
  if (/^[A-Z]{2}\s*$/.test(line)) return true; // language code stamp
  if (/^\d{1,2}\.\d{1,2}\.\d{4}\s/.test(line)) return true; // date + folio
  if (/^L\s+\d+\/\d+\s*$/.test(line)) return true;
  return false;
}

/**
 * Regulations, directives and standards: Chapters and Annexes for structure,
 * Articles and numbered paragraphs for the requirements themselves, and
 * lettered points beneath them. Nothing here looks like a numbered heading, so
 * the decimal-ID logic finds almost nothing.
 */
function extractRegulationSections(lines: string[]): ProgramSection[] {
  const trimmed = lines.map((l) => l.trim());
  const annexCount = trimmed.filter((l) => ANNEX_RE.test(l)).length;
  const articleCount = trimmed.filter((l) => ARTICLE_RE.test(l)).length;
  if (annexCount < 3 && articleCount < 20) return [];

  const sections: ProgramSection[] = [];
  const firstAnnex = trimmed.findIndex((l) => ANNEX_RE.test(l));

  // --- Enacting terms: one section per Chapter, one control per Article
  const chapterStarts: { index: number; numeral: string }[] = [];
  for (let i = 0; i < (firstAnnex === -1 ? trimmed.length : firstAnnex); i++) {
    const match = trimmed[i].match(CHAPTER_RE);
    if (match) chapterStarts.push({ index: i, numeral: match[1] });
  }

  chapterStarts.forEach((chapter, n) => {
    const end =
      n + 1 < chapterStarts.length
        ? chapterStarts[n + 1].index
        : firstAnnex === -1
          ? trimmed.length
          : firstAnnex;
    const id = `C${chapter.numeral}`;
    const articles = parseArticles(lines, chapter.index + 1, end, id);
    if (articles.length === 0) return;

    sections.push({
      id,
      title: `Chapter ${chapter.numeral} — ${headingTitle(lines, chapter.index)}`,
      description: '',
      evidenceItems: [],
      children: articles,
    });
  });

  // --- Annexes: one section each, one control per numbered requirement
  const annexStarts: { index: number; numeral: string }[] = [];
  for (let i = firstAnnex === -1 ? trimmed.length : firstAnnex; i < trimmed.length; i++) {
    const match = trimmed[i].match(ANNEX_RE);
    if (match) annexStarts.push({ index: i, numeral: match[1] });
  }

  annexStarts.forEach((annex, n) => {
    const end =
      n + 1 < annexStarts.length ? annexStarts[n + 1].index : trimmed.length;
    const id = `A${annex.numeral}`;
    const requirements = parseRequirements(lines, annex.index + 2, end, id);
    if (requirements.length === 0) return;

    sections.push({
      id,
      title: `Annex ${annex.numeral} — ${headingTitle(lines, annex.index)}`,
      description: '',
      evidenceItems: [],
      children: requirements,
    });
  });

  return sections;
}

/** The title line that follows a CHAPTER / ANNEX / Article marker */
function headingTitle(lines: string[], markerLine: number): string {
  for (let i = markerLine + 1; i < Math.min(markerLine + 5, lines.length); i++) {
    const t = lines[i].trim();
    if (!t || isNoiseLine(t) || isInstrumentNoise(t)) continue;
    // A chapter can be followed straight away by its first article
    if (ARTICLE_RE.test(t) || CHAPTER_RE.test(t)) return '';
    return cleanTitle(t);
  }
  return '';
}

function parseArticles(
  lines: string[],
  from: number,
  to: number,
  sectionId: string
): ProgramSection[] {
  const starts: { index: number; number: string }[] = [];
  for (let i = from; i < to; i++) {
    const match = lines[i].trim().match(ARTICLE_RE);
    if (match) starts.push({ index: i, number: match[1] });
  }

  return starts
    .map((article, n) => {
      const end = n + 1 < starts.length ? starts[n + 1].index : to;
      const id = `${sectionId}.${article.number}`;
      const title = headingTitle(lines, article.index);
      const paragraphs = parseRequirements(lines, article.index + 2, end, id);

      // An article's numbered paragraphs are its checkable obligations
      const evidenceItems: EvidenceItem[] = paragraphs.flatMap((p) =>
        p.evidenceItems.length > 0
          ? p.evidenceItems
          : [
              {
                id: `${p.id}-E1`,
                text: p.description || p.title,
                isRenewal: false,
                status: 'not-checked' as const,
              },
            ]
      );

      return {
        id,
        title: `Article ${article.number}${title ? ` — ${title}` : ''}`,
        description: '',
        evidenceItems,
      };
    })
    .filter((a) => a.evidenceItems.length > 0);
}

interface RequirementBlock {
  number: string;
  textLines: string[];
  points: { label: string; lines: string[] }[];
}

function parseRequirements(
  lines: string[],
  from: number,
  to: number,
  parentId: string
): ProgramSection[] {
  const blocks: RequirementBlock[] = [];
  let current: RequirementBlock | null = null;
  let point: { label: string; lines: string[] } | null = null;

  // A chapter heading inside an annex subdivides it without restarting the
  // numbering, so it is skipped along with its title rather than ending the run
  let skipHeadingTitle = false;

  for (let i = from; i < to && i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isNoiseLine(line) || isInstrumentNoise(line)) continue;
    if (ARTICLE_RE.test(line) || ANNEX_RE.test(line)) break;

    if (CHAPTER_RE.test(line)) {
      skipHeadingTitle = true;
      continue;
    }
    if (skipHeadingTitle) {
      skipHeadingTitle = false;
      continue;
    }

    const requirement = line.match(REQUIREMENT_RE);
    if (requirement && requirement[1].length <= 12) {
      if (current) blocks.push(current);
      current = { number: requirement[1], textLines: [], points: [] };
      point = null;
      if (requirement[2]) current.textLines.push(requirement[2]);
      continue;
    }

    if (!current) continue;

    const sub = line.match(SUBPOINT_RE);
    if (sub) {
      point = { label: sub[1], lines: [sub[2]] };
      current.points.push(point);
      continue;
    }

    if (point) point.lines.push(line);
    else current.textLines.push(line);
  }
  if (current) blocks.push(current);

  return blocks
    .map((block) => {
      const body = cleanText(block.textLines.join(' '));
      const id = `${parentId}.${block.number}`;

      const evidenceItems: EvidenceItem[] =
        block.points.length > 0
          ? block.points.map((p, i) => ({
              id: `${id}-E${i + 1}`,
              text: cleanText(`(${p.label}) ${p.lines.join(' ')}`),
              isRenewal: false,
              status: 'not-checked' as const,
            }))
          : body.length > 25
            ? [
                {
                  id: `${id}-E1`,
                  text: truncate(body, 900),
                  isRenewal: false,
                  status: 'not-checked' as const,
                },
              ]
            : [];

      return {
        id,
        title: `${block.number} ${truncate(body, 110)}`.trim(),
        description: truncate(body, 900),
        evidenceItems,
      };
    })
    .filter((r) => r.evidenceItems.length > 0);
}

/**
 * Some assessment guides are written as questionnaires rather than numbered
 * requirements: a "<Name> Questions" table per section, then a
 * "Question | Response | Evidence Required" header, then numbered questions
 * each followed by Yes/No and a bulleted list of the artefacts to upload.
 * Each question becomes a control point and each bullet an evidence item.
 */
function extractQuestionSections(lines: string[]): ProgramSection[] {
  const tables: { name: string; bodyStart: number; headingLine: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^(.+?)\s+Questions$/i);
    if (!match) continue;

    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const header = (lines[j] || '').trim().toLowerCase();
    if (header.includes('question') && header.includes('evidence required')) {
      tables.push({
        name: cleanTitle(match[1]),
        bodyStart: j + 1,
        headingLine: i,
      });
    }
  }

  if (tables.length === 0) return [];

  const furniture = runningHeaders(lines);
  const sections: ProgramSection[] = [];

  tables.forEach((tableInfo, index) => {
    const sectionId = `${index + 1}.0`;
    const end =
      index + 1 < tables.length ? tables[index + 1].headingLine : lines.length;

    const questions = parseQuestionBlocks(
      lines.slice(tableInfo.bodyStart, end),
      furniture,
      sectionId
    );
    if (questions.length === 0) return;

    sections.push({
      id: sectionId,
      title: tableInfo.name,
      description: sectionIntro(lines, tableInfo.headingLine, furniture),
      evidenceItems: [],
      children: questions,
    });
  });

  return sections;
}

interface QuestionBlock {
  number: number;
  questionLines: string[];
  evidenceLines: string[];
  inEvidence: boolean;
  done: boolean;
}

function parseQuestionBlocks(
  body: string[],
  furniture: Set<string>,
  sectionId: string
): ProgramSection[] {
  const blocks: QuestionBlock[] = [];
  let current: QuestionBlock | null = null;

  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;

    // A bare number starts the next question, but only once the previous one
    // has reached its evidence list — question prose can contain numbers too.
    // Tested before the noise filter, which would discard it as a page number.
    const numbered = line.match(/^(\d{1,2})$/);
    if (numbered && (!current || current.inEvidence)) {
      if (current) blocks.push(current);
      current = {
        number: Number(numbered[1]),
        questionLines: [],
        evidenceLines: [],
        inEvidence: false,
        done: false,
      };
      continue;
    }

    if (!current || isNoiseLine(line) || furniture.has(line)) continue;

    if (/^yes\s*\/\s*no$/i.test(line)) {
      current.inEvidence = true;
      continue;
    }

    if (!current.inEvidence) {
      current.questionLines.push(line);
      continue;
    }

    if (current.done) continue;

    // The evidence column is narrow, so its wrapped lines are short. A long
    // line, or a heading, means the table has ended and the next section's
    // prose has begun — the last question of a table would otherwise swallow it
    const isBullet = /^[•▪●·*-]/.test(line);
    if (
      !isBullet &&
      (line.length > 45 || /(?:^|\s)(?:Control|Overview|Questions)$/i.test(line))
    ) {
      current.done = true;
      continue;
    }

    current.evidenceLines.push(line);
  }
  if (current) blocks.push(current);

  return blocks.map((block) => {
    const id = `${sectionId.split('.')[0]}.${block.number}`;
    const full = cleanText(block.questionLines.join(' '));

    // The question itself is the first sentence; the rest is the guide's
    // explanation of what the control expects
    const cut = full.indexOf('?');
    const title = cut === -1 ? truncate(full, 120) : full.slice(0, cut + 1);
    const description = cut === -1 ? '' : full.slice(cut + 1).trim();

    return {
      id,
      title,
      description,
      evidenceItems: bulletsToEvidence(block.evidenceLines, id),
    };
  });
}

/** Bullet lines wrap across the column, so un-bulleted lines continue the previous item */
function bulletsToEvidence(lines: string[], controlId: string): EvidenceItem[] {
  const texts: string[] = [];
  for (const line of lines) {
    const bullet = line.match(/^[•▪●·*-]\s*(.*)$/);
    if (bullet) texts.push(bullet[1]);
    else if (texts.length > 0) texts[texts.length - 1] += ' ' + line;
  }

  return texts
    .map((t) => cleanText(t))
    .filter((t) => t.length > 2)
    .map((text, i) => ({
      id: `${controlId}-E${i + 1}`,
      text,
      isRenewal: false,
      status: 'not-checked' as const,
    }));
}

/** The prose between a section's own heading and its questions table */
function sectionIntro(
  lines: string[],
  headingLine: number,
  furniture: Set<string>
): string {
  const parts: string[] = [];
  for (let i = headingLine - 1; i >= 0 && i > headingLine - 40; i--) {
    const line = lines[i].trim();
    if (!line || isNoiseLine(line) || furniture.has(line)) continue;
    // Stop at the previous section's evidence column
    if (/^yes\s*\/\s*no$/i.test(line) || line.startsWith('•')) break;
    parts.unshift(line);
    if (parts.join(' ').length > 700) break;
  }
  return truncate(cleanText(parts.join(' ')), 700);
}

/**
 * Lines repeated on many pages are headers or footers. Bullets, bare numbers
 * and the Yes/No column are structural and repeat legitimately.
 */
function runningHeaders(lines: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const raw of lines) {
    const line = raw.trim();
    // Short fragments repeat as wrapped continuations of real content
    if (line.length < 20 || line.length > 120) continue;
    if (line.startsWith('•') || /^\d+$/.test(line)) continue;
    if (/^yes\s*\/\s*no$/i.test(line)) continue;
    counts.set(line, (counts.get(line) || 0) + 1);
  }

  const repeated = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= 4) repeated.add(line);
  }
  return repeated;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

/**
 * Find the end of the Table of Contents.
 * TOC lines typically have title text followed by dots/spaces and a page number.
 */
function findTocEnd(lines: string[]): number {
  // A TOC entry is a short line ending in a page number. The separator varies
  // by extractor — dot leaders, a run of spaces, or (when the PDF's tab stops
  // collapse) a single space.
  const isTocEntry = (t: string): boolean =>
    !!t &&
    t.length < 110 &&
    (/\.{3,}\s*\d{1,3}\s*$/.test(t) ||
      /\s{2,}\d{1,3}\s*$/.test(t) ||
      /^\S.*[A-Za-z)\]]\s\d{1,3}\s*$/.test(t));

  // Find the longest run of TOC entries, tolerating blank lines between them.
  // Any other prose line ends the run — that is where the body starts.
  let bestEnd = -1;
  let bestCount = 0;
  let count = 0;
  let blankGap = 0;

  for (let i = 0; i < Math.min(lines.length, 400); i++) {
    const t = lines[i].trim();
    if (isTocEntry(t)) {
      count++;
      blankGap = 0;
      if (count > bestCount) {
        bestCount = count;
        bestEnd = i;
      }
    } else if (t.length < 3) {
      if (++blankGap > 8) count = 0;
    } else {
      count = 0;
      blankGap = 0;
    }
  }

  // If we found a clear TOC (5+ entries), skip past it
  if (bestCount >= 5) {
    return bestEnd + 1;
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
  if (line.match(/\bpage\s+\d+\s+of\s+\d+\b/i)) return true; // "Version 3.1  Page 20 of 23"
  if (line.match(/confidential/i) && line.length < 50) return true;
  // Running header/footer, e.g. "... Assessment v4.2 (Sep 2025)   GOOGLE CONFIDENTIAL 27"
  if (line.match(/confidential\s*\d{0,3}\s*$/i)) return true;
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
function extractEvidenceItems(
  sectionId: string,
  contentLines: string[]
): { items: EvidenceItem[]; fromDescription: boolean } {
  // Strategy 1: Structured "Evidence Required" block
  const structured = extractStructuredEvidence(sectionId, contentLines);
  if (structured.length > 0) return { items: structured, fromDescription: false };

  // Strategy 2: Bullet points and numbered lists
  const bullets = extractBulletEvidence(sectionId, contentLines);
  if (bullets.length > 0) return { items: bullets, fromDescription: false };

  // Strategy 3: Requirement sentences (must/shall/should/provide/demonstrate)
  const requirements = extractRequirementSentences(sectionId, contentLines);
  if (requirements.length > 0) return { items: requirements, fromDescription: false };

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
    return {
      items: [{
        id: `${sectionId}-E1`,
        text,
        isRenewal: false,
        status: 'not-checked',
      }],
      fromDescription: true,
    };
  }

  return { items: [], fromDescription: false };
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
  productItems: { sectionId: string; product: string; isRenewal: boolean }[],
  lines: string[]
): void {
  if (productItems.length === 0) return;

  // Group by 3-level parent, dropping duplicates of the same product ID
  const productsByParent = new Map<string, typeof productItems>();
  const seenProductIds = new Set<string>();
  for (const p of productItems) {
    if (seenProductIds.has(p.sectionId)) continue;
    seenProductIds.add(p.sectionId);
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
    if (!parentSection.title) {
      parentSection.title =
        findProductParentTitle(lines, parentId) || `Section ${parentId}`;
    }
    products.sort((a, b) => compareSectionIds(a.sectionId, b.sectionId));
    for (const prod of products) {
      if (parentSection.evidenceItems.some(e => e.id === prod.sectionId)) continue;
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
    const existing = processed.get(twoLevel);
    if (existing && existing.title) continue;
    const section = existing || {
      id: twoLevel,
      title: '',
      description: '',
      evidenceItems: [],
    };
    section.title = findGroupHeading(lines, twoLevel) || `Section ${twoLevel}`;
    processed.set(twoLevel, section);
  }
}

/**
 * Product grids are introduced by a heading such as
 * "Section 4.1.x - Cloud products in current MSP growth cycle" rather than a
 * plain "4.1 Title" line, so the group has no title of its own without this.
 */
function findGroupHeading(lines: string[], groupId: string): string {
  const pattern = new RegExp(
    `^Section\\s+${groupId.replace('.', '\\.')}\\.x\\s*[-–—:]?\\s*(.+)$`,
    'i'
  );
  for (const line of lines) {
    const match = line.trim().match(pattern);
    if (match) {
      const title = cleanTitle(match[1]);
      if (title.length > 3) return title;
    }
  }
  return '';
}

/**
 * A product-grid row carries its group title in a separate cell, so the title
 * lands on its own line(s) somewhere after the group ID — often after a page
 * break. Walk forward past the product rows and collect the first run of plain
 * text.
 */
function findProductParentTitle(lines: string[], parentId: string): string {
  const anchor = new RegExp(`^${parentId.replace(/\./g, '\\.')}(\\s|$)`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (anchor.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start === -1) return '';

  const parts: string[] = [];
  for (let j = start + 1; j < Math.min(start + 16, lines.length); j++) {
    const t = lines[j].trim();
    if (!t || isNoiseLine(t)) continue;

    // A product row that starts with its ID contributes no title text
    if (t.match(/^\d+\.\d/)) {
      if (parts.length > 0) break;
      continue;
    }

    const leading = stripInlineProducts(t);
    if (leading) parts.push(leading);
    // Text followed by a product ID is the last title fragment in the cell
    if (leading !== cleanTitle(t)) break;
    if (parts.join(' ').length > 80 || parts.length >= 4) break;
  }

  return cleanTitle(parts.join(' '));
}

const PRODUCT_IN_LINE = /(\d+\.\d+\.\d+\.\d+)\s+([^\d].*?)(?=\s+\d+\.\d+\.\d+\.\d+\s|$)/g;

/**
 * Pull "4.1.2.1 Cloud Storage x" style product entries out of a line that also
 * contains other text (a parent ID, a group title, or several products).
 */
function collectInlineProducts(
  text: string
): { sectionId: string; product: string; isRenewal: boolean }[] {
  const found: { sectionId: string; product: string; isRenewal: boolean }[] = [];
  for (const match of text.matchAll(PRODUCT_IN_LINE)) {
    const renewalMatch = match[2].match(/^(.*?)(\s+x)\s*$/i);
    const product = cleanTitle(renewalMatch ? renewalMatch[1] : match[2]);
    if (product.length > 3) {
      found.push({
        sectionId: match[1],
        product,
        isRenewal: !!renewalMatch,
      });
    }
  }
  return found;
}

/** Remove any embedded product entries, leaving only the surrounding title text. */
function stripInlineProducts(text: string): string {
  return cleanTitle(text.replace(/\d+\.\d+\.\d+\.\d+\s+.*$/, ''));
}

function compareSectionIds(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
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

      const { items: evidenceItems } = extractEvidenceItems(id, [
        t,
        ...contentLines,
      ]);
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
