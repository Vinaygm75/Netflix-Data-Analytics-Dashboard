import React from 'react';
import { User, GoogleConnectionStatus } from '../types';
import { NavTab } from './Sidebar';
import { Menu, RefreshCw, FileSpreadsheet, Sun, Moon, Search } from 'lucide-react';

interface HeaderProps {
  user: User;
  activeTab: NavTab;
  onOpenMobileSidebar: () => void;
  onOpenGoogleModal: () => void;
  googleStatus: GoogleConnectionStatus | null;
  onManualSync: () => void;
  isSyncing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: (newTheme: 'light' | 'dark') => void;
  onOpenSearch?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Employee Dashboard', subtitle: 'Overview of your daily tasks, weekly metrics, and personal upcoming work' },
  'daily-work': { title: 'Daily Work Updates', subtitle: 'Log, edit, and track your daily video production deliverables' },
  attendance: { title: 'Studio Attendance', subtitle: 'Daily check-in and checkout timestamps synced to central database' },
  notes: { title: 'My Private Notes', subtitle: 'Personal work planning, ideas, and reminders (Strictly private)' },
  presets: { title: 'My Work Presets', subtitle: 'Manage custom reusable templates for repetitive production tasks' },
  kpi: { title: 'KPI Tracking', subtitle: 'Weekly, monthly, and yearly performance metrics calculated from your activity' },
  profile: { title: 'Employee Profile', subtitle: 'Your studio identity, credentials, and account settings' },
  'admin-dashboard': { title: 'Admin Dashboard', subtitle: 'Studio team overview, daily deliverables, and employee performance' },
  'admin-calendar': { title: 'Attendance Calendar', subtitle: 'Karnataka statutory calendar, working-day metrics, and employee monthly attendance' },
  'admin-computer-activity': { title: 'Computer Activity', subtitle: 'Apple Silicon Mac desktop agent activity timer and live presence monitoring' },
  'admin-employees': { title: 'Employee Management', subtitle: 'Manage studio team members, roles, and status' },
  'admin-team-work': { title: 'Team Work Activity', subtitle: 'Comprehensive audit of all employees’ daily deliverables and tasks' },
  'admin-performance': { title: 'Studio Performance & KPI', subtitle: 'Employee of the Month rankings and measurable output metrics' },
  settings: { title: 'System Settings', subtitle: 'Application preferences and data synchronization parameters' },
  'google-sheets-sync': { title: 'Google Sheets & Drive', subtitle: 'Central company spreadsheet database and Google Workspace synchronization' },
};

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onOpenMobileSidebar,
  onOpenGoogleModal,
  googleStatus,
  onManualSync,
  isSyncing,
  theme,
  onToggleTheme,
  onOpenSearch,
}) => {
  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'Studio Workspace', subtitle: '' };

  // Current date formatted
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <header
      className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors sticky top-0 z-30 liquid-glass-header text-slate-800 dark:text-slate-100"
    >
      {/* Left: Mobile trigger & Page titles */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <button
          id="mobile-menu-trigger"
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 lg:hidden cursor-pointer transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
            {currentTabInfo.title}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Right: Search, Theme Switcher, Storage pill, Sync, Profile badge */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Global Search Trigger */}
        {onOpenSearch && (
          <button
            type="button"
            id="header-global-search-btn"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
            title="Global Search work logs, employees, categories (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
            <span className="hidden md:inline text-slate-500 dark:text-slate-400 font-normal">Search work...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700/80 rounded text-slate-500 dark:text-slate-300 shadow-2xs border border-slate-200/60 dark:border-white/5">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Theme Switcher Toggle (Light / Dark) with Liquid Glass */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 shrink-0 shadow-xs">
          <button
            type="button"
            id="theme-light-btn"
            onClick={() => onToggleTheme('light')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs font-bold border border-white/80'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Light Theme"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Light</span>
          </button>
          <button
            type="button"
            id="theme-dark-btn"
            onClick={() => onToggleTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'liquid-btn-primary text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Dark Theme"
          >
            <Moon className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden md:inline">Dark</span>
          </button>
        </div>

        {/* Google Sheets Storage Pill */}
        <button
          id="header-google-status-pill"
          type="button"
          onClick={onOpenGoogleModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 backdrop-blur-md hover:bg-emerald-500/20 shadow-xs"
          title="Click to view central Google Sheets & Drive connection details"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden xl:inline">
            {googleStatus?.spreadsheetName || 'Google Sheets Database'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
        </button>

        {/* Manual Sync Icon button */}
        <button
          id="header-sync-btn"
          type="button"
          onClick={onManualSync}
          disabled={isSyncing}
          className="group p-2 rounded-xl text-slate-500 hover:text-[#1a66c2] hover:bg-blue-500/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 border border-transparent hover:border-blue-200/50 dark:hover:border-white/10 transition-all cursor-pointer"
          title="Sync with central Google Sheet"
        >
          <RefreshCw
            className={`w-4 h-4 transition-transform duration-300 ${
              isSyncing ? 'animate-spin text-[#1a66c2] dark:text-sky-400' : 'group-hover:rotate-90'
            }`}
          />
        </button>

        {/* User Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200/60 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a66c2] to-[#1555a3] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-none">{user.name}</span>
            <span className="text-[10px] text-[#1a66c2] dark:text-sky-400 font-semibold block leading-tight">
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};


