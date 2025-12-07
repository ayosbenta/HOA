
// =================================================================
// Deca Homes Phase 1 - Google Apps Script Backend
// =================================================================
// INSTRUCTIONS:
// 1. Create a new Google Sheet.
// 2. Open Extensions > Apps Script.
// 3. Paste this entire code into the script editor and save.
// 4. From the script editor, select the 'setupMockData' function from the dropdown and run it once to initialize your sheet.
// 5. Deploy > New deployment > Type: Web app.
// 6. Execute as: Me. Who has access: Anyone.
// 7. Copy the Web app URL and paste it into `services/googleSheetsApi.ts` in your frontend code.
// =================================================================

// SHEET SCHEMA (Created automatically by `setupMockData`)
// ---------------------------------
// Sheet: Users
// Columns: user_id, role, full_name, email, phone, block, lot, password_hash, status, date_created
//
// Sheet: Announcements
// Columns: ann_id, title, content, image_url, created_by, created_at, audience
//
// Sheet: Dues
// Columns: due_id, user_id, billing_month, amount, penalty, total_due, status, notes
//
// Sheet: Payments
// Columns: payment_id, due_id, user_id, amount, method, proof_url, status, date_paid, notes
//
// Sheet: Visitors
// Columns: visitor_id, homeowner_id, name, vehicle, date, time_in, time_out, qr_code, status
//
// Sheet: Settings
// Columns: key, value
//
// Sheet: Amenity Reservations
// Columns: reservation_id, user_id, amenity_name, reservation_date, start_time, end_time, status, notes
//
// Sheet: CCTV
// Columns: cctv_id, name, stream_url, created_at
//
// Sheet: Expenses
// Columns: expense_id, date, category, amount, payee, description, created_by
//
// Sheet: Projects
// Columns: project_id, name, description, status, start_date, end_date, budget, funds_allocated, funds_spent, created_at
// =================================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

// --- PERFORMANCE CACHING UTILITIES ---
const CACHE = CacheService.getScriptCache();
const CACHE_EXPIRATION_SECONDS = 300; // Cache data for 5 minutes

// Generic function to get data from cache or fetch it if not present
function getCached(key, fetchFunction) {
  const cached = CACHE.get(key);
  if (cached != null) {
    Logger.log(`Cache HIT for key: ${key}`);
    return JSON.parse(cached);
  }
  
  Logger.log(`Cache MISS for key: ${key}. Fetching data.`);
  const data = fetchFunction();
  if (data) {
    const jsonString = JSON.stringify(data);
    // Check if the data is too large for the cache (100KB limit)
    if (jsonString.length < 100 * 1024) {
      CACHE.put(key, jsonString, CACHE_EXPIRATION_SECONDS);
    } else {
      Logger.log(`Cache SKIPPED for key: ${key}. Data size (${jsonString.length} bytes) exceeds cache limit.`);
    }
  }
  return data;
}

// Function to clear a specific cache key
function clearCache(key) {
  Logger.log(`Clearing cache for key: ${key}`);
  CACHE.remove(key);
}

// Centralized cache key definitions to prevent typos
const CACHE_KEYS = {
  ANNOUNCEMENTS: 'announcements',
  ALL_DUES: 'all_dues',
  ALL_VISITORS: 'all_visitors',
  ADMIN_DASHBOARD: 'admin_dashboard',
  ALL_USERS: 'all_users',
  APP_SETTINGS: 'app_settings',
  ALL_RESERVATIONS: 'all_reservations',
  CCTV_LIST: 'cctv_list',
  FINANCIAL_REPORT: 'financial_report',
  PROJECT_LIST: 'project_list',
  USER_DUES: (userId) => `dues_${userId}`,
  USER_VISITORS: (homeownerId) => `visitors_${homeownerId}`,
  USER_DASHBOARD: (userId) => `dashboard_${userId}`,
  USER_RESERVATIONS: (userId) => `reservations_${userId}`,
};


function getSheetOrThrow(name) {
    const sheet = SS.getSheetByName(name);
    if (!sheet) {
        throw new Error(`Critical Setup Error: Google Sheet tab named "${name}" was not found. Please run the "setupMockData" function from the Apps Script editor to initialize the sheets.`);
    }
    return sheet;
}


// --- WEB APP ENTRY POINTS ---

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30 seconds for the lock.

  try {
    const action = e.parameter.action;
    Logger.log(JSON.stringify({type: 'GET', action: action, parameters: e.parameters}));

    if (!action) {
      return jsonResponse({ 
        error: 'API Error: The "action" parameter was missing. This can happen if the Apps Script is not deployed with "Access" set to "Anyone". Please re-deploy and check your deployment settings.' 
      }, false);
    }

    let data;

    // Use the caching layer for all GET requests
    switch (action) {
      case 'getAnnouncements':
        data = getCached(CACHE_KEYS.ANNOUNCEMENTS, getAnnouncements);
        break;
      case 'getDuesForUser':
        data = getCached(CACHE_KEYS.USER_DUES(e.parameter.userId), () => getDuesForUser(e.parameter.userId));
        break;
      case 'getAllDues':
        data = getCached(CACHE_KEYS.ALL_DUES, getAllDues);
        break;
      case 'getVisitorsForHomeowner':
        data = getCached(CACHE_KEYS.USER_VISITORS(e.parameter.homeownerId), () => getVisitorsForHomeowner(e.parameter.homeownerId));
        break;
      case 'getAllVisitors':
        data = getCached(CACHE_KEYS.ALL_VISITORS, getAllVisitors);
        break;
      case 'getHomeownerDashboardData':
        data = getCached(CACHE_KEYS.USER_DASHBOARD(e.parameter.userId), () => getHomeownerDashboardData(e.parameter.userId));
        break;
      case 'getAdminDashboardData':
        data = getCached(CACHE_KEYS.ADMIN_DASHBOARD, getAdminDashboardData);
        break;
      case 'getAllUsers':
        data = getCached(CACHE_KEYS.ALL_USERS, getAllUsers);
        break;
      case 'getAppSettings':
        // Custom caching logic for settings to avoid caching large QR code images.
        const cachedFeeSchedule = CACHE.get(CACHE_KEYS.APP_SETTINGS);
        if (cachedFeeSchedule != null) {
          Logger.log(`Cache HIT for key: ${CACHE_KEYS.APP_SETTINGS}`);
          data = JSON.parse(cachedFeeSchedule);
          // Manually fetch and add the non-cached QR code
          const settingsSheet = getSheetOrThrow("Settings");
          const allSettingsData = sheetToJSON(settingsSheet, ['key', 'value']);
          const qrCodeSetting = allSettingsData.find(s => s.key === 'gcashQrCode');
          data.gcashQrCode = qrCodeSetting ? qrCodeSetting.value : null;
        } else {
          Logger.log(`Cache MISS for key: ${CACHE_KEYS.APP_SETTINGS}. Fetching data.`);
          const allSettings = getAppSettings(); // This fetches everything from the sheet.
          data = allSettings; // The full data to be returned to the client.
          
          // Now, create a version for the cache that excludes the large QR code.
          const { gcashQrCode, ...settingsToCache } = allSettings;
          const jsonStringToCache = JSON.stringify(settingsToCache);
           if (jsonStringToCache.length < 100 * 1024) {
             CACHE.put(CACHE_KEYS.APP_SETTINGS, jsonStringToCache, CACHE_EXPIRATION_SECONDS);
           }
        }
        break;
      case 'getAmenityReservationsForUser':
        data = getCached(CACHE_KEYS.USER_RESERVATIONS(e.parameter.userId), () => getAmenityReservationsForUser(e.parameter.userId));
        break;
      case 'getAllAmenityReservations':
        data = getCached(CACHE_KEYS.ALL_RESERVATIONS, getAllAmenityReservations);
        break;
      case 'getCCTVList':
        data = getCached(CACHE_KEYS.CCTV_LIST, getCCTVList);
        break;
      case 'getFinancialData':
        data = getCached(CACHE_KEYS.FINANCIAL_REPORT, getFinancialData);
        break;
      case 'getProjects':
        data = getCached(CACHE_KEYS.PROJECT_LIST, getProjects);
        break;
      default:
        return jsonResponse({ error: 'Invalid GET action: ' + action }, false);
    }
    return jsonResponse(data);
  } catch (error) {
    Logger.log('doGet Error: ' + error.toString() + ' Stack: ' + error.stack);
    return jsonResponse({ error: error.message }, false);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30 seconds for the lock.

  try {
    if (!e || !e.postData || !e.postData.contents) {
      const errorMsg = 'Invalid POST request: No data received. This is often a sign of a deployment issue. Please re-deploy your script and ensure "Who has access" is set to "Anyone".';
      Logger.log(errorMsg);
      return jsonResponse({ error: errorMsg }, false);
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload;
    Logger.log(JSON.stringify({type: 'POST', action: action, payload: payload ? Object.keys(payload) : null})); // Don't log payload value in case it's sensitive
    let data;

    // Invalidate relevant caches after data modification
    switch (action) {
      case 'login':
        data = login(payload);
        break;
      case 'register':
        data = register(payload);
        clearCache(CACHE_KEYS.ALL_USERS);
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        break;
      case 'updateUser':
        data = updateUser(payload);
        clearCache(CACHE_KEYS.ALL_USERS);
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        break;
      case 'updateAppSettings':
        data = updateAppSettings(payload.settings);
        clearCache(CACHE_KEYS.APP_SETTINGS);
        break;
      case 'createVisitorPass':
        data = createVisitorPass(payload);
        clearCache(CACHE_KEYS.ALL_VISITORS);
        clearCache(CACHE_KEYS.USER_VISITORS(payload.homeownerId));
        break;
      case 'createAnnouncement':
        data = createAnnouncement(payload);
        clearCache(CACHE_KEYS.ANNOUNCEMENTS);
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        // Note: Individual user dashboards with announcements might show stale data until cache expires.
        break;
      case 'submitPayment':
        data = submitPayment(payload);
        clearCache(CACHE_KEYS.ALL_DUES);
        clearCache(CACHE_KEYS.USER_DUES(payload.userId));
        clearCache(CACHE_KEYS.FINANCIAL_REPORT);
        break;
      case 'recordCashPaymentIntent':
        data = recordCashPaymentIntent(payload);
        if (data && data.user_id) {
          clearCache(CACHE_KEYS.ALL_DUES);
          clearCache(CACHE_KEYS.USER_DUES(data.user_id));
        }
        break;
      case 'recordAdminCashPayment':
        data = recordAdminCashPayment(payload);
        if (data && data.user_id) {
          clearCache(CACHE_KEYS.ALL_DUES);
          clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
          clearCache(CACHE_KEYS.USER_DUES(data.user_id));
          clearCache(CACHE_KEYS.USER_DASHBOARD(data.user_id));
          clearCache(CACHE_KEYS.FINANCIAL_REPORT);
        }
        break;
      case 'updatePaymentStatus':
        data = updatePaymentStatus(payload);
        clearCache(CACHE_KEYS.ALL_DUES);
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        clearCache(CACHE_KEYS.FINANCIAL_REPORT);
        if (data && data.user_id) {
          clearCache(CACHE_KEYS.USER_DUES(data.user_id));
          clearCache(CACHE_KEYS.USER_DASHBOARD(data.user_id));
        }
        break;
      case 'createAmenityReservation':
        data = createAmenityReservation(payload);
        clearCache(CACHE_KEYS.ALL_RESERVATIONS);
        clearCache(CACHE_KEYS.USER_RESERVATIONS(payload.userId));
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        clearCache(CACHE_KEYS.USER_DASHBOARD(payload.userId));
        break;
      case 'updateAmenityReservationStatus':
        data = updateAmenityReservationStatus(payload);
        clearCache(CACHE_KEYS.ALL_RESERVATIONS);
        if (data && data.user_id) {
          clearCache(CACHE_KEYS.USER_RESERVATIONS(data.user_id));
          clearCache(CACHE_KEYS.USER_DASHBOARD(data.user_id));
        }
        clearCache(CACHE_KEYS.ADMIN_DASHBOARD);
        break;
      case 'createCCTV':
        data = createCCTV(payload);
        clearCache(CACHE_KEYS.CCTV_LIST);
        break;
      case 'updateCCTV':
        data = updateCCTV(payload);
        clearCache(CACHE_KEYS.CCTV_LIST);
        break;
      case 'deleteCCTV':
        data = deleteCCTV(payload.cctvId);
        clearCache(CACHE_KEYS.CCTV_LIST);
        break;
      case 'createExpense':
        data = createExpense(payload);
        clearCache(CACHE_KEYS.FINANCIAL_REPORT);
        break;
      case 'createProject':
        data = createProject(payload);
        clearCache(CACHE_KEYS.PROJECT_LIST);
        break;
      case 'updateProject':
        data = updateProject(payload);
        clearCache(CACHE_KEYS.PROJECT_LIST);
        break;
      case 'deleteProject':
        data = deleteProject(payload.projectId);
        clearCache(CACHE_KEYS.PROJECT_LIST);
        break;
      default:
        return jsonResponse({ error: 'Invalid POST action: ' + action }, false);
    }
    return jsonResponse(data);
  } catch (error)
  {
    Logger.log('doPost Error: ' + error.toString() + ' Stack: ' + error.stack);
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: 'Failed to parse request body as JSON.', details: error.message }, false);
    }
    return jsonResponse({ error: error.message }, false);
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(data, success = true) {
  return ContentService.createTextOutput(JSON.stringify({ success, data }))
    .setMimeType(ContentService.MimeType.JSON);
}


// --- API FUNCTIONS ---

function login({ email, password }) {
  if (!email || !password) {
    Logger.log('Login attempt with missing email or password.');
    return null;
  }
  
  Logger.log(`Attempting login for email: ${email}`);
  const usersSheet = getSheetOrThrow("Users");
  const users = sheetToJSON(usersSheet);
  
  const user = users.find(u => String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase());
  
  if (!user) {
    Logger.log(`Login failed: No user found with email: ${email}`);
    return null;
  }

  Logger.log(`User found: ${user.full_name}. Comparing passwords and status.`);
  
  if (String(user.password_hash).trim() === String(password).trim()) {
    if (user.status !== 'active') {
      Logger.log(`Login failed: User account status is "${user.status}".`);
      throw new Error(`Your account is currently ${user.status}. Please contact the administrator.`);
    }
    Logger.log(`Login successful for user: ${user.full_name}`);
    const { password_hash, ...userClientData } = user;
    return userClientData;
  } else {
    Logger.log(`Login failed: Password mismatch for user: ${user.full_name}.`);
    return null;
  }
}

function register(payload) {
    const { fullName, email, phone, block, lot, password } = payload;
    if (!fullName || !email || !phone || !block || !lot || !password) {
        throw new Error('All registration fields are required.');
    }

    const usersSheet = getSheetOrThrow("Users");
    const users = sheetToJSON(usersSheet, ['email']); 

    const existingUser = users.find(u => String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase());
    if (existingUser) {
        throw new Error('An account with this email address already exists.');
    }

    const newUserId = 'user_' + new Date().getTime();
    const today = new Date().toISOString();

    const newUserRow = [
        newUserId,          // user_id
        'Homeowner',        // role
        fullName,           // full_name
        email,              // email
        phone,              // phone
        block,              // block
        lot,                // lot
        password,           // password_hash
        'pending',          // status
        today               // date_created
    ];

    usersSheet.appendRow(newUserRow);

    return { message: 'Registration successful! Your account is pending approval by the administrator.' };
}

function getAnnouncements() {
  const required = ['ann_id', 'title', 'content', 'created_by', 'created_at'];
  const announcementsSheet = getSheetOrThrow("Announcements");
  return sheetToJSON(announcementsSheet, required).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
}

function createAnnouncement(payload) {
    const { title, content, image_url, created_by, audience } = payload;
    if (!title || !content || !created_by || !audience) {
        throw new Error("Title, content, creator, and audience are required to create an announcement.");
    }

    const sheet = getSheetOrThrow("Announcements");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const newId = 'ann_' + new Date().getTime();
    const newAnnouncement = {
        ann_id: newId,
        title: title,
        content: content,
        image_url: image_url || null,
        created_by: created_by,
        created_at: new Date().toISOString(),
        audience: audience,
    };

    const newRow = headers.map(header => newAnnouncement[String(header).trim()] !== undefined ? newAnnouncement[String(header).trim()] : null);
    sheet.appendRow(newRow);

    return newAnnouncement;
}

function getDuesForUser(userId) {
  const duesSheet = getSheetOrThrow("Dues");
  // fix: Safely get the Payments sheet without throwing an error if it's missing.
  const paymentsSheet = SS.getSheetByName("Payments");

  const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
  // fix: If the Payments sheet doesn't exist, treat the payments list as empty.
  const allPayments = paymentsSheet ? sheetToJSON(paymentsSheet, ['payment_id', 'due_id']) : [];
  
  const userDues = allDues.filter(due => due.user_id === userId);

  const duesWithPayments = userDues.map(due => {
      const duePayments = allPayments.filter(p => p.due_id === due.due_id).sort((a, b) => new Date(b.date_paid) - new Date(a.date_paid));
      return {
          ...due,
          payment: duePayments.length > 0 ? duePayments[0] : null
      };
  });

  return duesWithPayments;
}

function getAllDues() {
    const duesSheet = getSheetOrThrow("Dues");
    const paymentsSheet = SS.getSheetByName("Payments");
    const usersSheet = getSheetOrThrow("Users");

    const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
    const allPayments = paymentsSheet ? sheetToJSON(paymentsSheet, ['payment_id', 'due_id']) : [];
    const allUsers = sheetToJSON(usersSheet, ['user_id']);
    
    const userMap = allUsers.reduce((map, user) => {
      map[user.user_id] = user;
      return map;
    }, {});

    const duesWithDetails = allDues.map(due => {
        const duePayments = allPayments.filter(p => p.due_id === due.due_id).sort((a, b) => new Date(b.date_paid) - new Date(a.date_paid));
        const homeowner = userMap[due.user_id];

        return {
            ...due,
            payment: duePayments.length > 0 ? duePayments[0] : null,
            full_name: homeowner ? homeowner.full_name : 'Unknown',
            block: homeowner ? homeowner.block : 'N/A',
            lot: homeowner ? homeowner.lot : 'N/A'
        };
    });

    return duesWithDetails;
}

function getVisitorsForHomeowner(homeownerId) {
  const visitorsSheet = getSheetOrThrow("Visitors");
  const allVisitors = sheetToJSON(visitorsSheet, ['visitor_id', 'homeowner_id']);
  return allVisitors.filter(v => v.homeowner_id === homeownerId);
}

function getAllVisitors() {
    const visitorsSheet = getSheetOrThrow("Visitors");
    const visitors = sheetToJSON(visitorsSheet, ['visitor_id']);
    const usersSheet = getSheetOrThrow("Users");
    const users = sheetToJSON(usersSheet, ['user_id', 'block', 'lot', 'full_name']);

    const visitorsWithHomeowner = visitors.map(v => {
      const homeowner = users.find(u => u.user_id === v.homeowner_id);
      return {
        ...v,
        homeowner_name: homeowner ? homeowner.full_name : 'N/A',
        homeowner_address: homeowner ? `B${homeowner.block} L${homeowner.lot}` : 'N/A'
      };
    });
    return visitorsWithHomeowner.sort((a,b) => new Date(b.date) - new Date(a.date));
}

function getHomeownerDashboardData(userId) {
    const dues = getDuesForUser(userId);
    const announcements = getAnnouncements().slice(0, 3); // Get latest 3

    const amenityReservations = getAmenityReservationsForUser(userId);
    const pendingAmenityReservations = amenityReservations.filter(r => r.status === 'pending').length;
    
    // Assuming there could be other types of requests in the future
    const totalPendingRequests = pendingAmenityReservations;

    return { dues, announcements, pendingRequestsCount: totalPendingRequests };
}

function getAdminDashboardData() {
    const usersSheet = getSheetOrThrow("Users");
    const amenityReservationsSheet = getSheetOrThrow("Amenity Reservations");
    const paymentsSheet = SS.getSheetByName("Payments");

    const users = sheetToJSON(usersSheet);
    const amenityReservations = sheetToJSON(amenityReservationsSheet);

    // 1. Dues collected this month (based on verified payment date)
    let duesCollected = 0;
    if (paymentsSheet) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const payments = sheetToJSON(paymentsSheet, ['status', 'date_paid', 'amount']);
        duesCollected = payments
            .filter(p => {
                if (p.status !== 'verified' || !p.date_paid) return false;
                const paidDate = new Date(p.date_paid);
                return paidDate >= firstDayOfMonth && paidDate < firstDayOfNextMonth;
            })
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    }

    // 2. Pending users
    const pendingUsers = users.filter(u => u.status === 'pending');

    // 3. Pending amenity reservations
    const pendingReservations = amenityReservations.filter(r => r.status === 'pending');

    // 4. Active members
    const activeMembers = users.filter(u => u.status === 'active' && u.role === 'Homeowner').length;

    // 5. Pending approvals list (combine and sort by date)
    const userApprovals = pendingUsers.map(u => ({
        id: u.user_id,
        name: u.full_name,
        type: 'New Member',
        date: u.date_created
    }));

    const amenityApprovals = pendingReservations.map(r => {
        const user = users.find(u => u.user_id === r.user_id);
        return {
            id: r.reservation_id,
            name: user ? user.full_name : 'Unknown User',
            type: `Amenity: ${r.amenity_name}`,
            date: r.reservation_date
        };
    });

    const allPendingApprovals = [...userApprovals, ...amenityApprovals]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // get latest 5

    return {
        duesCollected: duesCollected,
        pendingApprovalsCount: pendingUsers.length + pendingReservations.length,
        upcomingEventsCount: 0, // Placeholder, no events feature yet
        activeMembers: activeMembers,
        pendingApprovals: allPendingApprovals
    };
}


function getAllUsers() {
    const usersSheet = getSheetOrThrow("Users");
    const users = sheetToJSON(usersSheet, ['user_id', 'password_hash']);
    // Remove password hash before sending
    return users.map(u => {
      const { password_hash, ...userClientData } = u;
      return userClientData;
    });
}

function updateUser(payload) {
    const { userId, newRole, newStatus } = payload;
    if (!userId || !newRole || !newStatus) {
        throw new Error("User ID, new role, and new status are required for an update.");
    }
    const usersSheet = getSheetOrThrow("Users");
    const users = usersSheet.getDataRange().getValues();
    const headers = users[0];
    const userIndex = users.findIndex(row => row[headers.indexOf('user_id')] === userId);

    if (userIndex !== -1) {
        const roleIndex = headers.indexOf('role');
        const statusIndex = headers.indexOf('status');
        
        usersSheet.getRange(userIndex + 1, roleIndex + 1).setValue(newRole);
        usersSheet.getRange(userIndex + 1, statusIndex + 1).setValue(newStatus);

        // Return the updated user
        const updatedUserRow = usersSheet.getRange(userIndex + 1, 1, 1, headers.length).getValues()[0];
        const userObject = headers.reduce((obj, header, i) => {
            obj[header] = updatedUserRow[i];
            return obj;
        }, {});
        const { password_hash, ...userClientData } = userObject;
        return userClientData;
    }
    throw new Error('User not found');
}

function createVisitorPass(payload) {
    const { homeownerId, name, vehicle, date } = payload;
    if (!homeownerId || !name || !date) {
        throw new Error("Homeowner ID, guest name, and date are required to create a pass.");
    }

    const visitorsSheet = getSheetOrThrow("Visitors");
    const headers = visitorsSheet.getRange(1, 1, 1, visitorsSheet.getLastColumn()).getValues()[0];
    
    const newVisitorId = 'vis_' + new Date().getTime();
    const qrCode = 'qr_' + newVisitorId; // Placeholder QR code data
    const status = 'expected';
    
    const newVisitor = {
      visitor_id: newVisitorId,
      homeowner_id: homeownerId,
      name: name,
      vehicle: vehicle || '',
      date: date,
      time_in: null,
      time_out: null,
      qr_code: qrCode,
      status: status
    };

    const newRow = headers.map(header => newVisitor[String(header).trim()] !== undefined ? newVisitor[String(header).trim()] : null);

    visitorsSheet.appendRow(newRow);
    
    return newVisitor;
}

function getAppSettings() {
    const settingsSheet = getSheetOrThrow("Settings");
    const settings = sheetToJSON(settingsSheet, ['key', 'value']);
    const appSettings = {
        monthlyDue: 0,
        penalty: 0,
        gcashQrCode: null,
        effectiveDate: ''
    };
    settings.forEach(setting => {
        if (setting.key in appSettings) {
            const value = (setting.key === 'monthlyDue' || setting.key === 'penalty') 
              ? Number(setting.value) 
              : setting.value;
            appSettings[setting.key] = value;
        }
    });
    return appSettings;
}

function updateAppSettings(newSettings) {
    const oldSettings = getAppSettings();
    const settingsSheet = getSheetOrThrow("Settings");
    const settingsRange = settingsSheet.getDataRange();
    const settingsValues = settingsRange.getValues();
    const headers = settingsValues[0];
    const keyIndex = headers.indexOf('key');
    const valueIndex = headers.indexOf('value');

    Object.keys(newSettings).forEach(key => {
        const rowIndex = settingsValues.findIndex(row => row[keyIndex] === key);
        if (rowIndex !== -1) {
            settingsSheet.getRange(rowIndex + 1, valueIndex + 1).setValue(newSettings[key]);
        } else {
            settingsSheet.appendRow([key, newSettings[key]]);
        }
    });
    
    SpreadsheetApp.flush(); 

    const currentSettings = getAppSettings();

    if (newSettings.effectiveDate && newSettings.effectiveDate !== oldSettings.effectiveDate) {
        Logger.log(`Effective date changed from "${oldSettings.effectiveDate}" to "${newSettings.effectiveDate}". Triggering due generation.`);
        generateMonthlyDuesForAllHomeowners(currentSettings);
    }

    return currentSettings;
}

function generateMonthlyDuesForAllHomeowners(settings) {
    if (!settings || !settings.effectiveDate || !settings.monthlyDue) {
        Logger.log("Skipping due generation: Missing effectiveDate or monthlyDue in settings.");
        return;
    }

    const usersSheet = getSheetOrThrow("Users");
    const duesSheet = getSheetOrThrow("Dues");

    const allUsers = sheetToJSON(usersSheet);
    const activeHomeowners = allUsers.filter(u => u.role === 'Homeowner' && u.status === 'active');
    
    if (activeHomeowners.length === 0) {
        Logger.log("No active homeowners found to generate dues for.");
        return;
    }
    
    const allDues = sheetToJSON(duesSheet);
    
    const effectiveDate = new Date(settings.effectiveDate);
    effectiveDate.setUTCHours(12, 0, 0, 0); // Avoid timezone issues
    const billingMonthISO = effectiveDate.toISOString();
    
    Logger.log(`Generating dues for billing month starting: ${billingMonthISO}`);

    const existingDuesForMonth = new Set(
        allDues.filter(d => {
          if (!d.billing_month) return false;
          try {
            const dueBillingDate = new Date(d.billing_month);
            return dueBillingDate.getUTCFullYear() === effectiveDate.getUTCFullYear() &&
                   dueBillingDate.getUTCMonth() === effectiveDate.getUTCMonth();
          } catch(e) {
            return false;
          }
        }).map(d => d.user_id)
    );

    Logger.log(`${existingDuesForMonth.size} users already have dues for this month.`);

    const duesHeaders = duesSheet.getRange(1, 1, 1, duesSheet.getLastColumn()).getValues()[0];
    const newDuesRows = [];

    activeHomeowners.forEach(homeowner => {
        if (!existingDuesForMonth.has(homeowner.user_id)) {
            const newDueId = 'due_' + new Date().getTime() + '_' + homeowner.user_id.slice(-4);
            const newDue = {
                due_id: newDueId,
                user_id: homeowner.user_id,
                billing_month: billingMonthISO,
                amount: settings.monthlyDue,
                penalty: 0,
                total_due: settings.monthlyDue,
                status: 'unpaid',
                notes: ''
            };

            const newRow = duesHeaders.map(header => newDue[String(header).trim()] !== undefined ? newDue[String(header).trim()] : null);
            newDuesRows.push(newRow);
        }
    });

    if (newDuesRows.length > 0) {
        Logger.log(`Generating ${newDuesRows.length} new due entries.`);
        const lastRow = duesSheet.getLastRow();
        duesSheet.getRange(lastRow + 1, 1, newDuesRows.length, newDuesRows[0].length).setValues(newDuesRows);
        clearCache(CACHE_KEYS.ALL_DUES);
    } else {
        Logger.log("No new dues needed to be generated.");
    }
}


function submitPayment(payload) {
  const { dueId, userId, amount, method, proofUrl } = payload;
  if (!dueId || !userId || !amount || !method || !proofUrl) {
    throw new Error("Missing required fields for payment submission.");
  }

  const paymentsSheet = getSheetOrThrow("Payments");
  const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];

  const newPaymentId = 'pay_' + new Date().getTime();
  const newPayment = {
    payment_id: newPaymentId,
    due_id: dueId,
    user_id: userId,
    amount: amount,
    method: method,
    proof_url: proofUrl,
    status: 'pending',
    date_paid: new Date().toISOString(),
    notes: ''
  };

  const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
  paymentsSheet.appendRow(newRow);

  return newPayment;
}

function recordCashPaymentIntent(payload) {
  const { dueId } = payload;
  if (!dueId) {
    throw new Error("Due ID is required to record a cash payment intent.");
  }

  const duesSheet = getSheetOrThrow("Dues");
  const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
  const due = allDues.find(d => d.due_id === dueId);
  if (!due) {
    throw new Error("Due not found.");
  }

  const paymentsSheet = getSheetOrThrow("Payments");
  const allPayments = sheetToJSON(paymentsSheet, ['due_id']);
  const existingPayment = allPayments.find(p => p.due_id === dueId && (p.status === 'pending' || p.status === 'verified'));
  if (existingPayment) {
    throw new Error(`A payment for this due is already ${existingPayment.status}.`);
  }

  const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
  const newPaymentId = 'pay_' + new Date().getTime();
  
  const newPayment = {
    payment_id: newPaymentId,
    due_id: dueId,
    user_id: due.user_id,
    amount: due.total_due,
    method: 'Cash',
    proof_url: '',
    status: 'pending',
    date_paid: new Date().toISOString(),
    notes: 'Pending cash payment at office.'
  };

  const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
  paymentsSheet.appendRow(newRow);

  return newPayment;
}

function recordAdminCashPayment(payload) {
  const { dueId } = payload;
  if (!dueId) {
    throw new Error("Due ID is required to record a cash payment.");
  }

  const duesSheet = getSheetOrThrow("Dues");
  const duesData = duesSheet.getDataRange().getValues();
  const duesHeaders = duesData[0];
  const dueIdIndex = duesHeaders.indexOf('due_id');
  const dueRowIndex = duesData.findIndex(row => row[dueIdIndex] === dueId);

  if (dueRowIndex === -1) {
    throw new Error("Due not found.");
  }
  
  const dueRow = duesData[dueRowIndex];
  const dueObj = duesHeaders.reduce((obj, header, i) => {
    obj[header] = dueRow[i];
    return obj;
  }, {});
  
  // Update the due status to 'paid'
  const dueStatusIndex = duesHeaders.indexOf('status');
  duesSheet.getRange(dueRowIndex + 1, dueStatusIndex + 1).setValue('paid');

  // Create a new 'verified' payment record
  const paymentsSheet = getSheetOrThrow("Payments");
  const paymentsHeaders = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
  const newPaymentId = 'pay_' + new Date().getTime();
  
  const newPayment = {
    payment_id: newPaymentId,
    due_id: dueId,
    user_id: dueObj.user_id,
    amount: dueObj.total_due,
    method: 'Cash',
    proof_url: '',
    status: 'verified',
    date_paid: new Date().toISOString(),
    notes: 'Paid in cash at office. Recorded by admin.'
  };

  const newRow = paymentsHeaders.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
  paymentsSheet.appendRow(newRow);

  return newPayment;
}

function updatePaymentStatus(payload) {
  const { paymentId, status, notes } = payload;
  if (!paymentId || !status) {
    throw new Error("Payment ID and new status are required.");
  }

  const paymentsSheet = getSheetOrThrow("Payments");
  const paymentsData = paymentsSheet.getDataRange().getValues();
  const paymentsHeaders = paymentsData[0];
  const paymentIdIndex = paymentsHeaders.indexOf('payment_id');
  const paymentRowIndex = paymentsData.findIndex(row => row[paymentIdIndex] === paymentId);

  if (paymentRowIndex === -1) {
    throw new Error("Payment not found.");
  }
  
  const paymentRow = paymentsData[paymentRowIndex];
  const paymentObj = paymentsHeaders.reduce((obj, header, i) => {
    obj[header] = paymentRow[i];
    return obj;
  }, {});


  // Update payment status
  const statusIndex = paymentsHeaders.indexOf('status');
  paymentsSheet.getRange(paymentRowIndex + 1, statusIndex + 1).setValue(status);
  
  if (notes) {
      const notesIndex = paymentsHeaders.indexOf('notes');
      paymentsSheet.getRange(paymentRowIndex + 1, notesIndex + 1).setValue(notes);
  }

  // If approved, update the corresponding due
  if (status === 'verified') {
    const dueId = paymentObj.due_id;
    const duesSheet = getSheetOrThrow("Dues");
    const duesData = duesSheet.getDataRange().getValues();
    const duesHeaders = duesData[0];
    const dueIdIndex = duesHeaders.indexOf('due_id');
    const dueRowIndex = duesData.findIndex(row => row[dueIdIndex] === dueId);

    if (dueRowIndex !== -1) {
      const dueStatusIndex = duesHeaders.indexOf('status');
      duesSheet.getRange(dueRowIndex + 1, dueStatusIndex + 1).setValue('paid');
    }
  }

  // Return the full payment object for context
  return paymentObj;
}


// --- AMENITY RESERVATION FUNCTIONS ---

function createAmenityReservation(payload) {
    const { userId, amenityName, reservationDate, startTime, endTime, notes } = payload;
    if (!userId || !amenityName || !reservationDate || !startTime || !endTime) {
        throw new Error("User, amenity, date, and times are required.");
    }

    const reservationsSheet = getSheetOrThrow("Amenity Reservations");
    const headers = reservationsSheet.getRange(1, 1, 1, reservationsSheet.getLastColumn()).getValues()[0];

    const newReservationId = 'res_' + new Date().getTime();
    const newReservation = {
        reservation_id: newReservationId,
        user_id: userId,
        amenity_name: amenityName,
        reservation_date: reservationDate,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        notes: notes || '',
    };
    
    const newRow = headers.map(header => newReservation[String(header).trim()] !== undefined ? newReservation[String(header).trim()] : null);
    reservationsSheet.appendRow(newRow);
    
    return newReservation;
}

function getAmenityReservationsForUser(userId) {
    const sheet = getSheetOrThrow("Amenity Reservations");
    const reservations = sheetToJSON(sheet, ['reservation_id', 'user_id']);
    return reservations.filter(r => r.user_id === userId).sort((a,b) => new Date(b.reservation_date) - new Date(a.reservation_date));
}

function getAllAmenityReservations() {
    const reservationsSheet = getSheetOrThrow("Amenity Reservations");
    const reservations = sheetToJSON(reservationsSheet, ['reservation_id']);
    const usersSheet = getSheetOrThrow("Users");
    const users = sheetToJSON(usersSheet, ['user_id']);

    // Join with user data to get full_name
    const reservationsWithNames = reservations.map(res => {
        const user = users.find(u => u.user_id === res.user_id);
        return {
            ...res,
            full_name: user ? user.full_name : 'Unknown User',
        };
    });
    
    return reservationsWithNames.sort((a,b) => new Date(b.reservation_date) - new Date(a.reservation_date));
}

function updateAmenityReservationStatus(payload) {
    const { reservationId, status } = payload;
    if (!reservationId || !status) {
        throw new Error("Reservation ID and new status are required.");
    }

    const sheet = getSheetOrThrow("Amenity Reservations");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('reservation_id');
    const statusIndex = headers.indexOf('status');

    const rowIndex = data.findIndex(row => row[idIndex] === reservationId);

    if (rowIndex !== -1) {
        sheet.getRange(rowIndex + 1, statusIndex + 1).setValue(status);
        const updatedRow = sheet.getRange(rowIndex + 1, 1, 1, headers.length).getValues()[0];
        return headers.reduce((obj, header, i) => {
            obj[header] = updatedRow[i];
            return obj;
        }, {});
    }
    throw new Error('Reservation not found');
}

// --- CCTV FUNCTIONS ---

function getCCTVList() {
    const sheet = SS.getSheetByName("CCTV");
    if (!sheet) return [];
    
    try {
        return sheetToJSON(sheet, ['cctv_id']);
    } catch (e) {
        // If headers are missing (sheetToJSON throws), return empty list so the app doesn't crash.
        Logger.log("CCTV sheet exists but is invalid/empty. Returning empty list. Error: " + e.message);
        return [];
    }
}

function createCCTV(payload) {
    const { name, stream_url } = payload;
    if (!name || !stream_url) {
        throw new Error("Camera name and stream URL are required.");
    }

    let sheet = SS.getSheetByName("CCTV");
    const headersList = ['cctv_id', 'name', 'stream_url', 'created_at'];

    // Auto-create sheet if missing
    if (!sheet) {
        sheet = SS.insertSheet("CCTV");
        sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]).setFontWeight('bold');
        sheet.setFrozenRows(1);
    } else {
        // Auto-fix headers if sheet exists but is empty
        if (sheet.getLastRow() === 0) {
             sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]).setFontWeight('bold');
             sheet.setFrozenRows(1);
        }
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const newId = 'cam_' + new Date().getTime();
    const newCamera = {
        cctv_id: newId,
        name: name,
        stream_url: stream_url,
        created_at: new Date().toISOString()
    };

    const newRow = headers.map(header => newCamera[String(header).trim()] !== undefined ? newCamera[String(header).trim()] : null);
    sheet.appendRow(newRow);

    return newCamera;
}

function updateCCTV(payload) {
  const { cctv_id, name, stream_url } = payload;
  if (!cctv_id || !name || !stream_url) {
      throw new Error("CCTV ID, name, and stream URL are required for update.");
  }

  const sheet = getSheetOrThrow("CCTV");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('cctv_id');

  const rowIndex = data.findIndex(row => row[idIndex] === cctv_id);

  if (rowIndex !== -1) {
      const nameIndex = headers.indexOf('name');
      const urlIndex = headers.indexOf('stream_url');
      
      sheet.getRange(rowIndex + 1, nameIndex + 1).setValue(name);
      sheet.getRange(rowIndex + 1, urlIndex + 1).setValue(stream_url);

      const updatedRow = sheet.getRange(rowIndex + 1, 1, 1, headers.length).getValues()[0];
       return headers.reduce((obj, header, i) => {
          obj[header] = updatedRow[i];
          return obj;
      }, {});
  }
  throw new Error('Camera not found');
}

function deleteCCTV(cctvId) {
    const sheet = getSheetOrThrow("CCTV");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('cctv_id');

    const rowIndex = data.findIndex(row => row[idIndex] === cctvId);

    if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex + 1);
        return { success: true };
    }
    throw new Error('Camera not found');
}

// --- FINANCIAL REPORT FUNCTIONS ---

function createExpense(payload) {
    const { date, category, amount, payee, description } = payload;
    if (!date || !category || !amount || !payee) {
        throw new Error("Date, category, amount, and payee are required.");
    }
    
    // Ensure Expenses sheet exists (Lazy creation)
    let sheet = SS.getSheetByName("Expenses");
    const headersList = ['expense_id', 'date', 'category', 'amount', 'payee', 'description', 'created_by'];
    if (!sheet) {
        sheet = SS.insertSheet("Expenses");
        sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]).setFontWeight('bold');
        sheet.setFrozenRows(1);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newId = 'exp_' + new Date().getTime();
    const newExpense = {
        expense_id: newId,
        date: date,
        category: category,
        amount: Number(amount),
        payee: payee,
        description: description || '',
        created_by: 'Admin' 
    };

    const newRow = headers.map(header => newExpense[String(header).trim()] !== undefined ? newExpense[String(header).trim()] : null);
    sheet.appendRow(newRow);

    return newExpense;
}

function getFinancialData() {
    // 1. Get Expenses
    const expensesSheet = SS.getSheetByName("Expenses");
    const expenses = expensesSheet ? sheetToJSON(expensesSheet, ['expense_id', 'amount', 'category']) : [];

    // 2. Get Revenue (Verified Payments)
    const paymentsSheet = SS.getSheetByName("Payments");
    const payments = paymentsSheet ? sheetToJSON(paymentsSheet, ['status', 'amount', 'method', 'due_id']) : [];
    const verifiedPayments = payments.filter(p => p.status === 'verified');
    
    // 3. Get Dues (for breakdown and receivables)
    const duesSheet = SS.getSheetByName("Dues");
    const dues = duesSheet ? sheetToJSON(duesSheet, ['due_id', 'penalty']) : [];
    // Join Dues with Users for Receivables List
    const usersSheet = SS.getSheetByName("Users");
    const users = sheetToJSON(usersSheet, ['user_id', 'full_name', 'block', 'lot']);
    
    // CALCULATIONS

    // Revenue Breakdown
    let totalRevenue = 0;
    let incomeFromDues = 0;
    let incomeFromPenalties = 0;
    let incomeOther = 0;

    // We need to map payments back to dues to see if it included a penalty
    // Since payment amount is total, we might have to infer penalty paid if due had penalty
    // Simplification: Count total verified payment amount as revenue. 
    // Count total penalty column in *Paid* dues as Penalty Income, rest as Dues.
    
    const duesMap = dues.reduce((map, due) => {
        map[due.due_id] = due;
        return map;
    }, {});

    verifiedPayments.forEach(p => {
        const amount = Number(p.amount) || 0;
        totalRevenue += amount;
        
        const due = duesMap[p.due_id];
        if (due && Number(due.penalty) > 0) {
            incomeFromPenalties += Number(due.penalty);
            incomeFromDues += (amount - Number(due.penalty));
        } else {
            incomeFromDues += amount;
        }
    });

    // Expense Breakdown
    let totalExpenses = 0;
    const expenseBreakdown = {};
    expenses.forEach(exp => {
        const amount = Number(exp.amount) || 0;
        totalExpenses += amount;
        expenseBreakdown[exp.category] = (expenseBreakdown[exp.category] || 0) + amount;
    });

    // Cash Position
    let cashOnHand = 0;
    let gcash = 0;
    verifiedPayments.forEach(p => {
        const amount = Number(p.amount) || 0;
        if (p.method === 'Cash') cashOnHand += amount;
        else if (p.method === 'GCash') gcash += amount;
    });
    
    // Subtract expenses from Cash Position (Assuming 'Admin & Office' etc come from Cash/Bank)
    // For simplicity in this mock, we subtract all expenses from Cash On Hand for now, 
    // or we could split it proportionally. Let's leave inflow as the "Position" and handle outflow as general deduction for "Ending Balance".
    // Better logic: Net Cash = Total Cash In - Total Expenses (Assuming expenses paid via cash/check)
    
    const netSurplus = totalRevenue - totalExpenses;
    
    // Ending Cash Balance = Total Revenue - Total Expenses (Lifetime)
    const endingCashBalance = netSurplus; 

    // Accounts Receivable
    // All unpaid or overdue dues
    const unpaidDues = sheetToJSON(duesSheet, ['due_id', 'user_id', 'total_due', 'status']).filter(d => d.status === 'unpaid' || d.status === 'overdue');
    let totalReceivables = 0;
    const receivablesMap = {}; // userId -> { name, unit, amount, count }
    
    unpaidDues.forEach(d => {
        const amount = Number(d.total_due);
        totalReceivables += amount;
        
        if (!receivablesMap[d.user_id]) {
            const user = users.find(u => u.user_id === d.user_id);
            receivablesMap[d.user_id] = {
                name: user ? user.full_name : 'Unknown',
                unit: user ? `B${user.block} L${user.lot}` : 'N/A',
                amount: 0,
                months: 0
            };
        }
        receivablesMap[d.user_id].amount += amount;
        receivablesMap[d.user_id].months += 1;
    });
    
    const accountsReceivableList = Object.values(receivablesMap);

    // Reserve Fund (Simple calculation: Total of 'Reserve Fund Contribution' expenses + 10% of Surplus if desired)
    // For now, just sum the expenses categorized as 'Reserve Fund Contribution'
    const reserveFundTotal = expenseBreakdown['Reserve Fund Contribution'] || 0;

    return {
        totalRevenue,
        totalExpenses,
        netSurplus,
        endingCashBalance,
        cashPosition: {
            cashOnHand: cashOnHand, // Inflow only shown here for "where funds entered"
            gcash: gcash,
            bank: 0 
        },
        incomeBreakdown: {
            dues: incomeFromDues,
            penalties: incomeFromPenalties,
            other: incomeOther
        },
        expenseBreakdown,
        accountsReceivable: totalReceivables,
        accountsReceivableList,
        reserveFundTotal,
        expensesLedger: expenses.sort((a,b) => new Date(b.date) - new Date(a.date))
    };
}


// --- PROJECTS / PLANNING FUNCTIONS ---

function getProjects() {
    const sheet = SS.getSheetByName("Projects");
    if (!sheet) return [];
    
    try {
        return sheetToJSON(sheet, ['project_id', 'name', 'status']);
    } catch (e) {
        Logger.log("Projects sheet exists but is invalid/empty. Returning empty list.");
        return [];
    }
}

function createProject(payload) {
    const { name, description, status, start_date, end_date, budget, funds_allocated, funds_spent } = payload;
    if (!name || !status) {
        throw new Error("Project Name and Status are required.");
    }

    let sheet = SS.getSheetByName("Projects");
    const headersList = ['project_id', 'name', 'description', 'status', 'start_date', 'end_date', 'budget', 'funds_allocated', 'funds_spent', 'created_at'];

    // Auto-create sheet if missing
    if (!sheet) {
        sheet = SS.insertSheet("Projects");
        sheet.getRange(1, 1, 1, headersList.length).setValues([headersList]).setFontWeight('bold');
        sheet.setFrozenRows(1);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const newId = 'proj_' + new Date().getTime();
    const newProject = {
        project_id: newId,
        name: name,
        description: description || '',
        status: status,
        start_date: start_date || '',
        end_date: end_date || '',
        budget: Number(budget) || 0,
        funds_allocated: Number(funds_allocated) || 0,
        funds_spent: Number(funds_spent) || 0,
        created_at: new Date().toISOString()
    };

    const newRow = headers.map(header => newProject[String(header).trim()] !== undefined ? newProject[String(header).trim()] : null);
    sheet.appendRow(newRow);

    return newProject;
}

function updateProject(payload) {
    const { projectId, name, description, status, start_date, end_date, budget, funds_allocated, funds_spent } = payload;
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    const sheet = getSheetOrThrow("Projects");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('project_id');

    const rowIndex = data.findIndex(row => row[idIndex] === projectId);

    if (rowIndex === -1) {
        throw new Error('Project not found');
    }
    
    const updateMap = {
        'name': name,
        'description': description,
        'status': status,
        'start_date': start_date,
        'end_date': end_date,
        'budget': budget,
        'funds_allocated': funds_allocated,
        'funds_spent': funds_spent
    };

    Object.keys(updateMap).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1 && updateMap[key] !== undefined) {
             sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updateMap[key]);
        }
    });

    const updatedRow = sheet.getRange(rowIndex + 1, 1, 1, headers.length).getValues()[0];
    return headers.reduce((obj, header, i) => {
        obj[header] = updatedRow[i];
        return obj;
    }, {});
}

function deleteProject(payload) {
    const { projectId } = payload;
    const sheet = getSheetOrThrow("Projects");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('project_id');

    const rowIndex = data.findIndex(row => row[idIndex] === projectId);

    if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex + 1);
        return { success: true };
    }
    throw new Error('Project not found');
}


// --- UTILITY FUNCTIONS ---

function sheetToJSON(sheet, requiredHeaders = []) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 1) return [];
  
  // Trim headers to make matching more robust against extra whitespace.
  const headers = values.shift().map(h => String(h).trim());
  
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
        throw new Error(`Critical Setup Error: The sheet "${sheet.getName()}" is missing the required column header: "${header}". Please check for typos or extra spaces, or run the "setupMockData" function from the Apps Script editor to reset the sheets.`);
    }
  }

  return values.map(row => {
    return headers.reduce((obj, header, i) => {
      // Ensure header isn't an empty string before assigning.
      if (header) {
        obj[header] = row[i];
      }
      return obj;
    }, {});
  });
}

// --- MOCK DATA SETUP ---

function setupMockData() {
  const getOrCreateSheet = (name) => {
    let sheet = SS.getSheetByName(name);
    if (!sheet) {
      sheet = SS.insertSheet(name);
      Logger.log(`Created new sheet: "${name}"`);
    } else {
      sheet.clear();
      sheet.setFrozenRows(0);
      sheet.setFrozenColumns(0);
    }
    return sheet;
  };

  const usersSheet = getOrCreateSheet("Users");
  const announcementsSheet = getOrCreateSheet("Announcements");
  const duesSheet = getOrCreateSheet("Dues");
  const paymentsSheet = getOrCreateSheet("Payments");
  const visitorsSheet = getOrCreateSheet("Visitors");
  const settingsSheet = getOrCreateSheet("Settings");
  const amenityReservationsSheet = getOrCreateSheet("Amenity Reservations");
  const cctvSheet = getOrCreateSheet("CCTV");
  const expensesSheet = getOrCreateSheet("Expenses");
  const projectsSheet = getOrCreateSheet("Projects");
  
  const today = new Date().toISOString();

  // === Set up Users sheet ===
  const usersHeaders = ['user_id', 'role', 'full_name', 'email', 'phone', 'block', 'lot', 'password_hash', 'status', 'date_created'];
  const usersData = [
    ['user_001', 'Admin', 'Admin User', 'admin@gmail.com', '09171234567', 1, 1, 'admin', 'active', today],
    ['user_002', 'Homeowner', 'John Doe', 'john.doe@home.com', '09181234567', 5, 12, 'password', 'active', today],
    ['user_003', 'Homeowner', 'Jane Smith', 'jane.smith@home.com', '09191234567', 8, 2, 'password', 'active', today],
    ['user_004', 'Staff', 'Security Guard', 'staff@hoa.com', '09201234567', 0, 0, 'password', 'active', today]
  ];
  usersSheet.getRange(1, 1, 1, usersHeaders.length).setValues([usersHeaders]).setFontWeight('bold');
  if (usersData.length > 0) {
    usersSheet.getRange(2, 1, usersData.length, usersData[0].length).setValues(usersData);
  }
  usersSheet.setFrozenRows(1);

  // === Set up Announcements sheet ===
  const announcementsHeaders = ['ann_id', 'title', 'content', 'image_url', 'created_by', 'created_at', 'audience'];
  const announcementsData = [
    ['ann_001', 'Community Octoberfest Party!', 'Join us for a night of fun, food, and music at the clubhouse this coming October 30th at 7 PM. Please RSVP by October 25th.', 'https://images.unsplash.com/photo-1570592801226-f793616f7433?q=80&w=2070&auto=format&fit=crop', 'Admin User', '203-10-15T10:00:00Z', 'all'],
    ['ann_002', 'Quarterly Pest Control Schedule', 'The quarterly pest control will be conducted on November 5th. Please ensure someone is home to grant access to our accredited pest control provider.', null, 'Admin User', '2023-10-10T14:30:00Z', 'all']
  ];
  announcementsSheet.getRange(1, 1, 1, announcementsHeaders.length).setValues([announcementsHeaders]).setFontWeight('bold');
  if (announcementsData.length > 0) {
    announcementsSheet.getRange(2, 1, announcementsData.length, announcementsData[0].length).setValues(announcementsData);
  }
  announcementsSheet.setFrozenRows(1);
  
  // === Set up Dues sheet ===
  const duesHeaders = ['due_id', 'user_id', 'billing_month', 'amount', 'penalty', 'total_due', 'status', 'notes'];
  const duesData = [
    ['due_001', 'user_002', '2023-10-01T00:00:00.000Z', 2000, 100, 2100, 'overdue', ''],
    ['due_002', 'user_002', '2023-09-01T00:00:00.000Z', 2000, 0, 2000, 'paid', 'Paid via GCash'],
    ['due_003', 'user_003', '2023-10-01T00:00:00.000Z', 2000, 0, 2000, 'unpaid', ''],
    ['due_004', 'user_003', '2023-09-01T00:00:00.000Z', 2000, 0, 2000, 'paid', '']
  ];
  duesSheet.getRange(1, 1, 1, duesHeaders.length).setValues([duesHeaders]).setFontWeight('bold');
  if (duesData.length > 0) {
    duesSheet.getRange(2, 1, duesData.length, duesData[0].length).setValues(duesData);
  }
  duesSheet.setFrozenRows(1);
  
   // === Set up Payments sheet ===
  const paymentsHeaders = ['payment_id', 'due_id', 'user_id', 'amount', 'method', 'proof_url', 'status', 'date_paid', 'notes'];
  const paymentsData = [
    ['pay_001', 'due_002', 'user_002', 2000, 'GCash', 'https://i.imgur.com/gQnL3f6.png', 'verified', '2023-09-15T10:00:00Z', ''],
    ['pay_002', 'due_004', 'user_003', 2000, 'GCash', 'https://i.imgur.com/gQnL3f6.png', 'verified', '2023-09-14T11:00:00Z', '']
  ];
  paymentsSheet.getRange(1, 1, 1, paymentsHeaders.length).setValues([paymentsHeaders]).setFontWeight('bold');
  if (paymentsData.length > 0) {
    paymentsSheet.getRange(2, 1, paymentsData.length, paymentsData[0].length).setValues(paymentsData);
  }
  paymentsSheet.setFrozenRows(1);

  // === Set up Visitors sheet ===
  const visitorsHeaders = ['visitor_id', 'homeowner_id', 'name', 'vehicle', 'date', 'time_in', 'time_out', 'qr_code', 'status'];
  const visitorsData = [
    ['vis_001', 'user_002', 'Maria Dela Cruz', 'ABC 123', '2023-10-28', '10:00 AM', null, 'qr_code_string_1', 'expected'],
    ['vis_002', 'user_002', 'Peter Pan', '', '2023-10-27', '2:00 PM', '4:00 PM', 'qr_code_string_2', 'exited'],
    ['vis_003', 'user_003', 'Juan Tamad', 'XYZ 789', '2023-10-29', null, null, 'qr_code_string_3', 'expected']
  ];
  visitorsSheet.getRange(1, 1, 1, visitorsHeaders.length).setValues([visitorsHeaders]).setFontWeight('bold');
  if (visitorsData.length > 0) {
    visitorsSheet.getRange(2, 1, visitorsData.length, visitorsData[0].length).setValues(visitorsData);
  }
  visitorsSheet.setFrozenRows(1);

  // === Set up Settings sheet ===
  const settingsHeaders = ['key', 'value'];
  const settingsData = [
      ['monthlyDue', '2000'],
      ['penalty', '100'],
      ['gcashQrCode', ''],
      ['effectiveDate', '2023-01-01']
  ];
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]).setFontWeight('bold');
  if (settingsData.length > 0) {
    settingsSheet.getRange(2, 1, settingsData.length, settingsData[0].length).setValues(settingsData);
  }
  settingsSheet.setFrozenRows(1);

  // === Set up Amenity Reservations sheet ===
  const amenityReservationsHeaders = ['reservation_id', 'user_id', 'amenity_name', 'reservation_date', 'start_time', 'end_time', 'status', 'notes'];
  const amenityReservationsData = [
    ['res_001', 'user_002', 'Clubhouse', '2023-11-25', '18:00', '22:00', 'approved', 'Birthday Party for 20 guests.'],
    ['res_002', 'user_003', 'Basketball Court', '2023-11-20', '09:00', '11:00', 'pending', ''],
    ['res_003', 'user_002', 'Swimming Pool', '2023-11-18', '14:00', '16:00', 'denied', 'Scheduled maintenance.']
  ];
  amenityReservationsSheet.getRange(1, 1, 1, amenityReservationsHeaders.length).setValues([amenityReservationsHeaders]).setFontWeight('bold');
  if (amenityReservationsData.length > 0) {
    amenityReservationsSheet.getRange(2, 1, amenityReservationsData.length, amenityReservationsData[0].length).setValues(amenityReservationsData);
  }
  amenityReservationsSheet.setFrozenRows(1);

  // === Set up CCTV sheet ===
  const cctvHeaders = ['cctv_id', 'name', 'stream_url', 'created_at'];
  const cctvData = [
    ['cam_001', 'Gate 1 Entrance', 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8', today], // Sample HLS stream
    ['cam_002', 'Clubhouse Area', 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8', today]
  ];
  cctvSheet.getRange(1, 1, 1, cctvHeaders.length).setValues([cctvHeaders]).setFontWeight('bold');
  if (cctvData.length > 0) {
    cctvSheet.getRange(2, 1, cctvData.length, cctvData[0].length).setValues(cctvData);
  }
  cctvSheet.setFrozenRows(1);
  
  // === Set up Expenses sheet ===
  const expensesHeaders = ['expense_id', 'date', 'category', 'amount', 'payee', 'description', 'created_by'];
  const expensesData = [
    ['exp_001', '2023-10-01', 'Security', 15000, 'Eagle Eye Agency', 'Monthly Security Service', 'Admin'],
    ['exp_002', '2023-10-05', 'Utilities', 3000, 'Meralco', 'Clubhouse Electricity', 'Admin']
  ];
  expensesSheet.getRange(1, 1, 1, expensesHeaders.length).setValues([expensesHeaders]).setFontWeight('bold');
  if (expensesData.length > 0) {
    expensesSheet.getRange(2, 1, expensesData.length, expensesData[0].length).setValues(expensesData);
  }
  expensesSheet.setFrozenRows(1);

  // === Set up Projects sheet ===
  const projectsHeaders = ['project_id', 'name', 'description', 'status', 'start_date', 'end_date', 'budget', 'funds_allocated', 'funds_spent', 'created_at'];
  const projectsData = [
    ['proj_001', 'Road Repair Phase 1', 'Repair of damaged asphalt on Main Avenue', 'Ongoing', '2023-11-01', '2023-12-15', 500000, 500000, 250000, today],
    ['proj_002', 'New Basketball Court Lights', 'Installation of LED floodlights', 'Planning', '2024-01-15', '2024-01-30', 75000, 0, 0, today]
  ];
  projectsSheet.getRange(1, 1, 1, projectsHeaders.length).setValues([projectsHeaders]).setFontWeight('bold');
  if (projectsData.length > 0) {
    projectsSheet.getRange(2, 1, projectsData.length, projectsData[0].length).setValues(projectsData);
  }
  projectsSheet.setFrozenRows(1);

  SpreadsheetApp.flush();
  Logger.log('Mock data and headers have been set up successfully!');
}
