import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  ShoppingBag, 
  User, 
  Clock, 
  LogOut,
  ChevronDown,
  PanelLeft,
  Home
} from 'lucide-react';
import { Student } from '../types';
import { NationalCollegeLogo } from './NationalCollegeLogo';

interface NavbarProps {
  student: Student | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut: () => void;
  onOpenFaceAuth: () => void;
  onToggleLeftDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  student,
  activeTab,
  setActiveTab,
  onSignOut,
  onOpenFaceAuth,
  onToggleLeftDashboard
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tutor', label: 'AI Tutor', icon: Sparkles },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#171614]/95 backdrop-blur-md border-b border-[#383129] shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left: Dashboard Button & College Logo/Title */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Left Side Dashboard Drawer Toggle */}
            <button
              onClick={onToggleLeftDashboard}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#221f1c] border border-[#383129] text-[#e0d7d0] hover:bg-[#2a2622] hover:border-[#524639] transition-all shadow-sm group"
              title="Toggle Quick Dashboard"
            >
              <PanelLeft className="w-4 h-4 text-[#998f86] group-hover:text-[#e0d7d0] transition-colors" />
              <span className="hidden sm:inline text-xs font-semibold text-[#998f86] group-hover:text-[#e0d7d0]">
                Dashboard
              </span>
            </button>

            {/* Official National College Logo & Brand */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => setActiveTab('home')}
            >
              <NationalCollegeLogo className="w-9 h-9 sm:w-11 sm:h-11 transition-transform group-hover:scale-105" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#998f86] font-semibold leading-tight">
                  Autonomous
                </div>
                <div className="text-sm sm:text-base font-bold text-[#e0d7d0] font-serif tracking-wide group-hover:text-white transition-colors">
                  NATIONAL COLLEGE
                </div>
              </div>
            </div>
          </div>

          {/* Center: Simplified Navigation Tabs (Icon + Simple Text) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-[#221f1c] p-1.5 rounded-2xl border border-[#383129]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#383129] text-[#e0d7d0] font-semibold shadow-sm border border-[#524639]/60'
                      : 'text-[#998f86] hover:text-[#e0d7d0] hover:bg-[#2a2622]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#e0d7d0]' : 'text-[#807368]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Clock & User Profile / Login */}
          <div className="flex items-center space-x-3">
            {/* Live Clock */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#221f1c] border border-[#383129] text-xs font-mono text-[#998f86]">
              <Clock className="w-3.5 h-3.5 text-[#807368]" />
              <span>{timeStr || '10:00 AM'}</span>
            </div>

            {student ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 bg-[#221f1c] border border-[#383129] hover:border-[#524639] rounded-2xl p-1.5 pr-3 transition-all focus:outline-none"
                >
                  <div className="relative">
                    <img
                      src={student.photoUrl}
                      alt={student.name}
                      className="w-8 h-8 rounded-xl object-cover border border-[#524639]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#171614]"></div>
                  </div>

                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-[#e0d7d0] leading-tight">{student.name}</div>
                    <div className="text-[10px] text-[#807368] font-mono">{student.rollNumber}</div>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-[#807368] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-[#221f1c] rounded-2xl p-2 border border-[#524639] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-[#383129]">
                      <p className="text-xs font-bold text-[#e0d7d0]">{student.name}</p>
                      <p className="text-[10px] text-[#807368] font-mono">{student.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-[#e0d7d0] hover:bg-[#2a2622] rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-[#807368]" />
                        <span>Student Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          onOpenFaceAuth();
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-[#e0d7d0] hover:bg-[#2a2622] rounded-xl transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Biometric Face Scan</span>
                      </button>

                      <div className="my-1 border-t border-[#383129]"></div>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/20 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenFaceAuth}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#e0d7d0] text-[#171614] font-semibold text-xs shadow-md hover:bg-white transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Row */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#383129]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'bg-[#383129] text-[#e0d7d0]' : 'text-[#807368]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
