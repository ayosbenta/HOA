// =================================================================
// HOAConnect PH - Google Apps Script Backend
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
        break;
      case 'updatePaymentStatus':
        data = updatePaymentStatus(payload);
        clearCache(CACHE_KEYS.ALL_DUES);
        if (data && data.user_id) {
          clearCache(CACHE_KEYS.USER_DUES(data.user_id));
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
  const paymentsSheet = getSheetOrThrow("Payments");

  const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
  const allPayments = sheetToJSON(paymentsSheet, ['payment_id', 'due_id']);
  
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
    const paymentsSheet = getSheetOrThrow("Payments");

    const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
    const allPayments = sheetToJSON(paymentsSheet, ['payment_id', 'due_id']);

    const duesWithPayments = allDues.map(due => {
        const duePayments = allPayments.filter(p => p.due_id === due.due_id).sort((a, b) => new Date(b.date_paid) - new Date(a.date_paid));
        return {
            ...due,
            payment: duePayments.length > 0 ? duePayments[0] : null
        };
    });

    return duesWithPayments;
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
  const duesSheet = getSheetOrThrow("Dues");
  const amenityReservationsSheet = getSheetOrThrow("Amenity Reservations");

  const users = sheetToJSON(usersSheet);
  const dues = sheetToJSON(duesSheet);
  const amenityReservations = sheetToJSON(amenityReservationsSheet);

  // 1. Dues collected this month
  const now = new Date();
  const currentMonthStr = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear();
  const duesThisMonth = dues
    .filter(d => d.billing_month === currentMonthStr && d.status === 'paid')
    .reduce((sum, d) => sum + parseFloat(d.total_due || 0), 0);

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
    duesCollected: duesThisMonth,
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
    return getAppSettings();
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
    ['due_001', 'user_002', 'October 2023', 2000, 100, 2100, 'overdue', ''],
    ['due_002', 'user_002', 'September 2023', 2000, 0, 2000, 'paid', 'Paid via GCash'],
    ['due_003', 'user_003', 'October 2023', 2000, 0, 2000, 'unpaid', ''],
    ['due_004', 'user_003', 'September 2023', 2000, 0, 2000, 'paid', '']
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


  SpreadsheetApp.flush();
  Logger.log('Mock data and headers have been set up successfully!');
}