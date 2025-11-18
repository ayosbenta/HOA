import { User, UserRole, Announcement, Due, Visitor } from '../types';

// --- MOCK DATABASE ---

const mockUsers: User[] = [
  {
    user_id: 'user-admin-01',
    role: UserRole.ADMIN,
    full_name: 'Admin User',
    email: 'admin@hoa.com',
    phone: '123-456-7890',
    block: 1,
    lot: 1,
    status: 'active',
    date_created: '2023-01-01T10:00:00Z',
  },
  {
    user_id: 'user-owner-01',
    role: UserRole.HOMEOWNER,
    full_name: 'John Doe',
    email: 'john.doe@home.com',
    phone: '098-765-4321',
    block: 5,
    lot: 12,
    status: 'active',
    date_created: '2023-02-15T11:30:00Z',
  },
  {
    user_id: 'user-staff-01',
    role: UserRole.STAFF,
    full_name: 'Security Guard',
    email: 'staff@hoa.com',
    phone: '555-555-5555',
    block: 0,
    lot: 0,
    status: 'active',
    date_created: '2023-01-10T08:00:00Z',
  },
];

const mockAnnouncements: Announcement[] = [
    {
      ann_id: 'ann-001',
      title: 'Community Town Hall Meeting',
      content: 'Join us for a town hall meeting on October 30th at 7 PM in the clubhouse to discuss the upcoming holiday events and budget for next year. Your participation is highly encouraged!',
      image_url: 'https://images.unsplash.com/photo-1561494226-54f420551a4a?q=80&w=2070&auto=format&fit=crop',
      created_by: 'Admin User',
      created_at: '2023-10-25T09:00:00Z',
      audience: 'all',
    },
    {
      ann_id: 'ann-002',
      title: 'Annual Pest Control Schedule',
      content: 'The annual pest control service is scheduled for the first week of November. Please check the detailed schedule for your block and ensure you provide access to the service team.',
      created_by: 'Admin User',
      created_at: '2023-10-22T14:20:00Z',
      audience: 'all',
    },
    {
      ann_id: 'ann-003',
      title: 'Swimming Pool Maintenance',
      content: 'The community swimming pool will be closed for maintenance from November 5th to November 7th. We apologize for any inconvenience this may cause.',
      image_url: 'https://images.unsplash.com/photo-1575059802216-9524552b2847?q=80&w=1974&auto=format&fit=crop',
      created_by: 'Admin User',
      created_at: '2023-10-20T11:00:00Z',
      audience: 'all',
    }
];

const mockDues: Due[] = [
  {
    due_id: 'due-001',
    user_id: 'user-owner-01',
    billing_month: 'October 2023',
    amount: 2500,
    penalty: 250,
    total_due: 2750,
    status: 'overdue',
  },
  {
    due_id: 'due-002',
    user_id: 'user-owner-01',
    billing_month: 'September 2023',
    amount: 2500,
    penalty: 0,
    total_due: 2500,
    status: 'paid',
  },
  {
    due_id: 'due-003',
    user_id: 'user-owner-02', // some other user for admin view
    billing_month: 'October 2023',
    amount: 2500,
    penalty: 0,
    total_due: 2500,
    status: 'unpaid',
  },
  {
    due_id: 'due-004',
    user_id: 'user-owner-03',
    billing_month: 'October 2023',
    amount: 3000,
    penalty: 0,
    total_due: 3000,
    status: 'paid',
  }
];

const mockVisitors: Visitor[] = [
    {
      visitor_id: 'vis-001',
      homeowner_id: 'user-owner-01',
      name: 'Jane Smith',
      vehicle: 'ABC 123',
      date: '2023-10-28',
      time_in: null,
      time_out: null,
      qr_code: 'qr-code-string-1',
      status: 'expected',
    },
    {
      visitor_id: 'vis-002',
      homeowner_id: 'user-owner-01',
      name: 'Peter Jones',
      vehicle: '',
      date: '2023-10-27',
      time_in: '10:05:12',
      time_out: '11:30:45',
      qr_code: 'qr-code-string-2',
      status: 'exited',
    },
    {
        visitor_id: 'vis-003',
        homeowner_id: 'user-owner-02',
        name: 'Contractor Work',
        vehicle: 'XYZ 789',
        date: '2023-10-28',
        time_in: '09:00:00',
        time_out: null,
        qr_code: 'qr-code-string-3',
        status: 'entered',
    }
];

// --- API FUNCTIONS ---

const simulateApiCall = <T>(data: T, delay = 500): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation
        }, delay);
    });
};

export const apiLogin = async (email: string, password: string): Promise<User | null> => {
    console.log(`Attempting login for email: ${email}`);
    const user = mockUsers.find(u => u.email === email);
    // In a real app, you'd check the password hash
    if (user && password === 'password') { // Simple password check for mock
        return simulateApiCall(user);
    }
    return simulateApiCall(null);
};

export const apiLogout = (): void => {
    console.log("User logged out");
    // No server call needed for this mock
};

export const getAnnouncements = (): Promise<Announcement[]> => {
    return simulateApiCall(mockAnnouncements.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
};

export const getDuesForUser = (userId: string): Promise<Due[]> => {
    const userDues = mockDues.filter(due => due.user_id === userId);
    return simulateApiCall(userDues);
};

export const getAllDues = (): Promise<Due[]> => {
    return simulateApiCall(mockDues);
}

export const getVisitorsForHomeowner = (homeownerId: string): Promise<Visitor[]> => {
    const userVisitors = mockVisitors.filter(v => v.homeowner_id === homeownerId);
    return simulateApiCall(userVisitors);
};

export const getAllVisitors = (): Promise<Visitor[]> => {
    return simulateApiCall(mockVisitors);
};

export const getHomeownerDashboardData = async (userId: string): Promise<{ dues: Due[], announcements: Announcement[] }> => {
    const dues = await getDuesForUser(userId);
    const announcements = await getAnnouncements();
    return simulateApiCall({
        dues: dues,
        announcements: announcements.slice(0, 2) // Return only the latest 2 announcements for dashboard
    });
};