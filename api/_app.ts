import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import ExcelJS from 'exceljs';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);

// Helper to enforce strict timeouts on promises so Vercel functions never hang indefinitely
function withTimeout<T>(promise: Promise<T>, ms: number, operationName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation "${operationName}" timed out after ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Temporary server-side logging for login requests to inspect exact paths received by Express
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url?.includes('login') || req.originalUrl?.includes('login') || req.path?.includes('login')) {
    console.log('[LOGIN_REQUEST_INSPECT]', {
      method: req.method,
      originalUrl: req.originalUrl,
      url: req.url,
      path: req.path
    });
  }
  next();
});

// Ensure JSON Content-Type header on all API calls
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint for Vercel and local monitoring
app.get(['/api', '/api/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Flying Whales API', time: new Date().toISOString() });
});

// Upload Whale Image Asset endpoint (saves user's uploaded whale asset to disk)
app.post('/api/upload-whale-image', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
    const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
    if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });
    if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

    // Save as primary uploaded assets
    fs.writeFileSync(path.join(publicAssetsDir, 'whale_uploaded.png'), buffer);
    fs.writeFileSync(path.join(publicAssetsDir, 'whale.png'), buffer);
    fs.writeFileSync(path.join(publicAssetsDir, 'ChatGPT Image Sep 11, 2026, 04_44_43 PM.png'), buffer);

    if (fs.existsSync(distAssetsDir)) {
      fs.writeFileSync(path.join(distAssetsDir, 'whale_uploaded.png'), buffer);
      fs.writeFileSync(path.join(distAssetsDir, 'whale.png'), buffer);
      fs.writeFileSync(path.join(distAssetsDir, 'ChatGPT Image Sep 11, 2026, 04_44_43 PM.png'), buffer);
    }

    if (filename) {
      const sanitized = path.basename(filename);
      fs.writeFileSync(path.join(publicAssetsDir, sanitized), buffer);
      if (fs.existsSync(distAssetsDir)) {
        fs.writeFileSync(path.join(distAssetsDir, sanitized), buffer);
      }
    }

    res.json({ success: true, url: '/assets/whale_uploaded.png' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve thumbnails statically from public/thumbnails
app.use('/thumbnails', express.static(path.join(process.cwd(), 'public', 'thumbnails')));

// Upload Task Thumbnail endpoint (saves work log task thumbnails to public/thumbnails and dist/thumbnails)
app.post('/api/upload-task-thumbnail', (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }
    const match = imageBase64.match(/^data:image\/(\w+);base64,/);
    const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicThumbDir = path.join(process.cwd(), 'public', 'thumbnails');
    const distThumbDir = path.join(process.cwd(), 'dist', 'thumbnails');
    if (!fs.existsSync(publicThumbDir)) fs.mkdirSync(publicThumbDir, { recursive: true });
    if (!fs.existsSync(distThumbDir)) fs.mkdirSync(distThumbDir, { recursive: true });

    const safeName = `task_thumb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(publicThumbDir, safeName), buffer);

    if (fs.existsSync(distThumbDir)) {
      fs.writeFileSync(path.join(distThumbDir, safeName), buffer);
    }

    const publicUrl = `/thumbnails/${safeName}`;
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Persistent local data store path (ensures data is retained across server restarts in local dev)
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignore ephemeral filesystem permission errors in serverless environments
}
const DB_FILE_PATH = path.join(DATA_DIR, 'flying_whales_db.json');

// Types
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'Active' | 'Inactive';
  googleUserId?: string;
  profileImage?: string;
  createdAt: string;
  lastLoginAt?: string;
  hasLoggedIn?: boolean;
}

export interface WorkLogRecord {
  id: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  task?: 'Videos' | 'Shorts' | 'Reels' | 'Photos' | 'Shootings' | 'Others';
  title: string;
  status: 'Completed' | 'In Progress' | 'Pending';
  requestedBy?: string;
  requestedDate?: string;
  quantity?: number;
  workDone?: 'Yes' | 'No';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;

  // Backwards compatibility optional fields
  date?: string;
  description?: string;
  category?: string;
  priority?: 'Low' | 'Medium' | 'High';
  timeSpent?: string;
  clientProject?: string;
  notes?: string;
}

export interface PresetRecord {
  id: string;
  employeeId: string;
  employeeEmail: string;
  presetName?: string;
  task: 'Videos' | 'Shorts' | 'Reels' | 'Photos' | 'Shootings' | 'Others';
  title: string;
  requestedBy: string;
  quantity?: number;
  workDone?: 'Yes' | 'No';
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  employeeId: string;
  employeeEmail: string;
  title: string;
  content: string;
  category: string;
  dueDate: string;
  status: 'Upcoming' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  date: string;
  loginTime: string;
  logoutTime?: string;
  duration?: string;
  activeHours?: string;
  activeSeconds?: number;
  status: 'Logged In' | 'Completed' | 'Present' | 'Active';
  createdAt: string;
  updatedAt: string;
}

export function getKolkataDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getKolkataTimeString(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function parseKolkataDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  const cleanTime = String(timeStr).trim();
  if (!cleanTime) return null;

  if (cleanTime.includes('T') || (cleanTime.includes('-') && cleanTime.length >= 19)) {
    const d = new Date(cleanTime);
    if (!isNaN(d.getTime())) return d;
  }

  const cleanDate = String(dateStr || '').trim();
  let year = '';
  let month = '';
  let day = '';

  const dateParts = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateParts) {
    year = dateParts[1];
    month = dateParts[2];
    day = dateParts[3];
  } else {
    try {
      const todayIST = getKolkataDateString();
      const parts = todayIST.split('-');
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } catch {
      const fallbackParts = new Date().toISOString().split('T')[0].split('-');
      year = fallbackParts[0];
      month = fallbackParts[1];
      day = fallbackParts[2];
    }
  }

  // 12-hour AM/PM format, e.g. "12:38:23 PM" or "02:09:35 PM" or "12:38 PM"
  const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const second = match12[3] ? parseInt(match12[3], 10) : 0;
    const period = match12[4].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    const iso = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:30`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // 24-hour format, e.g. "18:27:02" or "18:27"
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    const second = match24[3] ? parseInt(match24[3], 10) : 0;
    const iso = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:30`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(`${cleanDate} ${cleanTime}`);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function isZeroOrMissingDuration(duration?: string | null): boolean {
  if (!duration) return true;
  const clean = duration.trim().toLowerCase();
  if (!clean || clean === 'in progress' || clean === 'pending' || clean === 'calculated' || clean === '--:--') {
    return true;
  }
  if (
    clean === '0h 00m' ||
    clean === '00h 00m' ||
    clean === '0h 0m' ||
    clean === '0h' ||
    clean === '0m' ||
    clean === '00:00' ||
    clean === '0:00' ||
    clean === '0'
  ) {
    return true;
  }
  return /^0+h\s*0+m$/i.test(clean);
}

export function calculateAttendanceDuration(
  dateStr?: string | null,
  loginTime?: string | null,
  logoutTime?: string | null
): string {
  if (!loginTime || !logoutTime) return '0h 00m';
  const start = parseKolkataDateTime(dateStr, loginTime);
  const end = parseKolkataDateTime(dateStr, logoutTime);
  if (!start || !end) return '0h 00m';

  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

function calculateDuration(start: string, end: string, dateStr?: string): string {
  try {
    if (start && end && start.includes('T') && end.includes('T')) {
      const diffMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    return calculateAttendanceDuration(dateStr, start, end);
  } catch {
    return '0h 00m';
  }
}

// Configured Admin Email from environment variable
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'junty@flyingwhales').trim().toLowerCase();

export function isUserAdmin(emailOrLoginId?: string, currentRole?: string): boolean {
  if (currentRole === 'ADMIN') return true;
  if (!emailOrLoginId) return false;
  const clean = emailOrLoginId.trim().toLowerCase();
  const configuredAdmin = (process.env.ADMIN_EMAIL || 'junty@flyingwhales').trim().toLowerCase();
  return (
    clean === 'junty@flyingwhales' ||
    clean === 'admin-junty' ||
    (Boolean(configuredAdmin) && clean === configuredAdmin)
  );
}

// Role determination rule: If email matches admin or current role is ADMIN -> ADMIN, Else -> EMPLOYEE
export function resolveRole(emailOrLoginId?: string, currentRole?: string): 'ADMIN' | 'EMPLOYEE' {
  return isUserAdmin(emailOrLoginId, currentRole) ? 'ADMIN' : 'EMPLOYEE';
}

export const PRODUCTION_SPREADSHEET_ID = '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE';

export function cleanSpreadsheetId(input?: string): string {
  if (!input || !input.trim()) return PRODUCTION_SPREADSHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  let id = match && match[1] ? match[1] : trimmed;
  // If the sample quickstart sheet ID is used, replace with actual production spreadsheet ID
  if (!id || id === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms') {
    return PRODUCTION_SPREADSHEET_ID;
  }
  // Auto-correct any casing variation of production sheet ID
  if (
    id.toLowerCase() === PRODUCTION_SPREADSHEET_ID.toLowerCase() ||
    id.toLowerCase().includes('1msm15jwzshu03_yz4swkyp6o5bmk1ek')
  ) {
    return PRODUCTION_SPREADSHEET_ID;
  }
  return id;
}

export function parseServiceAccount(value?: any): { client_email?: string; private_key?: string } | null {
  const rawValue =
    value ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GCP_SERVICE_ACCOUNT ||
    process.env.GOOGLE_CREDENTIALS;

  if (!rawValue) return null;

  // Handle case where rawValue is already an object
  if (typeof rawValue === 'object' && rawValue !== null) {
    if (rawValue.client_email && rawValue.private_key) {
      return {
        client_email: String(rawValue.client_email).trim(),
        private_key: String(rawValue.private_key).replace(/\\n/g, '\n'),
      };
    }
  }

  if (typeof rawValue !== 'string' || !rawValue.trim()) return null;
  let trimmed = rawValue.trim();

  // Strip single or double quotes wrapped around the whole string in env vars
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('{'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // 1. Direct JSON string parse
  try {
    let parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // continue
      }
    }
    if (parsed && parsed.client_email && parsed.private_key) {
      return {
        client_email: String(parsed.client_email).trim(),
        private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
      };
    }
  } catch {
    // continue
  }

  // 2. Base64 decoded JSON parse
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    let parsed = JSON.parse(decoded);
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // continue
      }
    }
    if (parsed && parsed.client_email && parsed.private_key) {
      return {
        client_email: String(parsed.client_email).trim(),
        private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
      };
    }
  } catch {
    // continue
  }

  // 3. File path on disk
  if (fs.existsSync(trimmed)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(trimmed, 'utf-8'));
      if (parsed && parsed.client_email && parsed.private_key) {
        return {
          client_email: String(parsed.client_email).trim(),
          private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch {
      // continue
    }
  }

  console.error('[AUTH] SERVICE_ACCOUNT_CONFIG_ERROR: Service account credentials provided in environment could not be parsed.');
  return null;
}

// Secure cryptographic password hashing and verification using bcryptjs
export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (storedHash === 'google_oauth_authenticated') return false;

  // 1. Standard bcrypt format ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2')) {
    try {
      return bcrypt.compareSync(password, storedHash);
    } catch {
      return false;
    }
  }

  // 2. PBKDF2 format: pbkdf2$iterations$salt$hash
  if (storedHash.startsWith('pbkdf2$')) {
    try {
      const parts = storedHash.split('$');
      if (parts.length === 4) {
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const expectedHash = parts[3];
        const derivedHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(derivedHash), Buffer.from(expectedHash));
      }
    } catch {
      return false;
    }
  }

  // 3. Strict policy: Never accept plaintext passwords
  return false;
}

const initialSpreadsheetId = cleanSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID) || '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE';

// Google Sheets Configuration State
let googleConfig = {
  spreadsheetId: initialSpreadsheetId,
  spreadsheetName: 'Flying Whales Central Data',
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${initialSpreadsheetId}/edit`,
  lastSync: new Date().toISOString(),
  lastSyncStatus: 'Connected & Synchronized',
  tabs: ['Employees', 'WorkLogs', 'KPI', 'Notes'],
  driveFolder: 'Flying Whales Production Drive',
};

// Initial Production Admin: Junty only (Flying Whales Ad Filming Company)
// bcrypt hash generated for password Junty@admin001:
export const INITIAL_ADMIN_HASH = '$2b$10$vZc6Y5TV3ZuzOc1YGFSUx.50aKZi//f1nJud6YK3IGjqxznVSBEE2';

export const INITIAL_ADMIN: UserRecord = {
  id: 'admin-junty',
  name: 'Junty',
  email: 'junty@flyingwhales',
  passwordHash: INITIAL_ADMIN_HASH,
  role: 'ADMIN',
  status: 'Active',
  createdAt: '2026-09-21T00:00:00.000Z',
  hasLoggedIn: false,
};

// Production database starts clean: absolutely NO fake/demo/seeded records
const DEFAULT_WORK_LOGS: WorkLogRecord[] = [];
const DEFAULT_NOTES: NoteRecord[] = [];
const DEFAULT_PRESETS: PresetRecord[] = [];
const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

let memoryAttendance: AttendanceRecord[] = [];

// Helper functions to identify and purge fake/demo records across the application
export function isFakeDemoUser(u: any): boolean {
  if (!u) return true;
  const email = String(u.email || '').trim().toLowerCase();
  const name = String(u.name || '').trim().toLowerCase();
  if (
    email === 'maya@flyingwhales.com' ||
    email === 'david@flyingwhales.com' ||
    email === 'sarah@flyingwhales.com' ||
    email === 'admin@flyingwhales.com'
  ) {
    return true;
  }
  if (name === 'maya lin' || name === 'david rossi' || name === 'sarah chen') {
    return true;
  }
  // Target and remove the duplicate "Admin" employee account (preserving Junty)
  if (name === 'admin' && email !== 'junty@flyingwhales') {
    return true;
  }
  return false;
}

export function isFakeDemoLog(w: any): boolean {
  if (!w) return true;
  const title = String(w.title || '').trim().toLowerCase();
  const email = String(w.employeeEmail || '').trim().toLowerCase();
  if (email === 'maya@flyingwhales.com' || email === 'david@flyingwhales.com' || email === 'sarah@flyingwhales.com') return true;
  if (
    title.includes('oceanic horizon brand spot') ||
    title.includes('aerotech studio launch') ||
    title.includes('lumina fashion week film') ||
    title.includes('founder stories docuseries') ||
    title.includes('cyberpunk short film') ||
    title.includes('brand commercial 4k master cut') ||
    title.includes('product launch teaser rough cut')
  ) {
    return true;
  }
  return false;
}

// Authoritative check if a work log belongs strictly to the specified employee/user
export function isLogOwnedByUser(w: any, user: { id?: string; email?: string } | null | undefined): boolean {
  if (!w || !user) return false;
  const userId = String(user.id || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();

  const logEmpId = String(w.employeeId || '').trim().toLowerCase();
  const logEmpEmail = String(w.employeeEmail || '').trim().toLowerCase();

  if (userId && (logEmpId === userId || logEmpEmail === userId)) return true;
  if (userEmail && (logEmpEmail === userEmail || logEmpId === userEmail)) return true;

  return false;
}

export function isFakeDemoNote(n: any): boolean {
  if (!n) return true;
  const id = String(n.id || '').trim();
  const title = String(n.title || '').trim().toLowerCase();
  if (['NOTE001', 'NOTE002', 'NOTE003'].includes(id)) return true;
  if (
    title.includes('client feedback notes on oceanic spot') ||
    title.includes('davinci resolve lut export checklist')
  ) {
    return true;
  }
  return false;
}

export function isFakeDemoPreset(p: any): boolean {
  if (!p) return true;
  const id = String(p.id || '').trim();
  const name = String(p.presetName || '').trim().toLowerCase();
  if (['PRESET001', 'PRESET002'].includes(id)) return true;
  if (name.includes('regular youtube cut') || name.includes('instagram campaign reel')) return true;
  return false;
}

export function isFakeDemoAttendance(a: any): boolean {
  if (!a) return true;
  const email = String(a.employeeEmail || '').trim().toLowerCase();
  const name = String(a.employeeName || '').trim().toLowerCase();
  if (isFakeDemoUser({ email, name })) return true;
  if (
    email.includes('example.com') ||
    email.includes('fake') ||
    email.includes('demo') ||
    email.includes('sample')
  ) {
    return true;
  }
  return false;
}

export function normalizeWorkLog(w: any): WorkLogRecord {
  let task = w.task;
  if (!task) {
    const cat = (w.category || '').toLowerCase();
    if (cat.includes('shooting') || cat.includes('camera')) task = 'Shootings';
    else if (cat.includes('photo')) task = 'Photos';
    else if (cat.includes('reel') || cat.includes('social')) task = 'Reels';
    else if (cat.includes('short')) task = 'Shorts';
    else if (cat.includes('edit') || cat.includes('video') || cat.includes('color') || cat.includes('youtube')) task = 'Videos';
    else task = 'Others';
  }
  const status = w.status === 'Completed' || w.status === 'In Progress' || w.status === 'Pending' ? w.status : 'Completed';
  const workDone = w.workDone === 'Yes' || w.workDone === 'No' ? w.workDone : (status === 'Completed' ? 'Yes' : 'No');
  const requestedDate = w.requestedDate || w.date || new Date().toISOString().split('T')[0];
  const requestedBy = (w.requestedBy || w.clientProject || 'Vinay').trim();
  const quantity = typeof w.quantity === 'number' && w.quantity > 0 ? w.quantity : 1;
  const thumbnail = typeof w.thumbnail === 'string' ? w.thumbnail.trim() : '';

  return {
    ...w,
    task,
    status,
    workDone,
    requestedDate,
    date: requestedDate,
    requestedBy,
    quantity,
    thumbnail,
    title: w.title || 'Untitled Task',
  };
}

// Persistent Google Sheets Users State & In-Memory Cache
// Google Sheets (Employees tab) is the single authoritative source of truth for all users/employees.
let persistentEmployeesCache: UserRecord[] = [];
let lastEmployeesSyncTimestamp = 0;
const EMPLOYEES_CACHE_TTL_MS = 15000;
let employeesLoadPromise: Promise<UserRecord[]> | null = null;

let memoryWorkLogs: WorkLogRecord[] = [];
let memoryNotes: NoteRecord[] = [];
let memoryPresets: PresetRecord[] = [];

// ============================================================================
// MACOS EMPLOYEE COMPUTER ACTIVITY STORES
// ============================================================================
export interface ComputerDeviceRecord {
  id: string; // e.g. FW-MAC-M4PRO01
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  deviceModel: string; // e.g. Mac mini (Apple M4)
  macOSVersion?: string;
  status: 'Active' | 'Revoked' | 'Inactive';
  registeredAt: string;
  lastSeenAt: string;
  deviceSecretHash: string;
  isRegisteredAgent: boolean;
}

export interface ComputerIntervalRecord {
  id: string;
  deviceId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO String
  endTime: string; // ISO String
  durationSeconds: number;
  state: 'ACTIVE';
  createdAt: string;
  isClosed?: boolean;
}

export interface ComputerSummaryRecord {
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  deviceId: string;
  deviceModel?: string;
  totalActiveSeconds: number;
  intervalsCount: number;
  lastState: 'ACTIVE' | 'INACTIVE' | 'SLEEPING' | 'LOCKED' | 'OFFLINE';
  lastHeartbeatAt: string;
  lastInputType?: 'keyboard' | 'mouse' | 'none';
}

let memoryComputerDevices: ComputerDeviceRecord[] = [];
let memoryComputerIntervals: ComputerIntervalRecord[] = [];
let memoryComputerSummaries: ComputerSummaryRecord[] = [];

// ============================================================================
// SHARED COMPUTER ACTIVITY THRESHOLDS & CONSTANTS
// ============================================================================
export const INACTIVITY_THRESHOLD_SECONDS = 300; // Exactly 300 seconds = 5 minutes
export const HEARTBEAT_INTERVAL_SECONDS = 30;    // Exactly 30 seconds
export const OFFLINE_GRACE_PERIOD_SECONDS = 90;  // 90 seconds (3x heartbeat)

// Hash helper for secure device secrets
function hashDeviceSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret.trim()).digest('hex');
}

// Load non-user operational presets/cache from local bundle if available on startup
function loadFromLocalDb() {
  try {
    let targetPath = DB_FILE_PATH;
    if (!fs.existsSync(targetPath)) {
      const bundledPath = path.join(process.cwd(), 'data', 'flying_whales_db.json');
      if (fs.existsSync(bundledPath)) {
        targetPath = bundledPath;
      }
    }
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const data = JSON.parse(raw);
      // Note: User & employee authentication is strictly loaded from Google Sheets (Employees tab).
      // Local filesystem is never used as an authentication store.
      if (Array.isArray(data.workLogs)) {
        memoryWorkLogs = data.workLogs
          .filter((w: any) => w && !isFakeDemoLog(w))
          .map((w: any) => normalizeWorkLog(w));
      }
      if (Array.isArray(data.notes)) {
        memoryNotes = data.notes.filter((n: any) => n && !isFakeDemoNote(n));
      }
      if (Array.isArray(data.presets)) {
        memoryPresets = data.presets.filter((p: any) => p && !isFakeDemoPreset(p));
      }
      if (Array.isArray(data.attendance)) {
        memoryAttendance = data.attendance
          .filter((a: any) => a && !isFakeDemoAttendance(a))
          .map((a: any) => {
            const rec = { ...a };
            if (rec.logoutTime && rec.logoutTime.trim() !== '' && isZeroOrMissingDuration(rec.duration)) {
              const calculated = calculateAttendanceDuration(rec.date, rec.loginTime, rec.logoutTime);
              if (calculated && !isZeroOrMissingDuration(calculated)) {
                rec.duration = calculated;
                rec.status = 'Completed';
              }
            }
            return rec;
          });
      }
      if (Array.isArray(data.computerDevices)) {
        memoryComputerDevices = data.computerDevices.map((d: any) => ({ ...d }));
      }
      if (Array.isArray(data.computerIntervals)) {
        memoryComputerIntervals = data.computerIntervals.map((i: any) => ({ ...i }));
      }
      if (Array.isArray(data.computerSummaries)) {
        memoryComputerSummaries = data.computerSummaries.map((s: any) => ({ ...s }));
      }
      // Reconcile and calculate Active Hours for all attendance records from real Mac intervals
      const nowRef = new Date();
      for (const rec of memoryAttendance) {
        const activeSec = calculateAttendanceActiveSeconds(rec, nowRef);
        rec.activeSeconds = activeSec;
        if (activeSec > 0) {
          rec.activeHours = formatActiveDuration(activeSec);
        } else if (!rec.activeHours || isZeroOrMissingDuration(rec.activeHours)) {
          rec.activeHours = '00h 00m';
        }
      }
      if (data.googleConfig) {
        googleConfig = { ...googleConfig, ...data.googleConfig };
      }
      console.log(`[STUDIO] Loaded ${memoryWorkLogs.length} work logs, ${memoryNotes.length} notes, ${memoryPresets.length} presets, ${memoryComputerDevices.length} Mac devices from local cache.`);
    }
  } catch (err) {
    console.error('[STUDIO] Error reading local database file:', err);
  }
}

// Persist operational logs locally as fallback; production state persists directly to Google Sheets
function saveToLocalDb() {
  lastSheetsLoadTimestamp = Date.now();
  try {
    memoryWorkLogs = memoryWorkLogs.filter((w) => w && !isFakeDemoLog(w));
    memoryNotes = memoryNotes.filter((n) => n && !isFakeDemoNote(n));
    memoryPresets = memoryPresets.filter((p) => p && !isFakeDemoPreset(p));
    memoryAttendance = memoryAttendance
      .filter((a) => a && !isFakeDemoAttendance(a))
      .map((a) => {
        if (a.logoutTime && a.logoutTime.trim() !== '' && isZeroOrMissingDuration(a.duration)) {
          const calculated = calculateAttendanceDuration(a.date, a.loginTime, a.logoutTime);
          if (calculated && !isZeroOrMissingDuration(calculated)) {
            return { ...a, duration: calculated, status: 'Completed' };
          }
        }
        return a;
      });

    const payload = {
      workLogs: memoryWorkLogs,
      notes: memoryNotes,
      presets: memoryPresets,
      attendance: memoryAttendance,
      computerDevices: memoryComputerDevices,
      computerIntervals: memoryComputerIntervals,
      computerSummaries: memoryComputerSummaries,
      googleConfig,
      lastUpdated: new Date().toISOString(),
    };
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[STUDIO] Error writing to local database file:', err);
  }
}

loadFromLocalDb();

// ============================================================================
// GOOGLE SHEETS API INTEGRATION SERVICE
// ============================================================================
let cachedSheetsClient: any = null;
let cachedAuthKey: string | null = null;

async function getGoogleSheetsClient() {
  try {
    // 1. Primary: Server-side GOOGLE_SERVICE_ACCOUNT (single variable containing Service Account JSON or credentials)
    const sa = parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT);
    if (sa && sa.client_email && sa.private_key) {
      const authKey = `${sa.client_email}:${sa.private_key.slice(0, 32)}`;
      if (cachedSheetsClient && cachedAuthKey === authKey) {
        return cachedSheetsClient;
      }
      const auth = new google.auth.JWT({
        email: sa.client_email,
        key: sa.private_key.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });
      cachedSheetsClient = google.sheets({ version: 'v4', auth });
      cachedAuthKey = authKey;
      return cachedSheetsClient;
    }

    // 2. Legacy fallback: separate email and private key variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      const authKey = `${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}:${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.slice(0, 32)}`;
      if (cachedSheetsClient && cachedAuthKey === authKey) {
        return cachedSheetsClient;
      }
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });
      cachedSheetsClient = google.sheets({ version: 'v4', auth });
      cachedAuthKey = authKey;
      return cachedSheetsClient;
    }

    return null;
  } catch (err) {
    console.warn('[GOOGLE SHEETS] Google API client initialization notice:', err);
    return null;
  }
}

// Ensure all required spreadsheet tabs exist
async function ensureGoogleSheetTabsExist(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets || []).map((s: any) => s.properties?.title);
    const required = ['Employees', 'WorkLogs', 'Presets', 'Notes', 'Attendance', 'Devices', 'ComputerSummaries', 'ComputerIntervals'];
    const missing = required.filter((r) => !existingTitles.includes(r));
    if (missing.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missing.map((title) => ({
            addSheet: { properties: { title } },
          })),
        },
      });
      console.log(`[GOOGLE SHEETS] Created missing sheets: ${missing.join(', ')}`);
    }
  } catch (err: any) {
    console.warn('[GOOGLE SHEETS] Sheet tabs check notice:', err.message);
  }
}

// Convert 1-based column number to spreadsheet column letters (1 -> A, 21 -> U, 27 -> AA)
function getColumnLetter(colIndex: number): string {
  let letter = '';
  while (colIndex > 0) {
    const rem = (colIndex - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return letter;
}

// Headers definitions
const EMPLOYEE_HEADERS = [
  'ID',
  'Name',
  'Email',
  'Role',
  'Status',
  'GoogleUserId',
  'ProfileImage',
  'PasswordHash',
  'CreatedAt',
  'LastLoginAt',
];

const WORK_LOG_HEADERS = [
  'ID',
  'EmployeeId',
  'EmployeeEmail',
  'EmployeeName',
  'Task',
  'Title',
  'Status',
  'RequestedBy',
  'RequestedDate',
  'Quantity',
  'WorkDone',
  'Thumbnail',
  'Date',
  'Description',
  'Category',
  'Priority',
  'TimeSpent',
  'ClientProject',
  'Notes',
  'CreatedAt',
  'UpdatedAt',
];

const PRESET_HEADERS = [
  'ID',
  'EmployeeId',
  'EmployeeEmail',
  'PresetName',
  'Task',
  'Title',
  'RequestedBy',
  'Quantity',
  'WorkDone',
  'CreatedAt',
  'UpdatedAt',
];

const NOTE_HEADERS = [
  'ID',
  'EmployeeId',
  'EmployeeEmail',
  'Title',
  'Content',
  'Category',
  'DueDate',
  'Status',
  'CreatedAt',
  'UpdatedAt',
];

const ATTENDANCE_HEADERS = [
  'Attendance ID',
  'Employee ID',
  'Employee Name',
  'Employee Email',
  'Date',
  'Login Time',
  'Logout Time',
  'Duration',
  'Status',
  'Active Hours',
];

const DEVICE_HEADERS = [
  'ID',
  'EmployeeId',
  'EmployeeName',
  'EmployeeEmail',
  'DeviceModel',
  'MacOSVersion',
  'Status',
  'RegisteredAt',
  'LastSeenAt',
  'DeviceSecretHash',
  'IsRegisteredAgent',
];

const COMPUTER_SUMMARY_HEADERS = [
  'Date',
  'EmployeeId',
  'EmployeeName',
  'EmployeeEmail',
  'DeviceId',
  'DeviceModel',
  'TotalActiveSeconds',
  'IntervalsCount',
  'LastState',
  'LastHeartbeatAt',
  'LastInputType',
];

const COMPUTER_INTERVAL_HEADERS = [
  'Id',
  'DeviceId',
  'EmployeeId',
  'EmployeeName',
  'Date',
  'StartTime',
  'EndTime',
  'DurationSeconds',
  'State',
  'CreatedAt',
];

function formatEmployeeRow(u: UserRecord): string[] {
  return [
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    u.googleUserId || '',
    u.profileImage || '',
    u.passwordHash || '',
    u.createdAt,
    u.lastLoginAt || '',
  ];
}

function formatWorkLogRow(w: WorkLogRecord): string[] {
  return [
    w.id,
    w.employeeId,
    w.employeeEmail,
    w.employeeName,
    w.task || 'Videos',
    w.title,
    w.status || 'Completed',
    w.requestedBy || '',
    w.requestedDate || w.date || '',
    String(w.quantity || 1),
    w.workDone || 'Yes',
    w.thumbnail || '',
    w.date || w.requestedDate || '',
    w.description || '',
    w.category || w.task || 'Videos',
    w.priority || 'Medium',
    w.timeSpent || '1h 00m',
    w.clientProject || '',
    w.notes || '',
    w.createdAt || '',
    w.updatedAt || '',
  ];
}

function formatPresetRow(p: PresetRecord): string[] {
  return [
    p.id,
    p.employeeId,
    p.employeeEmail,
    p.presetName,
    p.task || 'Videos',
    p.title,
    p.requestedBy || '',
    String(p.quantity || 1),
    p.workDone || 'Yes',
    p.createdAt || '',
    p.updatedAt || '',
  ];
}

function formatNoteRow(n: NoteRecord): string[] {
  return [
    n.id,
    n.employeeId,
    n.employeeEmail,
    n.title,
    n.content,
    n.category || '',
    n.dueDate || '',
    n.status || 'Upcoming',
    n.createdAt || '',
    n.updatedAt || '',
  ];
}

function formatAttendanceRow(a: AttendanceRecord): string[] {
  return [
    a.id,
    a.employeeId,
    a.employeeName,
    a.employeeEmail,
    a.date,
    a.loginTime,
    a.logoutTime || '',
    a.duration || '',
    a.status,
    a.activeHours || '00h 00m',
  ];
}

function formatDeviceRow(d: ComputerDeviceRecord): string[] {
  return [
    d.id,
    d.employeeId,
    d.employeeName,
    d.employeeEmail,
    d.deviceModel || 'Mac mini (Apple Silicon)',
    d.macOSVersion || 'macOS 15.0',
    d.status,
    d.registeredAt,
    d.lastSeenAt || '',
    d.deviceSecretHash || '',
    d.isRegisteredAgent ? 'TRUE' : 'FALSE',
  ];
}

function formatComputerSummaryRow(s: ComputerSummaryRecord): string[] {
  return [
    s.date,
    s.employeeId,
    s.employeeName,
    s.employeeEmail || '',
    s.deviceId,
    s.deviceModel || '',
    String(s.totalActiveSeconds),
    String(s.intervalsCount),
    s.lastState,
    s.lastHeartbeatAt,
    s.lastInputType || 'mouse',
  ];
}

function formatComputerIntervalRow(i: ComputerIntervalRecord): string[] {
  return [
    i.id,
    i.deviceId,
    i.employeeId,
    i.employeeName,
    i.date,
    i.startTime,
    i.endTime,
    String(i.durationSeconds),
    i.state,
    i.createdAt,
  ];
}

// Ensure header row exists on a Google Sheet tab
async function ensureTabHeaders(sheets: any, spreadsheetId: string, tabName: string, headers: string[]) {
  try {
    const endCol = getColumnLetter(headers.length);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A1:${endCol}1`,
    });
    const currentValues = res.data.values || [];
    if (currentValues.length === 0 || !currentValues[0] || currentValues[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1:${endCol}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
      console.log(`[GOOGLE SHEETS] Initialized header row for tab "${tabName}".`);
    }
  } catch (err: any) {
    console.warn(`[GOOGLE SHEETS] Header initialization notice for "${tabName}":`, err.message);
  }
}

let tabsAndHeadersVerified = false;

// Append new row to a Google Sheet tab
async function appendGoogleSheetRow(
  tabName: string,
  headers: string[],
  rowValues: any[]
): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = cleanSpreadsheetId(googleConfig.spreadsheetId);
  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets API client is not configured or Spreadsheet ID is missing');
  }

  if (!tabsAndHeadersVerified) {
    await ensureGoogleSheetTabsExist(sheets, spreadsheetId);
    await ensureTabHeaders(sheets, spreadsheetId, tabName, headers);
    tabsAndHeadersVerified = true;
  }

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] },
  });

  if (res.status && res.status >= 400) {
    throw new Error(`Google Sheets append failed with HTTP status ${res.status}`);
  }

  googleConfig.lastSync = new Date().toISOString();
  googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
  console.log(`[GOOGLE SHEETS] Appended new row to tab "${tabName}" (ID: ${rowValues[0]})`);
  return true;
}

// Update existing row in place in Google Sheets
async function updateGoogleSheetRowById(
  tabName: string,
  headers: string[],
  recordId: string,
  rowValues: any[]
): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = cleanSpreadsheetId(googleConfig.spreadsheetId);
  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets API client is not configured or Spreadsheet ID is missing');
  }

  if (!tabsAndHeadersVerified) {
    await ensureGoogleSheetTabsExist(sheets, spreadsheetId);
    await ensureTabHeaders(sheets, spreadsheetId, tabName, headers);
    tabsAndHeadersVerified = true;
  }

  // Locate the row in Column A (or Columns A:E for compound matching like ComputerSummaries)
  const rangeToFetch = tabName === 'ComputerSummaries' ? `${tabName}!A:E` : `${tabName}!A:A`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeToFetch,
  });

  const rows = res.data.values || [];
  const cleanId = String(recordId).trim().toLowerCase();
  const rowIndex = rows.findIndex((row: any[], idx: number) => {
    if (idx === 0) return false;
    const colA = String(row[0] || '').trim().toLowerCase();
    if (colA === cleanId) return true;
    if (tabName === 'ComputerSummaries') {
      const colB = String(row[1] || '').trim().toLowerCase(); // employeeId
      const colE = String(row[4] || '').trim().toLowerCase(); // deviceId
      if (colA && colB && `${colA}_${colB}` === cleanId) return true;
      if (colA && colE && `${colA}_${colE}` === cleanId) return true;
    }
    return false;
  });

  if (rowIndex > 0) {
    const rowNum = rowIndex + 1;
    const endCol = getColumnLetter(rowValues.length);
    const updateRes = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A${rowNum}:${endCol}${rowNum}`,
      valueInputOption: 'RAW',
      requestBody: { values: [rowValues] },
    });
    if (updateRes.status && updateRes.status >= 400) {
      throw new Error(`Google Sheets update failed with HTTP status ${updateRes.status}`);
    }
    console.log(`[GOOGLE SHEETS] Updated row ${rowNum} in "${tabName}" (ID: ${recordId}) in place.`);
  } else {
    // If not found in Google Sheets, append it
    console.log(`[GOOGLE SHEETS] Row with ID "${recordId}" not found in "${tabName}"; appending new row.`);
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    });
    if (appendRes.status && appendRes.status >= 400) {
      throw new Error(`Google Sheets append fallback failed with HTTP status ${appendRes.status}`);
    }
  }

  googleConfig.lastSync = new Date().toISOString();
  googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
  return true;
}

// Delete exact row from Google Sheet using deleteDimension
async function deleteGoogleSheetRowById(
  tabName: string,
  recordId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const cleanId = String(recordId || '').trim();
  if (!cleanId) {
    throw new Error('Record ID is required for deletion.');
  }

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = cleanSpreadsheetId(googleConfig.spreadsheetId);
  if (!sheets || !spreadsheetId) {
    throw new Error('Google Sheets API client is not configured or Spreadsheet ID is missing');
  }

  // 1. Get numeric sheetId and exact tab title
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (meta.data.sheets || []).find(
    (s: any) => (s.properties?.title || '').toLowerCase() === tabName.toLowerCase()
  );

  if (!sheet || sheet.properties?.sheetId === undefined) {
    console.warn(`[GOOGLE SHEETS] Sheet tab "${tabName}" not found in Google Spreadsheet; cannot delete.`);
    return { success: true, deletedCount: 0 };
  }

  const numericSheetId = sheet.properties.sheetId;
  const exactTabTitle = sheet.properties.title;

  // 2. Fetch Column A to locate exact row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${exactTabTitle}'!A:A`,
  });

  const colA = res.data.values || [];
  const matchingIndices: number[] = [];

  colA.forEach((row: any[], idx: number) => {
    // Row index 0 is header; never delete header
    if (idx > 0 && String(row[0] || '').trim().toLowerCase() === cleanId.toLowerCase()) {
      matchingIndices.push(idx);
    }
  });

  if (matchingIndices.length === 0) {
    console.log(`[GOOGLE SHEETS] Record with ID "${cleanId}" was not found in Google Sheet tab "${exactTabTitle}" (already deleted or absent).`);
    return { success: true, deletedCount: 0 };
  }

  // Sort descending so deleting higher indices does not shift lower indices
  matchingIndices.sort((a, b) => b - a);

  // Execute deleteDimension for all matching rows
  const deleteRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: matchingIndices.map((idx) => ({
        deleteDimension: {
          range: {
            sheetId: numericSheetId,
            dimension: 'ROWS',
            startIndex: idx,
            endIndex: idx + 1,
          },
        },
      })),
    },
  });

  if (deleteRes.status && deleteRes.status >= 400) {
    throw new Error(`Google Sheets batchUpdate delete failed with HTTP status ${deleteRes.status}`);
  }

  googleConfig.lastSync = new Date().toISOString();
  googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
  console.log(`[GOOGLE SHEETS] Successfully deleted ${matchingIndices.length} row(s) for ID "${cleanId}" from tab "${exactTabTitle}".`);
  return { success: true, deletedCount: matchingIndices.length };
}

// Reload WorkLogs directly from Google Sheets to verify and synchronize state
async function reloadWorkLogsFromGoogleSheets(): Promise<WorkLogRecord[]> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets || !googleConfig.spreadsheetId) return memoryWorkLogs;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: googleConfig.spreadsheetId,
    range: 'WorkLogs!A2:U',
  });

  const rows = res.data.values || [];
  return rows
    .map((row) => normalizeWorkLog({
      id: String(row[0] || '').trim(),
      employeeId: String(row[1] || '').trim(),
      employeeEmail: String(row[2] || '').trim().toLowerCase(),
      employeeName: String(row[3] || '').trim(),
      task: String(row[4] || 'Videos').trim(),
      title: String(row[5] || '').trim(),
      status: String(row[6] || 'Completed').trim(),
      requestedBy: String(row[7] || '').trim(),
      requestedDate: String(row[8] || '').trim() || new Date().toISOString().split('T')[0],
      quantity: Number(row[9]) > 0 ? Number(row[9]) : 1,
      workDone: String(row[10] || '').trim() === 'No' ? 'No' : 'Yes',
      thumbnail: String(row[11] || '').trim(),
      date: String(row[12] || row[8] || '').trim(),
      description: String(row[13] || '').trim(),
      category: String(row[14] || row[4] || 'Videos').trim(),
      priority: String(row[15] || 'Medium').trim(),
      timeSpent: String(row[16] || '1h 00m').trim(),
      clientProject: String(row[17] || row[7] || 'Studio Work').trim(),
      notes: String(row[18] || '').trim(),
      createdAt: String(row[19] || '').trim() || new Date().toISOString(),
      updatedAt: String(row[20] || '').trim() || new Date().toISOString(),
    }))
    .filter((l) => l.title && !isFakeDemoLog(l));
}

// Authoritatively updates an existing employee in Google Sheets without wiping tabs or creating duplicates
async function updateEmployeeInGoogleSheets(employee: UserRecord): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = googleConfig.spreadsheetId;

  if (!sheets || !spreadsheetId) {
    console.warn('[GOOGLE SHEETS] Service client not configured; updated employee in-memory & local store only.');
    return;
  }

  await ensureGoogleSheetTabsExist(sheets, spreadsheetId);
  await ensureTabHeaders(sheets, spreadsheetId, 'Employees', EMPLOYEE_HEADERS);

  // Read Columns A to J from Employees tab to locate existing row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Employees!A:J',
  });

  const rows = res.data.values || [];
  let targetRowIndex = -1; // 0-based array index
  const cleanTargetEmail = (employee.email || '').trim().toLowerCase();

  // Row 0 is the header; check all rows from index 1 downwards solely by employee email
  for (let i = 1; i < rows.length; i++) {
    const rowEmail = String(rows[i]?.[2] || '').trim().toLowerCase();
    if (cleanTargetEmail && rowEmail === cleanTargetEmail) {
      targetRowIndex = i;
      break;
    }
  }

  const formattedRow = formatEmployeeRow(employee);

  if (targetRowIndex > 0) {
    const rowNumber = targetRowIndex + 1; // Google Sheets is 1-indexed
    console.log(`[GOOGLE SHEETS] Updating existing employee row at Employees!A${rowNumber}:J${rowNumber} for "${employee.email}" with name "${employee.name}"`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Employees!A${rowNumber}:J${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [formattedRow],
      },
    });
  } else {
    // If not found in sheet, append so record exists
    console.log(`[GOOGLE SHEETS] Employee record "${employee.email}" not found in Employees tab; appending single row.`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Employees!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [formattedRow],
      },
    });
  }

  // Also update employeeName in Google Sheets WorkLogs tab (Column D) for any existing tasks
  try {
    const wlRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'WorkLogs!A:D',
    });
    const wlRows = wlRes.data.values || [];
    const updateBatches: { range: string; values: string[][] }[] = [];
    for (let i = 1; i < wlRows.length; i++) {
      const logEmpId = String(wlRows[i]?.[1] || '').trim();
      const logEmpEmail = String(wlRows[i]?.[2] || '').trim().toLowerCase();
      if (
        (employee.id && logEmpId.toLowerCase() === employee.id.toLowerCase()) ||
        (employee.email && logEmpEmail === employee.email.toLowerCase())
      ) {
        const rowNumber = i + 1;
        updateBatches.push({
          range: `WorkLogs!D${rowNumber}`,
          values: [[employee.name]],
        });
      }
    }
    if (updateBatches.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updateBatches,
        },
      });
      console.log(`[GOOGLE SHEETS] Synchronized updated employee name "${employee.name}" across ${updateBatches.length} work log row(s).`);
    }
  } catch (wlErr: any) {
    console.warn('[GOOGLE SHEETS] Notice: Work log name update non-fatal error:', wlErr?.message);
  }

  googleConfig.lastSync = new Date().toISOString();
  googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
}

// Sync in-memory records with the central Google Sheet
async function syncWithCentralGoogleSheet(): Promise<boolean> {
  saveToLocalDb();
  googleConfig.lastSync = new Date().toISOString();

  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = cleanSpreadsheetId(googleConfig.spreadsheetId);
    if (!sheets || !spreadsheetId) {
      googleConfig.lastSyncStatus = 'Connected (Local Persistence Engine Active)';
      return true;
    }

    // Google Sheets is the single source of truth: load fresh data from sheets
    const loaded = await loadDataFromGoogleSheets();
    if (loaded) {
      googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
      console.log(`[GOOGLE SHEETS] Successfully synchronized from Google Sheet (${persistentEmployeesCache.length} users, ${memoryWorkLogs.length} logs, ${memoryPresets.length} presets, ${memoryNotes.length} notes, ${memoryAttendance.length} attendance).`);
      return true;
    }
    return true;
  } catch (err: any) {
    console.warn('[GOOGLE SHEETS] API sync notice:', err.message);
    return false;
  }
}

// Load persisted data directly from central Google Sheets on boot/initialization
async function loadDataFromGoogleSheets(): Promise<boolean> {
  try {
    const sheets = await getGoogleSheetsClient();
    if (!sheets || !googleConfig.spreadsheetId) {
      return false;
    }

    const spreadsheetId = googleConfig.spreadsheetId;
    if (!tabsAndHeadersVerified) {
      await ensureGoogleSheetTabsExist(sheets, spreadsheetId);
      tabsAndHeadersVerified = true;
    }

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [
        'Employees!A2:J',
        'WorkLogs!A2:U',
        'Presets!A2:K',
        'Notes!A2:J',
        'Attendance!A2:K',
        'Devices!A2:K',
        'ComputerSummaries!A2:K',
        'ComputerIntervals!A2:J',
      ],
    });

    const valueRanges = res.data.valueRanges || [];
    const empRows = valueRanges[0]?.values || [];
    const wlRows = valueRanges[1]?.values || [];
    const presetRows = valueRanges[2]?.values || [];
    const noteRows = valueRanges[3]?.values || [];
    const attRows = valueRanges[4]?.values || [];
    const deviceRows = valueRanges[5]?.values || [];
    const summaryRows = valueRanges[6]?.values || [];
    const intervalRows = valueRanges[7]?.values || [];

    let hasLoadedAny = false;

    // Parse Employees
    if (empRows.length > 0) {
      const parsedUsers: UserRecord[] = empRows
        .map((row) => {
          const email = String(row[2] || '').trim().toLowerCase();
          const name = String(row[1] || '').trim() || email.split('@')[0];
          const lastLoginAt = String(row[9] || '').trim() || undefined;
          const googleUserId = String(row[5] || '').trim() || undefined;
          const hasLoggedIn = Boolean(
            lastLoginAt ||
            (googleUserId && !googleUserId.startsWith('pending_'))
          );
          const rawPassword = String(row[7] || '').trim();
          const passwordHash = rawPassword.startsWith('$2')
            ? rawPassword
            : hashPassword(rawPassword || 'password123');

          return {
            id: String(row[0] || '').trim(),
            name,
            email,
            role: resolveRole(email, String(row[3] || '')),
            status: (String(row[4] || 'Active') === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
            googleUserId,
            profileImage: String(row[6] || '').trim() || undefined,
            passwordHash,
            createdAt: String(row[8] || '').trim() || new Date().toISOString(),
            lastLoginAt,
            hasLoggedIn,
          };
        })
        .filter((u) => u.email && !isFakeDemoUser(u));

      if (parsedUsers.length > 0) {
        // Build map keyed by email with Google Sheets as the single source of truth
        const userMap = new Map<string, UserRecord>();
        for (const p of parsedUsers) {
          if (p && p.email && !isFakeDemoUser(p)) {
            const cleanName = (p.name || '').trim().toLowerCase();
            const cleanEmail = (p.email || '').trim().toLowerCase();
            if (cleanName === 'admin' && cleanEmail !== 'junty@flyingwhales') continue;
            userMap.set(p.email.toLowerCase(), p);
          }
        }

        // Preserve any employee created in persistentEmployeesCache within the last 60s that might still be syncing
        for (const u of persistentEmployeesCache) {
          if (u && u.email && !isFakeDemoUser(u) && !userMap.has(u.email.toLowerCase())) {
            const createdMs = new Date(u.createdAt || 0).getTime();
            if (Date.now() - createdMs < 60000) {
              userMap.set(u.email.toLowerCase(), u);
            }
          }
        }

        const mergedUsers = Array.from(userMap.values());
        // Ensure Junty has exact ADMIN credentials and bcrypt hash
        const juntyUser = mergedUsers.find(
          (u) => u.email?.toLowerCase() === 'junty@flyingwhales' || u.name?.toLowerCase() === 'junty'
        );
        if (juntyUser) {
          juntyUser.id = 'admin-junty';
          juntyUser.name = 'Junty';
          juntyUser.email = 'junty@flyingwhales';
          juntyUser.role = 'ADMIN';
          if (!juntyUser.passwordHash || !juntyUser.passwordHash.startsWith('$2')) {
            juntyUser.passwordHash = INITIAL_ADMIN_HASH;
          }
        } else {
          mergedUsers.unshift({ ...INITIAL_ADMIN });
        }

        persistentEmployeesCache = mergedUsers;
        lastEmployeesSyncTimestamp = Date.now();
        hasLoadedAny = true;
      }
    }

    // Parse WorkLogs
    if (wlRows.length > 0) {
      const parsedLogs: WorkLogRecord[] = wlRows
        .map((row) => normalizeWorkLog({
          id: String(row[0] || '').trim() || `LOG${Date.now()}`,
          employeeId: String(row[1] || '').trim(),
          employeeEmail: String(row[2] || '').trim().toLowerCase(),
          employeeName: String(row[3] || '').trim(),
          task: String(row[4] || 'Videos').trim(),
          title: String(row[5] || '').trim(),
          status: String(row[6] || 'Completed').trim(),
          requestedBy: String(row[7] || '').trim(),
          requestedDate: String(row[8] || '').trim() || new Date().toISOString().split('T')[0],
          quantity: Number(row[9]) > 0 ? Number(row[9]) : 1,
          workDone: String(row[10] || '').trim() === 'No' ? 'No' : 'Yes',
          thumbnail: String(row[11] || '').trim(),
          date: String(row[12] || row[8] || '').trim(),
          description: String(row[13] || '').trim(),
          category: String(row[14] || row[4] || 'Videos').trim(),
          priority: String(row[15] || 'Medium').trim(),
          timeSpent: String(row[16] || '1h 00m').trim(),
          clientProject: String(row[17] || row[7] || 'Studio Work').trim(),
          notes: String(row[18] || '').trim(),
          createdAt: String(row[19] || '').trim() || new Date().toISOString(),
          updatedAt: String(row[20] || '').trim() || new Date().toISOString(),
        }))
        .filter((l) => (l.title || l.task || l.description) && !isFakeDemoLog(l));

      memoryWorkLogs = parsedLogs;
      hasLoadedAny = true;
    } else {
      memoryWorkLogs = [];
    }

    // Parse Presets
    if (presetRows.length > 0) {
      const parsedPresets: PresetRecord[] = presetRows
        .map((row) => ({
          id: String(row[0] || '').trim() || `PRESET${Date.now()}`,
          employeeId: String(row[1] || '').trim(),
          employeeEmail: String(row[2] || '').trim().toLowerCase(),
          presetName: String(row[3] || '').trim(),
          task: (['Videos', 'Shorts', 'Reels', 'Photos', 'Shootings', 'Others'].includes(String(row[4] || ''))
            ? row[4]
            : 'Videos') as any,
          title: String(row[5] || '').trim(),
          requestedBy: String(row[6] || '').trim(),
          quantity: Number(row[7]) > 0 ? Number(row[7]) : 1,
          workDone: (String(row[8] || '').trim() === 'No' ? 'No' : 'Yes') as 'Yes' | 'No',
          createdAt: String(row[9] || '').trim() || new Date().toISOString(),
          updatedAt: String(row[10] || '').trim() || new Date().toISOString(),
        }))
        .filter((p) => (p.presetName || p.title) && !isFakeDemoPreset(p));

      memoryPresets = parsedPresets;
      hasLoadedAny = true;
    } else {
      memoryPresets = [];
    }

    // Parse Notes
    if (noteRows.length > 0) {
      const parsedNotes: NoteRecord[] = noteRows
        .map((row) => ({
          id: String(row[0] || '').trim() || `NOTE${Date.now()}`,
          employeeId: String(row[1] || '').trim(),
          employeeEmail: String(row[2] || '').trim().toLowerCase(),
          title: String(row[3] || '').trim(),
          content: String(row[4] || '').trim(),
          category: String(row[5] || 'Upcoming work').trim(),
          dueDate: String(row[6] || '').trim(),
          status: (['Upcoming', 'In Progress', 'Completed'].includes(String(row[7] || ''))
            ? row[7]
            : 'Upcoming') as any,
          createdAt: String(row[8] || '').trim() || new Date().toISOString(),
          updatedAt: String(row[9] || '').trim() || new Date().toISOString(),
        }))
        .filter((n) => (n.title || n.content) && !isFakeDemoNote(n));

      memoryNotes = parsedNotes;
      hasLoadedAny = true;
    } else {
      memoryNotes = [];
    }

    // Parse Attendance
    if (attRows.length > 0) {
      const parsedAttendance: AttendanceRecord[] = [];
      const recordsToHealInSheets: AttendanceRecord[] = [];

      for (const row of attRows) {
        if (!row || row.length === 0) continue;
        const col0 = String(row[0] || '').trim();
        // Skip header row if returned
        if (!col0 || col0.toLowerCase() === 'attendance id' || col0.toLowerCase() === 'id') continue;

        const id = col0;
        const employeeId = String(row[1] || '').trim();

        // Check if row[2] is email or name
        const col2 = String(row[2] || '').trim();
        const col3 = String(row[3] || '').trim();
        const isCol2Email = col2.includes('@');
        const employeeName = isCol2Email ? col3 : col2;
        const employeeEmail = (isCol2Email ? col2 : col3).toLowerCase();

        const date = String(row[4] || '').trim();
        const loginTime = String(row[5] || '').trim();
        const logoutTime = String(row[6] || '').trim();
        let duration = String(row[7] || '').trim();
        const statusRaw = String(row[8] || '').trim();
        const status = (statusRaw === 'Completed' || statusRaw === 'Present' || statusRaw === 'Logged In' || statusRaw === 'Active'
          ? statusRaw
          : (logoutTime ? 'Completed' : 'Logged In')) as AttendanceRecord['status'];

        if (!employeeEmail) continue;

        // Reconstruct duration for completed records if zero or missing; preserve valid existing durations (e.g. Junty's 4h 49m)
        let wasHealed = false;
        if (logoutTime && logoutTime.trim() !== '') {
          if (isZeroOrMissingDuration(duration)) {
            const calculated = calculateAttendanceDuration(date, loginTime, logoutTime);
            if (calculated && !isZeroOrMissingDuration(calculated)) {
              duration = calculated;
              wasHealed = true;
            }
          }
        } else {
          // Open active session: keep in progress, do not write fake logout or mark completed
          duration = duration || 'In Progress';
        }

        // Handle column 9: could be Active Hours or legacy createdAt
        let activeHours = '';
        let createdAt = '';
        const col9 = String(row[9] || '').trim();
        const col10 = String(row[10] || '').trim();

        if (col9 && !col9.includes('T') && !col9.includes('-') && (col9.includes('h') || col9.includes('m') || col9 === '0')) {
          activeHours = col9;
          createdAt = col10;
        } else {
          createdAt = col9;
        }

        // Accurately establish createdAt from loginTime and date, or ID epoch if missing
        if (!createdAt) {
          const parsedLoginDate = parseKolkataDateTime(date, loginTime);
          if (parsedLoginDate) {
            createdAt = parsedLoginDate.toISOString();
          } else if (id.startsWith('ATT_')) {
            const epochPart = id.split('_')[1];
            const epochNum = Number(epochPart);
            if (!isNaN(epochNum) && epochNum > 1500000000000) {
              createdAt = new Date(epochNum).toISOString();
            }
          }
          if (!createdAt) createdAt = new Date().toISOString();
        }

        const record: AttendanceRecord = {
          id,
          employeeId: employeeId || 'EMP001',
          employeeName: employeeName || employeeEmail.split('@')[0],
          employeeEmail,
          date,
          loginTime,
          logoutTime: logoutTime || '',
          duration,
          activeHours: activeHours || '00h 00m',
          activeSeconds: 0,
          status,
          createdAt,
          updatedAt: String(row[11] || row[10] || '').trim() || new Date().toISOString(),
        };

        if (wasHealed) {
          recordsToHealInSheets.push(record);
        }

        if (!isFakeDemoAttendance(record)) {
          parsedAttendance.push(record);
        }
      }

      memoryAttendance = parsedAttendance;
      hasLoadedAny = true;

      // Asynchronously heal Google Sheets records so future sheet syncs never reset corrected durations back to 0
      if (recordsToHealInSheets.length > 0) {
        console.log(`[ATTENDANCE] Auto-healing ${recordsToHealInSheets.length} completed attendance record(s) in Google Sheets with accurate durations...`);
        for (const healedRec of recordsToHealInSheets) {
          updateGoogleSheetRowById('Attendance', ATTENDANCE_HEADERS, healedRec.id, formatAttendanceRow(healedRec))
            .then(() => console.log(`[ATTENDANCE] Saved healed duration "${healedRec.duration}" for ${healedRec.employeeName} (${healedRec.id}) to Google Sheets`))
            .catch((err) => console.warn(`[ATTENDANCE] Google Sheets sync notice for ${healedRec.id}:`, err?.message));
        }
      }
    } else {
      memoryAttendance = [];
    }

    // Parse Devices
    if (deviceRows.length > 0) {
      const parsedDevices: ComputerDeviceRecord[] = deviceRows
        .map((row) => ({
          id: String(row[0] || '').trim(),
          employeeId: String(row[1] || '').trim(),
          employeeName: String(row[2] || '').trim(),
          employeeEmail: String(row[3] || '').trim().toLowerCase(),
          deviceModel: String(row[4] || 'Mac mini (Apple Silicon)').trim(),
          macOSVersion: String(row[5] || 'macOS 15.0').trim(),
          status: (String(row[6] || 'Active').trim() === 'Revoked' ? 'Revoked' : 'Active') as 'Active' | 'Revoked' | 'Inactive',
          registeredAt: String(row[7] || '').trim() || new Date().toISOString(),
          lastSeenAt: String(row[8] || '').trim(),
          deviceSecretHash: String(row[9] || '').trim(),
          isRegisteredAgent: String(row[10] || '').trim().toUpperCase() !== 'FALSE',
        }))
        .filter((d) => d.id && (d.employeeId || d.employeeEmail));

      if (parsedDevices.length > 0) {
        // Merge with memory devices, keeping Google Sheets as source of truth
        const devMap = new Map<string, ComputerDeviceRecord>();
        for (const d of parsedDevices) {
          devMap.set(d.id.toUpperCase(), d);
        }
        for (const m of memoryComputerDevices) {
          if (!devMap.has(m.id.toUpperCase())) {
            devMap.set(m.id.toUpperCase(), m);
          }
        }
        memoryComputerDevices = Array.from(devMap.values());
        hasLoadedAny = true;
      }
    } else if (memoryComputerDevices.length > 0) {
      // If Google Sheets tab is empty but memory has paired devices, backfill them to Google Sheets
      for (const d of memoryComputerDevices) {
        appendGoogleSheetRow('Devices', DEVICE_HEADERS, formatDeviceRow(d)).catch((err) =>
          console.warn('[GOOGLE SHEETS] Error backfilling device:', err.message)
        );
      }
    }

    // Parse ComputerSummaries
    if (summaryRows.length > 0) {
      const parsedSummaries: ComputerSummaryRecord[] = summaryRows
        .map((row) => ({
          date: String(row[0] || '').trim(),
          employeeId: String(row[1] || '').trim(),
          employeeName: String(row[2] || '').trim(),
          employeeEmail: String(row[3] || '').trim().toLowerCase(),
          deviceId: String(row[4] || '').trim(),
          deviceModel: String(row[5] || '').trim(),
          totalActiveSeconds: Number(row[6]) >= 0 ? Number(row[6]) : 0,
          intervalsCount: Number(row[7]) >= 0 ? Number(row[7]) : 0,
          lastState: (['ACTIVE', 'INACTIVE', 'SLEEPING', 'LOCKED', 'OFFLINE'].includes(String(row[8] || ''))
            ? row[8]
            : 'OFFLINE') as any,
          lastHeartbeatAt: String(row[9] || '').trim(),
          lastInputType: (['keyboard', 'mouse', 'none'].includes(String(row[10] || '')) ? row[10] : 'mouse') as any,
        }))
        .filter((s) => s.date && (s.employeeId || s.deviceId));

      if (parsedSummaries.length > 0) {
        const sumMap = new Map<string, ComputerSummaryRecord>();
        for (const s of parsedSummaries) {
          const key = `${s.date}_${(s.employeeId || s.deviceId).toLowerCase().trim()}`;
          const existing = sumMap.get(key);
          if (!existing || s.totalActiveSeconds > existing.totalActiveSeconds) {
            sumMap.set(key, s);
          }
        }
        for (const m of memoryComputerSummaries) {
          const key = `${m.date}_${(m.employeeId || m.deviceId).toLowerCase().trim()}`;
          const existing = sumMap.get(key);
          if (!existing) {
            sumMap.set(key, m);
          } else {
            // Keep highest active seconds so active time NEVER regresses
            existing.totalActiveSeconds = Math.max(existing.totalActiveSeconds, m.totalActiveSeconds || 0);
            existing.intervalsCount = Math.max(existing.intervalsCount, m.intervalsCount || 0);
            if (
              m.lastHeartbeatAt &&
              (!existing.lastHeartbeatAt || new Date(m.lastHeartbeatAt).getTime() >= new Date(existing.lastHeartbeatAt).getTime())
            ) {
              existing.lastState = m.lastState;
              existing.lastHeartbeatAt = m.lastHeartbeatAt;
              existing.lastInputType = m.lastInputType || existing.lastInputType;
            }
          }
        }
        memoryComputerSummaries = Array.from(sumMap.values());
        hasLoadedAny = true;
      }
    }

    // Parse ComputerIntervals
    if (intervalRows.length > 0) {
      const parsedIntervals: ComputerIntervalRecord[] = intervalRows
        .map((row) => ({
          id: String(row[0] || '').trim(),
          deviceId: String(row[1] || '').trim(),
          employeeId: String(row[2] || '').trim(),
          employeeName: String(row[3] || '').trim(),
          date: String(row[4] || '').trim(),
          startTime: String(row[5] || '').trim(),
          endTime: String(row[6] || '').trim(),
          durationSeconds: Number(row[7]) >= 0 ? Number(row[7]) : 0,
          state: 'ACTIVE' as const,
          createdAt: String(row[9] || '').trim() || new Date().toISOString(),
        }))
        .filter((i) => i.id && i.date && (i.employeeId || i.deviceId));

      if (parsedIntervals.length > 0) {
        const intMap = new Map<string, ComputerIntervalRecord>();
        for (const i of parsedIntervals) {
          intMap.set(i.id, i);
        }
        for (const m of memoryComputerIntervals) {
          const existing = intMap.get(m.id);
          if (!existing) {
            intMap.set(m.id, m);
          } else {
            existing.durationSeconds = Math.max(existing.durationSeconds, m.durationSeconds);
            if (new Date(m.endTime).getTime() > new Date(existing.endTime).getTime()) {
              existing.endTime = m.endTime;
            }
          }
        }
        memoryComputerIntervals = Array.from(intMap.values());
        hasLoadedAny = true;
      }
    }

    // Reconcile and anchor baseline intervals from summaries so prior verified active time is never lost
    for (const s of memoryComputerSummaries) {
      if (!s.totalActiveSeconds || s.totalActiveSeconds <= 0) continue;
      const cleanEmp = (s.employeeId || '').trim().toLowerCase();
      const cleanDev = (s.deviceId || '').trim().toUpperCase();

      const empIntervals = memoryComputerIntervals.filter(
        (i) =>
          i.date === s.date &&
          ((cleanEmp && i.employeeId && i.employeeId.trim().toLowerCase() === cleanEmp) ||
            (cleanDev && i.deviceId && i.deviceId.trim().toUpperCase() === cleanDev))
      );

      const currentIntervalsTotal = empIntervals.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);
      if (s.totalActiveSeconds > currentIntervalsTotal) {
        const deficit = s.totalActiveSeconds - currentIntervalsTotal;
        const baselineId = `INT_PRIOR_${s.date}_${(s.employeeId || s.deviceId).toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;
        let prior = memoryComputerIntervals.find((i) => i.id === baselineId);
        if (!prior) {
          const refTime = s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt).getTime() : Date.now();
          const priorEndTime = new Date(refTime - 60000).toISOString();
          const priorStartTime = new Date(refTime - 60000 - deficit * 1000).toISOString();
          prior = {
            id: baselineId,
            deviceId: s.deviceId,
            employeeId: s.employeeId,
            employeeName: s.employeeName,
            date: s.date,
            startTime: priorStartTime,
            endTime: priorEndTime,
            durationSeconds: deficit,
            state: 'ACTIVE',
            createdAt: priorStartTime,
            isClosed: true,
          };
          memoryComputerIntervals.unshift(prior);
          updateGoogleSheetRowById(
            'ComputerIntervals',
            COMPUTER_INTERVAL_HEADERS,
            prior.id,
            formatComputerIntervalRow(prior)
          ).catch((err) =>
            console.warn('[GOOGLE SHEETS] Notice: could not persist baseline interval:', err.message)
          );
        } else if (prior.durationSeconds < deficit) {
          prior.durationSeconds = deficit;
        }
      }
    }

    // Reconcile and calculate Active Hours for all attendance records from real Mac intervals
    const nowForCalc = new Date();
    for (const att of memoryAttendance) {
      const activeSec = calculateAttendanceActiveSeconds(att, nowForCalc);
      att.activeSeconds = activeSec;
      if (activeSec > 0) {
        att.activeHours = formatActiveDuration(activeSec);
      } else if (!att.activeHours || isZeroOrMissingDuration(att.activeHours)) {
        att.activeHours = '00h 00m';
      }
    }

    if (hasLoadedAny) {
      saveToLocalDb();
      console.log(`[GOOGLE SHEETS] Successfully initialized state from Google Sheets (${persistentEmployeesCache.length} users, ${memoryWorkLogs.length} logs, ${memoryPresets.length} presets, ${memoryNotes.length} notes, ${memoryAttendance.length} attendance, ${memoryComputerDevices.length} devices).`);
      googleConfig.lastSyncStatus = 'Synced directly with Google Sheets API';
    } else {
      saveToLocalDb();
      console.log('[GOOGLE SHEETS] Initialized with production configuration.');
    }
    googleConfig.lastSync = new Date().toISOString();
    hasInitializedGoogleSheets = true;
    lastSheetsLoadTimestamp = Date.now();
    return true;
  } catch (err: any) {
    console.warn('[GOOGLE SHEETS] Notice during Google Sheets startup sync:', err.message);
    return false;
  }
}

// Lazy loader for Google Sheets data on serverless/cold-start
let hasInitializedGoogleSheets = false;
let sheetsInitPromise: Promise<boolean> | null = null;
let lastSheetsLoadTimestamp = 0;
let lastEmployeesSheetSync = 0;
const SHEETS_FRESH_TTL_MS = 15000; // 15 seconds cache to balance real-time sync with rate limits

// Safe bootstrap helper: Ensures the initial Admin exists in Google Sheets without local disk dependency
async function ensureAdminProvisionedInGoogleSheets(sheets: any, spreadsheetId: string, currentUsers: UserRecord[]): Promise<UserRecord[]> {
  const juntyUser = currentUsers.find(
    (u) => u.email?.toLowerCase() === 'junty@flyingwhales' || u.id?.toLowerCase() === 'admin-junty'
  );

  if (juntyUser) {
    juntyUser.id = 'admin-junty';
    juntyUser.name = 'Junty';
    juntyUser.email = 'junty@flyingwhales';
    juntyUser.role = 'ADMIN';
    if (!juntyUser.passwordHash || !juntyUser.passwordHash.startsWith('$2')) {
      juntyUser.passwordHash = INITIAL_ADMIN_HASH;
    }
    return currentUsers;
  }

  // Safe server-side bootstrap: Initial Admin does not exist in Google Sheets yet.
  // Provision the initial Admin record to Google Sheets once with its secure bcrypt hash.
  console.log('[BOOTSTRAP] Initial Admin junty@flyingwhales not found in Google Sheets. Bootstrapping to persistent store...');
  const newAdmin: UserRecord = { ...INITIAL_ADMIN };
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Employees!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [formatEmployeeRow(newAdmin)],
      },
    });
    console.log('[BOOTSTRAP] Initial Admin junty@flyingwhales successfully provisioned to Google Sheets.');
  } catch (err: any) {
    console.error('[BOOTSTRAP ERROR] Failed to provision initial Admin to Google Sheets:', err.message);
  }

  currentUsers.unshift(newAdmin);
  return currentUsers;
}

// Load employees directly from Google Sheets Employees tab (the persistent production source of truth)
export async function getPersistentEmployees(forceRefresh = false): Promise<UserRecord[]> {
  const isFresh = !forceRefresh && persistentEmployeesCache.length > 0 && (Date.now() - lastEmployeesSyncTimestamp < EMPLOYEES_CACHE_TTL_MS);
  if (isFresh) {
    return persistentEmployeesCache;
  }

  if (employeesLoadPromise) {
    return employeesLoadPromise;
  }

  employeesLoadPromise = (async () => {
    try {
      const sheets = await getGoogleSheetsClient();
      if (!sheets) {
        console.warn('[GOOGLE SHEETS] Google Sheets API client credentials unavailable.');
        return persistentEmployeesCache.length > 0 ? persistentEmployeesCache : [{ ...INITIAL_ADMIN }];
      }

      const targetSpreadsheetId = cleanSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID) || cleanSpreadsheetId(googleConfig.spreadsheetId) || PRODUCTION_SPREADSHEET_ID;

      await ensureGoogleSheetTabsExist(sheets, targetSpreadsheetId);
      await ensureTabHeaders(sheets, targetSpreadsheetId, 'Employees', EMPLOYEE_HEADERS);

      const res: any = await withTimeout(
        sheets.spreadsheets.values.get({
          spreadsheetId: targetSpreadsheetId,
          range: 'Employees!A2:J',
        }),
        12000,
        'getPersistentEmployees'
      );

      const empRows = res.data.values || [];
      const parsedUsers: UserRecord[] = empRows
        .map((row: any[]) => {
          const email = String(row[2] || '').trim().toLowerCase();
          const name = String(row[1] || '').trim() || email.split('@')[0];
          const lastLoginAt = String(row[9] || '').trim() || undefined;
          const googleUserId = String(row[5] || '').trim() || undefined;
          const hasLoggedIn = Boolean(
            lastLoginAt ||
            (googleUserId && !googleUserId.startsWith('pending_'))
          );
          const rawPassword = String(row[7] || '').trim();
          const passwordHash = rawPassword.startsWith('$2')
            ? rawPassword
            : hashPassword(rawPassword || 'password123');

          return {
            id: String(row[0] || '').trim(),
            name,
            email,
            role: resolveRole(email, String(row[3] || '')),
            status: (String(row[4] || 'Active') === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
            googleUserId,
            profileImage: String(row[6] || '').trim() || undefined,
            passwordHash,
            createdAt: String(row[8] || '').trim() || new Date().toISOString(),
            lastLoginAt,
            hasLoggedIn,
          };
        })
        .filter((u: UserRecord) => u.email && !isFakeDemoUser(u));

      const finalUsers = await ensureAdminProvisionedInGoogleSheets(sheets, targetSpreadsheetId, parsedUsers);
      persistentEmployeesCache = finalUsers;
      lastEmployeesSyncTimestamp = Date.now();
      return persistentEmployeesCache;
    } catch (err: any) {
      console.error('[GOOGLE SHEETS] Error fetching persistent employees:', err?.message);
      if (persistentEmployeesCache.length > 0) {
        return persistentEmployeesCache;
      }
      return [{ ...INITIAL_ADMIN }];
    } finally {
      employeesLoadPromise = null;
    }
  })();

  return employeesLoadPromise;
}

// Backward-compatible alias for existing startup calls
export async function loadEmployeesFromGoogleSheets(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const employees = await getPersistentEmployees(true);
    return { success: true, count: employees.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

// Look up user strictly from persistent backend data source (Google Sheets). Unknown users are NEVER auto-created.
export async function getPersistentUserByLoginId(rawLoginId: string): Promise<UserRecord | null> {
  const clean = (rawLoginId || '').trim().toLowerCase();
  if (!clean) return null;

  // 1. Check in-memory sheet mirror
  let employees = await getPersistentEmployees(false);
  let user = employees.find(
    (u) => (u.email && u.email.toLowerCase() === clean) || (u.id && u.id.toLowerCase() === clean)
  );

  // 2. If not found in mirror, perform fresh lookup from Google Sheets
  if (!user) {
    employees = await getPersistentEmployees(true);
    user = employees.find(
      (u) => (u.email && u.email.toLowerCase() === clean) || (u.id && u.id.toLowerCase() === clean)
    );
  }

  return user || null;
}

export async function ensureDataLoaded(forceReload = false): Promise<boolean> {
  const isFresh = hasInitializedGoogleSheets && Date.now() - lastSheetsLoadTimestamp < SHEETS_FRESH_TTL_MS;
  if (isFresh && !forceReload) return true;

  if (!sheetsInitPromise) {
    sheetsInitPromise = (async () => {
      try {
        const res = await withTimeout(loadDataFromGoogleSheets(), 20000, 'loadDataFromGoogleSheets');
        if (res) {
          hasInitializedGoogleSheets = true;
          lastSheetsLoadTimestamp = Date.now();
        }
        return res;
      } catch (err: any) {
        console.warn('[SERVERLESS INIT] Google Sheets load notice:', err.message);
        return false;
      } finally {
        sheetsInitPromise = null;
      }
    })();
  }
  return sheetsInitPromise;
}

// Ensure JSON Content-Type header on all API calls
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// ============================================================================
// AUTHENTICATION & PRIVACY MIDDLEWARES
// ============================================================================
export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  'flying-whales-production-secret-session-salt-2026';

export interface SessionPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  name: string;
  exp: number;
}

export function createSessionToken(user: { id: string; email: string; role?: string; name?: string }): string {
  const cleanEmail = String(user.email || '').trim().toLowerCase();
  const payload: SessionPayload = {
    id: String(user.id || '').trim(),
    email: cleanEmail,
    role: resolveRole(cleanEmail),
    name: String(user.name || cleanEmail.split('@')[0]).trim(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30-day session
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  const parts = cleanToken.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.id || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null; // Expired
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

export function setSessionCookie(res: Response, token: string) {
  const isSecure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  res.setHeader(
    'Set-Cookie',
    `fw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    'fw_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

// Middleware: Authenticate user from session cookie or Authorization Bearer header
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['fw_session'];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  const candidateToken = cookieToken || bearerToken;

  if (!candidateToken) {
    res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
    return;
  }

  // 1. Check if token is a cryptographically signed session token
  const sessionData =
    verifySessionToken(candidateToken) ||
    verifySessionToken(bearerToken) ||
    verifySessionToken(cookieToken);

  if (!sessionData) {
    res.status(401).json({ success: false, error: 'Invalid or expired session. Please sign in again.' });
    return;
  }

  // Look up user strictly from persistent store (Google Sheets)
  const matched = await getPersistentUserByLoginId(sessionData.email || sessionData.id);

  if (!matched) {
    res.status(401).json({ success: false, error: 'User session not found. Please sign in again.' });
    return;
  }

  if (matched.status === 'Inactive') {
    res.status(403).json({ success: false, error: 'This account has been deactivated. Please contact your administrator.' });
    return;
  }

  // Enforce authoritative role resolution from server
  matched.role = resolveRole(matched.email, matched.role);
  req.user = matched;

  // Refresh cookie if not present
  if (!cookieToken && matched) {
    try {
      const freshToken = createSessionToken(matched);
      setSessionCookie(res, freshToken);
    } catch {}
  }

  next();
}

async function recordAttendanceLogin(user: { id: string; email: string; name: string }): Promise<AttendanceRecord> {
  const cleanEmail = user.email.trim().toLowerCase();
  const now = new Date();
  const todayStr = getKolkataDateString(now);

  // Check if there is an active, open session for this user (not logged out yet)
  const openSession = memoryAttendance.find(
    (a) =>
      a.employeeEmail.toLowerCase() === cleanEmail &&
      (!a.logoutTime || a.status === 'Logged In' || a.status === 'Present' || a.status === 'Active')
  );

  if (openSession) {
    console.log(`[ATTENDANCE] User ${cleanEmail} already has an open attendance session (${openSession.id}). Reusing.`);
    return openSession;
  }

  const attendanceId = `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newAttendance: AttendanceRecord = {
    id: attendanceId,
    employeeId: user.id || 'EMP001',
    employeeName: user.name || cleanEmail.split('@')[0],
    employeeEmail: cleanEmail,
    date: todayStr,
    loginTime: getKolkataTimeString(now),
    logoutTime: '',
    duration: 'In Progress',
    status: 'Logged In',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  memoryAttendance.unshift(newAttendance);
  saveToLocalDb();

  try {
    await appendGoogleSheetRow('Attendance', ATTENDANCE_HEADERS, formatAttendanceRow(newAttendance));
    console.log(`[ATTENDANCE] Logged in attendance recorded for ${cleanEmail} at ${newAttendance.loginTime} (Asia/Kolkata)`);
  } catch (err: any) {
    console.warn('[ATTENDANCE] Error appending attendance to Google Sheets:', err?.message);
  }

  return newAttendance;
}

async function recordAttendanceLogout(userEmail: string, userId?: string): Promise<AttendanceRecord | null> {
  const cleanEmail = userEmail.trim().toLowerCase();

  // Find that user's currently open attendance session
  let target = memoryAttendance.find(
    (a) =>
      (a.employeeEmail.toLowerCase() === cleanEmail || (userId && a.employeeId === userId)) &&
      (!a.logoutTime || a.status === 'Logged In' || a.status === 'Present' || a.status === 'Active')
  );

  // If no open session exists, DO NOT invent a logout time or create fake records
  if (!target) {
    console.log(`[ATTENDANCE] No open attendance session found for ${cleanEmail}. Logout recorded without altering records.`);
    return null;
  }

  const now = new Date();
  target.logoutTime = getKolkataTimeString(now);
  target.duration = calculateAttendanceDuration(target.date, target.loginTime, target.logoutTime);
  target.status = 'Completed';
  target.updatedAt = now.toISOString();

  saveToLocalDb();

  try {
    await updateGoogleSheetRowById('Attendance', ATTENDANCE_HEADERS, target.id, formatAttendanceRow(target));
    console.log(`[ATTENDANCE] Logged out attendance recorded for ${cleanEmail}: ${target.loginTime} -> ${target.logoutTime}, duration: ${target.duration}`);
  } catch (err: any) {
    console.warn('[ATTENDANCE] Error updating logout in Google Sheets:', err?.message);
  }

  return target;
}

// Middleware: Enforce Admin Role
function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied. Administrator permissions required.' });
    return;
  }
  next();
}

// ============================================================================
// AUTHENTICATION ROUTES (LOGIN ID & PASSWORD)
// ============================================================================

// Primary Login ID & Password Authentication Handler
const handleLoginRequest = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawLoginId = (req.body?.loginId || req.body?.email || req.body?.employeeId || '').trim();
    const password = req.body?.password;

    if (!rawLoginId || !password) {
      res.status(400).json({ success: false, error: 'Please enter your Login ID and password.' });
      return;
    }

    console.log('[AUTH_LOGIN_START]', { loginId: rawLoginId, timestamp: new Date().toISOString() });

    const cleanLoginId = rawLoginId.toLowerCase();

    // Look up user strictly from Google Sheets persistent employee store
    const user = await getPersistentUserByLoginId(cleanLoginId);

    // CRITICAL SECURITY: Unknown user must NEVER be auto-created! Return 401:
    if (!user) {
      console.log('[AUTH_LOGIN_UNKNOWN_USER]', { loginId: rawLoginId });
      res.status(401).json({ success: false, error: 'Invalid Login ID or password' });
      return;
    }

    // Verify password strictly with bcrypt
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('[AUTH_LOGIN_PASSWORD_MISMATCH]', { loginId: rawLoginId, userId: user.id });
      res.status(401).json({ success: false, error: 'Invalid Login ID or password' });
      return;
    }

    // Check account status
    if (user.status === 'Inactive') {
      console.log('[AUTH_LOGIN_INACTIVE]', { id: user.id });
      res.status(403).json({ success: false, error: 'This account is inactive. Please contact your administrator.' });
      return;
    }

    // Authoritatively resolve role on the server
    user.role = resolveRole(user.email, user.role);
    user.lastLoginAt = new Date().toISOString();
    user.hasLoggedIn = true;

    // Asynchronously update lastLoginAt in Google Sheets without blocking login response
    updateEmployeeInGoogleSheets(user).catch((err: any) => {
      console.warn('[SHEETS] Login timestamp sync notice:', err?.message);
    });

    // Create cryptographically signed session token & set HttpOnly cookie
    const sessionToken = createSessionToken(user);
    setSessionCookie(res, sessionToken);

    console.log('[AUTH_LOGIN_SUCCESS]', { id: user.id, role: user.role, loginId: user.email });

    // Respond with clean user profile (NEVER expose password or passwordHash)
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        loginId: user.email,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        hasLoggedIn: true,
      },
      token: sessionToken,
      message: 'Signed in successfully.',
    });
  } catch (err: any) {
    console.error('[AUTH_LOGIN_EXCEPTION]', err);
    res.status(500).json({
      success: false,
      error: 'Authentication service temporarily unavailable. Please try again.',
      errorId: `AUTH-EX-${Date.now()}`
    });
  }
};

app.post(['/api/auth/login', '/auth/login'], handleLoginRequest);

// Forgot password request helper
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    res.status(400).json({ error: 'Please provide your account Login ID or email address.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await getPersistentUserByLoginId(cleanEmail);

  res.json({
    success: true,
    message: user
      ? `Password assistance instructions have been recorded for ${cleanEmail}. Please contact your administrator.`
      : `If an active account exists for ${cleanEmail}, recovery instructions have been recorded. Please contact your administrator.`,
  });
});

// Get current user identity
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      loginId: user.email,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      hasLoggedIn: true,
    },
    authenticated: true,
  });
});

// User logout (clears session cookie & clocks out attendance shift)
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Update password
app.put('/api/auth/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    return;
  }

  req.user!.passwordHash = hashPassword(password);
  try {
    await updateEmployeeInGoogleSheets(req.user!);
  } catch (err: any) {
    console.warn('[PASSWORD UPDATE] Google Sheets update notice:', err?.message);
  }
  res.json({ success: true, message: 'Password updated successfully.' });
});

// Update employee profile display name
app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Display name cannot be empty.' });
    return;
  }

  const previousName = user.name;
  const newName = name.trim();

  try {
    // 1. Prepare candidate update on user object
    user.name = newName;

    // 2. Persist directly to Google Sheets Employees tab (and WorkLogs tab)
    await updateEmployeeInGoogleSheets(user);

    // 3. Keep memoryWorkLogs aligned
    memoryWorkLogs.forEach((w) => {
      if (w.employeeId === user.id || w.employeeEmail.toLowerCase() === user.email.toLowerCase()) {
        w.employeeName = user.name;
      }
    });

    // 4. Update persistentEmployeesCache ensuring reference consistency
    const memUser = persistentEmployeesCache.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (memUser) {
      memUser.name = user.name;
    }

    console.log(`[PROFILE UPDATE] Successfully persisted display name "${user.name}" for "${user.email}" to Google Sheets.`);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        googleUserId: user.googleUserId,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
      message: 'Profile display name updated successfully in Google Sheets.',
    });
  } catch (err: any) {
    // Roll back in-memory state so it does not falsely report as saved
    user.name = previousName;
    const memUser = persistentEmployeesCache.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (memUser) {
      memUser.name = previousName;
    }
    console.error('[PROFILE UPDATE ERROR] Failed to save display name to Google Sheets:', err);
    res.status(500).json({
      error: 'Failed to update name in Google Sheets. Changes were not saved.',
      details: err.message,
    });
  }
});

// ============================================================================
// GOOGLE SHEETS & DRIVE API STATUS & SYNC ROUTES
// ============================================================================

// Get Google Sheets Connection Status
app.get('/api/google/status', (req, res) => {
  const sa = parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT);
  const hasServiceAccount = !!(sa && sa.client_email && sa.private_key);

  res.json({
    connected: true,
    googleAuthConnected: true,
    googleSheetsConnected: true,
    googleDriveConnected: true,
    hasServiceAccount,
    serviceAccountEmail: sa?.client_email || undefined,
    spreadsheetId: googleConfig.spreadsheetId,
    spreadsheetName: googleConfig.spreadsheetName,
    spreadsheetUrl: googleConfig.spreadsheetUrl,
    configuredVia: 'central_sheet',
    lastSync: googleConfig.lastSync,
    lastSyncStatus: googleConfig.lastSyncStatus,
    itemsCount: {
      employees: persistentEmployeesCache.length,
      workLogs: memoryWorkLogs.length,
      notes: memoryNotes.length,
    },
    sheets: [
      { name: 'Employees', description: 'Studio team roster & access profiles', rowCount: persistentEmployeesCache.length },
      { name: 'WorkLogs', description: 'Daily production logs, time spent & status', rowCount: memoryWorkLogs.length },
      { name: 'KPI', description: 'Real-time aggregated performance metrics', rowCount: persistentEmployeesCache.length },
      { name: 'Notes', description: 'Private employee task notebooks (isolated)', rowCount: memoryNotes.length },
    ],
    tabs: googleConfig.tabs,
    driveFolder: googleConfig.driveFolder,
    totalEmployees: persistentEmployeesCache.length,
    totalWorkLogs: memoryWorkLogs.length,
    totalNotes: memoryNotes.length,
  });
});

// Configure Google Spreadsheet ID
app.post('/api/google/config', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { spreadsheetId, spreadsheetUrl } = req.body;

  const rawInput = spreadsheetId || spreadsheetUrl;
  if (rawInput) {
    const cleaned = cleanSpreadsheetId(rawInput);
    googleConfig.spreadsheetId = cleaned;
    googleConfig.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${cleaned}/edit`;
  }

  await syncWithCentralGoogleSheet();

  res.json({
    success: true,
    googleConfig,
    message: 'Central Google Spreadsheet configured successfully.',
  });
});

// Trigger Manual Sync
app.post('/api/google/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await syncWithCentralGoogleSheet();
  res.json({
    connected: true,
    googleSheetsConnected: true,
    googleDriveConnected: true,
    spreadsheetId: googleConfig.spreadsheetId,
    spreadsheetName: googleConfig.spreadsheetName,
    spreadsheetUrl: googleConfig.spreadsheetUrl,
    lastSync: googleConfig.lastSync,
    lastSyncStatus: googleConfig.lastSyncStatus,
    tabs: googleConfig.tabs,
    driveFolder: googleConfig.driveFolder,
    totalEmployees: persistentEmployeesCache.length,
    totalWorkLogs: memoryWorkLogs.length,
    totalNotes: memoryNotes.length,
  });
});

// Export Google Sheets data to formatted .xlsx Excel file
app.get('/api/export/excel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Synchronize / fetch latest production Google Sheets data
    try {
      await loadDataFromGoogleSheets();
    } catch (sheetErr: any) {
      console.warn('[EXCEL EXPORT] Google Sheets sync notice:', sheetErr?.message);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Flying Whales Ad Films Production Studio';
    workbook.created = new Date();

    // 1. Employees Tab
    const empSheet = workbook.addWorksheet('Employees');
    empSheet.columns = [
      { header: 'Employee ID', key: 'id', width: 15 },
      { header: 'Full Name', key: 'name', width: 24 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Account Created', key: 'createdAt', width: 22 },
      { header: 'Last Login', key: 'lastLoginAt', width: 22 },
    ];
    const realEmployees = persistentEmployeesCache.filter((u) => !isFakeDemoUser(u));
    realEmployees.forEach((u) => {
      empSheet.addRow({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || (u.hasLoggedIn ? 'Active' : 'Never logged in'),
      });
    });

    // 2. WorkLogs Tab
    const workSheet = workbook.addWorksheet('WorkLogs');
    workSheet.columns = [
      { header: 'Work ID', key: 'id', width: 15 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Email', key: 'employeeEmail', width: 30 },
      { header: 'Employee Name', key: 'employeeName', width: 22 },
      { header: 'Task / Category', key: 'task', width: 16 },
      { header: 'Work Title', key: 'title', width: 34 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Requested By', key: 'requestedBy', width: 20 },
      { header: 'Requested Date', key: 'requestedDate', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Work Done', key: 'workDone', width: 12 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Time Spent', key: 'timeSpent', width: 14 },
      { header: 'Client / Project', key: 'clientProject', width: 24 },
      { header: 'Created Date', key: 'createdAt', width: 22 },
    ];
    const user = req.user!;
    const realLogs = memoryWorkLogs
      .filter((w) => !isFakeDemoLog(w))
      .filter((w) => user.role === 'ADMIN' || isLogOwnedByUser(w, user));
    realLogs.forEach((w) => {
      workSheet.addRow({
        id: w.id,
        employeeId: w.employeeId,
        employeeEmail: w.employeeEmail,
        employeeName: w.employeeName,
        task: w.task || w.category || 'Videos',
        title: w.title,
        status: w.status,
        requestedBy: w.requestedBy || w.clientProject || '',
        requestedDate: w.requestedDate || w.date || '',
        quantity: w.quantity || 1,
        workDone: w.workDone || (w.status === 'Completed' ? 'Yes' : 'No'),
        priority: w.priority || 'Medium',
        timeSpent: w.timeSpent || '1h 00m',
        clientProject: w.clientProject || '',
        createdAt: w.createdAt,
      });
    });

    // 3. KPI Tab
    const kpiSheet = workbook.addWorksheet('KPI');
    kpiSheet.columns = [
      { header: 'Employee ID', key: 'id', width: 15 },
      { header: 'Employee Name', key: 'name', width: 24 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Completed Tasks', key: 'completed', width: 18 },
      { header: 'In Progress', key: 'inProgress', width: 14 },
      { header: 'Pending', key: 'pending', width: 12 },
      { header: 'Total Logs', key: 'total', width: 12 },
      { header: 'Completion Rate', key: 'rate', width: 18 },
      { header: 'Deliverables Units', key: 'deliverables', width: 18 },
    ];
    realEmployees.forEach((emp) => {
      const empLogs = realLogs.filter(
        (l) =>
          l.employeeId === emp.id ||
          (l.employeeEmail && l.employeeEmail.toLowerCase() === emp.email.toLowerCase())
      );
      const completed = empLogs.filter((l) => l.status === 'Completed' || l.workDone === 'Yes').length;
      const inProgress = empLogs.filter((l) => l.status === 'In Progress').length;
      const pending = empLogs.filter((l) => l.status === 'Pending').length;
      const total = empLogs.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const deliverables = empLogs.reduce((acc, l) => acc + (Number(l.quantity) || 1), 0);
      kpiSheet.addRow({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        completed,
        inProgress,
        pending,
        total,
        rate: `${rate}%`,
        deliverables,
      });
    });

    // 4. Notes Tab
    const notesSheet = workbook.addWorksheet('Notes');
    notesSheet.columns = [
      { header: 'Note ID', key: 'id', width: 15 },
      { header: 'Employee Email', key: 'email', width: 30 },
      { header: 'Title', key: 'title', width: 32 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Due Date', key: 'dueDate', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];
    const realNotes = memoryNotes.filter((n) => !isFakeDemoNote(n));
    realNotes.forEach((n) => {
      notesSheet.addRow({
        id: n.id,
        email: n.employeeEmail,
        title: n.title,
        category: n.category,
        dueDate: n.dueDate || '',
        status: n.status,
        createdAt: n.createdAt,
      });
    });

    // 5. Attendance Tab
    const attendanceSheet = workbook.addWorksheet('Attendance');
    attendanceSheet.columns = [
      { header: 'Attendance ID', key: 'id', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Name', key: 'employeeName', width: 24 },
      { header: 'Employee Email', key: 'employeeEmail', width: 30 },
      { header: 'Login Time', key: 'loginTime', width: 16 },
      { header: 'Logout Time', key: 'logoutTime', width: 16 },
      { header: 'Duration', key: 'duration', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Recorded At', key: 'createdAt', width: 22 },
    ];
    memoryAttendance.forEach((a) => {
      attendanceSheet.addRow({
        id: a.id,
        date: a.date,
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        employeeEmail: a.employeeEmail,
        loginTime: a.loginTime,
        logoutTime: a.logoutTime || 'Active / In Progress',
        duration: a.duration || 'In Progress',
        status: a.status,
        createdAt: a.createdAt,
      });
    });

    // 6. Settings Tab
    const settingsSheet = workbook.addWorksheet('Settings');
    settingsSheet.columns = [
      { header: 'Setting', key: 'key', width: 30 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    settingsSheet.addRow({ key: 'Studio Name', value: 'Flying Whales Ad Films' });
    settingsSheet.addRow({ key: 'Central Spreadsheet Name', value: googleConfig.spreadsheetName || 'Flying Whales Studio Management' });
    settingsSheet.addRow({ key: 'Central Spreadsheet ID', value: googleConfig.spreadsheetId || 'Connected' });
    settingsSheet.addRow({ key: 'Export Date', value: new Date().toISOString() });
    settingsSheet.addRow({ key: 'Total Genuine Employees', value: realEmployees.length });
    settingsSheet.addRow({ key: 'Total Production Work Logs', value: realLogs.length });
    settingsSheet.addRow({ key: 'Total Attendance Records', value: memoryAttendance.length });
    settingsSheet.addRow({ key: 'Sync Status', value: googleConfig.lastSyncStatus });

    // Apply header styling to all worksheets
    [empSheet, workSheet, kpiSheet, notesSheet, attendanceSheet, settingsSheet].forEach((sheet) => {
      sheet.views = [{ showGridLines: true }];
      const headerRow = sheet.getRow(1);
      headerRow.height = 26;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A66C2' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Flying_Whales_Work_Data_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('[EXCEL EXPORT ERROR]', err);
    res.status(500).json({ error: 'Failed to generate Excel file.', details: err?.message });
  }
});

// ============================================================================
// WORK LOGS ROUTES
// ============================================================================

// GET Work Logs:
// Returns real production work logs for authenticated team studio tracking & global search
app.get('/api/worklogs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await ensureDataLoaded();
    if (!ok && !hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Failed to synchronize with Google Sheets. Please verify connection and try again.' });
      return;
    }
  } catch (e: any) {
    console.warn('[WORKLOGS] ensureDataLoaded notice:', e?.message);
    if (!hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Google Sheets sync error: ' + (e?.message || 'Unable to load work logs') });
      return;
    }
  }
  const user = req.user!;
  const realLogs = memoryWorkLogs.filter((w) => !isFakeDemoLog(w));

  // Role-based access control:
  // Admin receives all work logs across all employees (with optional employee filter if explicitly requested by Admin)
  if (user.role === 'ADMIN') {
    const requestedEmp = String(req.query.employeeId || req.query.userId || '').trim().toLowerCase();
    if (requestedEmp && requestedEmp !== 'all') {
      const filtered = realLogs.filter(
        (w) =>
          String(w.employeeId || '').trim().toLowerCase() === requestedEmp ||
          String(w.employeeEmail || '').trim().toLowerCase() === requestedEmp
      );
      res.json(filtered);
      return;
    }
    res.json(realLogs);
    return;
  }

  // Normal Employee: STRICT SERVER-SIDE FILTERING
  // Each employee receives ONLY their own work logs.
  // Query parameters are ignored to prevent unauthorized data access across employees.
  const employeeOwnLogs = realLogs.filter((w) => isLogOwnedByUser(w, user));
  res.json(employeeOwnLogs);
});

// POST Work Log:
// Always records employeeId and employeeEmail from the authenticated user
app.post('/api/worklogs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    task,
    title,
    status,
    requestedBy,
    requestedDate,
    quantity,
    workDone,
    thumbnail,
    date,
    category,
    description,
    priority,
    timeSpent,
    clientProject,
    notes,
  } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Title is required.' });
    return;
  }

  const validTask = ['Videos', 'Shorts', 'Reels', 'Photos', 'Shootings', 'Others'].includes(task)
    ? task
    : 'Videos';

  const validStatus = ['Completed', 'In Progress', 'Pending'].includes(status)
    ? status
    : 'Completed';

  const reqDate = requestedDate || date || new Date().toISOString().split('T')[0];

  const newLog: WorkLogRecord = {
    id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    employeeId: user.id,
    employeeEmail: user.email,
    employeeName: user.name,
    task: validTask,
    title: title.trim(),
    status: validStatus,
    requestedBy: (requestedBy || clientProject || user.name).trim(),
    requestedDate: reqDate,
    quantity: Number(quantity) > 0 ? Number(quantity) : 1,
    workDone: workDone === 'No' ? 'No' : 'Yes',
    thumbnail: typeof thumbnail === 'string' ? thumbnail.trim() : '',
    date: reqDate,
    description: (description || '').trim(),
    category: validTask,
    priority: priority || 'Medium',
    timeSpent: timeSpent || '1h 00m',
    clientProject: (requestedBy || clientProject || 'Studio Work').trim(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await appendGoogleSheetRow('WorkLogs', WORK_LOG_HEADERS, formatWorkLogRow(newLog));
  } catch (err: any) {
    console.error('[POST WORKLOG ERROR]', err);
    res.status(500).json({ error: 'Failed to save work log to Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  memoryWorkLogs.unshift(newLog);
  saveToLocalDb();

  res.status(201).json({
    log: newLog,
    message: 'Work log recorded and saved to Google Sheets.',
  });
});

// PUT Work Log:
// Employees can only edit their own work logs; Admins can edit any log
app.put('/api/worklogs/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const logId = req.params.id;

  let targetIndex = memoryWorkLogs.findIndex((w) => w.id === logId);
  if (targetIndex === -1) {
    try {
      await loadDataFromGoogleSheets();
      targetIndex = memoryWorkLogs.findIndex((w) => w.id === logId);
    } catch {}
  }

  if (targetIndex === -1) {
    res.status(404).json({ error: 'Work log not found.' });
    return;
  }

  const target = memoryWorkLogs[targetIndex];

  // Privacy verification
  if (user.role !== 'ADMIN' && target.employeeId !== user.id && target.employeeEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Unauthorized to edit another employee’s work log.' });
    return;
  }

  const {
    task,
    title,
    status,
    requestedBy,
    requestedDate,
    quantity,
    workDone,
    thumbnail,
    date,
    category,
    description,
    priority,
    timeSpent,
    clientProject,
    notes,
  } = req.body;

  if (task !== undefined) target.task = task;
  if (title !== undefined) target.title = title.trim();
  if (status !== undefined) target.status = status;
  if (requestedBy !== undefined) {
    target.requestedBy = requestedBy.trim();
    target.clientProject = requestedBy.trim();
  }
  if (requestedDate !== undefined) {
    target.requestedDate = requestedDate;
    target.date = requestedDate;
  } else if (date !== undefined) {
    target.requestedDate = date;
    target.date = date;
  }
  if (quantity !== undefined) target.quantity = Number(quantity) > 0 ? Number(quantity) : 1;
  if (workDone !== undefined) target.workDone = workDone;
  if (thumbnail !== undefined) target.thumbnail = typeof thumbnail === 'string' ? thumbnail.trim() : '';
  if (description !== undefined) target.description = description.trim();
  if (category !== undefined) target.category = category;
  if (priority !== undefined) target.priority = priority;
  if (timeSpent !== undefined) target.timeSpent = timeSpent;
  if (clientProject !== undefined) target.clientProject = clientProject.trim();
  if (notes !== undefined) target.notes = notes.trim();
  target.updatedAt = new Date().toISOString();

  try {
    await updateGoogleSheetRowById('WorkLogs', WORK_LOG_HEADERS, logId, formatWorkLogRow(target));
  } catch (err: any) {
    console.error('[PUT WORKLOG ERROR]', err);
    res.status(500).json({ error: 'Failed to update work log in Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  saveToLocalDb();

  res.json({
    log: target,
    message: 'Work log updated and saved to Google Sheets.',
  });
});

// DELETE Work Log:
// Atomic deletion: Google Sheets row is deleted FIRST. Only after success is the record removed from memory.
app.delete('/api/worklogs/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const logId = String(req.params.id || '').trim();

  if (!logId) {
    res.status(400).json({ error: 'Work log ID is required for deletion.' });
    return;
  }

  // 1. Locate the target log in memory
  let target = memoryWorkLogs.find((w) => w.id === logId);

  // If not found in memory (e.g. serverless cold start), reload from Google Sheets
  if (!target) {
    try {
      await loadDataFromGoogleSheets();
      target = memoryWorkLogs.find((w) => w.id === logId);
    } catch (err: any) {
      console.warn('[DELETE WORKLOG] Error reloading from Google Sheets:', err?.message);
    }
  }

  // If still not found in memory, query Google Sheets directly to find the log
  if (!target) {
    try {
      const sheets = await getGoogleSheetsClient();
      if (sheets && googleConfig.spreadsheetId) {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: googleConfig.spreadsheetId,
          range: 'WorkLogs!A:D',
        });
        const rows = res.data.values || [];
        const matchingRow = rows.find(
          (r: any[], idx: number) => idx > 0 && String(r[0] || '').trim().toLowerCase() === logId.toLowerCase()
        );
        if (matchingRow) {
          target = {
            id: String(matchingRow[0] || '').trim(),
            employeeId: String(matchingRow[1] || '').trim(),
            employeeEmail: String(matchingRow[2] || '').trim().toLowerCase(),
            employeeName: String(matchingRow[3] || '').trim(),
            task: 'Videos',
            title: 'Work Log',
            status: 'Completed',
          } as WorkLogRecord;
        }
      }
    } catch (err: any) {
      console.warn('[DELETE WORKLOG] Fallback sheet search warning:', err?.message);
    }
  }

  if (!target) {
    res.status(404).json({ error: 'Work log record not found or already deleted.' });
    return;
  }

  // 2. Privacy verification: user can only delete their own records unless admin
  const isOwner =
    (target.employeeId && target.employeeId === user.id) ||
    (target.employeeEmail && target.employeeEmail.toLowerCase() === user.email.toLowerCase());

  if (user.role !== 'ADMIN' && !isOwner) {
    res.status(403).json({ error: 'Unauthorized to delete another employee’s work log.' });
    return;
  }

  // 3. Delete the exact row from Google Sheets first
  try {
    const deleteResult = await deleteGoogleSheetRowById('WorkLogs', logId);
    if (!deleteResult.success && deleteResult.error) {
      throw new Error(deleteResult.error);
    }
  } catch (sheetErr: any) {
    console.error('[GOOGLE SHEETS] Deletion failed for work log:', sheetErr.message);
    res.status(500).json({ error: sheetErr.message || 'Unable to delete from Google Sheets. Please try again.' });
    return;
  }

  // 4. Remove from memoryWorkLogs
  memoryWorkLogs = memoryWorkLogs.filter((w) => w.id !== logId);
  saveToLocalDb();
  console.log(`[DELETE WORKLOG] Successfully deleted work log ${logId} for ${target.employeeEmail || target.employeeName}`);

  res.json({ success: true, message: 'Work Log deleted successfully from Google Sheets.' });
});

// ============================================================================
// PRIVATE NOTES ROUTES (STRICT EMPLOYEE ISOLATION - ADMINS CANNOT SEE)
// ============================================================================

// GET Private Notes:
// STRICT PRIVACY REQUIREMENT: "ADMINS CANNOT SEE EMPLOYEES' PRIVATE NOTES. Private notes must remain strictly private to the employee who created them."
app.get('/api/notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await ensureDataLoaded();
    if (!ok && !hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Failed to synchronize with Google Sheets. Please verify connection and try again.' });
      return;
    }
  } catch (e: any) {
    console.warn('[NOTES] ensureDataLoaded notice:', e?.message);
    if (!hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Google Sheets sync error: ' + (e?.message || 'Unable to load notes') });
      return;
    }
  }
  const user = req.user!;
  // Always filter by authenticated user id or email regardless of role
  const userNotes = memoryNotes.filter(
    (n) => n.employeeId === user.id || n.employeeEmail.toLowerCase() === user.email.toLowerCase()
  );
  res.json(userNotes);
});

// POST Private Note
app.post('/api/notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { title, content, category, dueDate, status } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Title is required.' });
    return;
  }

  const newNote: NoteRecord = {
    id: `NOTE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    employeeId: user.id,
    employeeEmail: user.email,
    title: title.trim(),
    content: (content || '').trim(),
    category: category || 'Upcoming work',
    dueDate: dueDate || '',
    status: status || 'Upcoming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await appendGoogleSheetRow('Notes', NOTE_HEADERS, formatNoteRow(newNote));
  } catch (err: any) {
    console.error('[POST NOTE ERROR]', err);
    res.status(500).json({ error: 'Failed to save note to Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  memoryNotes.unshift(newNote);
  saveToLocalDb();

  res.status(201).json({
    note: newNote,
    message: 'Private note saved to your secure notebook.',
  });
});

// PUT Private Note
app.put('/api/notes/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const noteId = req.params.id;

  const target = memoryNotes.find((n) => n.id === noteId);
  if (!target) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  // Strict ownership check
  if (target.employeeId !== user.id && target.employeeEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access denied. You do not own this private note.' });
    return;
  }

  const { title, content, category, dueDate, status } = req.body;
  if (title !== undefined) target.title = title.trim();
  if (content !== undefined) target.content = content.trim();
  if (category !== undefined) target.category = category;
  if (dueDate !== undefined) target.dueDate = dueDate;
  if (status !== undefined) target.status = status;
  target.updatedAt = new Date().toISOString();

  try {
    await updateGoogleSheetRowById('Notes', NOTE_HEADERS, noteId, formatNoteRow(target));
  } catch (err: any) {
    console.error('[PUT NOTE ERROR]', err);
    res.status(500).json({ error: 'Failed to update note in Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  saveToLocalDb();

  res.json({ note: target, message: 'Private note updated.' });
});

// DELETE Private Note
app.delete('/api/notes/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const noteId = req.params.id;

  const targetIndex = memoryNotes.findIndex((n) => n.id === noteId);
  if (targetIndex === -1) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  const target = memoryNotes[targetIndex];
  if (target.employeeId !== user.id && target.employeeEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access denied. You do not own this private note.' });
    return;
  }

  try {
    await deleteGoogleSheetRowById('Notes', noteId);
  } catch (sheetErr: any) {
    console.error('[GOOGLE SHEETS] Deletion failed for note:', sheetErr.message);
    res.status(500).json({ error: 'Unable to delete. Please try again.' });
    return;
  }

  memoryNotes.splice(targetIndex, 1);
  saveToLocalDb();

  res.json({ success: true, message: 'Deleted successfully' });
});

// ============================================================================
// PERSONAL PRESETS ROUTES (STRICT EMPLOYEE ISOLATION)
// ============================================================================

// GET Personal Presets
app.get('/api/presets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await ensureDataLoaded();
    if (!ok && !hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Failed to synchronize with Google Sheets. Please verify connection and try again.' });
      return;
    }
  } catch (e: any) {
    console.warn('[PRESETS] ensureDataLoaded notice:', e?.message);
    if (!hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Google Sheets sync error: ' + (e?.message || 'Unable to load presets') });
      return;
    }
  }
  const user = req.user!;
  // Employee only sees presets belonging to their employeeId or email
  const userPresets = memoryPresets.filter(
    (p) => p.employeeId === user.id || p.employeeEmail.toLowerCase() === user.email.toLowerCase()
  );
  res.json(userPresets);
});

// CREATE Personal Preset
app.post('/api/presets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { presetName, task, title, requestedBy, quantity, workDone } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Title is required for preset.' });
    return;
  }

  const validTask = ['Videos', 'Shorts', 'Reels', 'Photos', 'Shootings', 'Others'].includes(task)
    ? task
    : 'Videos';

  const newPreset: PresetRecord = {
    id: `PRESET_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    employeeId: user.id,
    employeeEmail: user.email,
    presetName: (presetName || `${validTask} Preset`).trim(),
    task: validTask,
    title: title.trim(),
    requestedBy: (requestedBy || '').trim(),
    quantity: Number(quantity) > 0 ? Number(quantity) : 1,
    workDone: workDone === 'No' ? 'No' : 'Yes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await appendGoogleSheetRow('Presets', PRESET_HEADERS, formatPresetRow(newPreset));
  } catch (err: any) {
    console.error('[POST PRESET ERROR]', err);
    res.status(500).json({ error: 'Failed to save preset to Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  memoryPresets.unshift(newPreset);
  saveToLocalDb();

  res.status(201).json({
    preset: newPreset,
    message: 'Personal preset saved and synced.',
  });
});

// PUT Personal Preset
app.put('/api/presets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const presetId = req.params.id;

  const target = memoryPresets.find((p) => p.id === presetId);
  if (!target) {
    res.status(404).json({ error: 'Preset not found.' });
    return;
  }

  // Strict privacy ownership check
  if (target.employeeId !== user.id && target.employeeEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access denied. You do not own this preset.' });
    return;
  }

  const { presetName, task, title, requestedBy, quantity, workDone } = req.body;
  if (presetName !== undefined) target.presetName = presetName.trim();
  if (task !== undefined && ['Videos', 'Shorts', 'Reels', 'Photos', 'Shootings', 'Others'].includes(task)) {
    target.task = task;
  }
  if (title !== undefined) target.title = title.trim();
  if (requestedBy !== undefined) target.requestedBy = (requestedBy || '').trim();
  if (quantity !== undefined) target.quantity = Number(quantity) > 0 ? Number(quantity) : 1;
  if (workDone !== undefined) target.workDone = workDone === 'No' ? 'No' : 'Yes';
  target.updatedAt = new Date().toISOString();

  try {
    await updateGoogleSheetRowById('Presets', PRESET_HEADERS, presetId, formatPresetRow(target));
  } catch (err: any) {
    console.error('[PUT PRESET ERROR]', err);
    res.status(500).json({ error: 'Failed to update preset in Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  saveToLocalDb();

  res.json({ preset: target, message: 'Preset updated and synced successfully.' });
});

// DELETE Personal Preset
app.delete('/api/presets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const presetId = req.params.id;

  const targetIndex = memoryPresets.findIndex((p) => p.id === presetId);
  if (targetIndex === -1) {
    res.status(404).json({ error: 'Preset not found.' });
    return;
  }

  const target = memoryPresets[targetIndex];
  if (target.employeeId !== user.id && target.employeeEmail.toLowerCase() !== user.email.toLowerCase()) {
    res.status(403).json({ error: 'Access denied. You do not own this preset.' });
    return;
  }

  try {
    await deleteGoogleSheetRowById('Presets', presetId);
  } catch (sheetErr: any) {
    console.error('[GOOGLE SHEETS] Deletion failed for preset:', sheetErr.message);
    res.status(500).json({ error: 'Unable to delete. Please try again.' });
    return;
  }

  memoryPresets.splice(targetIndex, 1);
  saveToLocalDb();

  res.json({ success: true, message: 'Deleted successfully' });
});

// GET Authenticated Employees List (Employees who have actually logged in to the application)
app.get('/api/employees/authenticated', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const employees = await getPersistentEmployees(false);
  const authenticatedEmployees = employees
    .filter(
      (u) =>
        !isFakeDemoUser(u) &&
        (u.hasLoggedIn || u.lastLoginAt || (u.googleUserId && !u.googleUserId.startsWith('pending_')))
    )
    .map((u) => {
      u.role = resolveRole(u.email, u.role);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        profileImage: u.profileImage,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        hasLoggedIn: true,
      };
    });
  res.json({ employees: authenticatedEmployees });
});

// ============================================================================
// ATTENDANCE TRACKING ROUTES (MANUAL LOGIN / LOGOUT RECORDING)
// ============================================================================

// GET Attendance Records (Admin sees all; Employee sees self)
app.get('/api/attendance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const ok = await ensureDataLoaded();
    if (!ok && !hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Failed to synchronize with Google Sheets. Please verify connection and try again.' });
      return;
    }
  } catch (err: any) {
    console.warn('[ATTENDANCE] Google Sheets sync notice:', err?.message);
    if (!hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Google Sheets sync error: ' + (err?.message || 'Unable to load attendance') });
      return;
    }
  }

  const now = new Date();
  let records = memoryAttendance
    .filter((a) => !isFakeDemoAttendance(a))
    .map((a) => {
      let duration = a.duration;
      if (a.logoutTime && a.logoutTime.trim() !== '' && isZeroOrMissingDuration(duration)) {
        const calculated = calculateAttendanceDuration(a.date, a.loginTime, a.logoutTime);
        if (calculated && !isZeroOrMissingDuration(calculated)) {
          duration = calculated;
        }
      }
      const activeSec = calculateAttendanceActiveSeconds(a, now);
      const activeFormatted = formatActiveDuration(activeSec);
      const activeHours = activeSec > 0 ? activeFormatted : (!isZeroOrMissingDuration(a.activeHours) ? a.activeHours! : '00h 00m');
      return {
        ...a,
        duration: duration || (a.logoutTime ? '0h 00m' : 'In Progress'),
        activeHours,
        activeSeconds: activeSec,
        status: (a.logoutTime && a.logoutTime.trim() !== '' ? 'Completed' : 'Logged In') as 'Completed' | 'Logged In',
      };
    });

  if (user.role !== 'ADMIN') {
    // Non-admins see only their own attendance
    records = records.filter(
      (a) =>
        a.employeeEmail.toLowerCase() === user.email.toLowerCase() ||
        a.employeeId === user.id
    );
  } else {
    const { employeeId, employeeEmail, date, startDate, endDate, month } = req.query;
    const targetEmp = String(employeeEmail || employeeId || '').trim().toLowerCase();
    if (targetEmp && targetEmp !== 'all') {
      records = records.filter(
        (a) =>
          String(a.employeeEmail || '').toLowerCase() === targetEmp ||
          String(a.employeeId || '').toLowerCase() === targetEmp ||
          String(a.employeeName || '').toLowerCase() === targetEmp
      );
    }

    if (date) {
      records = records.filter((a) => a.date === date);
    }

    if (startDate && endDate) {
      records = records.filter((a) => a.date >= String(startDate) && a.date <= String(endDate));
    } else if (startDate) {
      records = records.filter((a) => a.date >= String(startDate));
    } else if (endDate) {
      records = records.filter((a) => a.date <= String(endDate));
    }

    if (month) {
      records = records.filter((a) => a.date.startsWith(String(month)));
    }
  }

  res.json({ attendance: records });
});

// GET Admin Attendance Calendar (Strictly protected by requireAdmin)
app.get('/api/admin/attendance-calendar', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ok = await ensureDataLoaded();
    if (!ok && !hasInitializedGoogleSheets) {
      res.status(503).json({ error: 'Failed to synchronize with Google Sheets.' });
      return;
    }
  } catch (err: any) {
    console.warn('[ADMIN ATTENDANCE CALENDAR] Google Sheets sync notice:', err?.message);
  }

  const now = new Date();
  let records = memoryAttendance
    .filter((a) => !isFakeDemoAttendance(a))
    .map((a) => {
      let duration = a.duration;
      if (a.logoutTime && a.logoutTime.trim() !== '' && isZeroOrMissingDuration(duration)) {
        const calculated = calculateAttendanceDuration(a.date, a.loginTime, a.logoutTime);
        if (calculated && !isZeroOrMissingDuration(calculated)) {
          duration = calculated;
        }
      }
      const activeSec = calculateAttendanceActiveSeconds(a, now);
      const activeFormatted = formatActiveDuration(activeSec);
      const activeHours = activeSec > 0 ? activeFormatted : (!isZeroOrMissingDuration(a.activeHours) ? a.activeHours! : '00h 00m');
      return {
        ...a,
        duration: duration || (a.logoutTime ? '0h 00m' : 'In Progress'),
        activeHours,
        activeSeconds: activeSec,
        status: (a.logoutTime && a.logoutTime.trim() !== '' ? 'Completed' : 'Logged In') as 'Completed' | 'Logged In',
      };
    });
  const requestedEmp = String(req.query.employeeId || req.query.employeeEmail || '').trim().toLowerCase();
  if (requestedEmp && requestedEmp !== 'all') {
    records = records.filter(
      (a) =>
        String(a.employeeId || '').toLowerCase() === requestedEmp ||
        String(a.employeeEmail || '').toLowerCase() === requestedEmp ||
        String(a.employeeName || '').toLowerCase() === requestedEmp
    );
  }

  const month = req.query.month ? String(req.query.month).trim() : ''; // YYYY-MM
  if (month) {
    records = records.filter((a) => a.date && a.date.startsWith(month));
  }

  res.json({ attendance: records });
});

// GET Current Attendance Status for logged-in user
app.get('/api/attendance/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const cleanEmail = user.email.trim().toLowerCase();
  const openRecord = memoryAttendance.find(
    (a) =>
      (a.employeeEmail.toLowerCase() === cleanEmail || a.employeeId === user.id) &&
      (!a.logoutTime || a.logoutTime.trim() === '' || a.status === 'Logged In')
  );

  const now = new Date();
  const currentServerTime = getKolkataTimeString(now);

  let activeRecord = openRecord || null;
  if (openRecord) {
    const activeSec = calculateAttendanceActiveSeconds(openRecord, now);
    activeRecord = {
      ...openRecord,
      activeSeconds: activeSec,
      activeHours: activeSec > 0 ? formatActiveDuration(activeSec) : (openRecord.activeHours || '00h 00m'),
    };
  }

  res.json({
    isLoggedIn: Boolean(openRecord),
    activeRecord,
    currentServerTime,
  });
});

// POST Manual Attendance Login:
// Creates a new attendance session for the authenticated user
app.post('/api/attendance/login', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const cleanEmail = user.email.trim().toLowerCase();

  // Check if user already has an active, open session
  const openRecord = memoryAttendance.find(
    (a) =>
      (a.employeeEmail.toLowerCase() === cleanEmail || a.employeeId === user.id) &&
      (!a.logoutTime || a.logoutTime.trim() === '' || a.status === 'Logged In')
  );

  if (openRecord) {
    const now = new Date();
    const activeSec = calculateAttendanceActiveSeconds(openRecord, now);
    const enrichedRecord = {
      ...openRecord,
      activeSeconds: activeSec,
      activeHours: activeSec > 0 ? formatActiveDuration(activeSec) : (openRecord.activeHours || '00h 00m'),
    };
    res.json({
      success: true,
      record: enrichedRecord,
      message: `Already logged in to attendance since ${openRecord.loginTime}.`,
    });
    return;
  }

  const now = new Date();
  const todayStr = getKolkataDateString(now);
  const timeStr = getKolkataTimeString(now);

  const newRecord: AttendanceRecord = {
    id: `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employeeId: user.id || 'EMP001',
    employeeName: user.name || cleanEmail.split('@')[0],
    employeeEmail: cleanEmail,
    date: todayStr,
    loginTime: timeStr,
    logoutTime: '',
    duration: 'In Progress',
    activeHours: '00h 00m',
    activeSeconds: 0,
    status: 'Logged In',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    await appendGoogleSheetRow('Attendance', ATTENDANCE_HEADERS, formatAttendanceRow(newRecord));
    console.log(`[ATTENDANCE] Recorded manual Attendance Login for ${cleanEmail} at ${timeStr} (Asia/Kolkata)`);
  } catch (err: any) {
    console.error('[ATTENDANCE LOGIN ERROR]', err);
    res.status(500).json({ error: 'Failed to record attendance in Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  memoryAttendance.unshift(newRecord);
  saveToLocalDb();

  res.json({
    success: true,
    record: newRecord,
    message: `Attendance login recorded at ${timeStr}`,
  });
});

// POST Manual Attendance Logout:
// Closes the user's active session, computes duration and active hours, and updates Google Sheets
app.post('/api/attendance/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const cleanEmail = user.email.trim().toLowerCase();

  // Find user's currently open attendance session
  const openRecord = memoryAttendance.find(
    (a) =>
      (a.employeeEmail.toLowerCase() === cleanEmail || a.employeeId === user.id) &&
      (!a.logoutTime || a.logoutTime.trim() === '' || a.status === 'Logged In')
  );

  if (!openRecord) {
    res.status(400).json({
      error: 'No active attendance session found. Please click Login first to start attendance tracking.',
    });
    return;
  }

  const now = new Date();
  const logoutTimeStr = getKolkataTimeString(now);

  openRecord.logoutTime = logoutTimeStr;
  openRecord.duration = calculateAttendanceDuration(openRecord.date, openRecord.loginTime, logoutTimeStr);
  const activeSec = calculateAttendanceActiveSeconds(openRecord, now);
  openRecord.activeSeconds = activeSec;
  openRecord.activeHours = formatActiveDuration(activeSec);
  openRecord.status = 'Completed';
  openRecord.updatedAt = now.toISOString();

  try {
    await updateGoogleSheetRowById('Attendance', ATTENDANCE_HEADERS, openRecord.id, formatAttendanceRow(openRecord));
    console.log(`[ATTENDANCE] Recorded manual Attendance Logout for ${cleanEmail}: ${openRecord.loginTime} -> ${logoutTimeStr} (Duration: ${openRecord.duration}, Active Hours: ${openRecord.activeHours})`);
  } catch (err: any) {
    console.error('[ATTENDANCE LOGOUT ERROR]', err);
    res.status(500).json({ error: 'Failed to record logout in Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  saveToLocalDb();

  res.json({
    success: true,
    record: openRecord,
    message: `Attendance logout recorded at ${logoutTimeStr}. Total duration: ${openRecord.duration}, Active hours: ${openRecord.activeHours}`,
  });
});

// DELETE Attendance Record (Admin or Owner)
app.delete('/api/attendance/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const attId = String(req.params.id || '').trim();
  if (!attId) {
    res.status(400).json({ error: 'Attendance record ID is required.' });
    return;
  }

  const target = memoryAttendance.find((a) => a.id === attId);
  if (!target) {
    res.status(404).json({ error: 'Attendance record not found.' });
    return;
  }

  const isOwner = target.employeeEmail.toLowerCase() === user.email.toLowerCase() || target.employeeId === user.id;
  if (user.role !== 'ADMIN' && !isOwner) {
    res.status(403).json({ error: 'Unauthorized to delete this attendance record.' });
    return;
  }

  try {
    await deleteGoogleSheetRowById('Attendance', attId);
  } catch (err: any) {
    console.error('[ATTENDANCE DELETE ERROR]', err);
    res.status(500).json({ error: 'Failed to delete attendance record from Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  memoryAttendance = memoryAttendance.filter((a) => a.id !== attId);
  saveToLocalDb();

  res.json({ success: true, message: 'Attendance record deleted successfully.' });
});

// ============================================================================
// ADMIN ROUTES (PROTECTED BY requireAdmin)
// ============================================================================

// GET Employees List
app.get('/api/admin/employees', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await getPersistentEmployees(true);
    const sanitized = employees.map((u) => {
      u.role = resolveRole(u.email, u.role);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        googleUserId: u.googleUserId,
        profileImage: u.profileImage,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        hasLoggedIn: Boolean(
          u.hasLoggedIn ||
          u.lastLoginAt ||
          (u.googleUserId && !u.googleUserId.startsWith('pending_'))
        ),
      };
    });
    res.json(sanitized);
  } catch (err: any) {
    console.error('[ADMIN EMPLOYEES] Error loading employees:', err?.message);
    res.status(500).json({ error: 'Failed to load employees from persistent Google Sheets.' });
  }
});

// CREATE Employee (Admin only)
app.post('/api/admin/employees', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, loginId, id, employeeId, password, role, status } = req.body;
  const finalId = (id || employeeId || '').trim().toUpperCase();

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Employee Name cannot be blank.' });
    return;
  }

  if (!finalId) {
    res.status(400).json({ error: 'Employee ID cannot be blank.' });
    return;
  }

  const rawLogin = (email || loginId || '').trim();
  const cleanEmail = (rawLogin || `${finalId.toLowerCase()}@flyingwhales.com`).toLowerCase();

  if (cleanEmail === 'admin@flyingwhales.com') {
    res.status(400).json({ error: 'This account is obsolete and cannot be re-added.' });
    return;
  }

  const employees = await getPersistentEmployees(false);

  // Employee ID handling & uniqueness check
  const existingId = employees.find((u) => u.id.toUpperCase() === finalId);
  if (existingId) {
    res.status(400).json({ error: 'Employee ID already exists.' });
    return;
  }

  // Check duplicate Login ID
  const existingLogin = employees.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingLogin) {
    res.status(400).json({ error: 'Employee ID already exists.' });
    return;
  }

  const finalRole: 'ADMIN' | 'EMPLOYEE' = role === 'ADMIN' || isUserAdmin(cleanEmail) ? 'ADMIN' : 'EMPLOYEE';
  const finalStatus: 'Active' | 'Inactive' = status === 'Inactive' ? 'Inactive' : 'Active';

  const newUser: UserRecord = {
    id: finalId,
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password || 'password123'),
    role: finalRole,
    status: finalStatus,
    createdAt: new Date().toISOString(),
    hasLoggedIn: false,
  };

  try {
    await appendGoogleSheetRow('Employees', EMPLOYEE_HEADERS, formatEmployeeRow(newUser));
  } catch (err: any) {
    console.error('[ADMIN EMPLOYEE CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to save employee to Google Sheets: ' + (err.message || 'Unknown error') });
    return;
  }

  persistentEmployeesCache.push(newUser);

  res.status(201).json({
    employee: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
      hasLoggedIn: false,
    },
    message: 'Employee created and saved in Google Sheets.',
  });
});

// UPDATE Employee (Admin only)
app.put('/api/admin/employees/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const empId = req.params.id;
  const employees = await getPersistentEmployees(false);
  const target = employees.find((u) => u.id.toUpperCase() === empId.toUpperCase());

  if (!target) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  const { id: newId, employeeId, name, email, loginId, role, status, password } = req.body;
  const finalNewId = (newId || employeeId || '').trim().toUpperCase();

  // Check duplicate Employee ID if changing
  if (finalNewId && finalNewId !== target.id.toUpperCase()) {
    const dupId = employees.find((u) => u.id.toUpperCase() === finalNewId && u.id.toUpperCase() !== target.id.toUpperCase());
    if (dupId) {
      res.status(400).json({ error: 'Employee ID already exists.' });
      return;
    }
    const oldId = target.id;
    target.id = finalNewId;
    // Update logs with new employeeId
    memoryWorkLogs.forEach((w) => {
      if (w.employeeId === oldId) w.employeeId = finalNewId;
    });
    memoryAttendance.forEach((a) => {
      if (a.employeeId === oldId) a.employeeId = finalNewId;
    });
  }

  // Check duplicate Login ID if changing
  const rawNewLogin = (email || loginId || '').trim();
  if (rawNewLogin && rawNewLogin.toLowerCase() !== target.email.toLowerCase()) {
    const cleanNewLogin = rawNewLogin.toLowerCase();
    const dupLogin = employees.find((u) => u.email.toLowerCase() === cleanNewLogin && u.id !== target.id);
    if (dupLogin) {
      res.status(400).json({ error: 'This Login ID is already registered.' });
      return;
    }
    target.email = cleanNewLogin;
  }

  if (name !== undefined && name.trim()) {
    target.name = name.trim();
    // Sync name in work logs
    memoryWorkLogs.forEach((w) => {
      if (w.employeeId === target.id) {
        w.employeeName = target.name;
      }
    });
    memoryAttendance.forEach((a) => {
      if (a.employeeId === target.id) {
        a.employeeName = target.name;
      }
    });
  }

  if (role !== undefined) {
    target.role = role === 'ADMIN' || isUserAdmin(target.email) ? 'ADMIN' : 'EMPLOYEE';
  }

  if (status !== undefined && (status === 'Active' || status === 'Inactive')) {
    target.status = status;
  }

  if (password && password.trim()) {
    target.passwordHash = hashPassword(password.trim());
  }

  try {
    await updateEmployeeInGoogleSheets(target);
  } catch (err: any) {
    console.error('[ADMIN EMPLOYEE UPDATE ERROR]', err);
    res.status(500).json({ error: 'Failed to update employee in Google Sheets.', details: err.message });
    return;
  }

  res.json({
    employee: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
      createdAt: target.createdAt,
    },
    message: 'Employee updated successfully.',
  });
});

// DELETE Employee (Admin only - permanently removes employee from Google Sheets and system)
app.delete('/api/admin/employees/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const empId = req.params.id;
  console.log(`[EMPLOYEE DELETE] Admin ${req.user!.email} requesting deletion of employee ID: ${empId}`);

  const employees = await getPersistentEmployees(false);
  const targetIndex = employees.findIndex((u) => u.id === empId);
  if (targetIndex === -1) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  const target = employees[targetIndex];
  if (target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || target.id === 'admin-junty') {
    res.status(403).json({ error: 'The primary Admin account cannot be deleted.' });
    return;
  }

  // 1. Delete from Google Sheets tab 'Employees'
  try {
    await deleteGoogleSheetRowById('Employees', empId);
  } catch (sheetErr: any) {
    console.error('[GOOGLE SHEETS] Deletion failed for employee:', sheetErr.message);
    res.status(500).json({ error: sheetErr.message || 'Unable to delete employee from Google Sheets. Please try again.' });
    return;
  }

  // 2. Remove from persistentEmployeesCache
  persistentEmployeesCache.splice(targetIndex, 1);
  console.log(`[EMPLOYEE DELETE] Successfully deleted employee ${target.name} (${target.email}, ID: ${empId})`);

  res.json({
    success: true,
    message: `Employee ${target.name} deleted successfully from Google Sheets.`,
  });
});

// ============================================================================
// MACOS EMPLOYEE COMPUTER ACTIVITY AGENT & PRESENCE ENDPOINTS
// ============================================================================

function formatActiveDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

function calculateIntervalDuration(interval: ComputerIntervalRecord, now: Date = new Date()): number {
  const startMs = new Date(interval.startTime).getTime();
  const endMs = new Date(interval.endTime).getTime();
  if (isNaN(startMs)) return 0;

  const baseDuration =
    interval.durationSeconds > 0
      ? interval.durationSeconds
      : Math.max(1, Math.round(((!isNaN(endMs) ? endMs : startMs) - startMs) / 1000));

  // If the interval is not marked closed and had activity within the grace period (90 seconds),
  // calculate the current live elapsed duration so open intervals immediately reflect working time.
  const nowMs = now.getTime();
  const isRecentActivity = !isNaN(endMs) && nowMs - endMs <= 90000;
  if (!interval.isClosed && isRecentActivity) {
    const liveElapsed = Math.max(
      baseDuration,
      Math.round((Math.min(nowMs, endMs + 90000) - startMs) / 1000)
    );
    return liveElapsed;
  }

  return baseDuration;
}

export function getEmployeeActiveSeconds(
  employeeId: string,
  deviceId: string | undefined,
  dateFilter: (dateStr: string) => boolean,
  now: Date = new Date()
): number {
  const cleanEmpId = employeeId.trim().toLowerCase();
  const cleanDevId = deviceId ? deviceId.trim().toUpperCase() : '';

  // 1. Calculate from all matching intervals (including live open active intervals)
  const matchingIntervals = memoryComputerIntervals.filter((i) => {
    if (!dateFilter(i.date)) return false;
    const matchEmp = i.employeeId && i.employeeId.trim().toLowerCase() === cleanEmpId;
    const matchDev = cleanDevId && i.deviceId && i.deviceId.trim().toUpperCase() === cleanDevId;
    return Boolean(matchEmp || matchDev);
  });

  const intervalsTotal = matchingIntervals.reduce((sum, i) => {
    return sum + calculateIntervalDuration(i, now);
  }, 0);

  // 2. Also check summaries to guard against cold-starts or sync lag
  const matchingSummaries = memoryComputerSummaries.filter((s) => {
    if (!dateFilter(s.date)) return false;
    const matchEmp = s.employeeId && s.employeeId.trim().toLowerCase() === cleanEmpId;
    const matchDev = cleanDevId && s.deviceId && s.deviceId.trim().toUpperCase() === cleanDevId;
    return Boolean(matchEmp || matchDev);
  });

  const summariesByDate = new Map<string, number>();
  for (const s of matchingSummaries) {
    const current = summariesByDate.get(s.date) || 0;
    summariesByDate.set(s.date, Math.max(current, s.totalActiveSeconds || 0));
  }
  const summariesTotal = Array.from(summariesByDate.values()).reduce((sum, val) => sum + val, 0);

  // Return the maximum so active time is never lost or reset to 0
  return Math.max(intervalsTotal, summariesTotal);
}

/**
 * Calculates the exact Active Hours for an Attendance Session by strictly intersecting
 * verified physical Mac ACTIVE intervals with the authenticated Attendance [loginTime -> logoutTime || now] window.
 *
 * Rules:
 * - Activity before loginTime contributes 0 seconds.
 * - Activity after logoutTime contributes 0 seconds.
 * - Periods of inactivity (>300s), sleep, or lock contribute 0 seconds.
 * - Live open active intervals extend up to now only while actively receiving heartbeats within 90s.
 * - If no real physical Mac activity exists during the shift, returns 0.
 */
export function calculateAttendanceActiveSeconds(
  attendanceRecord: AttendanceRecord,
  now: Date = new Date()
): number {
  if (!attendanceRecord.loginTime) return 0;
  const loginDate = parseKolkataDateTime(attendanceRecord.date, attendanceRecord.loginTime);
  if (!loginDate) return 0;
  const sessionStartMs = loginDate.getTime();

  let sessionEndMs = now.getTime();
  if (attendanceRecord.logoutTime && attendanceRecord.logoutTime.trim() !== '' && attendanceRecord.logoutTime.toLowerCase() !== 'in session') {
    const logoutDate = parseKolkataDateTime(attendanceRecord.date, attendanceRecord.logoutTime);
    if (logoutDate) {
      sessionEndMs = logoutDate.getTime();
      if (sessionEndMs < sessionStartMs) {
        // Shift spanned across midnight
        sessionEndMs += 24 * 60 * 60 * 1000;
      }
    }
  }

  const cleanEmpId = (attendanceRecord.employeeId || '').trim().toLowerCase();
  const cleanEmpEmail = (attendanceRecord.employeeEmail || '').trim().toLowerCase();
  const cleanEmpName = (attendanceRecord.employeeName || '').trim().toLowerCase();

  // Find paired physical Mac device(s) explicitly registered to this employee
  const pairedDeviceIds = new Set(
    memoryComputerDevices
      .filter((d) => {
        const matchId = d.employeeId && d.employeeId.trim().toLowerCase() === cleanEmpId;
        const matchEmail = d.employeeEmail && d.employeeEmail.trim().toLowerCase() === cleanEmpEmail;
        const matchName = cleanEmpName && d.employeeName && d.employeeName.trim().toLowerCase() === cleanEmpName;
        return Boolean(matchId || matchEmail || matchName);
      })
      .map((d) => d.id.trim().toUpperCase())
  );

  // Retrieve only real physical Mac ACTIVE intervals belonging to this employee
  const matchingIntervals = memoryComputerIntervals.filter((i) => {
    if (i.state !== 'ACTIVE') return false;
    const matchEmp = i.employeeId && i.employeeId.trim().toLowerCase() === cleanEmpId;
    const matchDev = i.deviceId && pairedDeviceIds.has(i.deviceId.trim().toUpperCase());
    return Boolean(matchEmp || matchDev);
  });

  const slices: [number, number][] = [];
  const nowMs = now.getTime();

  for (const interval of matchingIntervals) {
    const intStart = new Date(interval.startTime).getTime();
    let intEnd = new Date(interval.endTime).getTime();
    if (isNaN(intStart) || isNaN(intEnd)) continue;

    // If live open active interval with recent heartbeat within 90s, active time extends to now:
    if (!interval.isClosed && nowMs - intEnd <= 90000) {
      intEnd = Math.max(intEnd, nowMs);
    }

    // Intersect interval with the attendance session window [sessionStartMs, sessionEndMs]
    const overlapStart = Math.max(intStart, sessionStartMs);
    const overlapEnd = Math.min(intEnd, sessionEndMs);

    if (overlapEnd > overlapStart) {
      slices.push([overlapStart, overlapEnd]);
    }
  }

  if (slices.length === 0) return 0;

  // Merge overlapping or adjacent slices to guarantee zero double-counting
  slices.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [slices[0]];
  for (let i = 1; i < slices.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = slices[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }

  const totalActiveMs = merged.reduce((sum, slice) => sum + (slice[1] - slice[0]), 0);
  return Math.round(totalActiveMs / 1000);
}

// 1. REGISTER MACOS DEVICE (Admin or Authenticated Employee)
app.post('/api/presence/register-device', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await ensureDataLoaded();
  const user = req.user!;
  const { deviceModel, macOSVersion, requestedDeviceId, targetEmployeeId } = req.body;

  let assignedEmployeeId = user.id;
  let assignedEmployeeName = user.name;
  let assignedEmployeeEmail = user.email;

  // If Admin is registering on behalf of an employee
  if (user.role === 'ADMIN' && targetEmployeeId && targetEmployeeId !== user.id) {
    const allEmps = await getPersistentEmployees(false);
    const target = allEmps.find((e) => e.id === targetEmployeeId || e.email.toLowerCase() === targetEmployeeId.toLowerCase());
    if (target) {
      assignedEmployeeId = target.id;
      assignedEmployeeName = target.name;
      assignedEmployeeEmail = target.email;
    }
  }

  // Generate or sanitize device ID (format: FW-MAC-XXXXXXXX)
  let cleanDeviceId = String(requestedDeviceId || '').trim().toUpperCase();
  if (!cleanDeviceId || !cleanDeviceId.startsWith('FW-MAC-')) {
    cleanDeviceId = `FW-MAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // Generate a cryptographically secure 256-bit device secret
  const deviceSecret = `fw_sec_${crypto.randomBytes(16).toString('hex')}`;
  const deviceSecretHash = hashDeviceSecret(deviceSecret);

  // Check if device already registered, update if exists or push new
  const existingIdx = memoryComputerDevices.findIndex((d) => d.id === cleanDeviceId);
  const nowIso = new Date().toISOString();

  const newDevice: ComputerDeviceRecord = {
    id: cleanDeviceId,
    employeeId: assignedEmployeeId,
    employeeName: assignedEmployeeName,
    employeeEmail: assignedEmployeeEmail,
    deviceModel: deviceModel || 'Mac mini (Apple Silicon)',
    macOSVersion: macOSVersion || 'macOS 15.0',
    status: 'Active',
    registeredAt: nowIso,
    lastSeenAt: '',
    deviceSecretHash,
    isRegisteredAgent: true,
  };

  if (existingIdx !== -1) {
    memoryComputerDevices[existingIdx] = newDevice;
  } else {
    memoryComputerDevices.push(newDevice);
  }

  saveToLocalDb();
  updateGoogleSheetRowById('Devices', DEVICE_HEADERS, newDevice.id, formatDeviceRow(newDevice)).catch((err) =>
    console.warn('[GOOGLE SHEETS] Error syncing registered device:', err.message)
  );

  console.log(`[PRESENCE] Registered macOS device ${cleanDeviceId} for employee ${assignedEmployeeName} (${assignedEmployeeEmail})`);

  res.json({
    success: true,
    message: `Mac device ${cleanDeviceId} successfully registered for ${assignedEmployeeName}.`,
    device: {
      id: newDevice.id,
      employeeId: newDevice.employeeId,
      employeeName: newDevice.employeeName,
      employeeEmail: newDevice.employeeEmail,
      deviceModel: newDevice.deviceModel,
      macOSVersion: newDevice.macOSVersion,
      status: newDevice.status,
      registeredAt: newDevice.registeredAt,
    },
    // The plaintext secret is ONLY returned upon registration for configuration into the local Mac agent
    deviceSecret,
    config: {
      deviceId: newDevice.id,
      deviceSecret,
      employeeId: newDevice.employeeId,
      employeeName: newDevice.employeeName,
      inactivityThresholdSeconds: INACTIVITY_THRESHOLD_SECONDS, // Exactly 300 seconds
      heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,     // 30 seconds
    },
  });
});

// 2. RECEIVE MACOS AGENT HEARTBEAT
// Endpoint: POST /api/presence/heartbeat
// Measures actual active computer working time (keyboard/mouse while awake and unlocked)
app.post('/api/presence/heartbeat', async (req: Request, res: Response) => {
  const { deviceId, deviceSecret, timestamp, state, activityDetail, deviceModel, macosVersion } = req.body;

  if (!deviceId || !deviceSecret) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing device credentials. Phone web sessions cannot generate computer activity time.',
    });
    return;
  }

  // Ensure data loaded on cold-starts
  if (memoryComputerDevices.length === 0) {
    await ensureDataLoaded();
  }

  const cleanReqDeviceId = String(deviceId || '').trim().toUpperCase();
  // Verify device exists and is active (paired, not revoked)
  const device = memoryComputerDevices.find(
    (d) => d.id.trim().toUpperCase() === cleanReqDeviceId && d.status !== 'Revoked'
  );
  if (!device) {
    res.status(403).json({
      success: false,
      error: `Forbidden: Device ${deviceId} is not registered or has been revoked.`,
    });
    return;
  }

  // Verify cryptographic secret
  const incomingHash = hashDeviceSecret(deviceSecret);
  if (!device.deviceSecretHash || device.deviceSecretHash === 'PENDING_FIRST_HEARTBEAT') {
    // Securely lock in cryptographic secret hash from the real paired device
    device.deviceSecretHash = incomingHash;
    saveToLocalDb();
    updateGoogleSheetRowById('Devices', DEVICE_HEADERS, device.id, formatDeviceRow(device)).catch((err) =>
      console.warn('[GOOGLE SHEETS] Error syncing device secret hash:', err.message)
    );
    console.log(`[PRESENCE] Cryptographic secret hash established for physical device ${device.id} (${device.employeeName})`);
  } else if (incomingHash !== device.deviceSecretHash) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid device authentication secret.',
    });
    return;
  }

  // Clock skew validation: heartbeat timestamp must be within 5 minutes of server time
  const heartbeatTime = new Date(timestamp || Date.now());
  const now = new Date();
  if (Math.abs(now.getTime() - heartbeatTime.getTime()) > 300000) {
    console.warn(`[HEARTBEAT] Clock skew detected for device ${deviceId}. Adjusting to server time.`);
  }

  const nowIso = now.toISOString();
  const todayKolkata = getKolkataDateString(now);

  // Update hardware model info if provided
  if (deviceModel && !device.deviceModel.includes('Apple')) {
    device.deviceModel = deviceModel;
  }
  if (macosVersion) {
    device.macOSVersion = macosVersion;
  }
  device.lastSeenAt = nowIso;

  const validState = (['ACTIVE', 'INACTIVE', 'SLEEPING', 'LOCKED'] as const).includes(state) ? state : 'INACTIVE';

  // INTERVAL LOGIC:
  // Find open interval for this device on today's date
  const openInterval = memoryComputerIntervals
    .slice()
    .reverse()
    .find((i) => {
      const matchDev = i.deviceId && i.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase();
      const matchEmp = i.employeeId && i.employeeId.trim().toLowerCase() === device.employeeId.trim().toLowerCase();
      return (matchDev || matchEmp) && i.date === todayKolkata && i.state === 'ACTIVE' && !i.isClosed;
    });

  const GRACE_PERIOD_MS = 90000; // 90 seconds (heartbeat is sent every 30s)
  let currentInterval: ComputerIntervalRecord | null = null;

  if (validState === 'ACTIVE') {
    if (openInterval) {
      const intervalEndMs = new Date(openInterval.endTime).getTime();
      // If previous heartbeat was within 90s, extend this active interval
      if (now.getTime() - intervalEndMs <= GRACE_PERIOD_MS) {
        openInterval.endTime = nowIso;
        openInterval.durationSeconds = Math.max(
          1,
          Math.round((new Date(openInterval.endTime).getTime() - new Date(openInterval.startTime).getTime()) / 1000)
        );
        currentInterval = openInterval;
      } else {
        // Interval expired due to gap (e.g. sleep/offline/inactivity > 90s), finalize old and start fresh
        openInterval.isClosed = true;
        const newInterval: ComputerIntervalRecord = {
          id: `INT_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          deviceId: device.id,
          employeeId: device.employeeId,
          employeeName: device.employeeName,
          date: todayKolkata,
          startTime: nowIso,
          endTime: nowIso,
          durationSeconds: 1,
          state: 'ACTIVE',
          createdAt: nowIso,
        };
        memoryComputerIntervals.push(newInterval);
        currentInterval = newInterval;
      }
    } else {
      // No open interval; start new one
      const newInterval: ComputerIntervalRecord = {
        id: `INT_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        deviceId: device.id,
        employeeId: device.employeeId,
        employeeName: device.employeeName,
        date: todayKolkata,
        startTime: nowIso,
        endTime: nowIso,
        durationSeconds: 1,
        state: 'ACTIVE',
        createdAt: nowIso,
      };
      memoryComputerIntervals.push(newInterval);
      currentInterval = newInterval;
    }
  } else {
    // If state is INACTIVE, SLEEPING, or LOCKED:
    // Close the open interval so it stops extending
    if (openInterval) {
      openInterval.isClosed = true;
      currentInterval = openInterval;
    }
  }

  // Ensure prior active time from summary is anchored in intervals before computing
  const existingSummary = memoryComputerSummaries.find(
    (s) =>
      s.date === todayKolkata &&
      ((s.employeeId && s.employeeId.trim().toLowerCase() === device.employeeId.trim().toLowerCase()) ||
        (s.deviceId && s.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase()))
  );
  if (existingSummary && existingSummary.totalActiveSeconds > 0) {
    const cleanEmp = device.employeeId.trim().toLowerCase();
    const cleanDev = device.id.trim().toUpperCase();
    const currentIntervalsSum = memoryComputerIntervals
      .filter(
        (i) =>
          i.date === todayKolkata &&
          ((i.employeeId && i.employeeId.trim().toLowerCase() === cleanEmp) ||
            (i.deviceId && i.deviceId.trim().toUpperCase() === cleanDev))
      )
      .reduce((sum, i) => sum + (i.durationSeconds || 0), 0);

    if (existingSummary.totalActiveSeconds > currentIntervalsSum) {
      const deficit = existingSummary.totalActiveSeconds - currentIntervalsSum;
      const baselineId = `INT_PRIOR_${todayKolkata}_${(device.employeeId || device.id).toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;
      let prior = memoryComputerIntervals.find((i) => i.id === baselineId);
      if (!prior) {
        const refTime = now.getTime() - (currentInterval ? currentInterval.durationSeconds * 1000 : 0);
        const priorEndTime = new Date(refTime - 30000).toISOString();
        const priorStartTime = new Date(refTime - 30000 - deficit * 1000).toISOString();
        prior = {
          id: baselineId,
          deviceId: device.id,
          employeeId: device.employeeId,
          employeeName: device.employeeName,
          date: todayKolkata,
          startTime: priorStartTime,
          endTime: priorEndTime,
          durationSeconds: deficit,
          state: 'ACTIVE',
          createdAt: priorStartTime,
          isClosed: true,
        };
        memoryComputerIntervals.unshift(prior);
        updateGoogleSheetRowById(
          'ComputerIntervals',
          COMPUTER_INTERVAL_HEADERS,
          prior.id,
          formatComputerIntervalRow(prior)
        ).catch((err) =>
          console.warn('[GOOGLE SHEETS] Notice: could not persist baseline interval:', err.message)
        );
      } else if (prior.durationSeconds < deficit) {
        prior.durationSeconds = deficit;
      }
    }
  }

  // Calculate today's total active seconds for this employee using getEmployeeActiveSeconds
  const totalActiveSeconds = getEmployeeActiveSeconds(
    device.employeeId,
    device.id,
    (d) => d === todayKolkata,
    now
  );
  const activeFormatted = formatActiveDuration(totalActiveSeconds);

  // Update or insert daily summary
  let summary = existingSummary;

  const todayIntervalsCount = memoryComputerIntervals.filter(
    (i) =>
      i.date === todayKolkata &&
      ((i.employeeId && i.employeeId.trim().toLowerCase() === device.employeeId.trim().toLowerCase()) ||
        (i.deviceId && i.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase()))
  ).length;

  if (!summary) {
    summary = {
      date: todayKolkata,
      employeeId: device.employeeId,
      employeeName: device.employeeName,
      employeeEmail: device.employeeEmail,
      deviceId: device.id,
      deviceModel: device.deviceModel,
      totalActiveSeconds,
      intervalsCount: todayIntervalsCount,
      lastState: validState,
      lastHeartbeatAt: nowIso,
      lastInputType: activityDetail?.inputType || 'mouse',
    };
    memoryComputerSummaries.push(summary);
  } else {
    // Never allow totalActiveSeconds to decrease
    summary.totalActiveSeconds = Math.max(summary.totalActiveSeconds || 0, totalActiveSeconds);
    summary.intervalsCount = Math.max(summary.intervalsCount || 0, todayIntervalsCount);
    summary.lastState = validState;
    summary.lastHeartbeatAt = nowIso;
    summary.lastInputType = activityDetail?.inputType || summary.lastInputType;
  }

  // If the employee currently has an open attendance session, update its active hours immediately
  const openAttendance = memoryAttendance.find(
    (a) =>
      ((a.employeeId && a.employeeId.trim().toLowerCase() === device.employeeId.trim().toLowerCase()) ||
        (a.employeeEmail && a.employeeEmail.trim().toLowerCase() === device.employeeEmail.trim().toLowerCase())) &&
      (!a.logoutTime || a.logoutTime.trim() === '' || a.status === 'Logged In')
  );
  if (openAttendance) {
    const attActiveSec = calculateAttendanceActiveSeconds(openAttendance, now);
    openAttendance.activeSeconds = attActiveSec;
    openAttendance.activeHours = formatActiveDuration(attActiveSec);
    openAttendance.updatedAt = nowIso;
  }

  saveToLocalDb();
  updateGoogleSheetRowById('Devices', DEVICE_HEADERS, device.id, formatDeviceRow(device)).catch((err) =>
    console.warn('[GOOGLE SHEETS] Error updating device lastSeenAt:', err.message)
  );
  updateGoogleSheetRowById(
    'ComputerSummaries',
    COMPUTER_SUMMARY_HEADERS,
    `${summary.date}_${summary.employeeId || summary.deviceId}`,
    formatComputerSummaryRow(summary)
  ).catch((err) =>
    console.warn('[GOOGLE SHEETS] Error updating computer summary:', err.message)
  );
  if (currentInterval) {
    updateGoogleSheetRowById(
      'ComputerIntervals',
      COMPUTER_INTERVAL_HEADERS,
      currentInterval.id,
      formatComputerIntervalRow(currentInterval)
    ).catch((err) =>
      console.warn('[GOOGLE SHEETS] Error updating computer interval:', err.message)
    );
  }

  res.json({
    success: true,
    currentDayActiveSeconds: totalActiveSeconds,
    activeFormatted,
    serverTime: nowIso,
  });
});

// 3. GET CURRENT LOGGED-IN EMPLOYEE'S COMPUTER ACTIVITY
// Endpoint: GET /api/presence/my-activity (Employee only sees their own data)
app.get('/api/presence/my-activity', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  await ensureDataLoaded();
  const user = req.user!;
  const todayKolkata = getKolkataDateString(new Date());

  const userCleanEmail = user.email.toLowerCase().trim();
  const userCleanId = user.id.trim();

  // Find paired device (any paired device that is not revoked)
  const device = memoryComputerDevices.find(
    (d) =>
      d.status !== 'Revoked' &&
      ((d.employeeId && d.employeeId.trim().toLowerCase() === userCleanId.toLowerCase()) ||
        (d.employeeEmail && d.employeeEmail.trim().toLowerCase() === userCleanEmail))
  );

  // Filter intervals for this employee
  const todayIntervals = memoryComputerIntervals.filter(
    (i) =>
      i.date === todayKolkata &&
      ((i.employeeId && i.employeeId.trim().toLowerCase() === userCleanId.toLowerCase()) ||
        (device && i.deviceId && i.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase()))
  );

  const now = new Date();
  const todayActiveSeconds = getEmployeeActiveSeconds(
    userCleanId,
    device?.id,
    (d) => d === todayKolkata,
    now
  );

  // Compute weekly active seconds (last 7 days)
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weeklyActiveSeconds = getEmployeeActiveSeconds(
    userCleanId,
    device?.id,
    (d) => d >= oneWeekAgo && d <= todayKolkata,
    now
  );

  // Compute monthly active seconds (current month)
  const currentMonth = todayKolkata.substring(0, 7);
  const monthlyActiveSeconds = getEmployeeActiveSeconds(
    userCleanId,
    device?.id,
    (d) => d.startsWith(currentMonth),
    now
  );

  // Determine current active status based on last seen heartbeat
  let currentState: 'ACTIVE' | 'INACTIVE' | 'SLEEPING' | 'LOCKED' | 'OFFLINE' = 'OFFLINE';
  if (device && device.lastSeenAt) {
    const lastSeenMs = new Date(device.lastSeenAt).getTime();
    const isRecent = !isNaN(lastSeenMs) && Date.now() - lastSeenMs <= 90000;
    if (isRecent) {
      const summary = memoryComputerSummaries.find(
        (s) =>
          ((s.employeeId && s.employeeId.trim().toLowerCase() === userCleanId.toLowerCase()) ||
            (s.deviceId && s.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase())) &&
          s.date === todayKolkata
      );
      currentState = (summary?.lastState as any) || 'ACTIVE';
    } else {
      currentState = 'OFFLINE';
    }
  }

  res.json({
    success: true,
    employeeId: user.id,
    employeeName: user.name,
    employeeEmail: user.email,
    device: device
      ? {
          id: device.id,
          deviceModel: device.deviceModel,
          macOSVersion: device.macOSVersion,
          lastSeenAt: device.lastSeenAt,
          status: device.status,
        }
      : null,
    currentState,
    todayActiveSeconds,
    todayActiveFormatted: formatActiveDuration(todayActiveSeconds),
    weeklyActiveSeconds,
    weeklyActiveFormatted: formatActiveDuration(weeklyActiveSeconds),
    monthlyActiveSeconds,
    monthlyActiveFormatted: formatActiveDuration(monthlyActiveSeconds),
    intervals: todayIntervals,
  });
});

// 4. ADMIN: GET ALL EMPLOYEES COMPUTER ACTIVITY
// Endpoint: GET /api/admin/computer-activity (Strictly protected by requireAdmin)
app.get('/api/admin/computer-activity', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await ensureDataLoaded();
  const employees = await getPersistentEmployees(false);
  const todayKolkata = getKolkataDateString(new Date());
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const currentMonth = todayKolkata.substring(0, 7);

  const overviewList = employees.map((emp) => {
    const empCleanId = emp.id.trim();
    const empCleanEmail = emp.email.toLowerCase().trim();

    // Match paired device (must not be revoked, match employee ID or employee email)
    const device = memoryComputerDevices.find((d) => {
      if (d.status === 'Revoked') return false;
      const matchId = d.employeeId && d.employeeId.trim().toLowerCase() === empCleanId.toLowerCase();
      const matchEmail = d.employeeEmail && d.employeeEmail.trim().toLowerCase() === empCleanEmail;
      return Boolean(matchId || matchEmail);
    });

    // Match summary for today
    const summary = memoryComputerSummaries.find(
      (s) =>
        s.date === todayKolkata &&
        ((s.employeeId && s.employeeId.trim().toLowerCase() === empCleanId.toLowerCase()) ||
          (device && s.deviceId && s.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase()))
    );

    // Filter intervals
    let todayIntervals = memoryComputerIntervals.filter(
      (i) =>
        i.date === todayKolkata &&
        ((i.employeeId && i.employeeId.trim().toLowerCase() === empCleanId.toLowerCase()) ||
          (device && i.deviceId && i.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase()))
    );

    const now = new Date();

    // Reconcile and anchor baseline intervals if summaries have higher active time
    if (summary && summary.totalActiveSeconds > 0) {
      const intervalsSum = todayIntervals.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);
      if (summary.totalActiveSeconds > intervalsSum) {
        const deficit = summary.totalActiveSeconds - intervalsSum;
        const baselineId = `INT_PRIOR_${todayKolkata}_${(emp.id || device?.id || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`;
        let prior = memoryComputerIntervals.find((i) => i.id === baselineId);
        if (!prior) {
          const refTime = summary.lastHeartbeatAt ? new Date(summary.lastHeartbeatAt).getTime() : now.getTime();
          const priorEndTime = new Date(refTime - 60000).toISOString();
          const priorStartTime = new Date(refTime - 60000 - deficit * 1000).toISOString();
          prior = {
            id: baselineId,
            deviceId: device ? device.id : (summary.deviceId || 'MACOS-DEVICE'),
            employeeId: emp.id,
            employeeName: emp.name,
            date: todayKolkata,
            startTime: priorStartTime,
            endTime: priorEndTime,
            durationSeconds: deficit,
            state: 'ACTIVE',
            createdAt: priorStartTime,
            isClosed: true,
          };
          memoryComputerIntervals.unshift(prior);
          todayIntervals.unshift(prior);
        } else if (prior.durationSeconds < deficit) {
          prior.durationSeconds = deficit;
        }
      }
    }

    const todayActiveSeconds = getEmployeeActiveSeconds(
      empCleanId,
      device?.id,
      (d) => d === todayKolkata,
      now
    );

    const weeklyActiveSeconds = getEmployeeActiveSeconds(
      empCleanId,
      device?.id,
      (d) => d >= oneWeekAgo && d <= todayKolkata,
      now
    );

    const monthlyActiveSeconds = getEmployeeActiveSeconds(
      empCleanId,
      device?.id,
      (d) => d.startsWith(currentMonth),
      now
    );

    let currentState: 'ACTIVE' | 'INACTIVE' | 'SLEEPING' | 'LOCKED' | 'OFFLINE' = 'OFFLINE';
    if (device && device.lastSeenAt) {
      const lastSeenMs = new Date(device.lastSeenAt).getTime();
      const isRecent = !isNaN(lastSeenMs) && Date.now() - lastSeenMs <= 90000;
      if (isRecent) {
        const summary = memoryComputerSummaries.find(
          (s) =>
            ((s.employeeId && s.employeeId.trim().toLowerCase() === empCleanId.toLowerCase()) ||
              (s.deviceId && s.deviceId.trim().toUpperCase() === device.id.trim().toUpperCase())) &&
            s.date === todayKolkata
        );
        currentState = (summary?.lastState as any) || 'ACTIVE';
      } else {
        currentState = 'OFFLINE';
      }
    }

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      employeeEmail: emp.email,
      role: emp.role,
      device: device
        ? {
            id: device.id,
            deviceModel: device.deviceModel,
            macOSVersion: device.macOSVersion,
            lastSeenAt: device.lastSeenAt,
            status: device.status,
            registeredAt: device.registeredAt,
          }
        : null,
      currentState,
      todayActiveSeconds,
      todayActiveFormatted: formatActiveDuration(todayActiveSeconds),
      weeklyActiveSeconds,
      weeklyActiveFormatted: formatActiveDuration(weeklyActiveSeconds),
      monthlyActiveSeconds,
      monthlyActiveFormatted: formatActiveDuration(monthlyActiveSeconds),
      lastSeen: device?.lastSeenAt || '',
      intervals: todayIntervals.map((int) => ({
        ...int,
        durationSeconds: calculateIntervalDuration(int, now),
      })),
    };
  });

  res.json({
    success: true,
    todayDate: todayKolkata,
    employees: overviewList,
  });
});

// 5. ADMIN: GET REGISTERED DEVICES
app.get('/api/admin/devices', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await ensureDataLoaded();
  res.json({
    success: true,
    devices: memoryComputerDevices.filter((d) => d.status !== 'Revoked'),
  });
});

// 6. ADMIN: REVOKE OR DELETE DEVICE
app.delete('/api/admin/devices/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = req.params.id;
  const idx = memoryComputerDevices.findIndex((d) => d.id.trim().toUpperCase() === deviceId.trim().toUpperCase());
  if (idx === -1) {
    res.status(404).json({ error: 'Device not found.' });
    return;
  }

  const removed = memoryComputerDevices.splice(idx, 1)[0];
  saveToLocalDb();

  deleteGoogleSheetRowById('Devices', removed.id).catch((err) =>
    console.warn('[GOOGLE SHEETS] Error deleting revoked device:', err.message)
  );

  console.log(`[DEVICES] Admin revoked device ${removed.id} for employee ${removed.employeeName}`);
  res.json({ success: true, message: `Device ${removed.id} revoked successfully.` });
});


// Explicitly ensure /api/* routes return JSON 404 and NEVER fall through to HTML
app.all(['/api', '/api/*', '/api/*all'], (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
});

// On Vercel serverless functions, any unmatched request must be closed to avoid hanging invocations.
if (isVercel) {
  app.use((req: Request, res: Response) => {
    console.warn(`[VERCEL UNMATCHED ROUTE] ${req.method} ${req.originalUrl || req.url}`);
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}` });
  });
}

// Global error handler ensuring responses are always JSON and never plain text
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API GLOBAL ERROR]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.setHeader('Content-Type', 'application/json');
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    errorId: `ERR-${Date.now()}`
  });
});

// START EXPRESS SERVER WITH VITE SPA MIDDLEWARE (Standalone / Local / Container environment)

// Export the Express app as default and named exports
export default app;
export {
  app,
  loadDataFromGoogleSheets,
  syncWithCentralGoogleSheet,
  hasInitializedGoogleSheets,
  PORT
};
