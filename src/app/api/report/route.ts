import { NextRequest, NextResponse } from 'next/server';
import { buildFinalReport } from '@/lib/report-builder';
import { ProgramSection, ReportMeta } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const {
      sections,
      meta,
    }: { sections: ProgramSection[]; meta: ReportMeta } = await request.json();

    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'No assessment data to report on' },
        { status: 400 }
      );
    }

    const buffer = await buildFinalReport(sections, meta);
    const fileName = `${meta.partner || 'Partner'} - Full Audit Final Report.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate the gap report.' },
      { status: 500 }
    );
  }
}
