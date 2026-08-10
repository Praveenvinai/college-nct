import React from 'react';
import { Shield, Sparkles, Building, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full glass-panel border-t border-slate-800/80 mt-20 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Institutional Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-['Outfit'] font-black text-amber-400">
                NC
              </div>
              <span className="font-['Outfit'] font-bold text-white text-lg tracking-tight">
                NATIONAL COLLEGE PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              National College Student Portal integrates biometric facial recognition authentication, AI-driven lecture voice tutoring with RAG PDF synthesis, and real-time smart vending dispenser controllers.
            </p>
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Biometric Vector Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> ISO 27001 Certified
              </span>
            </div>
          </div>

          {/* Quick Academic Links */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3 font-['Outfit']">ACADEMIC MODULES</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#tutor" className="hover:text-amber-300 transition-colors">AI Voice Professor (RAG)</a></li>
              <li><a href="#store" className="hover:text-amber-300 transition-colors">Library Dispenser Store</a></li>
              <li><a href="#profile" className="hover:text-amber-300 transition-colors">Biometric Profile Vault</a></li>
              <li><a href="#contact" className="hover:text-amber-300 transition-colors">Campus Registrar Support</a></li>
            </ul>
          </div>

          {/* Campus Location */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3 font-['Outfit']">CENTRAL CAMPUS</h4>
            <div className="space-y-2 text-xs">
              <p className="flex items-start gap-2">
                <Building className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>1000 Scholar Plaza, University Heights<br />Innovation Wing • Floor 4</span>
              </p>
              <p className="text-cyan-400 font-mono text-[11px] pt-1">
                System Status: All IoT Dispensers Online (100% Operational)
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium">
          <p>© 2026 National College. All rights reserved. Encrypted Biometric Student Systems.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Biometric Ethics</span>
            <span className="hover:text-slate-300 cursor-pointer">Institutional Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
