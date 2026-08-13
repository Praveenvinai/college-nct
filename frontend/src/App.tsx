import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { LeftDashboard } from './components/LeftDashboard';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { StaffHomeView } from './components/StaffHomeView';
import { StaffProfileView } from './components/StaffProfileView';
import { StaffGateActivityView } from './components/StaffGateActivityView';
import { VisitorGateActivityView } from './components/VisitorGateActivityView';
import { StaffAttendanceView } from './components/StaffAttendanceView';
import { StudentAttendanceView } from './components/StudentAttendanceView';
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
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
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
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);

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
    if (!studentId || currentStudent?.role !== 'student') {
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
  }, [currentStudent?.id, currentStudent?.role, logsRefreshKey]);

  // Handle Face Recognition Authentication Success
  const handleFaceAuthSuccess = (student: Student) => {
    setCurrentStudent(student);
    setLogsRefreshKey((key) => key + 1);
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

  // Sign out: clear session and return to public visitor Home
  const handleSignOut = () => {
    setCurrentStudent(null);
    setIsFaceAuthModalOpen(false);
    setIsLeftDashboardOpen(false);
    setActiveTab('home');
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
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${currentStudent?.id ?? 'visitor'}-${currentStudent?.role ?? 'none'}`}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {activeTab === 'home' &&
              (currentStudent?.role === 'staff' ? (
                <StaffHomeView
                  student={currentStudent}
                  announcements={announcements}
                  onNavigate={setActiveTab}
                />
              ) : (
                <HomeView
                  student={currentStudent?.role === 'student' ? currentStudent : null}
                  announcements={announcements}
                  recentPurchases={
                    currentStudent?.role === 'student'
                      ? purchases.filter((p) => p.studentId === currentStudent.id)
                      : []
                  }
                  onNavigate={setActiveTab}
                  onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
                  attendanceCount={attendanceCount}
                  attendanceEntries={attendanceEntries}
                  attendanceStatus={attendanceStatus}
                />
              ))}

            {activeTab === 'tutor' && (
              <AITutorView student={currentStudent} />
            )}

            {activeTab === 'store' && (
              <StoreView
                student={currentStudent}
                items={storeItems}
                purchaseHistory={
                  currentStudent
                    ? purchases.filter((p) => p.studentId === currentStudent.id)
                    : []
                }
                onPurchaseSuccess={handlePurchaseSuccess}
              />
            )}

            {activeTab === 'profile' &&
              (currentStudent?.role === 'staff' ? (
                <StaffProfileView student={currentStudent} />
              ) : currentStudent?.role === 'student' ? (
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
              ) : (
                <VisitorTabNote
                  title="Profile"
                  body="Not signed in. Public campus information is available on Home."
                />
              ))}

            {activeTab === 'staff-gate' &&
              (currentStudent?.role === 'staff' ? (
                <StaffGateActivityView student={currentStudent} />
              ) : (
                <VisitorTabNote
                  title="Gate Activity"
                  body="Staff gate activity is available after a staff login."
                />
              ))}

            {activeTab === 'visitor-gate' &&
              (currentStudent == null ? (
                <VisitorGateActivityView />
              ) : (
                <VisitorTabNote
                  title="Gate Activity"
                  body="Visitor gate activity is available on the public campus portal."
                />
              ))}

            {activeTab === 'staff-attendance' &&
              (currentStudent?.role === 'staff' ? (
                <StaffAttendanceView student={currentStudent} />
              ) : (
                <VisitorTabNote
                  title="Attendance"
                  body="Staff attendance is available after a staff login."
                />
              ))}

            {activeTab === 'student-attendance' &&
              (currentStudent?.role === 'student' ? (
                <StudentAttendanceView student={currentStudent} />
              ) : (
                <VisitorTabNote
                  title="Attendance"
                  body="Student attendance is available after a student login."
                />
              ))}

            {activeTab === 'contact' && (
              <ContactView />
            )}
          </motion.div>
        </AnimatePresence>
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

function VisitorTabNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-[#221f1c] border border-[#524639] flex items-center justify-center text-[#e0d7d0] shadow-xl">
        <span className="font-serif italic font-light text-2xl">NC</span>
      </div>
      <h2 className="text-2xl font-light text-[#e0d7d0] font-serif italic">{title}</h2>
      <p className="text-sm text-[#998f86] font-sans">{body}</p>
    </div>
  );
}
