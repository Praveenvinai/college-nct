import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Clock } from 'lucide-react';
import { AttendanceLog, LogLoadStatus, Student } from '../types';
import {
  formatIstTime,
  groupAttendanceByIstDay,
  isSameIstDay,
} from '../istTime';

interface StaffAttendanceViewProps {
  student: Student;
}

export const StaffAttendanceView: React.FC<StaffAttendanceViewProps> = ({
  student,
}) => {
  const [status, setStatus] = useState<LogLoadStatus>('idle');
  const [entries, setEntries] = useState<AttendanceLog[]>([]);
  const designation = student.department?.trim() || 'Staff';

  useEffect(() => {
    const staffId = student.id?.trim();
    if (!staffId) {
      setStatus('empty');
      setEntries([]);
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetch(`/api/attendance?student_id=${encodeURIComponent(staffId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`attendance HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
          setEntries([]);
          setStatus('error');
          return;
        }
        const list = data.entries as AttendanceLog[];
        setEntries(list);
        setStatus(list.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  const todayEntries = useMemo(
    () =>
      entries
        .filter((entry) => isSameIstDay(entry.timestamp))
        .slice()
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [entries]
  );

  const firstToday = todayEntries[0];
  const recentDays = useMemo(() => groupAttendanceByIstDay(entries), [entries]);

  return (
    <div className="space-y-8">
      <div className="bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/60 shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-[#998f86]" />
          Attendance
        </h1>
        <p className="text-lg font-semibold text-[#e0d7d0] mt-3">{student.name}</p>
        <p className="text-xs sm:text-sm text-[#998f86] mt-1">
          Staff ID:{' '}
          <span className="text-[#e0d7d0] font-mono">{student.id}</span>
        </p>
        <p className="text-xs sm:text-sm text-[#998f86] mt-1">
          Designation: <span className="text-[#e0d7d0]">{designation}</span>
        </p>
      </div>

      <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
        {status === 'loading' || status === 'idle' ? (
          <p className="text-xs text-[#998f86]">Loading attendance...</p>
        ) : status === 'error' ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#c7b8ac]">
              Unable to load attendance right now.
            </p>
            <p className="text-xs text-[#998f86]">Please try again.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#e0d7d0]">Today's Attendance</h2>
              {firstToday ? (
                <div className="p-4 rounded-2xl bg-[#171614] border border-[#524639]/30 space-y-1">
                  <p className="text-sm font-semibold text-emerald-400">Present</p>
                  <p className="text-xs text-[#998f86] flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    First recorded: {formatIstTime(firstToday.timestamp)} IST
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#998f86]">No attendance recorded today.</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-base font-semibold text-[#e0d7d0]">Recent Attendance</h2>
              {recentDays.length === 0 ? (
                <p className="text-sm font-semibold text-[#e0d7d0]">No attendance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentDays.map((day) => (
                    <div
                      key={day.dateKey}
                      className="p-4 rounded-2xl bg-[#171614] border border-[#524639]/30 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-mono text-[#e0d7d0]">{day.dateLabel}</p>
                        <span className="text-xs font-semibold text-emerald-400">Present</span>
                      </div>
                      <p className="text-xs text-[#998f86]">
                        First recorded: {formatIstTime(day.firstTimestamp)} IST
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
