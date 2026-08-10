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
import { Student, StoreItem, Announcement, PurchaseRecord } from './types';

export default function App() {
  const [allStudents, setAllStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(INITIAL_STUDENTS[0]); // Default verified student
  const [storeItems, setStoreItems] = useState<StoreItem[]>(INITIAL_STORE_ITEMS);
  const [announcements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(INITIAL_PURCHASES);
  
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isFaceAuthModalOpen, setIsFaceAuthModalOpen] = useState<boolean>(false);
  const [isLeftDashboardOpen, setIsLeftDashboardOpen] = useState<boolean>(false);

  // Fetch initial data from server if available
  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        if (data.students && Array.isArray(data.students)) {
          setAllStudents(data.students);
        }
      })
      .catch((err) => console.log("Using seed student records:", err));

    fetch('/api/store/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setStoreItems(data.items);
        }
      })
      .catch((err) => console.log("Using seed store inventory:", err));
  }, []);

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
