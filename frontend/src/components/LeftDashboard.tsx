import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Home, 
  Sparkles, 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  Activity, 
  BookOpen, 
  Bell, 
  Clock, 
  LogOut,
  ChevronRight,
  Sparkle
} from 'lucide-react';
import { Student, Announcement } from '../types';
import { NationalCollegeLogo } from './NationalCollegeLogo';

interface LeftDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  announcements: Announcement[];
  onSignOut: () => void;
}

export const LeftDashboard: React.FC<LeftDashboardProps> = ({
  isOpen,
  onClose,
  student,
  activeTab,
  setActiveTab,
  announcements,
  onSignOut
}) => {
  const menuItems = [
    { id: 'home', label: 'Home Dashboard', icon: Home, badge: 'Overview' },
    { id: 'tutor', label: 'AI Tutor', icon: Sparkles, badge: 'Voice RAG' },
    { id: 'store', label: 'Smart Store', icon: ShoppingBag, badge: 'Vending' },
    { id: 'profile', label: 'Student Profile', icon: User, badge: 'ID Pass' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#171614]/80 backdrop-blur-md z-50"
          />

          {/* Left Slide-out Sidebar Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 w-80 sm:w-96 bg-[#1f1c19] border-r border-[#524639]/50 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
          >
            {/* Header */}
            <div>
              <div className="p-6 border-b border-[#524639]/40 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <NationalCollegeLogo className="w-10 h-10" />
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-[#998f86] font-bold block">
                      Autonomous
                    </span>
                    <h2 className="text-sm font-bold text-[#e0d7d0] tracking-tight font-serif">
                      NATIONAL COLLEGE
                    </h2>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-[#2a2622] border border-[#524639]/50 text-[#998f86] hover:text-[#e0d7d0] hover:border-[#998f86]/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Card Summary in Drawer */}
              {student && (
                <div className="p-6 border-b border-[#524639]/30 bg-[#181614]/60">
                  <div className="flex items-center space-x-4">
                    <img
                      src={student.photoUrl}
                      alt={student.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-[#807368]/60 shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono text-[#998f86] font-bold px-2 py-0.5 rounded bg-[#524639]/30 border border-[#524639]/60">
                          {student.id}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#e0d7d0] truncate font-['Outfit']">
                        {student.name}
                      </h3>
                      <p className="text-[11px] text-[#998f86] truncate">
                        {student.department}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Stat Strip (No GPA) */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-[#282420] border border-[#524639]/40">
                      <span className="text-[10px] uppercase tracking-wider text-[#998f86] font-bold block">
                        Attendance
                      </span>
                      <span className="text-sm font-extrabold text-[#e0d7d0] font-mono">
                        {student.attendance}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#282420] border border-[#524639]/40">
                      <span className="text-[10px] uppercase tracking-wider text-[#998f86] font-bold block">
                        Enrolled
                      </span>
                      <span className="text-sm font-extrabold text-[#e0d7d0] font-mono">
                        {student.enrolledCourses.length} Modules
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Navigation List */}
              <div className="p-4 space-y-1">
                <span className="px-3 text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#807368] block mb-2">
                  Navigation Menu
                </span>

                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                        isActive
                          ? 'bg-[#524639]/40 text-[#e0d7d0] border border-[#807368]/60 shadow-lg'
                          : 'text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#282420]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#e0d7d0]' : 'text-[#807368]'}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-[#2a2622] text-[#807368] border border-[#524639]/40">
                          {item.badge}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#807368]" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Announcements Snapshot */}
              <div className="px-4 py-3">
                <span className="px-3 text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#807368] block mb-2">
                  Campus Bulletins
                </span>

                <div className="space-y-2">
                  {announcements.slice(0, 2).map((anc) => (
                    <div
                      key={anc.id}
                      className="p-3 rounded-2xl bg-[#181614] border border-[#524639]/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#998f86]">
                        <span className="font-semibold text-[#c7b8ac]">{anc.category}</span>
                        <span>{anc.date}</span>
                      </div>
                      <p className="font-semibold text-[#e0d7d0] text-[11px] line-clamp-1">
                        {anc.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[#524639]/40 bg-[#181614]/80">
              <button
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="w-full flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[#32201d] border border-rose-900/40 text-rose-300 text-xs font-bold hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Lock Biometric Session</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
