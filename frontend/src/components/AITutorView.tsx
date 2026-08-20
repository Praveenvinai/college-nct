import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Upload,
  Send,
  Check,
  Copy,
  X,
  FileCheck,
  Eye,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Pause,
  Play,
  Square,
} from 'lucide-react';
import { PDFDocument, Student, TutorMessage } from '../types';

interface AITutorViewProps {
  student: Student | null;
}

const EXAMPLE_QUESTIONS = [
  'What is machine learning?',
  'Explain entropy.',
  'Summarize this topic.',
  'Explain this concept with an example.',
];

const FRIENDLY_ANSWER_ERROR =
  'Unable to get an answer right now.\n\nPlease try again.';
const FRIENDLY_UPLOAD_ERROR =
  'Unable to upload that PDF right now.\n\nPlease try again.';

function slugNotesId(filename: string): string {
  const base = filename.replace(/\.(pdf|pptx)$/i, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'portal-notes';
}

export const AITutorView: React.FC<AITutorViewProps> = ({ student }) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(true);

  const [pdfDocuments, setPdfDocuments] = useState<PDFDocument[]>([]);
  const [isParsingPDF, setIsParsingPDF] = useState<boolean>(false);
  const [previewingDoc, setPreviewingDoc] = useState<PDFDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimeoutRef = useRef<number | null>(null);
  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const role = student?.role;
  const displayName = student?.name?.trim() || '';
  const isVisitor = !student;

  const scrollToBottom = () => {
    const list = conversationListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputQuery(transcript);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const clearSpeakTimeout = () => {
    if (speakTimeoutRef.current != null) {
      window.clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
  };

  const stopSpeaking = () => {
    clearSpeakTimeout();
    utteranceRef.current = null;
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingMessageId(null);
  };

  const pauseSpeaking = () => {
    if (!speechSupported || !isSpeaking || isPaused) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (!speechSupported || !isSpeaking || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  useEffect(() => {
    return () => {
      clearSpeakTimeout();
      utteranceRef.current = null;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        'Speech recognition is not supported in your browser. You can type your query in the input field.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputQuery('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string, messageId?: string) => {
    if (!speechSupported) return;

    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    if (!cleanText) return;

    clearSpeakTimeout();
    utteranceRef.current = null;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingMessageId(null);
    };
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingMessageId(null);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setIsPaused(false);
    setSpeakingMessageId(messageId ?? null);

    speakTimeoutRef.current = window.setTimeout(() => {
      speakTimeoutRef.current = null;
      if (utteranceRef.current !== utterance) return;
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.resume();
    }, 50);
  };

  const handleMultiplePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = (Array.from(files) as File[]).filter((f: File) =>
      f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.pptx')
    );

    // Detect unsupported old .ppt format
    const hasPpt = (Array.from(files) as File[]).some(
      (f: File) =>
        f.name.toLowerCase().endsWith('.ppt') && !f.name.toLowerCase().endsWith('.pptx')
    );
    if (hasPpt) {
      alert(
        '.ppt files are not supported.\n\nPlease re-save the file as .pptx in PowerPoint (File → Save As → PowerPoint Presentation) and try again.'
      );
      e.target.value = '';
      return;
    }

    if (fileList.length === 0) {
      alert('Please upload a PDF or PPTX file. Only .pdf and .pptx formats are supported.');
      e.target.value = '';
      return;
    }

    const file = fileList[fileList.length - 1];
    const notesId = slugNotesId(file.name);

    setIsParsingPDF(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes_id', notesId);

      const response = await fetch('/api/tutor/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-err-${Date.now()}`,
            sender: 'ai',
            text: FRIENDLY_UPLOAD_ERROR,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsParsingPDF(false);
        e.target.value = '';
        return;
      }

      const storedNotesId =
        typeof data.notes_id === 'string' && data.notes_id.trim()
          ? data.notes_id.trim()
          : notesId;
      const pages = typeof data.pages === 'number' ? data.pages : 1;
      const textLength = typeof data.text_length === 'number' ? data.text_length : undefined;

      const newDoc: PDFDocument = {
        id: `pdf-${Date.now()}-${file.name}`,
        name: file.name,
        pages,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contentSnippet: `Classroom notes extracted · ${pages} page${pages === 1 ? '' : 's'}${textLength != null ? ` · ${textLength} characters` : ''} · notes_id \`${storedNotesId}\`.`,
        isActive: true,
        notesId: storedNotesId,
      };

      setPdfDocuments([newDoc]);

      // --- Existing upload confirmation message (unchanged) -----------------
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `Notes uploaded: ${file.name} (${pages} pages). I will answer from this document. A new upload replaces the previous notes.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pdfSources: [file.name],
        },
      ]);

      // --- Auto-generated PDF summary message (new) -------------------------
      const summaryText =
        typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : null;
      if (summaryText) {
        const fig = data.figure && typeof data.figure === 'object' ? data.figure : null;
        const summaryMsg: TutorMessage = {
          id: `msg-summary-${Date.now()}`,
          sender: 'ai',
          text: summaryText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pdfSources: [file.name],
          isSummary: true,
          figureBase64: fig?.imageBase64 ?? undefined,
          figureMimeType: fig?.mimeType ?? undefined,
          figureCaption: fig?.caption ?? undefined,
        };
        setMessages((prev) => [...prev, summaryMsg]);
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'ai',
          text: FRIENDLY_UPLOAD_ERROR,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setIsParsingPDF(false);
    e.target.value = '';
  };

  const toggleDocActive = (id: string) => {
    setPdfDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isActive: !doc.isActive } : doc))
    );
  };

  const setAllDocsActive = (active: boolean) => {
    setPdfDocuments((prev) => prev.map((doc) => ({ ...doc, isActive: active })));
  };

  const removeDocument = (id: string) => {
    setPdfDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const clearAllDocuments = async () => {
    if (
      !confirm(
        'Remove the uploaded PDF from the tutor library? Classroom notes already stored in Firebase are not deleted.'
      )
    )
      return;
    try {
      await fetch('/api/tutor/docs', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear tutor library:', err);
    }
    setPdfDocuments([]);
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const queryText = customPrompt || inputQuery.trim();
    if (!queryText || isLoading) return;

    stopSpeaking();

    if (!customPrompt) setInputQuery('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const activeDocs = pdfDocuments.filter((doc) => doc.isActive !== false);
    const activeDocNames = activeDocs.map((d) => d.name);
    const notesId = activeDocs.find((d) => d.notesId)?.notesId;

    const userMsg: TutorMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pdfSources: activeDocNames.length > 0 ? activeDocNames : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (!notesId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'Upload a lecture PDF first so I can answer from your notes.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          notes_id: notesId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('AI tutor chat failed:', {
          status: response.status,
          error: data.error,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            sender: 'ai',
            text: FRIENDLY_ANSWER_ERROR,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Strip any leaked RELEVANT_SLIDE marker (safety net — backend already removes it)
      const aiResponseText = (
        data.text || 'I analyzed your question using the uploaded classroom notes.'
      ).replace(/\nRELEVANT_SLIDE:\s*\d+\s*$/im, '').trim();

      const slideNum: number | null =
        typeof data.slideNumber === 'number' ? data.slideNumber : null;

      const aiMsg: TutorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pdfSources: data.activeDocs?.length ? data.activeDocs : activeDocNames,
        slideImageBase64:
          typeof data.slideImageBase64 === 'string' && data.slideImageBase64
            ? data.slideImageBase64
            : undefined,
        slideNumber: slideNum ?? undefined,
        slideCaption: slideNum ? `Slide ${slideNum}` : undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      if (autoSpeechEnabled) {
        speakText(aiResponseText, aiMsg.id);
      }
    } catch (err) {
      console.error('Error communicating with AI tutor:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: FRIENDLY_ANSWER_ERROR,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputQuery.trim() && !isLoading) {
        handleSendMessage();
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeDocs = pdfDocuments.filter((d) => d.isActive !== false);
  const currentMaterialName = activeDocs[0]?.name;

  const welcome =
    role === 'student' && displayName
      ? {
          title: `Welcome back, ${displayName}`,
          body: 'Ask your AI Professor about your courses, lecture notes, or study topics.',
        }
      : role === 'staff' && displayName
        ? {
            title: `Welcome, ${displayName}`,
            body: 'Ask your AI Professor about campus teaching materials, lecture notes, or academic topics.',
          }
        : {
            title: 'Welcome to the AI Tutor',
            body: 'Ask questions and explore the available campus learning resources.',
          };

  const renderSpeechControls = () =>
    speechSupported && isSpeaking ? (
      <div className="flex flex-wrap items-center gap-2">
        {isPaused ? (
          <button
            type="button"
            onClick={resumeSpeaking}
            aria-label="Resume speaking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] text-xs font-medium hover:bg-[#524639] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
          >
            <Play className="w-3 h-3" aria-hidden="true" />
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={pauseSpeaking}
            aria-label="Pause speaking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] text-xs font-medium hover:bg-[#524639] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
          >
            <Pause className="w-3 h-3" aria-hidden="true" />
            Pause
          </button>
        )}
        <button
          type="button"
          onClick={stopSpeaking}
          aria-label="Stop speaking"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] text-xs font-medium hover:bg-[#524639] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
        >
          <Square className="w-3 h-3" aria-hidden="true" />
          Stop
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#998f86]">
          AI Tutor
        </p>
        <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic">
          {isVisitor ? 'Public campus learning assistant' : 'Your Campus AI Professor'}
        </h1>
        <p className="text-sm text-[#998f86] leading-relaxed max-w-2xl">
          Ask questions, explore your lecture material, and get answers from your campus AI
          assistant.
        </p>
        <div className="pt-1">
          <p className="text-base font-medium text-[#e0d7d0]">{welcome.title}</p>
          <p className="text-sm text-[#998f86] mt-1 leading-relaxed">{welcome.body}</p>
        </div>
        {!speechSupported && (
          <p className="text-xs text-[#998f86]">Voice playback isn't supported in this browser.</p>
        )}
      </header>

      <section className="bg-[#221f1c] rounded-2xl border border-[#524639]/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#e0d7d0] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#998f86]" aria-hidden="true" />
              Learning Material
            </h2>
            <p className="text-xs text-[#998f86] mt-1">
              Current material:{' '}
              <span className="text-[#e0d7d0]">
                {currentMaterialName || 'None uploaded yet'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e0d7d0] text-[#171614] text-xs font-semibold cursor-pointer hover:bg-white transition-colors focus-within:ring-2 focus-within:ring-[#807368]">
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isParsingPDF ? 'Analysing notes...' : 'Upload lecture PDF / PPTX'}</span>
              <input
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleMultiplePDFUpload}
                className="sr-only"
                disabled={isParsingPDF}
                aria-label="Upload lecture PDF"
              />
            </label>
            {pdfDocuments.length > 0 && (
              <button
                type="button"
                onClick={clearAllDocuments}
                className="px-3 py-2 rounded-xl border border-[#524639]/60 text-xs text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#383129] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {pdfDocuments.length === 0 ? (
          <p className="text-xs text-[#998f86]">
            Upload a lecture PDF. Answers are grounded in that document.
          </p>
        ) : (
          <ul className="space-y-2">
            {pdfDocuments.map((doc) => {
              const isActive = doc.isActive !== false;
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#171614] border border-[#524639]/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleDocActive(doc.id)}
                      aria-label={isActive ? 'Exclude this PDF from answers' : 'Use this PDF for answers'}
                      className="shrink-0 text-[#998f86] hover:text-[#e0d7d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
                    >
                      {isActive ? (
                        <ToggleRight className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm text-[#e0d7d0] truncate">{doc.name}</p>
                      <p className="text-[11px] text-[#998f86]">
                        {doc.pages} pages · {isActive ? 'Used for answers' : 'Excluded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewingDoc(doc)}
                      aria-label={`View details for ${doc.name}`}
                      className="p-2 rounded-lg text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#383129] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      aria-label={`Remove ${doc.name}`}
                      className="p-2 rounded-lg text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#383129] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pdfDocuments.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllDocsActive(true)}
              className="text-[11px] text-[#998f86] hover:text-[#e0d7d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setAllDocsActive(false)}
              className="text-[11px] text-[#998f86] hover:text-[#e0d7d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
            >
              Deselect all
            </button>
          </div>
        )}
      </section>

      <section className="bg-[#221f1c] rounded-2xl border border-[#524639]/40 overflow-hidden flex flex-col min-h-[420px] max-h-[min(70vh,640px)]">
        <div ref={conversationListRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[#e0d7d0]">AI Professor</p>
                <p className="text-sm text-[#998f86] mt-2 leading-relaxed">
                  What would you like to learn today?
                </p>
              </div>
              <div>
                <p className="text-xs text-[#998f86] mb-2">Try asking:</p>
                <ul className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        onClick={() => handleSendMessage(undefined, question)}
                        disabled={isLoading}
                        className="text-left text-sm text-[#e0d7d0] hover:text-white underline-offset-2 hover:underline disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            const isThisSpeaking = isSpeaking && msg.id === speakingMessageId;

            return (
              <article key={msg.id} className="space-y-2 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#998f86]">
                  {isAI ? (msg.isSummary ? 'PDF Summary' : 'AI Professor') : 'You'}
                </p>

                {/* Summary label for auto-generated summary messages */}
                {msg.isSummary && (
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#807368] bg-[#2a2622] border border-[#524639]/40 px-2.5 py-1 rounded-lg">
                      📄 Auto Summary
                    </span>
                  </div>
                )}

                <div
                  className={`text-sm leading-7 whitespace-pre-wrap ${
                    isAI ? 'text-[#e0d7d0]' : 'text-[#c7b8ac]'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Extracted PDF figure displayed below the summary text */}
                {msg.isSummary && msg.figureBase64 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#807368]">
                      Key Figure
                    </p>
                    <div className="rounded-xl overflow-hidden border border-[#524639]/40 bg-[#171614] inline-block max-w-full">
                      <img
                        src={`data:${msg.figureMimeType ?? 'image/png'};base64,${msg.figureBase64}`}
                        alt={msg.figureCaption ?? 'PDF figure'}
                        className="block max-w-full h-auto"
                        style={{ maxWidth: '100%' }}
                      />
                    </div>
                    {msg.figureCaption && (
                      <p className="text-[11px] text-[#998f86] italic">{msg.figureCaption}</p>
                    )}
                  </div>
                )}

                {/* Relevant Slide/Page image display for Q&A answers */}
                {!msg.isSummary && msg.slideImageBase64 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#807368] flex items-center gap-1.5">
                      <span>📊 Relevant Slide</span>
                      {msg.slideNumber && <span>— {msg.slideNumber}</span>}
                    </p>
                    <div className="rounded-xl overflow-hidden border border-[#524639]/40 bg-[#171614] inline-block max-w-full">
                      <img
                        src={`data:image/jpeg;base64,${msg.slideImageBase64}`}
                        alt={msg.slideCaption ?? `Slide ${msg.slideNumber || ''}`}
                        className="block max-w-full h-auto"
                        style={{ maxWidth: '100%' }}
                      />
                    </div>
                    {msg.slideCaption && (
                      <p className="text-[11px] text-[#998f86] italic">{msg.slideCaption}</p>
                    )}
                  </div>
                )}


                {isAI && msg.pdfSources && msg.pdfSources.length > 0 && (
                  <p className="text-[11px] text-[#998f86] flex flex-wrap items-center gap-1.5">
                    <FileCheck className="w-3 h-3" aria-hidden="true" />
                    {msg.pdfSources.join(', ')}
                  </p>
                )}

                {isAI && (
                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    {isThisSpeaking ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[#998f86]">
                          {isPaused ? 'Paused' : 'Speaking...'}
                        </p>
                        {renderSpeechControls()}
                      </div>
                    ) : speechSupported ? (
                      <button
                        type="button"
                        onClick={() => speakText(msg.text, msg.id)}
                        aria-label="Replay answer"
                        className="flex items-center gap-1.5 text-xs text-[#998f86] hover:text-[#e0d7d0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
                      >
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Replay
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      aria-label="Copy answer"
                      className="flex items-center gap-1.5 text-xs text-[#998f86] hover:text-[#e0d7d0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[#998f86]" aria-live="polite">
              <span
                className="inline-block w-2 h-2 rounded-full bg-[#e0d7d0] animate-pulse"
                aria-hidden="true"
              />
              AI Professor is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-4 sm:p-5 border-t border-[#524639]/40 bg-[#181614] space-y-3"
        >
          <div className="relative">
            <textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={isLoading}
              rows={3}
              placeholder={
                isListening
                  ? 'Listening...'
                  : activeDocs.length > 0
                    ? 'Ask your question...'
                    : 'Ask your question... Upload a lecture PDF for notes-grounded answers.'
              }
              aria-label="Ask your question"
              className="w-full resize-none bg-[#221f1c] border border-[#524639]/60 rounded-2xl px-4 py-3 pr-12 text-sm text-[#e0d7d0] placeholder-[#998f86] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#807368] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={toggleListening}
              aria-label={isListening ? 'Stop microphone' : 'Start speech input'}
              className={`absolute right-3 bottom-3 p-2 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] ${
                isListening
                  ? 'bg-rose-700 text-white border-rose-500'
                  : 'bg-[#2a2622] border-[#524639] text-[#e0d7d0] hover:bg-[#383129]'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Mic className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !autoSpeechEnabled;
                setAutoSpeechEnabled(next);
                if (!next) stopSpeaking();
              }}
              disabled={!speechSupported}
              className="text-xs text-[#998f86] hover:text-[#e0d7d0] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368] rounded"
            >
              {autoSpeechEnabled ? 'Mute voice' : 'Unmute voice'}
            </button>
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e0d7d0] text-[#171614] text-sm font-semibold hover:bg-white transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Ask Professor
            </button>
          </div>
        </form>
      </section>

      {previewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171614]/80">
          <div
            className="bg-[#221f1c] max-w-2xl w-full p-6 rounded-2xl border border-[#524639]/50 space-y-4 max-h-[85vh] flex flex-col"
            role="dialog"
            aria-labelledby="pdf-preview-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pdf-preview-title" className="text-sm font-semibold text-[#e0d7d0]">
                  {previewingDoc.name}
                </h3>
                <p className="text-xs text-[#998f86] mt-1">
                  {previewingDoc.pages} pages · {previewingDoc.size}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingDoc(null)}
                aria-label="Close document details"
                className="p-1.5 rounded-lg text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#383129] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#171614] p-4 rounded-xl border border-[#524639]/30 text-xs text-[#c7b8ac] whitespace-pre-wrap leading-relaxed">
              {previewingDoc.contentSnippet}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingDoc(null)}
                className="px-4 py-2 rounded-xl bg-[#383129] text-[#e0d7d0] text-xs font-medium hover:bg-[#524639] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#807368]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
