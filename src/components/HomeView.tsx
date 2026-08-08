import React from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  ShieldCheck, 
  Award, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Bell, 
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Student, Announcement, PurchaseRecord } from '../types';
import { NationalCollegeLogo } from './NationalCollegeLogo';
import { CAMPUS_AERIAL_GATE_URL, CAMPUS_AUTONOMOUS_GATE_URL } from '../assets/collegeAssets';

interface HomeViewProps {
  student: Student;
  announcements: Announcement[];
  recentPurchases: PurchaseRecord[];
  onNavigate: (tab: string) => void;
  onOpenFaceAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  student,
  announcements,
  recentPurchases,
  onNavigate,
  onOpenFaceAuth
}) => {
  return (
    <div className="space-y-8">
      
      {/* National College Hero Showcase Header with Official Logo Seal & Campus Photo */}
      <div className="relative rounded-3xl overflow-hidden bg-[#221f1c] border border-[#524639]/60 shadow-2xl">
        {/* Subtle Background Campus Image with Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img 
            src={CAMPUS_AERIAL_GATE_URL} 
            alt="National College Campus" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171614] via-[#171614]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Official Emblem Seal + Student Welcome Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="p-2 rounded-2xl bg-[#171614]/90 border border-[#524639] shadow-xl shrink-0">
              <NationalCollegeLogo className="w-20 h-20 sm:w-24 sm:h-24" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#383129] text-[#e0d7d0] border border-[#524639] font-mono uppercase tracking-widest">
                  National College Trichinopoly
                </span>
                <span className="text-xs text-[#998f86] font-serif italic">सा विद्या या विमुक्तये</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#e0d7d0] font-serif italic pt-1">
                Welcome back, {student.name}
              </h1>

              <p className="text-xs sm:text-sm text-[#998f86] font-medium tracking-wide">
                {student.department} • <span className="text-[#e0d7d0] font-mono">{student.rollNumber}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigate('tutor')}
              className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-[#e0d7d0] text-[#171614] font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-xl"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Tutor</span>
            </button>

            <button
              onClick={() => onNavigate('store')}
              className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-[#2a2622] border border-[#524639]/60 text-[#e0d7d0] font-bold text-xs uppercase tracking-widest hover:border-[#998f86] transition-all shadow-lg"
            >
              <ShoppingBag className="w-4 h-4 text-[#998f86]" />
              <span>Smart Store</span>
            </button>
          </div>

        </div>
      </div>

      {/* Student Metrics Snapshot Grid - NO GPA, NO NFC WALLET */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Attendance Metric */}
        <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 hover:border-[#807368]/60 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#998f86] uppercase tracking-wider">VERIFIED ATTENDANCE</span>
            <div className="p-2 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#e0d7d0] font-['Outfit']">{student.attendance}%</span>
            <span className="text-xs text-emerald-400 font-bold font-mono">Verified</span>
          </div>
          <p className="text-[11px] text-[#998f86] mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> Facial Biometrics Auto-Logged
          </p>
        </div>

        {/* Active Enrolled Modules */}
        <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 hover:border-[#807368]/60 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#998f86] uppercase tracking-wider">ACTIVE MODULES</span>
            <div className="p-2 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#e0d7d0] font-['Outfit']">{student.enrolledCourses.length}</span>
            <span className="text-xs text-[#c7b8ac] font-bold font-mono">Registered</span>
          </div>
          <p className="text-[11px] text-[#998f86] mt-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#998f86]" /> RAG Audio AI Vectorized
          </p>
        </div>

        {/* Honors & Biometric Pass Status */}
        <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 hover:border-[#807368]/60 transition-all duration-300 group shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#998f86] uppercase tracking-wider">ACADEMIC STANDING</span>
            <div className="p-2 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#e0d7d0] font-['Outfit']">Dean's List</span>
            <span className="text-xs text-emerald-400 font-bold font-mono">Active</span>
          </div>
          <p className="text-[11px] text-[#998f86] mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> High Honor Scholar Record
          </p>
        </div>
      </div>

      {/* Main Grid: Campus Bulletins + Portal Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Campus Bulletins */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#998f86]" />
              National College Campus Bulletins
            </h3>
            <span className="text-xs text-[#998f86] font-mono">3 Active Bulletins</span>
          </div>

          <div className="space-y-4">
            {announcements.map((anc) => (
              <div
                key={anc.id}
                className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 hover:border-[#807368]/60 transition-all duration-300 shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#383129] text-[#e0d7d0] border border-[#524639]/50">
                    {anc.category}
                  </span>
                  <span className="text-xs text-[#998f86] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {anc.date}
                  </span>
                </div>

                <h4 className="text-base font-bold text-[#e0d7d0] font-['Outfit'] mb-1.5">
                  {anc.title}
                </h4>
                <p className="text-xs text-[#998f86] leading-relaxed">
                  {anc.content}
                </p>
              </div>
            ))}
          </div>
          {/* Campus Entrance Gallery Showcase */}
          <div className="bg-[#221f1c] rounded-3xl border border-[#524639]/40 overflow-hidden shadow-lg">
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img 
                src={CAMPUS_AUTONOMOUS_GATE_URL} 
                alt="National College Autonomous Gate Entrance" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171614] via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e0d7d0] bg-[#383129]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#524639]">
                    Main Gate Entrance
                  </span>
                  <h4 className="text-lg font-bold text-[#e0d7d0] font-serif italic mt-1">
                    National College (Autonomous)
                  </h4>
                </div>
              </div>
            </div>
            <div className="p-5 text-xs text-[#998f86] leading-relaxed">
              Established in 1919 in Trichinopoly, Tamil Nadu. Renowned autonomous institution fostering academic excellence, innovation, and holistic student growth.
            </div>
          </div>
        </div>

        {/* Right Column: Enrolled Modules & Dispenser Log */}
        <div className="space-y-6">
          
          {/* Enrolled Modules Box */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold text-[#998f86] tracking-wider uppercase flex items-center justify-between">
              <span>ACTIVE ENROLLED MODULES</span>
              <span className="text-xs text-[#e0d7d0] font-mono">{student.enrolledCourses.length} Active</span>
            </h3>

            <div className="space-y-2">
              {student.enrolledCourses.map((course, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('tutor')}
                  className="p-3.5 rounded-2xl bg-[#171614] border border-[#524639]/30 flex items-center justify-between hover:border-[#807368]/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4 text-[#998f86] group-hover:text-[#e0d7d0] transition-colors shrink-0" />
                    <span className="text-xs font-semibold text-[#e0d7d0]">{course}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#807368] group-hover:text-[#e0d7d0] transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Dispenser & Support Requests */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#998f86] tracking-wider uppercase">INSTITUTIONAL DISPENSER LOG</h3>
              <button
                onClick={() => onNavigate('store')}
                className="text-xs text-[#e0d7d0] font-bold hover:underline"
              >
                Open Store
              </button>
            </div>

            <div className="space-y-2.5">
              {recentPurchases.slice(0, 3).map((tx) => (
                <div key={tx.id} className="p-3 rounded-2xl bg-[#171614] border border-[#524639]/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#e0d7d0]">{tx.itemName}</p>
                    <p className="text-[10px] text-[#998f86] font-mono">{tx.timestamp}</p>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#383129] text-[#e0d7d0] border border-[#524639]/40">
                    Dispensed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

