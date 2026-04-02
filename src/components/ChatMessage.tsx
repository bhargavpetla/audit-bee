'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import BeeLogo from './BeeLogo';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  // Strip hidden checklist update from display
  const displayContent = message.content
    .replace(/<!--CHECKLIST_UPDATE:[\s\S]*?-->/g, '')
    .trim();

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 mb-4">
        <div className="max-w-[75%] bg-primary text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed">
          {displayContent}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-1">
        <BeeLogo size={22} />
      </div>
      <div
        className={`max-w-[85%] bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-700 shadow-sm ${
          message.isStreaming && !displayContent ? '' : ''
        }`}
      >
        {displayContent ? (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 py-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.15s' }}
            />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
