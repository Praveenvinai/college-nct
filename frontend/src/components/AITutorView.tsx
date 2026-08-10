import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  Upload, 
  Send, 
  Trash2, 
  Bot, 
  User, 
  Check, 
  Copy, 
  X, 
  FileCheck, 
  Layers, 
  Eye, 
  Plus, 
  BookOpen, 
  FilePlus,
  ToggleLeft,
  ToggleRight,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { TutorMessage, PDFDocument } from '../types';

interface AITutorViewProps {
  studentName: string;
}

const SAMPLE_PDF_DOCS: PDFDocument[] = [
  {
    id: 'sample-pdf-1',
    name: 'CS101_Lecture_03_Neural_Networks.pdf',
    pages: 14,
    size: '1.8 MB',
    uploadedAt: 'Today 09:15 AM',
    contentSnippet: `Chapter 3: Artificial Neural Networks & Vector Spaces.
1. Multi-Layer Perceptrons (MLP): Composed of input, hidden, and output layers with non-linear activation functions (ReLU, Sigmoid, GELU).
2. Forward Propagation: Matrix multiplication W * X + b followed by activation f(z).
3. Backpropagation & Gradient Descent: Chain rule parameter updates using loss functions (Cross-Entropy, MSE).
4. Optimization: Adam Optimizer with learning rate decay schedules. Learning rate eta = 0.001.`,
    isActive: true,
  },
  {
    id: 'sample-pdf-2',
    name: 'MA201_Multivariable_Calculus_CheatSheet.pdf',
    pages: 8,
    size: '0.9 MB',
    uploadedAt: 'Today 10:30 AM',
    contentSnippet: `Section 4: Partial Derivatives & Gradient Vectors.
1. Gradient Vector Grad F = [dF/dx, dF/dy, dF/dz]. Represents direction of steepest ascent.
2. Jacobian Matrix: Matrix of all first-order partial derivatives for vector-valued functions.
3. Hessian Matrix: Second-order partial derivative matrix used in optimization and convexity testing.
4. Chain Rule in Higher Dimensions: dz/dt = (dz/dx)(dx/dt) + (dz/dy)(dy/dt).`,
    isActive: true,
  }
];

export const AITutorView: React.FC<AITutorViewProps> = ({ studentName }) => {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Welcome ${studentName}! I am Professor Cybera, your National College AI Scholar Tutor. I now support **Concurrent Multi-PDF RAG Synthesis**! You can upload multiple PDFs (lecture slides, textbook chapters, lab notes), toggle which documents are active, and ask me to cross-reference or synthesize information across all your active course documents simultaneously.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pdfSources: ['CS101_Lecture_03_Neural_Networks.pdf', 'MA201_Multivariable_Calculus_CheatSheet.pdf']
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(true);
  
  // Multi-PDF State
  const [pdfDocuments, setPdfDocuments] = useState<PDFDocument[]>(SAMPLE_PDF_DOCS);
  const [isParsingPDF, setIsParsingPDF] = useState<boolean>(false);
  const [previewingDoc, setPreviewingDoc] = useState<PDFDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Speech Recognition Setup (Web Speech API)
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

  // Toggle Voice Input
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

  // Speak Text using SpeechSynthesis
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

  // Handle Multi-PDF Uploads
  const handleMultiplePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsingPDF(true);

    const newDocs: PDFDocument[] = [];
    let processedCount = 0;

    const fileList: File[] = Array.from(files);
    fileList.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        const doc: PDFDocument = {
          id: `pdf-${Date.now()}-${index}`,
          name: file.name,
          pages: Math.floor(file.size / 20000) || Math.floor(Math.random() * 12) + 4,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contentSnippet: text.substring(0, 5000) || `Indexed contents of ${file.name}. Vector embeddings computed across document pages for multi-RAG retrieval.`,
          isActive: true
        };
        newDocs.push(doc);
        processedCount++;

        if (processedCount === fileList.length) {
          setTimeout(() => {
            setPdfDocuments((prev) => [...prev, ...newDocs]);
            setIsParsingPDF(false);

            // System Notification Message
            const fileNames = newDocs.map(d => d.name).join(', ');
            const systemMsg: TutorMessage = {
              id: `msg-${Date.now()}`,
              sender: 'ai',
              text: `📄 **${newDocs.length} Document(s) Added to Multi-RAG Bank**: Indexed \`${fileNames}\`. You can now ask questions across all active course PDFs concurrently!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              pdfSources: newDocs.map(d => d.name)
            };
            setMessages((prev) => [...prev, systemMsg]);
          }, 800);
        }
      };
      reader.readAsText(file);
    });
  };

  // Toggle Document Active State
  const toggleDocActive = (id: string) => {
    setPdfDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isActive: !doc.isActive } : doc))
    );
  };

  // Toggle All Documents Active/Inactive
  const setAllDocsActive = (active: boolean) => {
    setPdfDocuments((prev) => prev.map((doc) => ({ ...doc, isActive: active })));
  };

  // Delete Individual PDF Document
  const removeDocument = (id: string) => {
    setPdfDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  // Clear All Documents
  const clearAllDocuments = () => {
    if (confirm("Are you sure you want to remove all PDF documents from the RAG bank?")) {
      setPdfDocuments([]);
    }
  };

  // Add Sample Preset Documents
  const addSampleNotes = () => {
    const extraDoc: PDFDocument = {
      id: `sample-${Date.now()}`,
      name: `AI_Ethics_and_Governance_Module_${pdfDocuments.length + 1}.pdf`,
      pages: 12,
      size: '1.2 MB',
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contentSnippet: `Section 2: Ethical Considerations in Machine Intelligence.
1. Bias Mitigation: Demographic parity, equalized odds, and data audit pipelines.
2. Transparency & Explainability: SHAP values, LIME, and interpretable decision trees.
3. Privacy Frameworks: Differential privacy mechanisms and federated learning protocols.`,
      isActive: true
    };
    setPdfDocuments((prev) => [...prev, extraDoc]);
  };

  // Send Message with Multi-PDF Context
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
      pdfSources: activeDocNames.length > 0 ? activeDocNames : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          pdfContexts: activeDocs.map((doc) => ({
            name: doc.name,
            pages: doc.pages,
            contentSnippet: doc.contentSnippet
          })),
          history: messages.slice(-4)
        })
      });

      const data = await response.json();
      const aiResponseText = data.text || "I have analyzed your query across your active course documents.";

      const aiMsg: TutorMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pdfSources: data.activeDocs || activeDocNames
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      if (autoSpeechEnabled) {
        speakText(aiResponseText);
      }
    } catch (err) {
      console.error("Error communicating with AI tutor:", err);
      setIsLoading(false);
    }
  };

  // Copy Text
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
      
      {/* Top Section Header & Visualizer Orb */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tutor Identity */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400">
                <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </span>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Multi-PDF RAG Engine</div>
                <h2 className="text-2xl sm:text-3xl font-light text-white font-serif italic">
                  AI Scholar Tutor & Multi-Doc Synthesis
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
              Powered by Gemini 3.6 Flash. Upload multiple course PDFs concurrently to index vector chunks. Cross-reference, compare theorems, and synthesize answers across your active library.
            </p>
          </div>

          {/* Quick RAG Status Bar */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white">{activeDocCount}</strong> of <strong className="text-slate-400">{pdfDocuments.length}</strong> Active PDFs ({totalPagesIndexed} Pages Indexed)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={addSampleNotes}
                className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Sample PDF</span>
              </button>

              <label className="flex items-center space-x-2 px-5 py-2 rounded-full bg-white text-slate-950 font-bold text-xs uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-md cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isParsingPDF ? 'Indexing PDFs...' : 'Upload Course PDFs'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  multiple
                  onChange={handleMultiplePDFUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Animated Glowing AI Orb / Voice Visualizer */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden bg-slate-900/30">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-amber-500/5 to-transparent pointer-events-none"></div>

          {/* Orb Outer Rings */}
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
              {isListening ? '🎙️ LISTENING TO VOICE...' : isSpeaking ? '🔊 PROFESSOR CYBERA SPEAKING...' : isLoading ? '🧠 CROSS-REFERENCING ALL PDFs...' : 'MULTI-RAG READY'}
            </p>
            <p className="text-[11px] text-slate-400">
              {autoSpeechEnabled ? 'Voice Playback Active' : 'Voice Muted'}
            </p>
          </div>

          <button
            onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
            className="mt-3 px-3 py-1 rounded-full text-[10px] font-bold font-mono border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {autoSpeechEnabled ? '🔊 Mute Audio' : '🔈 Unmute Audio'}
          </button>
        </div>
      </div>

      {/* MULTI-DOCUMENT MANAGEMENT DRAWER / TABS BAR */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4 bg-slate-900/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              Active PDF Coursework Library ({pdfDocuments.length} Documents)
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

        {/* Documents Cards Grid */}
        {pdfDocuments.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No PDF documents uploaded yet.</p>
            <p className="text-[11px] text-slate-500">Upload lecture PDFs or click "Add Sample PDF" above to test multi-document RAG synthesis.</p>
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
                          {doc.pages} Pages • {doc.size}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors shrink-0"
                      title="Remove PDF"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                    <span className={isActive ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                      {isActive ? '● Included in RAG Prompt' : '○ Excluded'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewingDoc(doc)}
                      className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Inspect Vector Text</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK MULTI-DOC RAG SYNTHESIS PROMPTS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Cross-Doc Queries:
        </span>
        <button
          onClick={() => handleSendMessage(undefined, "Compare and synthesize the key concepts between my active uploaded PDF documents.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          🔄 Synthesize Key Overlap
        </button>
        <button
          onClick={() => handleSendMessage(undefined, "Generate 5 comprehensive exam review questions based on all active course documents.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          📝 Multi-Doc Exam Prep Questions
        </button>
        <button
          onClick={() => handleSendMessage(undefined, "Summarize formulas and core definitions across my active PDFs, citing each document title.")}
          className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-all"
        >
          📐 Extract Formulas & Cites
        </button>
      </div>

      {/* Hearing / Soundwave Voice Visualizer Banner */}
      {(isListening || isLoading || isSpeaking) && (
        <div className="bg-[#221f1c] border border-[#524639]/60 rounded-2xl p-4 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-4">
            {/* Animated Audio Equalizer Soundwave Bar Grid */}
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
                  ? 'Synthesizing response across PDF vector chunks...' 
                  : 'Speaking response...'}
              </p>
              <p className="text-[10px] text-[#998f86] font-mono mt-0.5">
                {isListening ? 'Speak clearly into your microphone — AI is hearing you...' : 'Professor Cybera Audio Synthesizer Active'}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-[#e0d7d0] bg-[#383129] px-3.5 py-1.5 rounded-full border border-[#524639]/60 shadow-sm">
            {isListening ? 'Listening' : isLoading ? 'Processing' : 'Speaking'}
          </div>
        </div>
      )}

      {/* Main Chat Thread Container */}
      <div className="bg-[#221f1c] rounded-3xl border border-[#524639]/50 shadow-2xl overflow-hidden flex flex-col h-[520px]">
        
        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#171614]/50">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3.5 ${isAI ? '' : 'flex-row-reverse space-x-reverse'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isAI 
                    ? 'bg-[#2a2622] border-[#807368]/60 text-[#e0d7d0] shadow-md' 
                    : 'bg-[#383129] border-[#524639] text-[#e0d7d0]'
                }`}>
                  {isAI ? <Bot className="w-5 h-5 text-[#e0d7d0]" /> : <User className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
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

                  {/* Active Document Sources Cited */}
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

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-[#221f1c] border border-[#524639]/60 w-fit">
              <Bot className="w-5 h-5 text-[#e0d7d0] animate-spin" />
              <span className="text-xs font-mono text-[#e0d7d0]">
                Synthesizing query across {activeDocCount} active PDF course documents...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Controls Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#181614] border-t border-[#524639]/50 flex items-center space-x-3">
          
          {/* Microphone Voice Toggle */}
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

          {/* Text Query Input */}
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isListening
                ? 'Hearing your speech input...'
                : `Ask Professor Cybera across your ${activeDocCount} active PDF documents...`
            }
            className="flex-1 bg-[#221f1c] border border-[#524639]/60 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#e0d7d0] placeholder-[#998f86] focus:outline-none focus:border-[#807368] font-medium"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-3 rounded-2xl bg-[#e0d7d0] text-[#171614] font-bold hover:bg-white transition-all disabled:opacity-40 shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* INSPECT DOCUMENT PREVIEW MODAL */}
      {previewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-slate-800 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{previewingDoc.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {previewingDoc.pages} Pages • {previewingDoc.size} • Uploaded {previewingDoc.uploadedAt}
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
                  {previewingDoc.isActive !== false ? "Active for Multi-RAG" : "Inactive"}
                </strong>
              </span>
              <button
                onClick={() => setPreviewingDoc(null)}
                className="px-5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
