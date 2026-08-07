'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAudit } from '@/context/AuditContext';
import ChatMessage from './ChatMessage';
import BeeLogo from './BeeLogo';

export default function ChatPanel() {
  const {
    guide,
    messages,
    isStreaming,
    selectedSection,
    documents,
    addMessage,
    updateLastAssistantMessage,
    setIsStreaming,
    updateChecklistItems,
  } = useAudit();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming || !selectedSection || !guide) return;

    setInput('');

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    addMessage(userMessage);
    addMessage(assistantMessage);
    setIsStreaming(true);

    try {
      const allMessages = [...messages, userMessage];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          documents,
          sectionId: selectedSection,
          guideSections: guide.sections,
          guideTitle: guide.title,
          guideRawText: guide.rawText,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        updateLastAssistantMessage(fullText);
      }

      // Parse checklist updates
      const checklistMatch = fullText.match(
        /<!--CHECKLIST_UPDATE:([\s\S]*?)-->/
      );
      if (checklistMatch) {
        try {
          const jsonStr = checklistMatch[1].trim();
          const updates = JSON.parse(jsonStr);
          console.log('[Audit Bee] Chat checklist update parsed:', updates);
          if (updates.items && updates.items.length > 0) {
            updateChecklistItems(updates.items, selectedSection);
          }
        } catch (e) {
          console.error('[Audit Bee] Failed to parse chat checklist update:', e, checklistMatch[1]);
        }
      } else {
        console.log('[Audit Bee] No CHECKLIST_UPDATE found in chat response');
      }

      const cleanText = fullText
        .replace(/<!--CHECKLIST_UPDATE:[\s\S]*?-->/g, '')
        .trim();
      updateLastAssistantMessage(cleanText);
    } catch {
      updateLastAssistantMessage(
        'Sorry, an error occurred. Please try again.'
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-lavender-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">
        <BeeLogo size={32} />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Audit Bee</h3>
          <p className="text-[10px] text-gray-400">AI Audit Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BeeLogo size={72} className="mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Welcome to Audit Bee
            </h3>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              {!guide
                ? 'Upload a program guide (PDF/DOCX) in the left panel to get started.'
                : !selectedSection
                  ? 'Select an assessment section from the dropdown.'
                  : 'Upload your evidence documents and click "Analyse My Documents" to begin.'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-6 py-4 shrink-0">
        <div className="flex items-end gap-3 bg-lavender-50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !guide
                ? 'Upload a program guide to start...'
                : !selectedSection
                  ? 'Select a section first...'
                  : 'Ask about this section or type a question...'
            }
            disabled={!selectedSection || isStreaming || !guide}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none disabled:opacity-50 max-h-32"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={sendMessage}
            disabled={
              !input.trim() || !selectedSection || isStreaming || !guide
            }
            className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
