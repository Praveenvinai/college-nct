import React, { useEffect, useState } from 'react';
import { DoorOpen, Clock } from 'lucide-react';
import { GateLog, LogLoadStatus, Student } from '../types';

interface StaffGateActivityViewProps {
  student: Student;
}

function formatGateTimestamp(raw: string): { date: string; time: string } {
  if (!raw) return { date: '—', time: '' };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw, time: '' };
  }
  return {
    date: parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function formatSource(source: string): string {
  if (source === 'rfid_gate') return 'RFID Gate';
  return source || '—';
}

export const StaffGateActivityView: React.FC<StaffGateActivityViewProps> = ({
  student,
}) => {
  const [status, setStatus] = useState<LogLoadStatus>('idle');
  const [entries, setEntries] = useState<GateLog[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const staffId = student.id?.trim();
    if (!staffId) {
      setStatus('empty');
      setEntries([]);
      setCount(0);
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetch(`/api/gate-logs?student_id=${encodeURIComponent(staffId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`gate-logs HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
          setEntries([]);
          setCount(0);
          setStatus('error');
          return;
        }
        const list = data.entries as GateLog[];
        const total = typeof data.count === 'number' ? data.count : list.length;
        setEntries(list);
        setCount(total);
        setStatus(total === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        setCount(0);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  return (
    <div className="space-y-8">
      <div className="bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/60 shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic flex items-center gap-2">
          <DoorOpen className="w-6 h-6 text-[#998f86]" />
          Gate Activity
        </h1>
        <p className="text-lg font-semibold text-[#e0d7d0] mt-3">{student.name}</p>
        <p className="text-xs sm:text-sm text-[#998f86] mt-1">
          Staff ID:{' '}
          <span className="text-[#e0d7d0] font-mono">{student.id}</span>
        </p>
      </div>

      <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
        {status === 'loading' || status === 'idle' ? (
          <p className="text-xs text-[#998f86]">Loading gate activity...</p>
        ) : status === 'error' ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#c7b8ac]">Unable to load gate activity.</p>
            <p className="text-xs text-[#998f86]">Please try again.</p>
          </div>
        ) : status === 'empty' ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#e0d7d0]">No gate activity yet.</p>
            <p className="text-xs text-[#998f86]">
              Your RFID gate access records will appear here after you use the campus gate.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {entries.map((entry) => {
                const { date, time } = formatGateTimestamp(entry.timestamp);
                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-[#171614] border border-[#524639]/30 space-y-1"
                  >
                    <p className="text-xs font-mono text-[#e0d7d0] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#998f86] shrink-0" />
                      {date}
                      {time ? ` · ${time}` : ''}
                    </p>
                    <p className="text-[11px] text-[#998f86] font-mono">
                      RFID: {entry.card_uid || '—'}
                    </p>
                    <p className="text-[11px] text-[#998f86]">
                      Status:{' '}
                      <span className="text-[#e0d7d0] font-semibold capitalize">
                        {entry.gate_status || '—'}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#998f86]">
                      Source: {formatSource(entry.source)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[#998f86] pt-2">
              Total Gate Entries:{' '}
              <span className="font-mono font-bold text-[#e0d7d0]">{count}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
