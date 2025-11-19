export enum UserRole {
  ADMIN = 'Admin',
  HOMEOWNER = 'Homeowner',
  STAFF = 'Staff',
  TENANT = 'Tenant',
}

export interface User {
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
  block: number;
  lot: number;
  status: 'active' | 'pending' | 'inactive';
  date_created: string;
}

export interface Announcement {
  ann_id: string;
  title: string;
  content: string;
  image_url?: string;
  created_by: string; // user_id
  created_at: string;
  audience: 'all' | UserRole[];
}

export interface AnnouncementPayload {
  title: string;
  content: string;
  image_url?: string;
  created_by: string; // user's full_name
  audience: 'all' | UserRole;
}

export interface Due {
  due_id: string;
  user_id: string;
  billing_month: string;
  amount: number;
  penalty: number;
  total_due: number;
  status: 'paid' | 'unpaid' | 'overdue';
  notes?: string;
  payment?: Payment | null; // Associated payment
  // For admin view
  full_name?: string;
  block?: number;
  lot?: number;
}

export interface Payment {
  payment_id: string;
  due_id: string;
  user_id: string;
  amount: number;
  method: 'GCash' | 'Maya' | 'Bank Transfer' | 'Credit Card' | 'Cash';
  proof_url?: string;
  status: 'verified' | 'pending' | 'rejected';
  date_paid: string;
  notes?: string; // For rejection reason
}

export interface Visitor {
  visitor_id: string;
  homeowner_id: string; // user_id
  homeowner_name?: string;
  homeowner_address?: string;
  name: string;
  vehicle: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  qr_code: string;
  status: 'expected' | 'entered' | 'exited' | 'denied';
}

export interface AmenityReservation {
  reservation_id: string;
  user_id: string;
  full_name?: string; // Added for admin view
  amenity_name: 'Clubhouse' | 'Basketball Court' | 'Swimming Pool';
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  notes?: string;
}

export interface AdminDashboardData {
    duesCollected: number;
    pendingApprovalsCount: number;
    upcomingEventsCount: number;
    activeMembers: number;
    pendingApprovals: {
        id: string;
        name: string;
        type: string;
        date: string;
    }[];
}