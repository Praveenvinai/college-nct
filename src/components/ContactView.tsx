import React, { useState } from 'react';
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  Clock, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const ContactView: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [category, setCategory] = useState<string>('Biometric Face Auth');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, category, message })
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const faqs = [
    {
      q: 'How does Biometric Facial Recognition work on campus?',
      a: 'National College uses encrypted 468-node facial feature vectors. When you look into the camera scanner, your face is converted into an anonymous mathematical hash and verified against the student registry without saving raw video.'
    },
    {
      q: 'How do I upload PDFs for the AI Tutor RAG system?',
      a: 'Navigate to the AI Tutor tab and drag & drop your lecture slides, textbook PDF, or note file. The AI indexes your document locally and incorporates the text directly when answering your voice or typed questions.'
    },
    {
      q: 'What if a vending machine dispenser item fails to release?',
      a: 'All vending machines feature optical drop sensors. If an item fails to dispense, your NFC student wallet is automatically refunded within 60 seconds and logged under your Store Purchase History.'
    },
    {
      q: 'How can I update my student profile photo or face vector?',
      a: 'You can re-scan your face at any time by clicking "Re-Scan Biometric Face" in the navbar or profile menu, or by visiting the Student IT Helpdesk in the Library Annex.'
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="glass-card p-8 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div className="flex items-center space-x-3 mb-2">
          <span className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 glow-gold">
            <Building className="w-6 h-6" />
          </span>
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            National College Registrar & Student Support
          </h2>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Need assistance with facial authentication enrollment, AI Tutor RAG lecture notes, or smart dispenser transactions? Submit a support inquiry or visit our central campus offices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Contact Form */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            Submit Student Support Inquiry
          </h3>

          {submitted && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Ticket registered with Student IT Helpdesk! A response will be sent to your institutional email.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alexander Vance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="a.vance@student.national.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Biometric Face Auth">Biometric Face Scanner</option>
                  <option value="AI Tutor PDF RAG">AI Tutor & PDF RAG</option>
                  <option value="Smart Dispenser Store">Vending Machine Dispenser</option>
                  <option value="Academic Registrar">Academic Registrar / GPA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Request to re-scan facial angles"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Inquiry Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or request in detail..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-xl hover:shadow-amber-500/20 transition-all glow-gold"
              >
                Submit Inquiry Ticket
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Campus Details & FAQ */}
        <div className="space-y-6">
          
          {/* Office Directory */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Campus Office Directory
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Central Registrar Hall</p>
                  <p className="text-slate-400">1000 Scholar Plaza, Building A</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start space-x-3">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Student Helpdesk Line</p>
                  <p className="text-slate-400 font-mono">+1 (800) 555-NC-PORTAL</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start space-x-3">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Support Hours</p>
                  <p className="text-slate-400">Mon - Fri: 8:00 AM - 8:00 PM EST</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              Frequently Asked Questions
            </h3>

            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-3 text-left text-xs font-bold text-white flex items-center justify-between"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
