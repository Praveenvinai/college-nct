import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { Student } from '../types';

interface StaffProfileViewProps {
  student: Student;
}

export const StaffProfileView: React.FC<StaffProfileViewProps> = ({ student }) => {
  const designation = student.department?.trim() || 'Staff';

  return (
    <div className="space-y-8">
      <div className="relative bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/60 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-28 h-28 rounded-3xl bg-[#171614] border border-[#807368]/60 shadow-2xl flex items-center justify-center text-2xl font-serif italic text-[#e0d7d0]">
            {student.name.trim().slice(0, 1) || 'S'}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-[#e0d7d0] bg-[#383129] px-2.5 py-0.5 rounded-full border border-[#524639]">
              Staff
            </span>
            <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic pt-1">
              {student.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#998f86] font-medium">
              Staff ID:{' '}
              <span className="text-[#e0d7d0] font-mono">{student.id}</span>
            </p>
            <p className="text-xs sm:text-sm text-[#998f86] font-medium">
              Designation: <span className="text-[#e0d7d0]">{designation}</span>
            </p>
            <p className="text-xs sm:text-sm text-[#998f86] font-medium">
              Role: <span className="text-[#e0d7d0]">Staff</span>
            </p>
            {student.email ? (
              <p className="text-xs text-[#998f86] flex items-center gap-1 pt-1">
                <Mail className="w-3.5 h-3.5 text-[#e0d7d0]" /> {student.email}
              </p>
            ) : null}
            <p className="text-xs text-emerald-400 flex items-center gap-1 pt-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified staff session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
