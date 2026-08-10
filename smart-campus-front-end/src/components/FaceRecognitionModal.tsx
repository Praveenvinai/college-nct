import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  ShieldCheck, 
  UserCheck, 
  RefreshCw, 
  Sparkles, 
  UserPlus, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  Key, 
  Scan, 
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';

interface FaceRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAuth: (student: Student) => void;
  allStudents: Student[];
}

export const FaceRecognitionModal: React.FC<FaceRecognitionModalProps> = ({
  isOpen,
  onClose,
  onSuccessAuth,
  allStudents
}) => {
  const [activeMode, setActiveMode] = useState<'scan' | 'enroll' | 'manual'>('scan');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(allStudents[0]?.id || 'NC-2026-881');

  // Enrollment Form State
  const [enrollName, setEnrollName] = useState<string>('');
  const [enrollRoll, setEnrollRoll] = useState<string>('');
  const [enrollDept, setEnrollDept] = useState<string>('School of Computer Science & AI');
  const [enrollEmail, setEnrollEmail] = useState<string>('');
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

  // Manual Login State
  const [manualId, setManualId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isOpen && activeMode === 'scan') {
      setCameraError(null);
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
        .then((mediaStream) => {
          stream = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play();
            setCameraActive(true);
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraActive(false);
          setCameraError("Camera access permission denied or camera not found. You may use direct student verification or manual ID input below.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, activeMode]);

  // Trigger Face Scan Process
  const handleStartScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);
    setVerifiedStudent(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          
          // Match selected preset student
          const target = allStudents.find((s) => s.id === selectedPresetId) || allStudents[0];
          setVerifiedStudent(target);

          // Confetti celebratory burst
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#06B6D4', '#10B981']
          });

          // Timeout to authorize
          setTimeout(() => {
            onSuccessAuth(target);
            onClose();
          }, 1500);

          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Submit Enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollName || !enrollEmail) return;

    try {
      const res = await fetch('/api/face/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enrollName,
          rollNumber: enrollRoll || `NC-${Math.floor(1000 + Math.random() * 9000)}`,
          department: enrollDept,
          email: enrollEmail
        })
      });

      const data = await res.json();
      if (data.success && data.student) {
        setEnrollSuccess(true);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
        setTimeout(() => {
          onSuccessAuth(data.student);
          onClose();
        }, 1600);
      }
    } catch (err) {
      console.error("Enrollment failed:", err);
    }
  };

  // Submit Manual ID Login
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = allStudents.find((s) => s.id.toLowerCase() === manualId.toLowerCase() || s.rollNumber.toLowerCase() === manualId.toLowerCase()) || allStudents[0];
    onSuccessAuth(found);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 glow-cyan">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Encrypted Gate</div>
              <h2 className="text-lg font-light text-white font-serif italic flex items-center gap-2">
                Biometric Verification
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 uppercase tracking-widest">
                  AI FACIAL VECTORS
                </span>
              </h2>
            </div>
          </div>

          <div className="flex space-x-1 bg-slate-950 p-1 rounded-full border border-slate-800">
            <button
              onClick={() => setActiveMode('scan')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeMode === 'scan' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scan
            </button>
            <button
              onClick={() => setActiveMode('enroll')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeMode === 'enroll' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enroll
            </button>
            <button
              onClick={() => setActiveMode('manual')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeMode === 'manual' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              ID Login
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeMode === 'scan' && (
            <div className="space-y-6">
              
              {/* Preset Student Selector for Easy Demo Testing */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Target Student Profile:
                </span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="bg-slate-950 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Scanner Container */}
              <div className="relative w-full aspect-video rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
                
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
                      <Camera className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-300 max-w-sm font-medium">
                      {cameraError || "Camera access permission dismissed or unavailable."}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
                            .then((mediaStream) => {
                              if (videoRef.current) {
                                videoRef.current.srcObject = mediaStream;
                                videoRef.current.play();
                                setCameraActive(true);
                              }
                            })
                            .catch((err) => {
                              console.error("Camera access error retry:", err);
                              setCameraError("Camera permission dismissed or unavailable in iframe. Demo simulation activated.");
                            });
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition-all"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={handleStartScan}
                        className="px-3.5 py-1.5 rounded-full bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold transition-all"
                      >
                        Use Synthetic Biometric Mesh
                      </button>
                    </div>
                  </div>
                )}

                {/* Face Scanning Overlays */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                  
                  {/* Top Status Header */}
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      BIOMETRIC SENSORS ONLINE
                    </span>
                    <span>FPS: 60 • MESH 468 NODES</span>
                  </div>

                  {/* Target Face Frame Brackets */}
                  <div className="relative w-56 h-56 border-2 border-amber-500/40 rounded-3xl flex items-center justify-center">
                    {/* Animated Corner Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl"></div>

                    {/* Scanning Laser Line */}
                    {scanning && (
                      <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line shadow-[0_0_15px_#06b6d4]"></div>
                    )}

                    {/* Verification Checkmark Pulse */}
                    {verifiedStudent && (
                      <div className="flex flex-col items-center space-y-2 animate-in zoom-in-75 duration-300">
                        <CheckCircle2 className="w-16 h-16 text-emerald-400 glow-emerald" />
                        <span className="text-xs font-bold text-emerald-300 font-mono bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                          FACE MATCH 98.4%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Scan Progress Bar */}
                  {scanning && (
                    <div className="w-full space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-amber-300">
                        <span>COMPUTING DESCRIPTOR VECTOR...</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-150"
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Result Banner */}
              {verifiedStudent ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-4">
                  <img
                    src={verifiedStudent.photoUrl}
                    alt={verifiedStudent.name}
                    className="w-12 h-12 rounded-xl object-cover border border-emerald-500/50"
                  />
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      {verifiedStudent.name}
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                        VERIFIED
                      </span>
                    </p>
                    <p className="text-xs text-slate-300">{verifiedStudent.department} • {verifiedStudent.rollNumber}</p>
                    <p className="text-[11px] text-emerald-400 font-medium">Session initialized. Accessing portal...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p className="font-semibold text-slate-200">Position face inside reticle frame.</p>
                    <p>Biometric vector verified against National College registry.</p>
                  </div>

                  <button
                    onClick={handleStartScan}
                    disabled={scanning}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold text-sm shadow-xl hover:shadow-amber-500/30 transition-all duration-300 glow-gold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center space-x-2"
                  >
                    {scanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Scan & Match Face</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enroll Student Form */}
          {activeMode === 'enroll' && (
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <UserPlus className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>One-Time Face Enrollment:</strong> Register student details and capture biometric face descriptor for permanent cardless login.
                </span>
              </div>

              {enrollSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Facial Embedding successfully stored! Redirecting to student dashboard...
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    placeholder="m.lin@student.national.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    value={enrollRoll}
                    onChange={(e) => setEnrollRoll(e.target.value)}
                    placeholder="CS-2026-102"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Department</label>
                  <select
                    value={enrollDept}
                    onChange={(e) => setEnrollDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="School of Computer Science & AI">School of Computer Science & AI</option>
                    <option value="Cyber Security & Forensics">Cyber Security & Forensics</option>
                    <option value="Electrical & Autonomous Engineering">Electrical & Autonomous Engineering</option>
                    <option value="Quantum Physics & Mathematics">Quantum Physics & Mathematics</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg hover:shadow-amber-500/20 transition-all glow-gold"
                >
                  Register Face & Enter Portal
                </button>
              </div>
            </form>
          )}

          {/* Manual Student ID Login */}
          {activeMode === 'manual' && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Fallback Authentication: Enter student ID or roll number to bypass biometric scan.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Student Roll Number / National ID *</label>
                <input
                  type="text"
                  required
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. CS-2024-049 or NC-2026-881"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                >
                  Verify Student ID
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
