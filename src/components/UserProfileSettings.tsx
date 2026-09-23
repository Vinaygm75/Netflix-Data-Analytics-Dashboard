import React, { useState, useEffect } from 'react';
import { User, GoogleConnectionStatus } from '../types';
import {
  User as UserIcon,
  Sun,
  CheckCircle2,
  FolderSync,
  FileSpreadsheet,
  Edit2,
  Palette,
  Download,
  Shield,
} from 'lucide-react';

interface UserProfileSettingsProps {
  user: User;
  onUpdatePassword?: (newPassword: string) => Promise<void>;
  onUpdateProfile?: (name: string) => Promise<void>;
  googleStatus: GoogleConnectionStatus | null;
  onOpenGoogleModal: () => void;
  tabType: 'profile' | 'settings';
  onDownloadExcel?: () => void;
  isDownloadingExcel?: boolean;
}

export const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({
  user,
  onUpdateProfile,
  googleStatus,
  onOpenGoogleModal,
  tabType,
  onDownloadExcel,
  isDownloadingExcel = false,
}) => {
  // Display Name editing
  const [displayName, setDisplayName] = useState(user.name);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.name);
  }, [user.name]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setNameError('Display name cannot be empty.');
      return;
    }
    if (!onUpdateProfile) return;

    setNameLoading(true);
    setNameError(null);
    try {
      await onUpdateProfile(displayName.trim());
      setNameSuccess(true);
      showToast('Display name updated and saved to Google Sheets.');
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name in Google Sheets.');
      setDisplayName(user.name);
    } finally {
      setNameLoading(false);
    }
  };

  return (
    <div className="relative pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Content Cards */}
      <div className="space-y-6 max-w-3xl relative z-10">
        {/* Identity & Display Name Card */}
        <div className="liquid-glass-card rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1a66c2] to-sky-400 text-white font-black text-xl flex items-center justify-center shadow-md border border-white/20 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Login ID: {user.email}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-blue-500/15 text-[#1a66c2] dark:text-sky-300 border border-blue-500/20'
                    }`}
                  >
                    {user.role === 'ADMIN' && <Shield className="w-3 h-3 text-purple-600" />}
                    {user.role}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                    ID: {user.id}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    • {user.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Display Name Form */}
          <div className="pt-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#1a66c2] dark:text-sky-400" />
              <span>Update Display Name</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Edit how your name appears on video production records, Google Sheets, and team dashboards.
            </p>

            {nameError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <span>{nameError}</span>
              </div>
            )}

            {nameSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Name updated and synced to Google Sheets successfully!</span>
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="space-y-3 max-w-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/20"
                />
              </div>

              <button
                type="submit"
                disabled={nameLoading || displayName.trim() === user.name}
                className="px-5 py-2.5 rounded-xl liquid-btn-primary text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {nameLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Note on Password Security: Only Admin sets passwords */}
        <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Account Security Note: </span>
          Studio login credentials and passwords are created and managed by the Studio Administrator (Junty). Contact your Admin if you need credential assistance.
        </div>

        {/* Application Theme Information */}
        <div className="liquid-glass-card rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#1a66c2] dark:text-sky-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Application Theme</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300 border border-blue-500/20 dark:border-sky-500/30">
              Liquid Glass iOS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Flying Whales Ad Films operates in an iOS-inspired Liquid Glass design language with translucent frosted surfaces, signature primary blue (#1a66c2), and layered depth.
          </p>

          <div className="p-4 rounded-xl liquid-glass-tile flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a66c2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Liquid Glass iOS Design Language</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Featuring frosted translucent materials, ambient depth, crisp typography, and real-time Google Sheets synchronization.
              </div>
            </div>
          </div>
        </div>

        {/* Google Sheets & Drive Storage Integration */}
        <div className="liquid-glass-card rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Central Google Sheets & Google Drive</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spreadsheet:{' '}
                <code className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {googleStatus?.spreadsheetName || 'Flying Whales Central Studio Data'}
                </code>
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Google Sheets Active</span>
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-6">
            <div className="flex justify-between py-2 border-b border-slate-200/50 dark:border-white/5">
              <span>Tabs Maintained</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Employees, WorkLogs, Attendance, Notes
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200/50 dark:border-white/5">
              <span>Last Synchronized</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {googleStatus?.lastSync ? new Date(googleStatus.lastSync).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Just now'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200/50 dark:border-white/5">
              <span>Privacy Isolation</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Enforced (Employees see their work; notes strictly private)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenGoogleModal}
              className="px-4 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span>Configure Google Sheets & Drive</span>
            </button>

            <a
              href={`https://docs.google.com/spreadsheets/d/${(googleStatus?.spreadsheetId && googleStatus.spreadsheetId !== '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' ? googleStatus.spreadsheetId : '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE').replace('1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKI94sDLPJRE', '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE')}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl liquid-btn-secondary text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Open in Google Sheets</span>
            </a>
          </div>
        </div>

        {/* DATA & EXPORT (Sole Location for Download Excel Button) */}
        <div id="data-export-section" className="liquid-glass-card rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark:border-emerald-500/30 shrink-0 shadow-xs">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <span>Data & Export</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Download real production records categorized into worksheets for Junty, Prajwal, Darshan, and Vinay as a formatted Excel (.xlsx) file.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 self-start sm:self-auto shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>XLSX Export Ready</span>
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-5">
            <div className="flex flex-wrap items-center justify-between py-2 border-b border-slate-200/50 dark:border-white/5 gap-1">
              <span>Worksheet Tabs</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                1. Junty | 2. Prajwal | 3. Darshan | 4. Vinay
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between py-2 border-b border-slate-200/50 dark:border-white/5 gap-1">
              <span>Columns</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Date, Task, Status, Requested By, Requested Date, Quantity of Deliverables, Work Done
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between py-2 border-b border-slate-200/50 dark:border-white/5 gap-1">
              <span>File Format</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Microsoft Excel (.xlsx) generated with ExcelJS
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onDownloadExcel && (
              <button
                id="profile-download-excel-btn"
                type="button"
                onClick={onDownloadExcel}
                disabled={isDownloadingExcel}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                title="Download genuine Google Sheets production data as .xlsx"
              >
                {isDownloadingExcel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting Production Data...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Excel (.xlsx)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
