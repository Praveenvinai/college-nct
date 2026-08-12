import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { LeftDashboard } from './components/LeftDashboard';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AITutorView } from './components/AITutorView';
import { StoreView } from './components/StoreView';
import { ProfileView } from './components/ProfileView';
import { ContactView } from './components/ContactView';
import { FaceRecognitionModal } from './components/FaceRecognitionModal';
import { INITIAL_STUDENTS, INITIAL_STORE_ITEMS, INITIAL_ANNOUNCEMENTS, INITIAL_PURCHASES } from './mockData';
import {
  Student,
  StoreItem,
  Announcement,
  PurchaseRecord,
  AttendanceLog,
  GateLog,
  LogLoadStatus,
} from './types';

export default function App() {
  const [allStudents, setAllStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(INITIAL_STUDENTS[0]); // Default verified student
  const [storeItems, setStoreItems] = useState<StoreItem[]>(INITIAL_STORE_ITEMS);
  const [announcements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(INITIAL_PURCHASES);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isFaceAuthModalOpen, setIsFaceAuthModalOpen] = useState<boolean>(false);
  const [isLeftDashboardOpen, setIsLeftDashboardOpen] = useState<boolean>(false);

  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceLog[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<LogLoadStatus>('idle');
  const [gateCount, setGateCount] = useState(0);
  const [gateEntries, setGateEntries] = useState<GateLog[]>([]);
  const [gateStatus, setGateStatus] = useState<LogLoadStatus>('idle');

  // Fetch initial data from server if available
  useEffect(() => {
    fetch('/api/students')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`students HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (
          data.students &&
          Array.isArray(data.students) &&
          data.students.length > 0
        ) {
          const liveStudents = data.students as Student[];

          setAllStudents(liveStudents);

          setCurrentStudent((current: Student | null) => {
            const currentExists = current
              ? liveStudents.some((student) => student.id === current.id)
              : false;

            return currentExists ? current : liveStudents[0];
          });
        }
      })
      .catch((err) => {
        console.log("Using seed student records:", err);
      });

    fetch('/api/store/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setStoreItems(data.items);
        }
      })
      .catch((err) => console.log("Using seed store inventory:", err));
  }, []);

  // Live attendance + gate logs for the current student (Express → Flask → Firebase)
  useEffect(() => {
    const studentId = currentStudent?.id;
    if (!studentId) {
      setAttendanceCount(0);
      setAttendanceEntries([]);
      setAttendanceStatus('idle');
      setGateCount(0);
      setGateEntries([]);
      setGateStatus('idle');
      return;
    }

    let cancelled = false;
    setAttendanceStatus('loading');
    setGateStatus('loading');

    const attendanceUrl = `/api/attendance?student_id=${encodeURIComponent(studentId)}`;
    const gateUrl = `/api/gate-logs?student_id=${encodeURIComponent(studentId)}`;

    fetch(attendanceUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`attendance HTTP ${res.status}`);
        return res.json();
      })
      .then((attData) => {
        if (cancelled) return;
        if (
          !attData ||
          typeof attData !== 'object' ||
          !Array.isArray(attData.entries)
        ) {
          setAttendanceCount(0);
          setAttendanceEntries([]);
          setAttendanceStatus('error');
          return;
        }
        const entries = attData.entries as AttendanceLog[];
        const count =
          typeof attData.count === 'number' ? attData.count : entries.length;
        setAttendanceCount(count);
        setAttendanceEntries(entries);
        setAttendanceStatus(count === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setAttendanceCount(0);
        setAttendanceEntries([]);
        setAttendanceStatus('error');
      });

    fetch(gateUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`gate-logs HTTP ${res.status}`);
        return res.json();
      })
      .then((gateData) => {
        if (cancelled) return;
        if (
          !gateData ||
          typeof gateData !== 'object' ||
          !Array.isArray(gateData.entries)
        ) {
          setGateCount(0);
          setGateEntries([]);
          setGateStatus('error');
          return;
        }
        const entries = gateData.entries as GateLog[];
        const count =
          typeof gateData.count === 'number' ? gateData.count : entries.length;
        setGateCount(count);
        setGateEntries(entries);
        setGateStatus(count === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setGateCount(0);
        setGateEntries([]);
        setGateStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [currentStudent?.id]);

  // Handle Face Recognition Authentication Success
  const handleFaceAuthSuccess = (student: Student) => {
    setCurrentStudent(student);
    setIsFaceAuthModalOpen(false);
  };

  // Handle Vending Machine Purchase Success
  const handlePurchaseSuccess = (updatedBalance: number, updatedItem: StoreItem, record: PurchaseRecord) => {
    if (currentStudent) {
      setCurrentStudent((prev) => prev ? { ...prev, walletBalance: updatedBalance } : null);
    }

    setStoreItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );

    setPurchases((prev) => [record, ...prev]);
  };

  // Sign out / lock session
  const handleSignOut = () => {
    setCurrentStudent(null);
    setIsFaceAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#171614] text-[#e0d7d0] selection:bg-[#524639] selection:text-[#ffffff]">
      
      {/* Navbar Header */}
      <Navbar
        student={currentStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
        onToggleLeftDashboard={() => setIsLeftDashboardOpen(!isLeftDashboardOpen)}
      />

      {/* Slide-out Left Dashboard */}
      <LeftDashboard
        isOpen={isLeftDashboardOpen}
        onClose={() => setIsLeftDashboardOpen(false)}
        student={currentStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        announcements={announcements}
        onSignOut={handleSignOut}
        attendanceCount={attendanceCount}
        attendanceStatus={attendanceStatus}
      />

      {/* Main Content View Container with Smooth Tab Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {currentStudent ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeTab === 'home' && (
                <HomeView
                  student={currentStudent}
                  announcements={announcements}
                  recentPurchases={purchases.filter((p) => p.studentId === currentStudent.id)}
                  onNavigate={setActiveTab}
                  onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
                  attendanceCount={attendanceCount}
                  attendanceEntries={attendanceEntries}
                  attendanceStatus={attendanceStatus}
                />
              )}

              {activeTab === 'tutor' && (
                <AITutorView studentName={currentStudent.name} />
              )}

              {activeTab === 'store' && (
                <StoreView
                  student={currentStudent}
                  items={storeItems}
                  purchaseHistory={purchases.filter((p) => p.studentId === currentStudent.id)}
                  onPurchaseSuccess={handlePurchaseSuccess}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  student={currentStudent}
                  purchases={purchases}
                  onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
                  attendanceCount={attendanceCount}
                  attendanceEntries={attendanceEntries}
                  attendanceStatus={attendanceStatus}
                  gateCount={gateCount}
                  gateEntries={gateEntries}
                  gateStatus={gateStatus}
                />
              )}

              {activeTab === 'contact' && (
                <ContactView />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-24 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#221f1c] border border-[#524639] flex items-center justify-center text-[#e0d7d0] shadow-2xl">
              <span className="font-serif italic font-light text-3xl">NC</span>
            </div>
            <h2 className="text-3xl font-light text-[#e0d7d0] font-serif italic">
              Session Locked • Biometric Face Authentication Required
            </h2>
            <p className="text-sm text-[#998f86] max-w-md mx-auto font-sans">
              Please complete facial biometric verification or student ID scan to access National College Student Portal.
            </p>
            <button
              onClick={() => setIsFaceAuthModalOpen(true)}
              className="px-8 py-3.5 rounded-2xl bg-[#e0d7d0] text-[#171614] font-bold text-sm shadow-2xl hover:bg-white transition-all"
            >
              Start Biometric Face Scan
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Face Recognition Modal Overlay */}
      <FaceRecognitionModal
        isOpen={isFaceAuthModalOpen}
        onClose={() => setIsFaceAuthModalOpen(false)}
        onSuccessAuth={handleFaceAuthSuccess}
        allStudents={allStudents}
      />
    </div>
  );
}
