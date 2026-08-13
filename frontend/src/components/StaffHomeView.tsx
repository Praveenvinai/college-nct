import React from 'react';
import {
  Sparkles,
  ShoppingBag,
  Activity,
  Bell,
  Clock,
  User,
  CalendarCheck,
} from 'lucide-react';
import { Student, Announcement } from '../types';
import { NationalCollegeLogo } from './NationalCollegeLogo';
import { CAMPUS_AERIAL_GATE_URL } from '../assets/collegeAssets';

interface StaffHomeViewProps {
  student: Student;
  announcements: Announcement[];
  onNavigate: (tab: string) => void;
}

export const StaffHomeView: React.FC<StaffHomeViewProps> = ({
  student,
  announcements,
  onNavigate,
}) => {
  const title = student.department?.trim() || 'Staff';

  return (
    <div className="space-y-8">
      <div className="relative rounded-3xl overflow-hidden bg-[#221f1c] border border-[#524639]/60 shadow-2xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img
            src={CAMPUS_AERIAL_GATE_URL}
            alt="National College Campus"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171614] via-[#171614]/90 to-transparent"></div>
        </div>

        <div className="relative z-10 p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="p-2 rounded-2xl bg-[#171614]/90 border border-[#524639] shadow-xl shrink-0">
              <NationalCollegeLogo className="w-20 h-20 sm:w-24 sm:h-24" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#383129] text-[#e0d7d0] border border-[#524639] font-mono uppercase tracking-widest">
                Staff
              </span>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#e0d7d0] font-serif italic pt-1">
                Welcome, {student.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#998f86] font-medium tracking-wide">
                Staff ID: <span className="text-[#e0d7d0] font-mono">{student.id}</span>
                {' · '}
                Designation: <span className="text-[#e0d7d0]">{title}</span>
                {' · '}
                Role: <span className="text-[#e0d7d0]">Staff</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-[#e0d7d0] font-serif italic">Campus Modules</h3>
          <div className="space-y-2">
            {[
              { id: 'tutor', label: 'AI Tutor', icon: Sparkles },
              { id: 'store', label: 'Smart Store', icon: ShoppingBag },
              { id: 'staff-gate', label: 'Gate Activity', icon: Activity },
              { id: 'staff-attendance', label: 'Attendance', icon: CalendarCheck },
              { id: 'home', label: 'Campus Information', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id + item.label}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="w-full flex items-center space-x-3 p-4 rounded-2xl bg-[#221f1c] border border-[#524639]/40 text-left hover:border-[#807368]/60 transition-colors"
                >
                  <Icon className="w-4 h-4 text-[#998f86]" />
                  <span className="text-sm font-semibold text-[#e0d7d0]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#998f86]" />
            Campus Information
          </h3>
          {announcements.map((anc) => (
            <div
              key={anc.id}
              className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#383129] text-[#e0d7d0] border border-[#524639]/50">
                  {anc.category}
                </span>
                <span className="text-xs text-[#998f86] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {anc.date}
                </span>
              </div>
              <h4 className="text-base font-bold text-[#e0d7d0] mb-1.5">{anc.title}</h4>
              <p className="text-xs text-[#998f86] leading-relaxed">{anc.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
