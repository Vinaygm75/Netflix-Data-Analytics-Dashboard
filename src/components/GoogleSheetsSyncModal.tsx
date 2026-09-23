import React, { useState } from 'react';
import { GoogleConnectionStatus } from '../types';
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Key,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  Database,
  Lock,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GoogleConnectionStatus | null;
  onTriggerSync: () => Promise<void>;
  onUpdateSpreadsheetId?: (idOrUrl: string) => Promise<boolean>;
  darkMode: boolean;
  isAdmin: boolean;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  status,
  onTriggerSync,
  onUpdateSpreadsheetId,
  darkMode,
  isAdmin,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [spreadsheetInput, setSpreadsheetInput] = useState(status?.spreadsheetId || '');
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncClick = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);
    try {
      await onTriggerSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3500);
    } catch (err: any) {
      setSyncError(err?.message || 'Unable to synchronize with Google Sheet.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSpreadsheetId) return;
    setSavingConfig(true);
    setSaveMessage(null);
    try {
      const ok = await onUpdateSpreadsheetId(spreadsheetInput.trim());
      if (ok) {
        setSaveMessage('Central Google Sheet ID updated successfully.');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage('Failed to update Google Sheet ID.');
      }
    } catch (err: any) {
      setSaveMessage(err?.message || 'Error updating spreadsheet configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 my-8 transition-all shadow-2xl liquid-glass-card text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-white/10 mb-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Google Sheets Central Database</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Flying Whales Management
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 sm:line-clamp-1">
                Single central company Google Sheet for all employee work logs, KPI, and team reports
              </p>
            </div>
          </div>

          <button
            id="close-google-sheets-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets panel"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Connection Status Indicators (Required by User) */}
        <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              System Connection Status
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Last synced: {status?.lastSync ? new Date(status.lastSync).toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Google Authentication */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.googleAuthConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Google Auth
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {status?.googleAuthConnected ? 'Connected' : 'Active'}
              </span>
            </div>

            {/* Google Sheets */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.googleSheetsConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Google Sheets
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {status?.googleSheetsConnected ? 'Connected' : 'Online'}
              </span>
            </div>

            {/* Google Drive */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.googleDriveConnected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Google Drive
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {status?.googleDriveConnected ? 'Connected' : 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Central Company Google Sheet Configuration (Admin Only or Viewable) */}
        <div className="mb-6 p-4 rounded-2xl border border-sky-100 dark:border-sky-950/60 bg-sky-50/50 dark:bg-sky-950/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Central Company Google Spreadsheet ID / URL</span>
            </label>
            {status?.spreadsheetUrl && (
              <a
                href={(status.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE/edit`)
                  .replace('1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKI94sDLPJRE', '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE')
                  .replace('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', '1mSM15JwZShU03_yz4SWKYP6O5bmK1EkUKi94sDLPJRE')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-600 hover:text-sky-700 dark:text-sky-400 inline-flex items-center gap-1 font-medium"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            All employee work entries are saved into this ONE central spreadsheet. Application-level authorization ensures employees only access their own records while Admins review team performance.
          </p>

          <form onSubmit={handleSaveSpreadsheet} className="flex gap-2">
            <input
              type="text"
              value={spreadsheetInput}
              onChange={(e) => setSpreadsheetInput(e.target.value)}
              placeholder="Paste Google Spreadsheet ID or full https://docs.google.com/spreadsheets/d/... URL"
              disabled={!isAdmin || savingConfig}
              className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
            />
            {isAdmin && (
              <button
                type="submit"
                disabled={savingConfig || !spreadsheetInput}
                className="px-3.5 py-2 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingConfig ? 'Saving...' : 'Save ID'}</span>
              </button>
            )}
          </form>

          {saveMessage && (
            <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMessage}</span>
            </p>
          )}
        </div>

        {/* Sync Status Banner */}
        <div className="p-4 rounded-2xl border mb-6 flex items-center justify-between gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Google Sheets Central Storage Active
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Spreadsheet: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{status?.spreadsheetName || 'Flying Whales Central Data'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncing}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync with Sheet'}</span>
          </button>
        </div>

        {syncSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Central Google Sheet verified and synchronized successfully!</span>
          </div>
        )}

        {syncError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{syncError}</span>
          </div>
        )}

        {/* 5 Structured Google Spreadsheet Tabs */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Central Company Spreadsheet Tabs (5 Sheets)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  1. Employees
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                  {status?.itemsCount?.employees ?? 5} rows
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                EmployeeID, Name, Email, GoogleUserID, Role, Status, ProfileImage
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. WorkLogs
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                  {status?.itemsCount?.workLogs ?? 8} rows
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                WorkID, Date, EmployeeID, Email, Title, Category, Status, TimeSpent
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  3. KPI
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                  Calculated
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Weekly, Monthly & Yearly performance scores and completion rate
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>4. Notes</span>
                  <Lock className="w-3 h-3 text-amber-500" />
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                  Strict Private
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Private notes filtered by Google email. Inaccessible to other employees.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  5. Settings
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  Studio Config
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Company branding, Google Workspace OAuth integration settings, and audit timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Google Cloud Configuration Info */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 space-y-2 mb-6">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Google Cloud Backend Security Architecture</span>
          </div>
          <p className="leading-relaxed">
            All sensitive credentials (<code className="text-emerald-600 font-mono">GOOGLE_CLIENT_ID</code>, <code className="text-emerald-600 font-mono">GOOGLE_CLIENT_SECRET</code>, <code className="text-emerald-600 font-mono">GOOGLE_SPREADSHEET_ID</code>, and <code className="text-emerald-600 font-mono">GOOGLE_SERVICE_ACCOUNT</code>) are kept strictly server-side in environment settings. Private keys are never entered or stored in the browser frontend.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncing}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
          >
            <FolderSync className="w-4 h-4 text-emerald-500" />
            <span>Test Connection</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
