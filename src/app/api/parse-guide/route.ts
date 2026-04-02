import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/document-parser';
import { parseGuideText } from '@/lib/guide-parser';
import { setGuideRawText } from '@/lib/guide-store';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rawText = await parseDocument(buffer, file.name);

    // Store raw text server-side (avoid sending 95KB+ to client)
    setGuideRawText(rawText);

    const parsed = parseGuideText(rawText);

    // Count total evidence items for progress info
    let totalEvidence = 0;
    const countEvidence = (sections: typeof parsed.sections) => {
      for (const s of sections) {
        totalEvidence += s.evidenceItems.length;
        if (s.children) countEvidence(s.children);
      }
    };
    countEvidence(parsed.sections);

    return NextResponse.json({
      title: parsed.title,
      sections: parsed.sections,
      fileName: file.name,
      totalEvidence,
      textLength: rawText.length,
    });
  } catch (error) {
    console.error('Guide parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse program guide. Please try a different file.' },
      { status: 500 }
    );
  }
}
