import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/document-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    const ext = file.name.toLowerCase().split('.').pop();
    const isAllowed =
      allowedTypes.includes(file.type) ||
      ['pdf', 'docx', 'doc', 'txt'].includes(ext || '');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await parseDocument(buffer, file.name);

    const fileType = ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'txt' : 'docx';

    return NextResponse.json({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: fileType,
      extractedText,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document. Please try a different file.' },
      { status: 500 }
    );
  }
}
