import React from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { FlyingWhalesLogo } from './FlyingWhalesLogo';
import {
  LayoutDashboard,
  CalendarCheck,
  StickyNote,
  TrendingUp,
  Bookmark,
  ShieldAlert,
  Users,
  Briefcase,
  Award,
  Settings,
  LogOut,
  FileSpreadsheet,
  Clock,
  Calendar,
  Monitor,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'daily-work'
  | 'attendance'
  | 'kpi'
  | 'notes'
  | 'presets'
  | 'profile'
  | 'settings'
  | 'google-sheets-sync'
  | 'admin-dashboard'
  | 'admin-calendar'
  | 'admin-computer-activity'
  | 'admin-employees'
  | 'admin-team-work'
  | 'admin-performance';

interface SidebarProps {
  user: User;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  onOpenGoogleModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  onOpenGoogleModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const isAdmin = user.role === 'ADMIN';

  // Navigation Groups:
  // 1. Core Workspace
  const workspaceNav = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily-work' as NavTab, label: 'Daily Work', icon: CalendarCheck },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: Clock },
    { id: 'kpi' as NavTab, label: 'KPI & Performance', icon: TrendingUp },
  ];

  // 2. Personal
  const personalNav = [
    { id: 'notes' as NavTab, label: 'My Notes', icon: StickyNote },
    { id: 'presets' as NavTab, label: 'My Presets', icon: Bookmark },
  ];

  // 3. Admin Studio
  const adminNav = [
    { id: 'admin-dashboard' as NavTab, label: 'Admin Dashboard', icon: ShieldAlert },
    { id: 'admin-calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'admin-computer-activity' as NavTab, label: 'Computer Activity', icon: Monitor },
    { id: 'admin-employees' as NavTab, label: 'Employees', icon: Users },
    { id: 'admin-team-work' as NavTab, label: 'Team Work', icon: Briefcase },
    { id: 'admin-performance' as NavTab, label: 'Performance', icon: Award },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Fixed Vertical Navigation Sidebar with Liquid Glass */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 liquid-glass-sidebar text-slate-800 dark:text-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="flex flex-col min-h-0">
          {/* Top Header / Branding */}
          <div className="h-20 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <FlyingWhalesLogo size={42} variant="icon" />
              <div className="flex flex-col">
                <span className="font-black tracking-tight text-[13px] uppercase leading-tight text-slate-950 dark:text-white">
                  FLYING WHALES
                </span>
                <span className="text-[10px] text-[#1a66c2] dark:text-sky-400 font-black tracking-widest uppercase">
                  AD FILMS
                </span>
              </div>
            </div>
            {isAdmin && (
              <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full tracking-wider bg-blue-50/80 dark:bg-blue-950/60 text-[#1a66c2] dark:text-sky-300 border border-blue-200/80 dark:border-blue-800/60 uppercase shadow-xs">
                Admin
              </span>
            )}
          </div>

          {/* Navigation Links Grouped */}
          <div className="px-3 py-4 space-y-4 overflow-y-auto flex-1">
            {/* WORKSPACE */}
            <div>
              <div className="space-y-1">
                {workspaceNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'liquid-nav-pill-active'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#1a66c2] dark:bg-sky-400 shadow-xs"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#1a66c2] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="border-t border-slate-200/50 dark:border-white/5 my-2" />

            {/* PERSONAL */}
            <div>
              <p className="px-3.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Personal
              </p>
              <div className="space-y-1">
                {personalNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'liquid-nav-pill-active'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#1a66c2] dark:bg-sky-400 shadow-xs"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#1a66c2] dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="border-t border-slate-200/50 dark:border-white/5 my-2" />

            {/* DATA & SYNC */}
            <div>
              <p className="px-3.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Data & Sync
              </p>
              <div className="space-y-1">
                <button
                  id="nav-google-sheets-sync"
                  onClick={() => {
                    onOpenGoogleModal();
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Google Sheets / Sync</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                </button>
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="border-t border-slate-200/50 dark:border-white/5 my-2" />

            {/* SETTINGS */}
            <div>
              <p className="px-3.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Settings
              </p>
              <div className="space-y-1">
                <button
                  id="nav-profile-settings"
                  onClick={() => handleNavClick('profile')}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'profile' || activeTab === 'settings'
                      ? 'liquid-nav-pill-active'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  {(activeTab === 'profile' || activeTab === 'settings') && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#1a66c2] dark:bg-sky-400 shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Settings
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      activeTab === 'profile' || activeTab === 'settings'
                        ? 'text-[#1a66c2] dark:text-sky-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>Profile & Settings</span>
                </button>
              </div>
            </div>

            {/* ADMIN STUDIO (if role is ADMIN) */}
            {isAdmin && (
              <>
                <div className="border-t border-slate-200/50 dark:border-white/5 my-2" />
                <div>
                  <p className="px-3.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-[#1a66c2] dark:text-sky-400">
                    Admin Studio
                  </p>
                  <div className="space-y-1">
                    {adminNav.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`nav-${item.id}`}
                          onClick={() => handleNavClick(item.id)}
                          className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'liquid-nav-pill-active'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/5'
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-active-indicator"
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#1a66c2] dark:bg-sky-400 shadow-xs"
                              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            />
                          )}
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-[#1a66c2] dark:text-sky-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="p-2.5 rounded-xl flex items-center justify-between liquid-glass-tile border border-white/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a66c2] to-[#1555a3] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight font-medium">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

