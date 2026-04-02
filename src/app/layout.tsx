import type { Metadata } from 'next';
import './globals.css';
import { AuditProvider } from '@/context/AuditContext';

export const metadata: Metadata = {
  title: 'Audit Bee — AI Audit Assistant',
  description: 'AI-powered audit guidance for Google Cloud MSP assessments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuditProvider>{children}</AuditProvider>
      </body>
    </html>
  );
}
