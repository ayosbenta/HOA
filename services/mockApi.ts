import { User, Announcement, Due, Visitor, UserRole } from '../types';

const today = new Date().toISOString();

const mockUsers: User[] = [
    { user_id: 'user_001', role: UserRole.ADMIN, full_name: 'Admin User', email: 'admin@hoa.com', phone: '09171234567', block: 1, lot: 1, status: 'active', date_created: today },
    { user_id: 'user_002', role: UserRole.HOMEOWNER, full_name: 'John Doe', email: 'john.doe@home.com', phone: '09181234567', block: 5, lot: 12, status: 'active', date_created: today },
    { user_id: 'user_003', role: UserRole.HOMEOWNER, full_name: 'Jane Smith', email: 'jane.smith@home.com', phone: '09191234567', block: 8, lot: 2, status: 'active', date_created: today },
    { user_id: 'user_004', role: UserRole.STAFF, full_name: 'Security Guard', email: 'staff@hoa.com', phone: '09201234567', block: 0, lot: 0, status: 'active', date_created: today },
];

const mockAnnouncements: Announcement[] = [
    { ann_id: 'ann_001', title: 'Community Octoberfest Party!', content: 'Join us for a night of fun, food, and music at the clubhouse this coming October 30th at 7 PM. Please RSVP by October 25th.', image_url: 'https://images.unsplash.com/photo-1570592801226-f793616f7433?q=80&w=2070&auto=format&fit=crop', created_by: 'Admin User', created_at: '2023-10-15T10:00:00Z', audience: 'all' },
    { ann_id: 'ann_002', title: 'Quarterly Pest Control Schedule', content: 'The quarterly pest control will be conducted on November 5th. Please ensure someone is home to grant access to our accredited pest control provider.', created_by: 'Admin User', created_at: '2023-10-10T14:30:00Z', audience: 'all' }
];

const mockDues: Due[] = [
    { due_id: 'due_001', user_id: 'user_002', billing_month: 'October 2023', amount: 2000, penalty: 100, total_due: 2100, status: 'overdue' },
    { due_id: 'due_002', user_id: 'user_002', billing_month: 'September 2023', amount: 2000, penalty: 0, total_due: 2000, status: 'paid', notes: 'Paid via GCash' },
    { due_id: 'due_003', user_id: 'user_003', billing_month: 'October 2023', amount: 2000, penalty: 0, total_due: 2000, status: 'unpaid' },
    { due_id: 'due_004', user_id: 'user_003', billing_month: 'September 2023', amount: 2000, penalty: 0, total_due: 2000, status: 'paid' }
];

const mockVisitors: Visitor[] = [
    { visitor_id: 'vis_001', homeowner_id: 'user_002', name: 'Maria Dela Cruz', vehicle: 'ABC 123', date: '2023-10-28', time_in: '10:00 AM', time_out: null, qr_code: 'qr_code_string_1', status: 'expected' },
    { visitor_id: 'vis_002', homeowner_id: 'user_002', name: 'Peter Pan', vehicle: '', date: '2023-10-27', time_in: '2:00 PM', time_out: '4:00 PM', qr_code: 'qr_code_string_2', status: 'exited' },
    { visitor_id: 'vis_003', homeowner_id: 'user_003', name: 'Juan Tamad', vehicle: 'XYZ 789', date: '2023-10-29', time_in: null, time_out: null, qr_code: 'qr_code_string_3', status: 'expected' }
];

const mockSettings = {
    monthlyDue: 2000,
    penalty: 100,
    gcashQrCode: '' // Initially empty, to be uploaded via UI
};


// Mock API functions
export const mockLogin = (email: string, password: string): Promise<User | null> => {
    const user = mockUsers.find(u => u.email === email);
    // In a real mock, you'd check a mock password. Here we simplify.
    if (user && ((user.role === UserRole.ADMIN && password === 'admin') || password === 'password')) {
        return Promise.resolve(user);
    }
    return Promise.resolve(null);
};

export const getMockAnnouncements = (): Promise<Announcement[]> => Promise.resolve(mockAnnouncements);

export const getMockDuesForUser = (userId: string): Promise<Due[]> => {
    return Promise.resolve(mockDues.filter(d => d.user_id === userId));
};

export const getMockAllDues = (): Promise<Due[]> => Promise.resolve(mockDues);

export const getMockVisitorsForHomeowner = (homeownerId: string): Promise<Visitor[]> => {
    return Promise.resolve(mockVisitors.filter(v => v.homeowner_id === homeownerId));
};

export const getMockAllVisitors = (): Promise<Visitor[]> => Promise.resolve(mockVisitors);

export const getMockHomeownerDashboardData = (userId: string): Promise<{ dues: Due[], announcements: Announcement[] }> => {
    const dues = mockDues.filter(d => d.user_id === userId);
    const announcements = mockAnnouncements.slice(0, 3);
    return Promise.resolve({ dues, announcements });
};

export const getMockAllUsers = (): Promise<User[]> => Promise.resolve(mockUsers);

export const getMockAppSettings = (): Promise<typeof mockSettings> => Promise.resolve(mockSettings);

export const updateMockUserRole = (userId: string, newRole: UserRole): Promise<User> => {
    const userIndex = mockUsers.findIndex(u => u.user_id === userId);
    if (userIndex > -1) {
        mockUsers[userIndex].role = newRole;
        return Promise.resolve(mockUsers[userIndex]);
    }
    return Promise.reject('User not found');
};

export const updateMockAppSettings = (settings: Partial<typeof mockSettings>): Promise<typeof mockSettings> => {
    Object.assign(mockSettings, settings);
    return Promise.resolve(mockSettings);
};
