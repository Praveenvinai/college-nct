import React, { useEffect, useState } from 'react';
import { DoorOpen, Clock } from 'lucide-react';
import { GateLog, LogLoadStatus } from '../types';
import { formatIstDate, formatIstTime } from '../istTime';

/** Demo visitor identity. Not user-selectable. */
const VISITOR_GATE_ID = 'VIS001';
const VISITOR_DISPLAY_NAME = 'Campus Visitor';
const VISITOR_PURPOSE = 'visits campus';

function formatGateStatus(status: string): string {
  const value = (status || '').trim().toLowerCase();
  if (value === 'granted') return 'Granted';
  if (value === 'denied') return 'Denied';
  return status || '—';
}

export const VisitorGateActivityView: React.FC = () => {
  const [loadStatus, setLoadStatus] = useState<LogLoadStatus>('idle');
  const [entries, setEntries] = useState<GateLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');

    fetch(`/api/gate-logs?student_id=${encodeURIComponent(VISITOR_GATE_ID)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`gate-logs HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
          setEntries([]);
          setLoadStatus('error');
          return;
        }
        const list = (data.entries as GateLog[]).filter(
          (entry) => entry.student_id === VISITOR_GATE_ID
        );
        setEntries(list);
        setLoadStatus(list.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        setLoadStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-[#221f1c] p-8 rounded-3xl border border-[#524639]/60 shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-light text-[#e0d7d0] font-serif italic flex items-center gap-2">
          <DoorOpen className="w-6 h-6 text-[#998f86]" />
          Gate Activity
        </h1>
        <p className="text-lg font-semibold text-[#e0d7d0] mt-3">{VISITOR_DISPLAY_NAME}</p>
        <p className="text-xs sm:text-sm text-[#998f86] mt-1">
          Visitor ID:{' '}
          <span className="text-[#e0d7d0] font-mono">{VISITOR_GATE_ID}</span>
        </p>
        <p className="text-xs sm:text-sm text-[#998f86] mt-1">
          Purpose: <span className="text-[#e0d7d0]">{VISITOR_PURPOSE}</span>
        </p>
      </div>

      <div className="bg-[#221f1c] p-6 rounded-3xl border border-[#524639]/40 space-y-4 shadow-lg">
        {loadStatus === 'loading' || loadStatus === 'idle' ? (
          <p className="text-xs text-[#998f86]">Loading gate activity...</p>
        ) : loadStatus === 'error' ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#c7b8ac]">Unable to load gate activity.</p>
            <p className="text-xs text-[#998f86]">Please try again.</p>
          </div>
        ) : loadStatus === 'empty' ? (
          <p className="text-sm font-semibold text-[#e0d7d0]">No gate activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#e0d7d0]">Recent Gate Activity</h2>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-[#171614] border border-[#524639]/30 space-y-1"
              >
                <p className="text-xs font-mono text-[#e0d7d0] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#998f86] shrink-0" />
                  {formatIstDate(entry.timestamp)}
                </p>
                <p className="text-xs text-[#e0d7d0]">Gate Access</p>
                <p
                  className={`text-xs font-semibold ${
                    formatGateStatus(entry.gate_status) === 'Denied'
                      ? 'text-[#c7b8ac]'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatGateStatus(entry.gate_status)}
                </p>
                <p className="text-xs text-[#998f86]">
                  Time: {formatIstTime(entry.timestamp)} IST
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
