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
// Sheet: Visitors
// Columns: visitor_id, homeowner_id, name, vehicle, date, time_in, time_out, qr_code, status
//
// Sheet: Settings
// Columns: key, value
// =================================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

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

    switch (action) {
      case 'getAnnouncements':
        data = getAnnouncements();
        break;
      case 'getDuesForUser':
        data = getDuesForUser(e.parameter.userId);
        break;
      case 'getAllDues':
        data = getAllDues();
        break;
      case 'getVisitorsForHomeowner':
        data = getVisitorsForHomeowner(e.parameter.homeownerId);
        break;
      case 'getAllVisitors':
        data = getAllVisitors();
        break;
      case 'getHomeownerDashboardData':
        data = getHomeownerDashboardData(e.parameter.userId);
        break;
      case 'getAllUsers':
        data = getAllUsers();
        break;
      case 'getAppSettings':
        data = getAppSettings();
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
    Logger.log(JSON.stringify({type: 'POST', action: action, payload: payload}));
    let data;

    switch (action) {
      case 'login':
        data = login(payload);
        break;
      case 'register':
        data = register(payload);
        break;
      case 'updateUserRole':
        data = updateUserRole(payload.userId, payload.newRole);
        break;
      case 'updateAppSettings':
        data = updateAppSettings(payload.settings);
        break;
      default:
        return jsonResponse({ error: 'Invalid POST action: ' + action }, false);
    }
    return jsonResponse(data);
  } catch (error) {
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

function getDuesForUser(userId) {
  const duesSheet = getSheetOrThrow("Dues");
  const allDues = sheetToJSON(duesSheet, ['due_id', 'user_id']);
  return allDues.filter(due => due.user_id === userId);
}

function getAllDues() {
    const duesSheet = getSheetOrThrow("Dues");
    return sheetToJSON(duesSheet, ['due_id', 'user_id']);
}

function getVisitorsForHomeowner(homeownerId) {
  const visitorsSheet = getSheetOrThrow("Visitors");
  const allVisitors = sheetToJSON(visitorsSheet, ['visitor_id', 'homeowner_id']);
  return allVisitors.filter(v => v.homeowner_id === homeownerId);
}

function getAllVisitors() {
    const visitorsSheet = getSheetOrThrow("Visitors");
    return sheetToJSON(visitorsSheet, ['visitor_id']);
}

function getHomeownerDashboardData(userId) {
    const dues = getDuesForUser(userId);
    const announcements = getAnnouncements().slice(0, 3); // Get latest 3
    return { dues, announcements };
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

function updateUserRole(userId, newRole) {
    const usersSheet = getSheetOrThrow("Users");
    const users = usersSheet.getDataRange().getValues();
    const headers = users[0];
    const userIndex = users.findIndex(row => row[headers.indexOf('user_id')] === userId);

    if (userIndex !== -1) {
        const roleIndex = headers.indexOf('role');
        usersSheet.getRange(userIndex + 1, roleIndex + 1).setValue(newRole);
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

function getAppSettings() {
    const settingsSheet = getSheetOrThrow("Settings");
    const settings = sheetToJSON(settingsSheet, ['key', 'value']);
    const appSettings = {
        monthlyDue: 0,
        penalty: 0,
        gcashQrCode: null
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
  const visitorsSheet = getOrCreateSheet("Visitors");
  const settingsSheet = getOrCreateSheet("Settings");
  
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
      ['gcashQrCode', '']
  ];
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]).setFontWeight('bold');
  if (settingsData.length > 0) {
    settingsSheet.getRange(2, 1, settingsData.length, settingsData[0].length).setValues(settingsData);
  }
  settingsSheet.setFrozenRows(1);

  SpreadsheetApp.flush();
  Logger.log('Mock data and headers have been set up successfully!');
}
