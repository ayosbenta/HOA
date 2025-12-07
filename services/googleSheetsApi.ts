
import { User, UserRole, Announcement, Due, Visitor, AmenityReservation, AdminDashboardData, AnnouncementPayload, Payment, CCTV, CCTVPayload, FinancialReportData, ExpensePayload, Expense, Project, ProjectPayload } from '../types';

// IMPORTANT: Replace this with your own Google Apps Script Web App URL
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1VVSb9V6vLcG97GV6uu7Z0-ok0tfoJh13-V5OLOgzw3I/edit
// 2. Go to Extensions > Apps Script.
// 3. Paste the code from `scripts/Code.gs.js` into the editor.
// 4. Click "Deploy" > "New deployment".
// 5. Configure as a "Web app", execute as "Me", and give access to "Anyone".
// 6. Copy the "Web app URL" provided after deployment and paste it here, replacing the placeholder below.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8cmtGdnv_uz1O7CpBtLJkwlZhrO0t93NM-eh3vLQnD5TiaqY0QzvqUZL_rXSc7_pg0Q/exec';

interface AppSettings {
    monthlyDue: number;
    penalty: number;
    gcashQrCode: string | null;
    effectiveDate?: string;
}

export interface RegistrationPayload {
    fullName: string;
    email: string;
    phone: string;
    block: string;
    lot: string;
    password: string;
}

export interface VisitorPayload {
    homeownerId: string;
    name: string;
    vehicle: string;
    date: string;
}

export interface AmenityReservationPayload {
    userId: string;
    amenityName: AmenityReservation['amenity_name'];
    reservationDate: string;
    startTime: string;
    endTime: string;
    notes: string;
}

export interface PaymentPayload {
    dueId: string;
    userId: string;
    amount: number;
    method: 'GCash';
    proofUrl: string; // base64 encoded image
}

export interface UpdatePaymentStatusPayload {
    paymentId: string;
    status: Payment['status'];
    notes?: string;
}


const handleApiResponse = async (response: Response) => {
    const result = await response.json();
    if (!result.success) {
        const errorMessage = result.data?.error || 'API request failed';
        throw new Error(errorMessage);
    }
    return result.data;
};

export const apiLogin = async (email: string, password: string): Promise<User | null> => {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', payload: { email, password } }),
    });
    return handleApiResponse(response);
};

export const apiRegister = async (payload: RegistrationPayload): Promise<{ message: string }> => {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'register', payload }),
    });
    return handleApiResponse(response);
};


export const apiLogout = (): void => {
    // Logout is a client-side action (clearing session storage)
    console.log("User logged out");
};

export const getAnnouncements = (): Promise<Announcement[]> => {
    return fetch(`${SCRIPT_URL}?action=getAnnouncements`).then(handleApiResponse);
};

export const createAnnouncement = (payload: AnnouncementPayload): Promise<Announcement> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createAnnouncement', payload }),
    });
    return response.then(handleApiResponse);
};

export const getDuesForUser = (userId: string): Promise<Due[]> => {
    return fetch(`${SCRIPT_URL}?action=getDuesForUser&userId=${userId}`).then(handleApiResponse);
};

export const getAllDues = (): Promise<Due[]> => {
    return fetch(`${SCRIPT_URL}?action=getAllDues`).then(handleApiResponse);
}

export const getVisitorsForHomeowner = (homeownerId: string): Promise<Visitor[]> => {
    return fetch(`${SCRIPT_URL}?action=getVisitorsForHomeowner&homeownerId=${homeownerId}`).then(handleApiResponse);
};

export const getAllVisitors = (): Promise<Visitor[]> => {
    return fetch(`${SCRIPT_URL}?action=getAllVisitors`).then(handleApiResponse);
};

export const getHomeownerDashboardData = (userId: string): Promise<{ dues: Due[], announcements: Announcement[], pendingRequestsCount: number }> => {
    return fetch(`${SCRIPT_URL}?action=getHomeownerDashboardData&userId=${userId}`).then(handleApiResponse);
};

export const getAdminDashboardData = (): Promise<AdminDashboardData> => {
    return fetch(`${SCRIPT_URL}?action=getAdminDashboardData`).then(handleApiResponse);
};


export const getAllUsers = (): Promise<User[]> => {
    return fetch(`${SCRIPT_URL}?action=getAllUsers`).then(handleApiResponse);
};

export const updateUser = (userId: string, newRole: UserRole, newStatus: User['status']): Promise<User> => {
     const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', payload: { userId, newRole, newStatus } }),
    });
    return response.then(handleApiResponse);
};

export const getAppSettings = (): Promise<AppSettings> => {
    return fetch(`${SCRIPT_URL}?action=getAppSettings`).then(handleApiResponse);
};

export const updateAppSettings = (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateAppSettings', payload: { settings } }),
    });
    return response.then(handleApiResponse);
};

export const createVisitorPass = (payload: VisitorPayload): Promise<Visitor> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createVisitorPass', payload }),
    });
    return response.then(handleApiResponse);
};

export const submitPayment = (payload: PaymentPayload): Promise<Payment> => {
     const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'submitPayment', payload }),
    });
    return response.then(handleApiResponse);
};

export const recordCashPaymentIntent = (dueId: string): Promise<Payment> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({ action: 'recordCashPaymentIntent', payload: { dueId }})
    });
    return response.then(handleApiResponse);
};

export const recordAdminCashPayment = (dueId: string): Promise<Payment> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({ action: 'recordAdminCashPayment', payload: { dueId }})
    });
    return response.then(handleApiResponse);
}

export const updatePaymentStatus = (payload: UpdatePaymentStatusPayload): Promise<Payment> => {
     const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updatePaymentStatus', payload }),
    });
    return response.then(handleApiResponse);
};

// --- Amenity Reservations API ---

export const getAmenityReservationsForUser = (userId: string): Promise<AmenityReservation[]> => {
    return fetch(`${SCRIPT_URL}?action=getAmenityReservationsForUser&userId=${userId}`).then(handleApiResponse);
};

export const getAllAmenityReservations = (): Promise<AmenityReservation[]> => {
    return fetch(`${SCRIPT_URL}?action=getAllAmenityReservations`).then(handleApiResponse);
};

export const createAmenityReservation = (payload: AmenityReservationPayload): Promise<AmenityReservation> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createAmenityReservation', payload }),
    });
    return response.then(handleApiResponse);
};

export const updateAmenityReservationStatus = (reservationId: string, status: AmenityReservation['status']): Promise<AmenityReservation> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateAmenityReservationStatus', payload: { reservationId, status } }),
    });
    return response.then(handleApiResponse);
};

// --- CCTV API ---

export const getCCTVList = (): Promise<CCTV[]> => {
    return fetch(`${SCRIPT_URL}?action=getCCTVList`).then(handleApiResponse);
};

export const createCCTV = (payload: CCTVPayload): Promise<CCTV> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createCCTV', payload }),
    });
    return response.then(handleApiResponse);
};

export const updateCCTV = (payload: CCTV): Promise<CCTV> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateCCTV', payload }),
    });
    return response.then(handleApiResponse);
};

export const deleteCCTV = (cctvId: string): Promise<{ success: boolean }> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteCCTV', payload: { cctvId } }),
    });
    return response.then(handleApiResponse);
};

// --- FINANCIAL REPORTS API ---

export const getFinancialData = (): Promise<FinancialReportData> => {
    return fetch(`${SCRIPT_URL}?action=getFinancialData`).then(handleApiResponse);
};

export const createExpense = (payload: ExpensePayload): Promise<Expense> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createExpense', payload }),
    });
    return response.then(handleApiResponse);
};

// --- PROJECTS / PLANNING API ---

export const getProjects = (): Promise<Project[]> => {
    return fetch(`${SCRIPT_URL}?action=getProjects`).then(handleApiResponse);
};

export const createProject = (payload: ProjectPayload): Promise<Project> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createProject', payload }),
    });
    return response.then(handleApiResponse);
};

export const updateProject = (projectId: string, payload: ProjectPayload): Promise<Project> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateProject', payload: { projectId, ...payload } }),
    });
    return response.then(handleApiResponse);
};

export const deleteProject = (projectId: string): Promise<{ success: boolean }> => {
    const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteProject', payload: { projectId } }),
    });
    return response.then(handleApiResponse);
};
