
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

export interface Due {
  due_id: string;
  user_id: string;
  billing_month: string;
  amount: number;
  penalty: number;
  total_due: number;
  status: 'paid' | 'unpaid' | 'overdue';
  notes?: string;
}

export interface Payment {
  payment_id: string;
  due_id: string;
  user_id: string;
  amount: number;
  method: 'GCash' | 'Maya' | 'Bank Transfer' | 'Credit Card';
  proof_url: string;
  status: 'verified' | 'pending';
  date_paid: string;
}

export interface Visitor {
  visitor_id: string;
  homeowner_id: string; // user_id
  name: string;
  vehicle: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  qr_code: string;
  status: 'expected' | 'entered' | 'exited' | 'denied';
}
