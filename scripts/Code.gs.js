
/**
 * Deca Homes Phase 1 - HOA Management Backend
 * 
 * Google Sheets Schema Requirements:
 * 
 * 1. Users
 *    - user_id, role, full_name, email, phone, block, lot, password_hash, status, date_created
 * 
 * 2. Announcements
 *    - ann_id, title, content, image_url, created_by, created_at, audience
 * 
 * 3. Dues
 *    - due_id, user_id, billing_month, amount, penalty, total_due, status, notes
 * 
 * 4. Payments
 *    - payment_id, due_id, user_id, amount, method, proof_url, status, date_paid, notes
 * 
 * 5. Visitors
 *    - visitor_id, homeowner_id, name, vehicle, date, time_in, time_out, qr_code, status
 * 
 * 6. Settings
 *    - key, value
 * 
 * 7. Amenity Reservations
 *    - reservation_id, user_id, amenity_name, reservation_date, start_time, end_time, status, notes
 * 
 * 8. CCTV
 *    - cctv_id, name, stream_url, created_at
 * 
 * 9. Expenses
 *    - expense_id, date, category, amount, payee, description, created_by, created_at
 * 
 * 10. Projects
 *    - project_id, name, description, status, start_date, end_date, budget, funds_allocated, funds_spent, created_at
 */

const SHEET_NAMES = {
  USERS: "Users",
  ANNOUNCEMENTS: "Announcements",
  DUES: "Dues",
  PAYMENTS: "Payments",
  VISITORS: "Visitors",
  SETTINGS: "Settings",
  AMENITY_RESERVATIONS: "Amenity Reservations",
  CCTV: "CCTV",
  EXPENSES: "Expenses",
  PROJECTS: "Projects"
};

// --- CORE UTILITIES ---

function getSheetOrThrow(sheetName) {
  if (!sheetName || sheetName === "undefined") {
    throw new Error(`Critical Error: Attempted to access a sheet with an undefined name.`);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // Self-healing for missing sheets
  if (!sheet) {
      if (sheetName === SHEET_NAMES.CCTV) {
          sheet = ss.insertSheet(SHEET_NAMES.CCTV);
          sheet.appendRow(['cctv_id', 'name', 'stream_url', 'created_at']);
      } else if (sheetName === SHEET_NAMES.EXPENSES) {
          sheet = ss.insertSheet(SHEET_NAMES.EXPENSES);
          sheet.appendRow(['expense_id', 'date', 'category', 'amount', 'payee', 'description', 'created_by', 'created_at']);
      } else if (sheetName === SHEET_NAMES.PROJECTS) {
          sheet = ss.insertSheet(SHEET_NAMES.PROJECTS);
          sheet.appendRow(['project_id', 'name', 'description', 'status', 'start_date', 'end_date', 'budget', 'funds_allocated', 'funds_spent', 'created_at']);
      }
  }

  if (!sheet) {
    throw new Error(`Critical Setup Error: Google Sheet tab named "${sheetName}" was not found. Please ensure it exists and the name is spelled correctly.`);
  }
  return sheet;
}

function sheetToJSON(sheet, requiredHeaders) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return [];

  const headers = data[0].map(h => String(h).trim()); // Trim headers to prevent whitespace issues
  
  // Validate headers if requiredHeaders provided
  if (requiredHeaders) {
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
           throw new Error(`Critical Setup Error: The sheet "${sheet.getName()}" is missing the required column header: "${missing[0]}". Please check for typos or extra spaces, or run the "setupMockData" function from the Apps Script editor to reset the sheets.`);
      }
  }

  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorJSON(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, data: { error: message } }))
    .setMimeType(ContentService.MimeType.JSON);
}


// --- API HANDLERS ---

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); 

  try {
    const action = e.parameter.action;

    if (!action) {
       return errorJSON('API Error: The "action" parameter was missing. This usually happens if the script is not deployed correctly. Please re-deploy and ensure "Who has access" is set to "Anyone".');
    }

    // CACHING STRATEGY
    const cache = CacheService.getScriptCache();
    const cacheKey = JSON.stringify(e.parameter);
    
    // Skip cache for 'getAppSettings' to prevent QR code size issues
    const cached = cache.get(cacheKey);
    if (cached != null && action !== 'getAppSettings') { 
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    let result;
    switch (action) {
      case 'getAnnouncements':
        result = getAnnouncements();
        break;
      case 'getDuesForUser':
        result = getDuesForUser(e.parameter.userId);
        break;
      case 'getAllDues':
        result = getAllDues();
        break;
      case 'getVisitorsForHomeowner':
        result = getVisitorsForHomeowner(e.parameter.homeownerId);
        break;
      case 'getAllVisitors':
        result = getAllVisitors();
        break;
      case 'getHomeownerDashboardData':
        result = getHomeownerDashboardData(e.parameter.userId);
        break;
      case 'getAdminDashboardData':
        result = getAdminDashboardData();
        break;
      case 'getAllUsers':
        result = getAllUsers();
        break;
      case 'getAppSettings':
        result = getAppSettings();
        break;
      case 'getAmenityReservationsForUser':
        result = getAmenityReservationsForUser(e.parameter.userId);
        break;
      case 'getAllAmenityReservations':
        result = getAllAmenityReservations();
        break;
      case 'getCCTVList':
        result = getCCTVList();
        break;
      case 'getFinancialData':
        result = getFinancialData();
        break;
      case 'getProjects':
        result = getProjects();
        break;
      case 'getProjectContributions':
        result = getProjectContributions();
        break;
      default:
        return errorJSON('Invalid GET action: ' + action);
    }
    
    const jsonOutput = JSON.stringify({ success: true, data: result });
    
    if (action !== 'getAppSettings') {
        try {
            cache.put(cacheKey, jsonOutput, 300); // Cache for 5 minutes
        } catch(e) {
            console.log("Cache put failed: " + e.toString());
        }
    }
    
    return ContentService.createTextOutput(jsonOutput).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return errorJSON(err.toString());
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e.postData || !e.postData.contents) {
      return errorJSON('Invalid request body. Ensure you are sending JSON.');
    }

    let request;
    try {
        request = JSON.parse(e.postData.contents);
    } catch (parseErr) {
        return errorJSON('Failed to parse JSON body: ' + parseErr.message);
    }

    const action = request.action;
    const payload = request.payload;
    
    let result;
    switch (action) {
      case 'login':
        result = login(payload);
        break;
      case 'register':
        result = register(payload);
        break;
      case 'createAnnouncement':
        result = createAnnouncement(payload);
        invalidateCache('getAnnouncements');
        invalidateCache('getHomeownerDashboardData'); 
        break;
      case 'updateUser':
        result = updateUser(payload);
        invalidateCache('getAllUsers');
        invalidateCache('getAdminDashboardData');
        break;
      case 'updateAppSettings':
        result = updateAppSettings(payload);
        invalidateCache('getAppSettings');
        break;
      case 'createVisitorPass':
        result = createVisitorPass(payload);
        invalidateCache('getVisitorsForHomeowner');
        invalidateCache('getAllVisitors');
        break;
      case 'submitPayment':
        result = submitPayment(payload);
        invalidateCache('getDuesForUser');
        invalidateCache('getAllDues');
        invalidateCache('getHomeownerDashboardData');
        invalidateCache('getAdminDashboardData');
        invalidateCache('getProjectContributions');
        break;
      case 'recordCashPaymentIntent':
        result = recordCashPaymentIntent(payload);
        invalidateCache('getDuesForUser');
        invalidateCache('getAllDues');
        invalidateCache('getHomeownerDashboardData');
        invalidateCache('getProjects');
        invalidateCache('getProjectContributions');
        break;
      case 'recordAdminCashPayment':
        result = recordAdminCashPayment(payload);
        invalidateCache('getDuesForUser');
        invalidateCache('getAllDues');
        invalidateCache('getHomeownerDashboardData');
        invalidateCache('getAdminDashboardData');
        break;
      case 'updatePaymentStatus':
        result = updatePaymentStatus(payload);
        invalidateCache('getDuesForUser');
        invalidateCache('getAllDues');
        invalidateCache('getHomeownerDashboardData');
        invalidateCache('getAdminDashboardData');
        invalidateCache('getProjects');
        invalidateCache('getProjectContributions');
        break;
      case 'createAmenityReservation':
        result = createAmenityReservation(payload);
        invalidateCache('getAmenityReservationsForUser');
        invalidateCache('getAllAmenityReservations');
        invalidateCache('getAdminDashboardData');
        invalidateCache('getHomeownerDashboardData');
        break;
      case 'updateAmenityReservationStatus':
        result = updateAmenityReservationStatus(payload);
        invalidateCache('getAmenityReservationsForUser');
        invalidateCache('getAllAmenityReservations');
        invalidateCache('getAdminDashboardData');
        invalidateCache('getHomeownerDashboardData');
        break;
      case 'createCCTV':
        result = createCCTV(payload);
        invalidateCache('getCCTVList');
        break;
      case 'updateCCTV':
        result = updateCCTV(payload);
        invalidateCache('getCCTVList');
        break;
      case 'deleteCCTV':
        result = deleteCCTV(payload);
        invalidateCache('getCCTVList');
        break;
      case 'createExpense':
        result = createExpense(payload);
        invalidateCache('getFinancialData');
        break;
      case 'createProject':
        result = createProject(payload);
        invalidateCache('getProjects');
        break;
      case 'updateProject':
        result = updateProject(payload);
        invalidateCache('getProjects');
        break;
      case 'deleteProject':
        result = deleteProject(payload);
        invalidateCache('getProjects');
        break;
      case 'createManualProjectContribution':
        result = createManualProjectContribution(payload);
        invalidateCache('getProjects');
        invalidateCache('getProjectContributions');
        break;
      default:
        return errorJSON('Invalid POST action: ' + action);
    }
    
    return responseJSON(result);

  } catch (err) {
    console.error("Error in doPost: " + err.toString());
    return errorJSON(err.toString());
  } finally {
    lock.releaseLock();
  }
}

function invalidateCache(keyPart) {
    // Placeholder: Google Apps Script cache cannot clear by pattern.
}

// --- LOGIC FUNCTIONS ---

function login(payload) {
  const { email, password } = payload;
  const sheet = getSheetOrThrow(SHEET_NAMES.USERS);
  const users = sheetToJSON(sheet, ['email', 'password_hash']);
  
  const user = users.find(u => 
    String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase()
  );

  if (user) {
    if (String(user.password_hash).trim() === String(password).trim()) {
      if (user.status === 'inactive') throw new Error('Account is inactive. Contact Admin.');
      if (user.status === 'pending') throw new Error('Account is pending approval.');
      
      const { password_hash, ...safeUser } = user;
      return safeUser;
    }
  }
  return null;
}

function register(payload) {
    const { fullName, email, phone, block, lot, password } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.USERS);
    
    const users = sheetToJSON(sheet, ['email']);
    const exists = users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    
    if (exists) {
        throw new Error("Email already registered.");
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newUser = {
        user_id: 'user_' + new Date().getTime(),
        role: 'Homeowner',
        full_name: fullName,
        email: email,
        phone: phone,
        block: block,
        lot: lot,
        password_hash: password,
        status: 'pending',
        date_created: new Date().toISOString()
    };
    
    const newRow = headers.map(header => newUser[String(header).trim()] !== undefined ? newUser[String(header).trim()] : null);
    sheet.appendRow(newRow);
    
    return { message: 'Registration successful! Please wait for Admin approval.' };
}

function getAnnouncements() {
  const sheet = getSheetOrThrow(SHEET_NAMES.ANNOUNCEMENTS);
  const data = sheetToJSON(sheet);
  return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function createAnnouncement(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.ANNOUNCEMENTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newAnn = {
        ann_id: 'ann_' + new Date().getTime(),
        title: payload.title,
        content: payload.content,
        image_url: payload.image_url || '',
        created_by: payload.created_by,
        created_at: new Date().toISOString(),
        audience: payload.audience
    };
    
    const newRow = headers.map(header => newAnn[String(header).trim()] !== undefined ? newAnn[String(header).trim()] : null);
    sheet.appendRow(newRow);
    
    return newAnn;
}

function getAllUsers() {
    const sheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(sheet);
    return users.map(u => {
        const { password_hash, ...rest } = u;
        return rest;
    });
}

function updateUser(payload) {
    const { userId, newRole, newStatus } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const userIdIndex = headers.indexOf('user_id');
    const roleIndex = headers.indexOf('role');
    const statusIndex = headers.indexOf('status');
    
    const rowIndex = data.findIndex(row => row[userIdIndex] === userId);
    
    if (rowIndex === -1) throw new Error("User not found");
    const actualRow = rowIndex + 1;
    
    if (newRole) sheet.getRange(actualRow, roleIndex + 1).setValue(newRole);
    if (newStatus) sheet.getRange(actualRow, statusIndex + 1).setValue(newStatus);
    
    return { success: true };
}

function getDuesForUser(userId) {
  const sheet = getSheetOrThrow(SHEET_NAMES.DUES);
  const allDues = sheetToJSON(sheet, ['user_id', 'due_id']);
  
  let allPayments = [];
  try {
     const pSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
     allPayments = sheetToJSON(pSheet, ['due_id']);
  } catch (e) {
      console.log("Payments sheet missing or empty, assuming no payments.");
  }

  const userDues = allDues.filter(d => d.user_id === userId);
  
  return userDues.map(due => {
      const payment = allPayments.find(p => p.due_id === due.due_id && p.status !== 'rejected') 
        || allPayments.filter(p => p.due_id === due.due_id).sort((a,b) => new Date(b.date_paid) - new Date(a.date_paid))[0];
      return { ...due, payment: payment || null };
  });
}

function getAllDues() {
    const sheet = getSheetOrThrow(SHEET_NAMES.DUES);
    const allDues = sheetToJSON(sheet);

    const usersSheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(usersSheet, ['user_id']);
    
    let allPayments = [];
    try {
        const pSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
        allPayments = sheetToJSON(pSheet);
    } catch (e) {}

    return allDues.map(due => {
        const user = users.find(u => u.user_id === due.user_id);
        const payment = allPayments.find(p => p.due_id === due.due_id && p.status !== 'rejected')
           || allPayments.filter(p => p.due_id === due.due_id).sort((a,b) => new Date(b.date_paid) - new Date(a.date_paid))[0];

        return {
            ...due,
            full_name: user ? user.full_name : 'Unknown',
            block: user ? user.block : '',
            lot: user ? user.lot : '',
            payment: payment || null
        };
    });
}

function getVisitorsForHomeowner(homeownerId) {
    const sheet = getSheetOrThrow(SHEET_NAMES.VISITORS);
    const all = sheetToJSON(sheet);
    return all.filter(v => v.homeowner_id === homeownerId).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function getAllVisitors() {
    const sheet = getSheetOrThrow(SHEET_NAMES.VISITORS);
    const all = sheetToJSON(sheet);
    const usersSheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(usersSheet, ['user_id']);
    
    return all.map(v => {
        const user = users.find(u => u.user_id === v.homeowner_id);
        return {
            ...v,
            homeowner_name: user ? user.full_name : 'Unknown',
            homeowner_address: user ? `Blk ${user.block} Lot ${user.lot}` : ''
        };
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function createVisitorPass(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.VISITORS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newVisitor = {
        visitor_id: 'vis_' + new Date().getTime(),
        homeowner_id: payload.homeownerId,
        name: payload.name,
        vehicle: payload.vehicle,
        date: payload.date,
        time_in: '',
        time_out: '',
        qr_code: 'qr_' + Math.random().toString(36).substring(7),
        status: 'expected'
    };
    
    const newRow = headers.map(header => newVisitor[String(header).trim()] !== undefined ? newVisitor[String(header).trim()] : null);
    sheet.appendRow(newRow);
    
    return newVisitor;
}

function getHomeownerDashboardData(userId) {
    const dues = getDuesForUser(userId);
    const announcements = getAnnouncements().slice(0, 3);
    const requests = getAmenityReservationsForUser(userId);
    const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
    
    return { dues, announcements, pendingRequestsCount };
}

function getAdminDashboardData() {
    const allDues = getAllDues(); 
    const users = getAllUsers();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let duesCollected = 0;
    allDues.forEach(d => {
        if (d.payment && d.payment.status === 'verified') {
             const pDate = new Date(d.payment.date_paid);
             if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                 duesCollected += Number(d.payment.amount);
             }
        }
    });

    const pendingApprovalsCount = users.filter(u => u.status === 'pending').length;
    
    const amenitySheet = getSheetOrThrow(SHEET_NAMES.AMENITY_RESERVATIONS);
    const amenities = sheetToJSON(amenitySheet);
    const pendingAmenities = amenities.filter(a => a.status === 'pending');
    
    const pendingList = [];
    users.filter(u => u.status === 'pending').forEach(u => {
        pendingList.push({ id: u.user_id, name: u.full_name, type: 'New Member', date: u.date_created });
    });
    pendingAmenities.forEach(a => {
        const user = users.find(u => u.user_id === a.user_id);
        pendingList.push({ id: a.reservation_id, name: user ? user.full_name : 'Unknown', type: `Amenity: ${a.amenity_name}`, date: a.reservation_date });
    });

    const upcomingEventsCount = amenities.filter(a => new Date(a.reservation_date) >= now).length;
    const activeMembers = users.filter(u => u.status === 'active' && u.role === 'Homeowner').length;
    
    return {
        duesCollected,
        pendingApprovalsCount: pendingList.length,
        upcomingEventsCount,
        activeMembers,
        pendingApprovals: pendingList.sort((a,b) => new Date(b.date) - new Date(a.date))
    };
}

// --- SETTINGS & BILLING ---

function getAppSettings() {
    const sheet = getSheetOrThrow(SHEET_NAMES.SETTINGS);
    const data = sheetToJSON(sheet, ['key', 'value']);
    const settings = {};
    data.forEach(row => {
        settings[row.key] = row.value;
    });
    
    return {
        monthlyDue: Number(settings['monthlyDue']) || 0,
        penalty: Number(settings['penalty']) || 0,
        gcashQrCode: settings['gcashQrCode'] || null,
        effectiveDate: settings['effectiveDate'] || ''
    };
}

function updateAppSettings(payload) {
    const { settings } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.SETTINGS);
    const data = sheet.getDataRange().getValues();
    
    const setSetting = (key, value) => {
        let found = false;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
                sheet.getRange(i + 1, 2).setValue(value);
                found = true;
                break;
            }
        }
        if (!found) {
            sheet.appendRow([key, value]);
        }
    };

    if (settings.monthlyDue !== undefined) setSetting('monthlyDue', settings.monthlyDue);
    if (settings.penalty !== undefined) setSetting('penalty', settings.penalty);
    if (settings.gcashQrCode !== undefined) setSetting('gcashQrCode', settings.gcashQrCode);
    
    if (settings.effectiveDate !== undefined) {
        const currentEffectiveDate = getAppSettings().effectiveDate;
        if (settings.effectiveDate !== currentEffectiveDate) {
             setSetting('effectiveDate', settings.effectiveDate);
             SpreadsheetApp.flush(); 
             generateMonthlyDuesForAllHomeowners(settings.effectiveDate);
        } else {
             setSetting('effectiveDate', settings.effectiveDate);
        }
    }
    
    SpreadsheetApp.flush(); 
    return getAppSettings();
}

function generateMonthlyDuesForAllHomeowners(effectiveDateString) {
    if (!effectiveDateString) return;
    
    const sheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(sheet);
    const homeowners = users.filter(u => u.role === 'Homeowner' && u.status === 'active');
    
    const settings = getAppSettings();
    const amount = settings.monthlyDue;
    const billingDateFull = effectiveDateString; 
    
    const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
    const existingDues = sheetToJSON(duesSheet);
    
    const duesHeaders = duesSheet.getRange(1, 1, 1, duesSheet.getLastColumn()).getValues()[0];
    
    homeowners.forEach(user => {
        const alreadyBilled = existingDues.some(d => d.user_id === user.user_id && d.billing_month === billingDateFull);
        
        if (!alreadyBilled) {
             const newDue = {
                due_id: 'due_' + new Date().getTime() + '_' + user.user_id,
                user_id: user.user_id,
                billing_month: billingDateFull,
                amount: amount,
                penalty: 0,
                total_due: amount,
                status: 'unpaid',
                notes: 'Auto-generated'
            };
            const newRow = duesHeaders.map(header => newDue[String(header).trim()] !== undefined ? newDue[String(header).trim()] : null);
            duesSheet.appendRow(newRow);
        }
    });
}

function submitPayment(payload) {
    const { dueId, userId, amount, method, proofUrl } = payload;
    
    // CHECK IF THIS IS A PROJECT PAYMENT (dueId starts with PROJ)
    if (String(dueId).startsWith('PROJ')) {
         const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
         const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
         
         const newPayment = {
            payment_id: 'pay_' + new Date().getTime(),
            due_id: dueId,
            user_id: userId,
            amount: amount,
            method: method,
            proof_url: proofUrl, 
            status: 'pending',
            date_paid: new Date().toISOString(),
            notes: 'Project Contribution via GCash'
         };
         
         const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
         paymentsSheet.appendRow(newRow);
         return newPayment;
         
    } else {
        const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
        const allDues = sheetToJSON(duesSheet, ['due_id']);
        const due = allDues.find(d => d.due_id === dueId);
        
        if (!due) throw new Error("Due not found.");
        
        const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
        const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
        
        const newPayment = {
            payment_id: 'pay_' + new Date().getTime(),
            due_id: dueId,
            user_id: userId,
            amount: amount,
            method: method,
            proof_url: proofUrl, 
            status: 'pending',
            date_paid: new Date().toISOString()
        };
        
        const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
        paymentsSheet.appendRow(newRow);
        
        return newPayment;
    }
}

function recordCashPaymentIntent(payload) {
  const { dueId, amount } = payload;
  if (!dueId) {
    throw new Error("Due ID is required to record a cash payment intent.");
  }

  // Check if this is a project contribution
  if (String(dueId).startsWith('PROJ')) {
      if (!amount) throw new Error("Amount is required for project contributions.");
      
      const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
      const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
      
      const separator = '::';
      const idParts = dueId.split(separator);
      let userIdFromId = null;
      if (idParts.length >= 3 && idParts[0] === 'PROJ') {
          userIdFromId = idParts[2];
      }
      
      if (!userIdFromId) {
          throw new Error("Invalid Project Payment ID format.");
      }
      
      const newPaymentId = 'pay_' + new Date().getTime();
      const newPayment = {
        payment_id: newPaymentId,
        due_id: dueId,
        user_id: userIdFromId,
        amount: amount,
        method: 'Cash',
        proof_url: '',
        status: 'pending',
        date_paid: new Date().toISOString(),
        notes: 'Pending cash contribution for project.'
      };
    
      const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
      paymentsSheet.appendRow(newRow);
    
      return newPayment;
      
  } else {
      const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
      const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
      const due = allDues.find(d => d.due_id === dueId);
      if (!due) {
        throw new Error("Due not found.");
      }
    
      const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
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
}

function recordAdminCashPayment(payload) {
    const { dueId } = payload;
    const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
    const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
    const due = allDues.find(d => d.due_id === dueId);
    
    if (!due) throw new Error("Due not found.");
    
    const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
    const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
    
    const newPayment = {
        payment_id: 'pay_admin_' + new Date().getTime(),
        due_id: dueId,
        user_id: due.user_id,
        amount: due.total_due,
        method: 'Cash',
        proof_url: '',
        status: 'verified', 
        date_paid: new Date().toISOString(),
        notes: 'Cash payment recorded by Admin.'
    };
    
    const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
    paymentsSheet.appendRow(newRow);
    
    const duesData = duesSheet.getDataRange().getValues();
    const duesHeaders = duesData[0];
    const dueIdIndex = duesHeaders.indexOf('due_id');
    const dueRowIndex = duesData.findIndex(row => row[dueIdIndex] === dueId);
    
    if (dueRowIndex !== -1) {
        const dueStatusIndex = duesHeaders.indexOf('status');
        duesSheet.getRange(dueRowIndex + 1, dueStatusIndex + 1).setValue('paid');
    }
    
    return newPayment;
}

function updatePaymentStatus(payload) {
  const { paymentId, status, notes } = payload;
  const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
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

  const statusIndex = paymentsHeaders.indexOf('status');
  paymentsSheet.getRange(paymentRowIndex + 1, statusIndex + 1).setValue(status);
  
  if (notes) {
      const notesIndex = paymentsHeaders.indexOf('notes');
      paymentsSheet.getRange(paymentRowIndex + 1, notesIndex + 1).setValue(notes);
  }

  // If approved
  if (status === 'verified') {
    // CHECK IF PROJECT PAYMENT
    if (String(paymentObj.due_id).startsWith('PROJ')) {
        const parts = String(paymentObj.due_id).split('::');
        if (parts.length >= 2) {
            const projectId = parts[1];
            // Find project and update funds
            const projectsSheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
            const projectsData = projectsSheet.getDataRange().getValues();
            const projHeaders = projectsData[0];
            const projIdIndex = projHeaders.indexOf('project_id');
            const projAllocatedIndex = projHeaders.indexOf('funds_allocated');
            
            const projRowIndex = projectsData.findIndex(row => row[projIdIndex] === projectId);
            
            if (projRowIndex !== -1 && projAllocatedIndex !== -1) {
                const currentAllocated = Number(projectsData[projRowIndex][projAllocatedIndex]) || 0;
                const paymentAmount = Number(paymentObj.amount) || 0;
                projectsSheet.getRange(projRowIndex + 1, projAllocatedIndex + 1).setValue(currentAllocated + paymentAmount);
            }
        }
    } else {
        // STANDARD DUE LOGIC
        const dueId = paymentObj.due_id;
        const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
        const duesData = duesSheet.getDataRange().getValues();
        const duesHeaders = duesData[0];
        const dueIdIndex = duesHeaders.indexOf('due_id');
        const dueRowIndex = duesData.findIndex(row => row[dueIdIndex] === dueId);
    
        if (dueRowIndex !== -1) {
          const dueStatusIndex = duesHeaders.indexOf('status');
          duesSheet.getRange(dueRowIndex + 1, dueStatusIndex + 1).setValue('paid');
        }
    }
  }

  return paymentObj;
}

// --- AMENITIES ---

function getAmenityReservationsForUser(userId) {
    const sheet = getSheetOrThrow(SHEET_NAMES.AMENITY_RESERVATIONS);
    const all = sheetToJSON(sheet);
    return all.filter(r => r.user_id === userId).sort((a,b) => new Date(b.reservation_date) - new Date(a.reservation_date));
}

function getAllAmenityReservations() {
    const sheet = getSheetOrThrow(SHEET_NAMES.AMENITY_RESERVATIONS);
    const all = sheetToJSON(sheet);
    const usersSheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(usersSheet, ['user_id']);
    
    return all.map(r => {
        const user = users.find(u => u.user_id === r.user_id);
        return { ...r, full_name: user ? user.full_name : 'Unknown' };
    }).sort((a,b) => new Date(b.reservation_date) - new Date(a.reservation_date));
}

function createAmenityReservation(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.AMENITY_RESERVATIONS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newRes = {
        reservation_id: 'res_' + new Date().getTime(),
        user_id: payload.userId,
        amenity_name: payload.amenityName,
        reservation_date: payload.reservationDate,
        start_time: payload.startTime,
        end_time: payload.endTime,
        status: 'pending',
        notes: payload.notes
    };
    
    const newRow = headers.map(header => newRes[String(header).trim()] !== undefined ? newRes[String(header).trim()] : null);
    sheet.appendRow(newRow);
    return newRes;
}

function updateAmenityReservationStatus(payload) {
    const { reservationId, status } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.AMENITY_RESERVATIONS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('reservation_id');
    const statusIndex = headers.indexOf('status');
    
    const rowIndex = data.findIndex(row => row[idIndex] === reservationId);
    if (rowIndex !== -1) {
        sheet.getRange(rowIndex + 1, statusIndex + 1).setValue(status);
        return { success: true };
    }
    throw new Error("Reservation not found");
}

// --- CCTV ---

function getCCTVList() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.CCTV);
    if (!sheet) return [];
    
    return sheetToJSON(sheet, ['cctv_id']); 
}

function createCCTV(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.CCTV); 
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (headers.length === 0 || headers[0] === '') {
        sheet.appendRow(['cctv_id', 'name', 'stream_url', 'created_at']);
    }

    const newCam = {
        cctv_id: 'cam_' + new Date().getTime(),
        name: payload.name,
        stream_url: payload.stream_url,
        created_at: new Date().toISOString()
    };
    
    const freshHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = freshHeaders.map(header => newCam[String(header).trim()] !== undefined ? newCam[String(header).trim()] : null);
    sheet.appendRow(newRow);
    return newCam;
}

function updateCCTV(payload) {
    const { cctv_id, name, stream_url } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.CCTV);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('cctv_id');
    const nameIndex = headers.indexOf('name');
    const urlIndex = headers.indexOf('stream_url');
    
    const rowIndex = data.findIndex(row => row[idIndex] === cctv_id);
    if (rowIndex === -1) throw new Error("Camera not found");
    
    const actualRow = rowIndex + 1;
    sheet.getRange(actualRow, nameIndex + 1).setValue(name);
    sheet.getRange(actualRow, urlIndex + 1).setValue(stream_url);
    
    return payload;
}

function deleteCCTV(payload) {
    const { cctvId } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.CCTV);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('cctv_id');
    
    const rowIndex = data.findIndex(row => row[idIndex] === cctvId);
    if (rowIndex === -1) throw new Error("Camera not found");
    
    sheet.deleteRow(rowIndex + 1);
    return { success: true };
}

// --- FINANCIAL REPORTS ---

function createExpense(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.EXPENSES);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newExp = {
        expense_id: 'exp_' + new Date().getTime(),
        date: payload.date,
        category: payload.category,
        amount: payload.amount,
        payee: payload.payee,
        description: payload.description,
        created_by: 'Admin',
        created_at: new Date().toISOString()
    };
    
    const newRow = headers.map(header => newExp[String(header).trim()] !== undefined ? newExp[String(header).trim()] : null);
    sheet.appendRow(newRow);
    return newExp;
}

function getFinancialData() {
    // 1. DUES & INCOME
    const duesSheet = getSheetOrThrow(SHEET_NAMES.DUES);
    const allDues = sheetToJSON(duesSheet);
    const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
    const allPayments = sheetToJSON(paymentsSheet);
    
    let totalDuesRevenue = 0;
    let totalPenalties = 0;
    let totalOtherRevenue = 0;
    let cashOnHand = 0;
    let gcash = 0;
    let bank = 0; 

    allPayments.forEach(p => {
        if (p.status === 'verified') {
            const amount = Number(p.amount);
            totalDuesRevenue += amount;
            
            if (p.method === 'Cash') cashOnHand += amount;
            else if (p.method === 'GCash') gcash += amount;
            else bank += amount;
        }
    });

    // 2. EXPENSES
    const expenseSheet = getSheetOrThrow(SHEET_NAMES.EXPENSES);
    const allExpenses = sheetToJSON(expenseSheet);
    
    let totalExpenses = 0;
    const expenseBreakdown = {};
    
    allExpenses.forEach(e => {
        const amount = Number(e.amount);
        totalExpenses += amount;
        
        if (!expenseBreakdown[e.category]) expenseBreakdown[e.category] = 0;
        expenseBreakdown[e.category] += amount;
    });

    // 3. ACCOUNTS RECEIVABLE
    const usersSheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(usersSheet);
    let accountsReceivable = 0;
    const accountsReceivableList = [];
    
    const duesByUser = {};
    allDues.forEach(d => {
        if (d.status !== 'paid') {
             if (!duesByUser[d.user_id]) duesByUser[d.user_id] = { count: 0, amount: 0 };
             duesByUser[d.user_id].count++;
             duesByUser[d.user_id].amount += Number(d.total_due);
        }
    });
    
    Object.keys(duesByUser).forEach(uid => {
        const u = users.find(user => user.user_id === uid);
        if (u) {
            const data = duesByUser[uid];
            accountsReceivable += data.amount;
            accountsReceivableList.push({
                name: u.full_name,
                unit: `B${u.block} L${u.lot}`,
                amount: data.amount,
                months: data.count
            });
        }
    });

    // 4. RESERVE FUND
    const reserveFundTotal = expenseBreakdown['Reserve Fund Contribution'] || 0;

    return {
        totalRevenue: totalDuesRevenue + totalPenalties + totalOtherRevenue,
        totalExpenses: totalExpenses,
        netSurplus: (totalDuesRevenue + totalPenalties + totalOtherRevenue) - totalExpenses,
        endingCashBalance: (cashOnHand + gcash + bank) - totalExpenses, 
        cashPosition: {
            cashOnHand,
            gcash,
            bank
        },
        incomeBreakdown: {
            dues: totalDuesRevenue,
            penalties: totalPenalties,
            other: totalOtherRevenue
        },
        expenseBreakdown,
        accountsReceivable,
        accountsReceivableList: accountsReceivableList.sort((a,b) => b.amount - a.amount),
        reserveFundTotal,
        expensesLedger: allExpenses.sort((a,b) => new Date(b.date) - new Date(a.date))
    };
}

// --- PROJECTS / PLANNING ---

function getProjects() {
    const sheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    return sheetToJSON(sheet).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
}

function createProject(payload) {
    const sheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const newProject = {
        project_id: 'proj_' + new Date().getTime(),
        name: payload.name,
        description: payload.description,
        status: payload.status,
        start_date: payload.start_date,
        end_date: payload.end_date,
        budget: payload.budget,
        funds_allocated: payload.funds_allocated,
        funds_spent: payload.funds_spent,
        created_at: new Date().toISOString()
    };
    
    const newRow = headers.map(header => newProject[String(header).trim()] !== undefined ? newProject[String(header).trim()] : null);
    sheet.appendRow(newRow);
    return newProject;
}

function updateProject(payload) {
    const { projectId, ...updates } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('project_id');
    
    const rowIndex = data.findIndex(row => row[idIndex] === projectId);
    if (rowIndex === -1) throw new Error("Project not found");
    
    const actualRow = rowIndex + 1;
    
    Object.keys(updates).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
            sheet.getRange(actualRow, colIndex + 1).setValue(updates[key]);
        }
    });
    
    return { success: true };
}

function deleteProject(payload) {
    const { projectId } = payload;
    const sheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('project_id');
    
    const rowIndex = data.findIndex(row => row[idIndex] === projectId);
    if (rowIndex === -1) throw new Error("Project not found");
    
    sheet.deleteRow(rowIndex + 1);
    return { success: true };
}

function getProjectContributions() {
    const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
    const payments = sheetToJSON(paymentsSheet);
    
    // Filter for project payments
    const projPayments = payments.filter(p => String(p.due_id).startsWith('PROJ'));
    
    const usersSheet = getSheetOrThrow(SHEET_NAMES.USERS);
    const users = sheetToJSON(usersSheet);
    
    const projectsSheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    const projects = sheetToJSON(projectsSheet);
    
    return projPayments.map(p => {
        const parts = String(p.due_id).split('::');
        const projectId = parts.length >= 2 ? parts[1] : '';
        
        const project = projects.find(prj => prj.project_id === projectId);
        const user = users.find(u => u.user_id === p.user_id);
        
        return {
            ...p,
            project_name: project ? project.name : 'Unknown Project',
            homeowner_name: user ? user.full_name : 'Unknown',
            homeowner_unit: user ? `B${user.block} L${user.lot}` : ''
        };
    }).sort((a,b) => new Date(b.date_paid) - new Date(a.date_paid));
}

function createManualProjectContribution(payload) {
    const { projectId, userId, amount } = payload;
    
    const paymentsSheet = getSheetOrThrow(SHEET_NAMES.PAYMENTS);
    const headers = paymentsSheet.getRange(1, 1, 1, paymentsSheet.getLastColumn()).getValues()[0];
    
    // Create a due_id for the record
    const dueId = `PROJ::${projectId}::${userId}::${new Date().getTime()}`;
    
    const newPayment = {
        payment_id: 'pay_admin_' + new Date().getTime(),
        due_id: dueId,
        user_id: userId,
        amount: amount,
        method: 'Cash',
        proof_url: '',
        status: 'verified',
        date_paid: new Date().toISOString(),
        notes: 'Manual contribution recorded by Admin'
    };
    
    const newRow = headers.map(header => newPayment[String(header).trim()] !== undefined ? newPayment[String(header).trim()] : null);
    paymentsSheet.appendRow(newRow);
    
    // Update Project Funds
    const projectsSheet = getSheetOrThrow(SHEET_NAMES.PROJECTS);
    const projectsData = projectsSheet.getDataRange().getValues();
    const projHeaders = projectsData[0];
    const projIdIndex = projHeaders.indexOf('project_id');
    const projAllocatedIndex = projHeaders.indexOf('funds_allocated');
    
    const projRowIndex = projectsData.findIndex(row => row[projIdIndex] === projectId);
    
    if (projRowIndex !== -1 && projAllocatedIndex !== -1) {
        const currentAllocated = Number(projectsData[projRowIndex][projAllocatedIndex]) || 0;
        projectsSheet.getRange(projRowIndex + 1, projAllocatedIndex + 1).setValue(currentAllocated + Number(amount));
    }
    
    return newPayment;
}

// --- SETUP UTILITY ---

function setupMockData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = [
    { name: SHEET_NAMES.USERS, headers: ['user_id', 'role', 'full_name', 'email', 'phone', 'block', 'lot', 'password_hash', 'status', 'date_created'] },
    { name: SHEET_NAMES.ANNOUNCEMENTS, headers: ['ann_id', 'title', 'content', 'image_url', 'created_by', 'created_at', 'audience'] },
    { name: SHEET_NAMES.DUES, headers: ['due_id', 'user_id', 'billing_month', 'amount', 'penalty', 'total_due', 'status', 'notes'] },
    { name: SHEET_NAMES.PAYMENTS, headers: ['payment_id', 'due_id', 'user_id', 'amount', 'method', 'proof_url', 'status', 'date_paid', 'notes'] },
    { name: SHEET_NAMES.VISITORS, headers: ['visitor_id', 'homeowner_id', 'name', 'vehicle', 'date', 'time_in', 'time_out', 'qr_code', 'status'] },
    { name: SHEET_NAMES.SETTINGS, headers: ['key', 'value'] },
    { name: SHEET_NAMES.AMENITY_RESERVATIONS, headers: ['reservation_id', 'user_id', 'amenity_name', 'reservation_date', 'start_time', 'end_time', 'status', 'notes'] },
    { name: SHEET_NAMES.CCTV, headers: ['cctv_id', 'name', 'stream_url', 'created_at'] },
    { name: SHEET_NAMES.EXPENSES, headers: ['expense_id', 'date', 'category', 'amount', 'payee', 'description', 'created_by', 'created_at'] },
    { name: SHEET_NAMES.PROJECTS, headers: ['project_id', 'name', 'description', 'status', 'start_date', 'end_date', 'budget', 'funds_allocated', 'funds_spent', 'created_at'] }
  ];

  sheets.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    sheet.clear();
    sheet.appendRow(def.headers);
  });

  // --- Initial Data ---
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const now = new Date().toISOString();
  usersSheet.appendRow(['user_001', 'Admin', 'Admin User', 'admin@gmail.com', '09170000000', '1', '1', 'admin', 'active', now]);
  usersSheet.appendRow(['user_002', 'Homeowner', 'John Doe', 'john.doe@home.com', '09180000000', '5', '12', 'password', 'active', now]);
  usersSheet.appendRow(['user_003', 'Staff', 'Security Guard', 'staff@hoa.com', '09190000000', '0', '0', 'password', 'active', now]);

  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  settingsSheet.appendRow(['monthlyDue', '2000']);
  settingsSheet.appendRow(['penalty', '100']);
  settingsSheet.appendRow(['effectiveDate', new Date().toISOString().split('T')[0]]);

  const projectSheet = ss.getSheetByName(SHEET_NAMES.PROJECTS);
  projectSheet.appendRow(['proj_001', 'Clubhouse Renovation', 'Repairing the roof and painting walls', 'Ongoing', '2023-11-01', '2024-01-30', 500000, 150000, 50000, now]);

  return "Database initialized successfully.";
}
