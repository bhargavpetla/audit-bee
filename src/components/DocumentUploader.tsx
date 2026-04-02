'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useAudit } from '@/context/AuditContext';

export default function DocumentUploader() {
  const { documents, addDocument, removeDocument } = useAudit();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError('');
      setUploading(true);

      for (const file of acceptedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Upload failed');
          }

          const doc = await res.json();
          addDocument(doc);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        }
      }

      setUploading(false);
    },
    [addDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Upload Documents
      </label>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary-50'
            : 'border-gray-200 hover:border-primary/50 hover:bg-lavender-50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-gray-500">Parsing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-xs text-gray-500">
              {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-[10px] text-gray-400">PDF, DOCX, TXT</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
            >
              <FileText className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-xs text-green-800 truncate flex-1">{doc.name}</span>
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDocument(doc.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
