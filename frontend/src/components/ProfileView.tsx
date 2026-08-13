import React from 'react';
import { 
  ShieldCheck, 
  Award, 
  BookOpen, 
  Mail, 
  Key, 
  Download, 
  Scan, 
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Activity,
  DoorOpen,
  Clock
} from 'lucide-react';
import {
  Student,
  PurchaseRecord,
  AttendanceLog,
  GateLog,
  LogLoadStatus,
} from '../types';
import { formatIstDate, formatIstTime } from '../istTime';

interface ProfileViewProps {
  student: Student;
  purchases: PurchaseRecord[];
  onOpenFaceAuth: () => void;
  attendanceCount: number;
  attendanceEntries: AttendanceLog[];
  attendanceStatus: LogLoadStatus;
  gateCount: number;
  gateEntries: GateLog[];
  gateStatus: LogLoadStatus;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  student,
  purchases,
  onOpenFaceAuth,
  attendanceCount,
  attendanceEntries,
  attendanceStatus,
  gateCount,
  gateEntries,
  gateStatus,
}) => {
  const studentPurchases = purchases.filter((p) => p.studentId === student.id);

  const handleDownloadID = () => {
    alert(`[National College Digital ID Card]\nStudent: ${student.name}\nID: ${student.id}\nRoll: ${student.rollNumber}\nDepartment: ${student.department}\nBiometric Signature: Encrypted & Verified`);
  };

  return (
    <div className="space-y-8">
      
      {/* Profile Banner */}
      <div className="relative bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/60 shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            
            {/* Student Photo */}
            <div className="relative">
              <img
                src={student.photoUrl}
                alt={student.name}
                className="w-28 h-28 rounded-3xl object-cover border border-[#807368]/60 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 bg-[#171614] rounded-xl border border-[#524639] text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-[#e0d7d0] bg-[#383129] px-2.5 py-0.5 rounded-full border border-[#524639]">
                  {student.id}
                </span>
                <span className="text-xs text-[#998f86] font-mono">{student.rollNumber}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic">
                {student.name}
              </h1>

              <p className="text-xs sm:text-sm text-[#998f86] font-medium">
                {student.department} • <span className="text-[#e0d7d0]">{student.year}</span>
              </p>
              <p className="text-xs sm:text-sm text-[#998f86] font-medium">
                Role: <span className="text-[#e0d7d0]">Student</span>
              </p>

              <p className="text-xs text-[#998f86] flex items-center gap-1 pt-1">
                <Mail className="w-3.5 h-3.5 text-[#e0d7d0]" /> {student.email}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadID}
              className="px-4 py-2.5 rounded-2xl bg-[#2a2622] border border-[#524639] text-[#e0d7d0] text-xs font-bold hover:border-[#807368] transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <Download className="w-4 h-4 text-[#e0d7d0]" />
              <span>Digital ID Pass</span>
            </button>

            <button
              onClick={onOpenFaceAuth}
              className="px-5 py-2.5 rounded-2xl bg-[#e0d7d0] text-[#171614] text-xs font-bold shadow-xl hover:bg-white transition-all flex items-center justify-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>Re-Scan Biometric Face</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live campus activity (Express → Flask → Firebase) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
          <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#998f86]" />
            Attendance Activity
          </h3>

          {attendanceStatus === 'loading' || attendanceStatus === 'idle' ? (
            <p className="text-xs text-[#998f86]">Loading attendance…</p>
          ) : attendanceStatus === 'error' ? (
            <p className="text-xs text-[#c7b8ac]">Attendance data unavailable</p>
          ) : attendanceStatus === 'empty' ? (
            <p className="text-xs text-[#998f86]">No attendance activity yet</p>
          ) : (
            <>
              <p className="text-xs text-[#998f86]">
                Total face check-ins:{' '}
                <span className="font-mono font-bold text-[#e0d7d0]">{attendanceCount}</span>
              </p>
              <div className="space-y-2">
                {attendanceEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-2xl bg-[#171614] border border-[#524639]/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#e0d7d0] flex items-center gap-1.5 truncate">
                        <Clock className="w-3 h-3 text-[#998f86] shrink-0" />
                        {formatIstDate(entry.timestamp)} · {formatIstTime(entry.timestamp)} IST
                      </p>
                      <p className="text-[10px] text-[#998f86] mt-0.5">
                        Confidence:{' '}
                        {typeof entry.confidence === 'number'
                          ? entry.confidence.toFixed(2)
                          : '—'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#383129] text-[#e0d7d0] border border-[#524639]/40 shrink-0">
                      Face
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
          <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-[#998f86]" />
            Gate Activity
          </h3>

          {gateStatus === 'loading' || gateStatus === 'idle' ? (
            <p className="text-xs text-[#998f86]">Loading gate activity…</p>
          ) : gateStatus === 'error' ? (
            <p className="text-xs text-[#c7b8ac]">Gate activity unavailable</p>
          ) : gateStatus === 'empty' ? (
            <p className="text-xs text-[#998f86]">No gate activity yet</p>
          ) : (
            <>
              <p className="text-xs text-[#998f86]">
                Total gate entries:{' '}
                <span className="font-mono font-bold text-[#e0d7d0]">{gateCount}</span>
              </p>
              <div className="space-y-2">
                {gateEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-2xl bg-[#171614] border border-[#524639]/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#e0d7d0] flex items-center gap-1.5 truncate">
                        <Clock className="w-3 h-3 text-[#998f86] shrink-0" />
                        {formatIstDate(entry.timestamp)} · {formatIstTime(entry.timestamp)} IST
                      </p>
                      <p className="text-[10px] text-[#998f86] mt-0.5 font-mono truncate">
                        UID {entry.card_uid} · {entry.gate_status}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#383129] text-[#e0d7d0] border border-[#524639]/40 shrink-0">
                      RFID
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Layout: Academic Details & Biometric Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Academic Profile & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bio & Achievements */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
              <Award className="w-5 h-5 text-[#998f86]" />
              Academic Bio & Honors
            </h3>
            <p className="text-xs text-[#998f86] leading-relaxed">
              {student.bio}
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              {student.achievements.map((ach, idx) => (
                <span key={idx} className="px-3 py-1 rounded-xl bg-[#383129] border border-[#524639]/60 text-[#e0d7d0] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {ach}
                </span>
              ))}
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#998f86]" />
              Active Enrolled Modules & PDF RAG Access
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {student.enrolledCourses.map((course, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#171614] border border-[#524639]/30 space-y-1">
                  <span className="text-[10px] font-mono text-[#998f86] uppercase font-bold">COURSE MODULE #{idx + 1}</span>
                  <p className="text-xs font-bold text-[#e0d7d0]">{course}</p>
                  <p className="text-[10px] text-[#807368]">Professor Cybera RAG Indexed</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Biometric Security Vault & Activity Stats */}
        <div className="space-y-6">
          
          {/* Biometric Security Panel */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Biometric Facial Vector Vault
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#171614] border border-[#524639]/40 space-y-1">
                <span className="text-[10px] text-[#998f86] font-mono uppercase">Facial Descriptor Hash</span>
                <p className="font-mono text-xs text-[#e0d7d0] font-bold truncate">{student.faceEmbeddingHash}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#171614] border border-[#524639]/40 space-y-1">
                <span className="text-[10px] text-[#998f86] font-mono uppercase">Biometric Status</span>
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Vector Encryption Active
                </p>
              </div>

              <button
                onClick={onOpenFaceAuth}
                className="w-full py-2.5 rounded-xl bg-[#2a2622] border border-[#524639] text-xs font-bold text-[#e0d7d0] hover:border-[#807368] transition-colors"
              >
                Re-Enroll Facial Angles
              </button>
            </div>
          </div>

          {/* Vending & Tutor Activity Summary */}
          <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
            <h3 className="text-base font-bold text-[#e0d7d0] font-serif italic">
              Portal Usage Activity
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171614] border border-[#524639]/30">
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 text-[#998f86]" />
                  <span className="font-semibold text-[#998f86]">Total Store Items Dispensed</span>
                </div>
                <span className="font-mono font-bold text-[#e0d7d0]">{studentPurchases.length}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171614] border border-[#524639]/30">
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-[#e0d7d0]" />
                  <span className="font-semibold text-[#998f86]">AI Tutor Sessions</span>
                </div>
                <span className="font-mono font-bold text-[#e0d7d0]">18 Sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
