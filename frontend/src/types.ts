export type UserRole = 'student' | 'staff';

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: string;
  gpa: number;
  attendance: number;
  walletBalance: number;
  photoUrl: string;
  faceEmbeddingHash: string;
  email: string;
  bio: string;
  enrolledCourses: string[];
  achievements: string[];
  role?: UserRole;
}

/** Face attendance event from Express → Flask → Firebase attendance_log */
export interface AttendanceLog {
  id: string;
  student_id: string;
  student_name: string;
  department: string;
  confidence: number;
  timestamp: string;
  source: string;
}

/** RFID gate event from Express → Flask → Firebase gate_log */
export interface GateLog {
  id: string;
  student_id: string;
  student_name: string;
  department: string;
  card_uid: string;
  timestamp: string;
  gate_status: string;
  source: string;
}

export interface AttendanceListResponse {
  count: number;
  entries: AttendanceLog[];
  student_id?: string;
}

export interface GateListResponse {
  count: number;
  entries: GateLog[];
  student_id?: string;
}

export type LogLoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface FaceRecognitionResult {
  success: boolean;
  student?: Student;
  confidence?: number;
  matchDescriptor?: string;
  message?: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  pdfSource?: string;
  pdfSources?: string[];
  audioBase64?: string;
}

export interface PDFDocument {
  id: string;
  name: string;
  pages: number;
  size: string;
  uploadedAt: string;
  contentSnippet: string;
  isActive?: boolean;
  notesId?: string;
}

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  stockCount: number;
  maxStock: number;
  category: 'beverages' | 'nutrition' | 'tech' | 'stationery';
  description: string;
  imageUrl: string;
  badge: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface PurchaseRecord {
  id: string;
  studentId: string;
  studentName: string;
  itemId: string;
  itemName: string;
  price: number;
  timestamp: string;
  status: 'Dispensed & Delivered' | 'Processing IoT' | 'Failed';
  location: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: string;
  date: string;
  content: string;
  priority: 'High' | 'Urgent' | 'General';
}

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  createdAt: string;
  status: 'Submitted' | 'In Review';
}
