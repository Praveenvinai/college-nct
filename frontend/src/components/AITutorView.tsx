import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  Upload, 
  Send, 
  Bot, 
  User, 
  Check, 
  Copy, 
  X, 
  FileCheck, 
  Layers, 
  Eye, 
  BookOpen, 
  ToggleLeft,
  ToggleRight,
  Compass,
} from 'lucide-react';
import { TutorMessage, PDFDocument } from '../types';

interface AITutorViewProps {
  studentName: string;
}

export const AITutorView: React.FC<AITutorViewProps> = ({ studentName }) => {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Welcome ${studentName}! I am Professor Cybera, your National College AI Scholar Tutor. Upload course PDFs and I will index them with the RAG engine (FAISS + Groq). Then ask questions — I retrieve relevant pages and cite your documents.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(true);
  
  const [pdfDocuments, setPdfDocuments] = useState<PDFDocument[]>([]);
  const [isParsingPDF, setIsParsingPDF] = useState<boolean>(false);
  const [previewingDoc, setPreviewingDoc] = useState<PDFDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. You can type your query in the input field.");
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

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~]/g, '').substring(0, 400);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleMultiplePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files).filter((f: File) =>
      f.name.toLowerCase().endsWith('.pdf')
    );
    if (fileList.length === 0) {
      alert('Please upload PDF files only. The RAG engine indexes PDFs on the AI Tutor service.');
      e.target.value = '';
      return;
    }

    setIsParsingPDF(true);
    const newDocs: PDFDocument[] = [];
    const errors: string[] = [];

    for (const file of fileList) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/tutor/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (!response.ok || data.error) {
          errors.push(`${file.name}: ${data.error || 'upload failed'}`);
          continue;
        }

        newDocs.push({
          id: `pdf-${Date.now()}-${file.name}`,
          name: data.filename || file.name,
          pages: data.pages || 1,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contentSnippet: `Indexed on AI Tutor RAG · ${data.chunks ?? '?'} vector chunks · ${data.pages ?? '?'} pages with text.`,
          isActive: true,
        });
      } catch (err) {
        console.error('PDF upload error:', err);
        errors.push(`${file.name}: AI Tutor service unreachable`);
      }
    }

    if (newDocs.length > 0) {
      setPdfDocuments((prev) => [...prev, ...newDocs]);
      const fileNames = newDocs.map((d) => d.name).join(', ');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**${newDocs.length} PDF(s) indexed** in the RAG knowledge base: \`${fileNames}\`. Ask questions and I will retrieve relevant pages.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pdfSources: newDocs.map((d) => d.name),
        },
      ]);
    }

    if (errors.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'ai',
          text: `Some uploads failed:\n${errors.map((e) => `- ${e}`).join('\n')}\n\nMake sure the AI Tutor service is running (\`python ai-tutor/rag/rag.py\` on port 8001).`,
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
    if (!confirm('Remove all PDF documents from the RAG bank (local UI + server index)?')) return;
    try {
      await fetch('/api/tutor/docs', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear server KB:', err);
    }
    setPdfDocuments([]);
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const queryText = customPrompt || inputQuery.trim();
    if (!queryText || isLoading) return;

    if (!customPrompt) setInputQuery('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const activeDocs = pdfDocuments.filter((doc) => doc.isActive !== false);
    const activeDocNames = activeDocs.map((d) => d.name);

    const userMsg: TutorMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pdfSources: activeDocNames.length > 0 ? activeDocNames : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          filenames: activeDocNames,
          history: messages.slice(-4),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errText =
          data.error ||
          'AI Tutor RAG is unreachable. Start it with: python ai-tutor/rag/rag.py';
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            sender: 'ai',
            text: errText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsLoading(false);
        return;
      }

      const aiResponseText = data.text || 'I analyzed your query across the indexed course documents.';

      const aiMsg: TutorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pdfSources: data.activeDocs?.length ? data.activeDocs : activeDocNames,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      if (autoSpeechEnabled) {
        speakText(aiResponseText);
      }
    } catch (err) {
      console.error('Error communicating with AI tutor:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'Could not reach the AI Tutor. Ensure the portal server and `ai-tutor/rag/rag.py` are both running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeDocCount = pdfDocuments.filter((d) => d.isActive !== false).length;
  const totalPagesIndexed = pdfDocuments
    .filter((d) => d.isActive !== false)
    .reduce((acc, d) => acc + d.pages, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400">
                <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </span>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">FAISS + Groq RAG Engine</div>
                <h2 className="text-2xl sm:text-3xl font-light text-white font-serif italic">
                  AI Scholar Tutor
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              Connected to the local AI Tutor service. Upload PDFs to build a vector index, then ask questions with page-level retrieval and citations.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white">{activeDocCount}</strong> of <strong className="text-slate-400">{pdfDocuments.length}</strong> Active PDFs ({totalPagesIndexed} Pages Indexed)
              </span>
            </div>

            <label className="flex items-center space-x-2 px-5 py-2 rounded-full bg-white text-slate-950 font-bold text-xs uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-md cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{isParsingPDF ? 'Indexing PDFs...' : 'Upload Course PDFs'}</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleMultiplePDFUpload}
                className="hidden"
                disabled={isParsingPDF}
              />
            </label>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden bg-slate-900/30">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-amber-500/5 to-transparent pointer-events-none"></div>

          <div className="relative flex items-center justify-center my-2">
            <div className={`w-28 h-28 rounded-full border-2 border-cyan-400/40 flex items-center justify-center transition-all duration-500 ${
              isSpeaking ? 'animate-ping border-cyan-300 scale-110' : isListening ? 'border-rose-500 scale-105' : 'glow-cyan'
            }`}>
              <div className={`w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-slate-900 to-amber-300 flex items-center justify-center shadow-2xl transition-transform ${
                isSpeaking || isListening ? 'scale-110 animate-pulse' : ''
              }`}>
                <Bot className="w-10 h-10 text-slate-100" />
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              {isListening ? 'LISTENING TO VOICE...' : isSpeaking ? 'PROFESSOR CYBERA SPEAKING...' : isLoading ? 'RETRIEVING FROM RAG...' : 'RAG READY'}
            </p>
            <p className="text-[11px] text-slate-400">
              {autoSpeechEnabled ? 'Voice Playback Active' : 'Voice Muted'}
            </p>
          </div>

          <button
            onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
            className="mt-3 px-3 py-1 rounded-full text-[10px] font-bold font-mono border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {autoSpeechEnabled ? 'Mute Audio' : 'Unmute Audio'}
          </button>
        </div>
      </div>

      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4 bg-slate-900/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              Indexed PDF Library ({pdfDocuments.length} Documents)
            </h3>
          </div>

          {pdfDocuments.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setAllDocsActive(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setAllDocsActive(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={clearAllDocuments}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-mono transition-colors border border-rose-500/30"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {pdfDocuments.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No PDF documents indexed yet.</p>
            <p className="text-[11px] text-slate-500">Upload lecture PDFs to build the FAISS knowledge base on the AI Tutor service.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pdfDocuments.map((doc) => {
              const isActive = doc.isActive !== false;
              return (
                <div
                  key={doc.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                    isActive
                      ? 'bg-slate-900/90 border-cyan-400/40 shadow-lg glow-cyan'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleDocActive(doc.id)}
                        className="text-cyan-400 hover:scale-110 transition-transform shrink-0"
                        title={isActive ? "Disable this PDF for RAG" : "Enable this PDF for RAG"}
                      >
                        {isActive ? (
                          <ToggleRight className="w-6 h-6 text-cyan-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold font-mono truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {doc.pages} Pages · {doc.size}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors shrink-0"
                      title="Remove from UI (server index keeps chunks until Clear All)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                    <span className={isActive ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                      {isActive ? '● Included in retrieval' : '○ Excluded'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewingDoc(doc)}
                      className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Quick queries:
        </span>
        <button
          onClick={() => handleSendMessage(undefined, "Summarize the key concepts from my uploaded PDF documents.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          Summarize Key Concepts
        </button>
        <button
          onClick={() => handleSendMessage(undefined, "Generate 5 exam review questions based on my uploaded course documents.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          Exam Prep Questions
        </button>
        <button
          onClick={() => handleSendMessage(undefined, "Extract important formulas and definitions from my documents, citing pages.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          Formulas & Citations
        </button>
      </div>

      {(isListening || isLoading || isSpeaking) && (
        <div className="bg-[#221f1c] border border-[#524639]/60 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 h-10 px-3 bg-[#171614] rounded-xl border border-[#524639]/60">
              <span className="w-1 bg-[#e0d7d0] rounded-full animate-soundwave" style={{ animationDelay: '0.05s', height: '80%' }}></span>
              <span className="w-1 bg-[#998f86] rounded-full animate-soundwave" style={{ animationDelay: '0.2s', height: '100%' }}></span>
              <span className="w-1 bg-[#e0d7d0] rounded-full animate-soundwave" style={{ animationDelay: '0.35s', height: '60%' }}></span>
              <span className="w-1 bg-[#807368] rounded-full animate-soundwave" style={{ animationDelay: '0.1s', height: '90%' }}></span>
              <span className="w-1 bg-[#e0d7d0] rounded-full animate-soundwave" style={{ animationDelay: '0.4s', height: '100%' }}></span>
              <span className="w-1 bg-[#998f86] rounded-full animate-soundwave" style={{ animationDelay: '0.25s', height: '70%' }}></span>
              <span className="w-1 bg-[#e0d7d0] rounded-full animate-soundwave" style={{ animationDelay: '0.15s', height: '95%' }}></span>
              <span className="w-1 bg-[#807368] rounded-full animate-soundwave" style={{ animationDelay: '0.3s', height: '50%' }}></span>
            </div>

            <div>
              <p className="text-xs font-bold text-[#e0d7d0] flex items-center gap-2">
                {isListening && <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>}
                {isListening 
                  ? 'Listening & Analyzing Voice Input...' 
                  : isLoading 
                  ? 'Retrieving chunks from FAISS and generating answer...' 
                  : 'Speaking response...'}
              </p>
              <p className="text-[10px] text-[#998f86] font-mono mt-0.5">
                {isListening ? 'Speak clearly into your microphone' : 'Professor Cybera · Groq RAG'}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-[#e0d7d0] bg-[#383129] px-3.5 py-1.5 rounded-full border border-[#524639]/60 shadow-sm">
            {isListening ? 'Listening' : isLoading ? 'Processing' : 'Speaking'}
          </div>
        </div>
      )}

      <div className="bg-[#221f1c] rounded-3xl border border-[#524639]/50 shadow-2xl overflow-hidden flex flex-col h-[520px]">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#171614]/50">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3.5 ${isAI ? '' : 'flex-row-reverse space-x-reverse'}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isAI 
                    ? 'bg-[#2a2622] border-[#807368]/60 text-[#e0d7d0] shadow-md' 
                    : 'bg-[#383129] border-[#524639] text-[#e0d7d0]'
                }`}>
                  {isAI ? <Bot className="w-5 h-5 text-[#e0d7d0]" /> : <User className="w-5 h-5" />}
                </div>

                <div className={`max-w-2xl rounded-2xl p-5 border text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                  isAI
                    ? 'bg-[#221f1c] border-[#524639]/60 text-[#e0d7d0] shadow-xl'
                    : 'bg-[#2a2622] border-[#807368]/50 text-[#e0d7d0] shadow-lg'
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#998f86] pb-2 border-b border-[#524639]/40">
                    <span className="font-bold text-[#e0d7d0]">
                      {isAI ? 'PROFESSOR CYBERA (AI TUTOR)' : studentName}
                    </span>
                    <span className="flex items-center gap-2">
                      <span>{msg.timestamp}</span>
                    </span>
                  </div>

                  {msg.pdfSources && msg.pdfSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-[#998f86] font-bold">Cited Docs ({msg.pdfSources.length}):</span>
                      {msg.pdfSources.map((source, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] text-[10px] font-mono flex items-center gap-1"
                        >
                          <FileCheck className="w-3 h-3 text-[#998f86]" />
                          <span className="truncate max-w-[180px]">{source}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-[#e0d7d0]">
                    {msg.text}
                  </div>

                  {isAI && (
                    <div className="pt-2 flex items-center space-x-3 text-[11px] font-mono text-[#998f86] border-t border-[#524639]/40">
                      <button
                        onClick={() => speakText(msg.text)}
                        className="flex items-center space-x-1 hover:text-[#e0d7d0] transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#e0d7d0]" />
                        <span>Replay Voice</span>
                      </button>

                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center space-x-1 hover:text-[#e0d7d0] transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Notes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-[#221f1c] border border-[#524639]/60 w-fit">
              <Bot className="w-5 h-5 text-[#e0d7d0] animate-spin" />
              <span className="text-xs font-mono text-[#e0d7d0]">
                Retrieving from {activeDocCount || 'general'} active PDF{activeDocCount === 1 ? '' : 's'}...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 bg-[#181614] border-t border-[#524639]/50 flex items-center space-x-3">
          
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-xl'
                : 'bg-[#2a2622] border-[#524639] text-[#e0d7d0] hover:border-[#807368] hover:bg-[#383129]'
            }`}
            title={isListening ? 'Stop Microphone' : 'Start Speech Input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isListening
                ? 'Hearing your speech input...'
                : activeDocCount > 0
                  ? `Ask across your ${activeDocCount} active PDF document${activeDocCount === 1 ? '' : 's'}...`
                  : 'Ask Professor Cybera (upload PDFs for document-grounded answers)...'
            }
            className="flex-1 bg-[#221f1c] border border-[#524639]/60 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#e0d7d0] placeholder-[#998f86] focus:outline-none focus:border-[#807368] font-medium"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-3 rounded-2xl bg-[#e0d7d0] text-[#171614] font-bold hover:bg-white transition-all disabled:opacity-40 shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {previewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-slate-800 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{previewingDoc.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {previewingDoc.pages} Pages · {previewingDoc.size} · Uploaded {previewingDoc.uploadedAt}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {previewingDoc.contentSnippet}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                Status: <strong className={previewingDoc.isActive !== false ? "text-cyan-400" : "text-rose-400"}>
                  {previewingDoc.isActive !== false ? "Active for RAG retrieval" : "Inactive"}
                </strong>
              </span>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="px-5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
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
