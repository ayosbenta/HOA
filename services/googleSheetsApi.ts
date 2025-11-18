import { User, UserRole, Announcement, Due, Visitor } from '../types';

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
}

export interface RegistrationPayload {
    fullName: string;
    email: string;
    phone: string;
    block: string;
    lot: string;
    password: string;
}


const handleApiResponse = async (response: Response) => {
    // fix: Removed dead code block that checks for a placeholder SCRIPT_URL.
    // The URL is now configured, making the check and its mock logic obsolete.
    const result = await response.json();
    if (!result.success) {
        // fix: Correctly parse the nested error message from the backend.
        // The backend sends errors in the format { success: false, data: { error: '...' } }
        const errorMessage = result.data?.error || 'API request failed';
        throw new Error(errorMessage);
    }
    return result.data;
};

export const apiLogin = async (email: string, password: string): Promise<User | null> => {
    // fix: Removed dead code block with mock login logic.
    // The SCRIPT_URL is configured, so the app should use the live API.

    // In a real app, never send password in a POST body like this without HTTPS.
    // Apps Script web apps are served over HTTPS, so this is secure.
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        // Apps Script doPost requires a string body and this specific content type
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

export const getHomeownerDashboardData = (userId: string): Promise<{ dues: Due[], announcements: Announcement[] }> => {
    return fetch(`${SCRIPT_URL}?action=getHomeownerDashboardData&userId=${userId}`).then(handleApiResponse);
};


export const getAllUsers = (): Promise<User[]> => {
    return fetch(`${SCRIPT_URL}?action=getAllUsers`).then(handleApiResponse);
};

export const updateUserRole = (userId: string, newRole: UserRole): Promise<User> => {
     const response = fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUserRole', payload: { userId, newRole } }),
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
