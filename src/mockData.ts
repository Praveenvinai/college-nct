import { Student, StoreItem, Announcement, PurchaseRecord } from './types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'NC-2026-881',
    name: 'Alexander Vance',
    rollNumber: 'CS-2024-049',
    department: 'School of Computer Science & AI',
    year: 'Senior (Year 4)',
    gpa: 3.94,
    attendance: 98.6,
    walletBalance: 125.50,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    faceEmbeddingHash: '0x8f2a4e91c7b3',
    email: 'a.vance@student.national.edu',
    bio: 'Specializing in Quantum Machine Learning and Distributed Neural Networks. President of National AI Society.',
    enrolledCourses: ['CS401: Deep Neural Networks', 'CS412: Distributed Systems', 'MA302: Quantum Vector Spaces', 'CY301: Cryptographic Protocols'],
    achievements: ['Dean\'s High Honor List 2025', 'National Hackathon Champion', 'Published IEEE AI Scholar']
  },
  {
    id: 'NC-2026-882',
    name: 'Elena Rostova',
    rollNumber: 'CY-2024-012',
    department: 'Cyber Security & Forensics',
    year: 'Junior (Year 3)',
    gpa: 3.88,
    attendance: 96.2,
    walletBalance: 88.00,
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    faceEmbeddingHash: '0x3c9f1a2e7b8d',
    email: 'e.rostova@student.national.edu',
    bio: 'Cybersecurity research assistant focused on Zero-Trust Mesh Architectures and Autonomous Biometric Defense.',
    enrolledCourses: ['CY301: Cryptographic Protocols', 'CY405: Cloud Forensic Architecture', 'CS401: Deep Neural Networks'],
    achievements: ['Cyber Defense Award 2025', 'Cybersec Fellow']
  },
  {
    id: 'NC-2026-883',
    name: 'Marcus Sterling',
    rollNumber: 'EE-2024-088',
    department: 'Electrical & Autonomous Engineering',
    year: 'Senior (Year 4)',
    gpa: 3.91,
    attendance: 99.1,
    walletBalance: 150.00,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    faceEmbeddingHash: '0x7d1a9f3e5c2b',
    email: 'm.sterling@student.national.edu',
    bio: 'Hardware engineer researching next-gen silicon photonics and IoT vending hardware controllers.',
    enrolledCourses: ['EE401: Embedded Silicon Systems', 'EE450: Robotics Kinematics'],
    achievements: ['National Innovation Award', 'IEEE Student Chair']
  }
];

export const INITIAL_STORE_ITEMS: StoreItem[] = [
  {
    id: 'item-01',
    name: 'Cold Brew Nitro Espresso (330ml)',
    price: 4.50,
    stockCount: 8,
    maxStock: 15,
    category: 'beverages',
    description: 'Triple-filtered micro-brewed espresso infused with liquid nitrogen for peak study concentration.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    badge: 'In Stock'
  },
  {
    id: 'item-02',
    name: 'Smart Electrolyte Hydration Flask',
    price: 3.25,
    stockCount: 3,
    maxStock: 20,
    category: 'beverages',
    description: 'Organic coconut water enriched with zinc, B-vitamins, and essential cellular electrolytes.',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    badge: 'Low Stock'
  },
  {
    id: 'item-03',
    name: 'Nootropic Focus Crunch Bar',
    price: 3.75,
    stockCount: 12,
    maxStock: 25,
    category: 'nutrition',
    description: 'Dark Belgian cacao with Lion\'s Mane mushroom extract and organic almond butter.',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    badge: 'In Stock'
  },
  {
    id: 'item-04',
    name: 'ANC Active Noise Cancelling Earbuds',
    price: 34.00,
    stockCount: 2,
    maxStock: 5,
    category: 'tech',
    description: 'High-fidelity acoustic wireless earbuds calibrated for silent library study zones.',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    badge: 'Low Stock'
  },
  {
    id: 'item-05',
    name: 'National College Matte Leather Journal',
    price: 18.50,
    stockCount: 14,
    maxStock: 20,
    category: 'stationery',
    description: 'Archival 120gsm acid-free paper with embossed gold National College emblem.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    badge: 'In Stock'
  },
  {
    id: 'item-06',
    name: 'MagSafe Multi-Port Power Bank (10,000mAh)',
    price: 26.00,
    stockCount: 0,
    maxStock: 10,
    category: 'tech',
    description: 'Fast 25W wireless power bank with magnetic lock for laptops and mobile devices.',
    imageUrl: 'https://images.unsplash.com/photo-1609592424082-f54e1957fae7?auto=format&fit=crop&w=600&q=80',
    badge: 'Out of Stock'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'anc-1',
    title: 'Annual AI & Robotics Research Symposium 2026 Registration Open',
    category: 'Academic Research',
    date: 'August 12, 2026',
    content: 'National College will host the international AI Symposium in the Innovation Auditorium. Keynote speeches by leading industry visionaries.',
    priority: 'Urgent'
  },
  {
    id: 'anc-2',
    title: 'Library 24/7 Silent Study Wings & AI Dispenser Stations Upgraded',
    category: 'Campus Facilities',
    date: 'August 10, 2026',
    content: 'All study pods in the Central Library now feature high-speed Wi-Fi 7 and automated IoT vending dispensers integrated with student wallet NFC.',
    priority: 'High'
  },
  {
    id: 'anc-3',
    title: 'Fall Semester Course Registration Deadline & Scholarship Review',
    category: 'Registrar Office',
    date: 'August 08, 2026',
    content: 'All senior scholars are requested to verify their credit requirements and submit research grant applications before August 20th.',
    priority: 'General'
  }
];

export const INITIAL_PURCHASES: PurchaseRecord[] = [
  {
    id: 'tx-8902',
    studentId: 'NC-2026-881',
    studentName: 'Alexander Vance',
    itemId: 'item-01',
    itemName: 'Cold Brew Nitro Espresso (330ml)',
    price: 4.50,
    timestamp: '2026-08-08 09:14 AM',
    status: 'Dispensed & Delivered',
    location: 'Central Library Dispenser #04'
  },
  {
    id: 'tx-8891',
    studentId: 'NC-2026-881',
    studentName: 'Alexander Vance',
    itemId: 'item-05',
    itemName: 'National College Matte Leather Journal',
    price: 18.50,
    timestamp: '2026-08-07 02:45 PM',
    status: 'Dispensed & Delivered',
    location: 'Computer Science Hub Dispenser #01'
  }
];
