import { NextRequest } from 'next/server';
import { getModel } from '@/lib/gemini';
import { buildPrompt } from '@/lib/prompt-builder';
import { ChatMessage, UploadedDocument, ProgramSection } from '@/lib/types';
import { getGuideRawText } from '@/lib/guide-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      documents,
      sectionId,
      guideSections,
      guideTitle,
      guideRawText: bodyRawText,
    }: {
      messages: ChatMessage[];
      documents: UploadedDocument[];
      sectionId: string;
      guideSections?: ProgramSection[];
      guideTitle?: string;
      guideRawText?: string;
    } = body;

    if (!sectionId) {
      return new Response(
        JSON.stringify({ error: 'No section selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage =
      messages.filter((m) => m.role === 'user').pop()?.content || '';

    // Prefer client-supplied raw text (works on Vercel serverless); fall back to in-memory store
    const guideRawText = bodyRawText || getGuideRawText();

    const { systemInstruction, userContent } = buildPrompt(
      sectionId,
      documents,
      lastUserMessage,
      guideRawText,
      guideSections,
      guideTitle
    );

    const model = getModel();

    // Build chat history from previous messages (excluding the last user message)
    const chatHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      history: chatHistory,
    });

    const result = await chat.sendMessageStream(userContent);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              '\n\nAn error occurred while generating the response. Please try again.'
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
