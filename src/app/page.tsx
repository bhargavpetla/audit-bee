'use client';

import AuditSetupPanel from '@/components/AuditSetupPanel';
import ChatPanel from '@/components/ChatPanel';
import ContextPanel from '@/components/ContextPanel';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AuditSetupPanel />
      <ChatPanel />
      <ContextPanel />
    </div>
  );
}
