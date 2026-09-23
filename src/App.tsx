import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, WorkLog, Note, Preset, GoogleConnectionStatus, Role, AttendanceRecord } from './types';
import { AuthPage } from './components/AuthPage';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { DailyWorkModule } from './components/DailyWorkModule';
import { MyNotesModule } from './components/MyNotesModule';
import { MyPresetsModule } from './components/MyPresetsModule';
import { KPIDashboard } from './components/KPIDashboard';
import { AttendanceModule } from './components/AttendanceModule';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminEmployees } from './components/AdminEmployees';
import { AdminTeamWork } from './components/AdminTeamWork';
import { AdminPerformance } from './components/AdminPerformance';
import { AdminAttendanceCalendar } from './components/AdminAttendanceCalendar';
import { AdminComputerActivity } from './components/AdminComputerActivity';
import { UserProfileSettings } from './components/UserProfileSettings';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { BrandedWatermark } from './components/BrandedWatermark';

export default function App() {
  // Two proper independent themes: Light and Dark, persisted in localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('studio_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('studio_theme', theme);
  }, [theme]);

  // User state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('studio_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState<boolean>(false);
  const [isFetchingEmployees, setIsFetchingEmployees] = useState<boolean>(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [authenticatedEmployees, setAuthenticatedEmployees] = useState<User[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);

  // Modals & Navigation helpers
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  // Deep-link / Quick trigger flags
  const [openAddWorkOnLoad, setOpenAddWorkOnLoad] = useState(false);
  const [openAddNoteOnLoad, setOpenAddNoteOnLoad] = useState(false);
  const [prefillPreset, setPrefillPreset] = useState<Preset | null>(null);

  // Auth helper headers: use signed session token and cookies
  const getAuthHeaders = useCallback(() => {
    const savedToken = localStorage.getItem('studio_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedToken) {
      headers.Authorization = `Bearer ${savedToken}`;
    }
    return headers;
  }, []);

  // Load Google Sheets & Drive status
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/google/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Work Logs
  const fetchWorkLogs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/worklogs', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setWorkLogs(Array.isArray(data) ? data : data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch work logs', err);
    }
  }, [user, getAuthHeaders]);

  // Fetch Notes (strictly private to authenticated user)
  const fetchNotes = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notes', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : data.notes || []);
      }
    } catch (err) {
      console.error('Failed to fetch private notes', err);
    }
  }, [user, getAuthHeaders]);

  // Fetch Presets (strictly personal to authenticated user)
  const fetchPresets = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/presets', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPresets(Array.isArray(data) ? data : data.presets || []);
      }
    } catch (err) {
      console.error('Failed to fetch personal presets', err);
    }
  }, [user, getAuthHeaders]);

  // Fetch Employees (Admin only)
  const fetchEmployees = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    try {
      setIsFetchingEmployees(true);
      const res = await fetch('/api/admin/employees', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setIsFetchingEmployees(false);
    }
  }, [user, getAuthHeaders]);

  // Fetch Authenticated Employees (Users who have actually logged in)
  const fetchAuthenticatedEmployees = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/employees/authenticated', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAuthenticatedEmployees(Array.isArray(data) ? data : data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch authenticated employees', err);
    }
  }, [user, getAuthHeaders]);

  // Fetch Attendance Records
  const fetchAttendance = useCallback(async () => {
    if (!user) return;
    try {
      setIsFetchingAttendance(true);
      const res = await fetch('/api/attendance', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : data.attendance || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    } finally {
      setIsFetchingAttendance(false);
    }
  }, [user, getAuthHeaders]);

  // Download production data as Excel (.xlsx)
  const handleDownloadExcel = useCallback(async () => {
    if (!user) return;
    try {
      setIsDownloadingExcel(true);
      const res = await fetch('/api/export/excel', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || 'Failed to generate Excel export');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `Flying_Whales_Work_Data_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch {}
      }, 2000);
    } catch (err: any) {
      console.error('Download excel failed:', err);
    } finally {
      setIsDownloadingExcel(false);
    }
  }, [user, getAuthHeaders]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K to trigger Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial mount: verify server session
  useEffect(() => {
    // Check if token was passed via URL redirect
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('studio_token', tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedToken = tokenFromUrl || localStorage.getItem('studio_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedToken) {
      headers.Authorization = `Bearer ${savedToken}`;
    }

    fetch('/api/auth/me', {
      headers,
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 401) {
          // Session expired on server; clean client state
          setUser(null);
          localStorage.removeItem('studio_user');
          localStorage.removeItem('studio_token');
        }
        return null;
      })
      .then((data) => {
        const freshUser = data?.user || data;
        if (freshUser && (freshUser.id || freshUser.email)) {
          setUser(freshUser);
          localStorage.setItem('studio_user', JSON.stringify(freshUser));
          if (data?.token) {
            localStorage.setItem('studio_token', data.token);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Refresh all state and sync user profile on login/mount
  useEffect(() => {
    if (user) {
      fetchWorkLogs();
      fetchNotes();
      fetchPresets();
      fetchAttendance();
      fetchGoogleStatus();
      fetchAuthenticatedEmployees();
      if (user.role === 'ADMIN') {
        fetchEmployees();
      }
    }
  }, [user?.id, fetchWorkLogs, fetchNotes, fetchPresets, fetchAttendance, fetchGoogleStatus, fetchAuthenticatedEmployees, fetchEmployees]);

  // Auth Handlers
  const handleAuthSuccess = (authenticatedUser: User, token?: string) => {
    setUser(authenticatedUser);
    localStorage.setItem('studio_user', JSON.stringify(authenticatedUser));
    if (token) {
      localStorage.setItem('studio_token', token);
    }
    // Route ADMIN to admin-dashboard, EMPLOYEE to dashboard
    if (authenticatedUser.role === 'ADMIN') {
      setActiveTab('admin-dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
    setWorkLogs([]);
    setNotes([]);
    setPresets([]);
    setEmployees([]);
    localStorage.removeItem('studio_user');
    localStorage.removeItem('studio_token');
    setActiveTab('dashboard');
  };

  // Work Log Handlers
  const handleAddWorkLog = async (logData: Partial<WorkLog>) => {
    const res = await fetch('/api/worklogs', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(logData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add work log');
    }
    const data = await res.json();
    const newLog = data.log || data;
    setWorkLogs((prev) => [newLog, ...prev]);
    fetchGoogleStatus();
  };

  const handleUpdateWorkLog = async (id: string, logData: Partial<WorkLog>) => {
    const res = await fetch(`/api/worklogs/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(logData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update work log');
    }
    const data = await res.json();
    const updated = data.log || data;
    setWorkLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));
    fetchGoogleStatus();
  };

  const handleDeleteWorkLog = async (id: string) => {
    const res = await fetch(`/api/worklogs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to delete work log from Google Sheets. Please try again.');
    }
    // Update state upon confirmed server & Google Sheets deletion
    setWorkLogs((prev) => prev.filter((l) => l.id !== id));
    fetchGoogleStatus();
  };

  // Note Handlers (Strictly Private)
  const handleAddNote = async (noteData: Partial<Note>) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(noteData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save private note');
    }
    const data = await res.json();
    const newNote = data.note || data;
    setNotes((prev) => [newNote, ...prev]);
    fetchGoogleStatus();
  };

  const handleUpdateNote = async (id: string, noteData: Partial<Note>) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(noteData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update note');
    }
    const data = await res.json();
    const updated = data.note || data;
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    fetchGoogleStatus();
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to delete note. Please try again.');
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetchNotes();
    fetchGoogleStatus();
  };

  // Preset Handlers (Strictly Personal)
  const handleAddPreset = async (presetData: Partial<Preset>) => {
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(presetData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save preset');
    }
    const data = await res.json();
    const newPreset = data.preset || data;
    setPresets((prev) => [newPreset, ...prev.filter((p) => p.id !== newPreset.id)]);
    await fetchPresets();
  };

  const handleUpdatePreset = async (id: string, presetData: Partial<Preset>) => {
    const res = await fetch(`/api/presets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(presetData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update preset');
    }
    const data = await res.json();
    const updated = data.preset || data;
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    await fetchPresets();
  };

  const handleDeletePreset = async (id: string) => {
    const res = await fetch(`/api/presets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to delete preset. Please try again.');
    }
    setPresets((prev) => prev.filter((p) => p.id !== id));
    await fetchPresets();
  };

  // Profile Update Handler (Display Name)
  const handleUpdateProfile = async (name: string) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.details || 'Failed to update profile name in Google Sheets');
    }
    const data = await res.json();
    const updatedUser = data.user;
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('studio_user', JSON.stringify(updatedUser));
      // Update employee list if user is also in employees
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === updatedUser.id || e.email.toLowerCase() === updatedUser.email.toLowerCase()
            ? { ...e, name: updatedUser.name }
            : e
        )
      );
      // Re-fetch work logs so updated employeeName is immediately visible
      await fetchWorkLogs();
    }
  };

  // Admin Employee Handlers
  const handleAddEmployee = async (data: {
    name: string;
    email: string;
    password?: string;
    role: Role;
  }) => {
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create employee');
    }
    const resData = await res.json();
    const newEmp = resData.employee || resData;
    setEmployees((prev) => [...prev, newEmp]);
    fetchGoogleStatus();
  };

  const handleUpdateEmployee = async (id: string, data: Partial<User>) => {
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update employee');
    }
    const resData = await res.json();
    const updated = resData.employee || resData;
    setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (user && user.id === id) {
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem('studio_user', JSON.stringify(merged));
    }
    fetchGoogleStatus();
  };

  const handleDeleteEmployee = async (id: string) => {
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete employee');
    }
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    fetchGoogleStatus();
  };

  // Real Server-Side Manual Attendance Handlers
  const handleAttendanceLogin = async () => {
    const res = await fetch('/api/attendance/login', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to record attendance login');
    }
    await fetchAttendance();
    fetchGoogleStatus();
  };

  const handleAttendanceLogout = async () => {
    const res = await fetch('/api/attendance/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to record attendance logout');
    }
    await fetchAttendance();
    fetchGoogleStatus();
  };

  const handleDeleteAttendance = async (id: string) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await fetchAttendance();
      throw new Error(err.error || 'Failed to delete attendance record');
    }
    await fetchAttendance();
    fetchGoogleStatus();
  };

  // Trigger Manual Google Sheets Sync
  const handleTriggerSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
        await Promise.all([fetchWorkLogs(), fetchNotes()]);
        if (user?.role === 'ADMIN') await fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Update password handler
  const handleUpdatePassword = async (newPassword: string) => {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password');
    }
  };

  // Render Google Auth view if not logged in
  if (!user) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        darkMode={theme === 'dark'}
        onToggleDarkMode={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark text-slate-100' : 'text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Navigation Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'google-sheets-sync') {
            setIsGoogleModalOpen(true);
          } else {
            setActiveTab(tab);
            if ((tab === 'admin-employees' || tab === 'admin-calendar') && user?.role === 'ADMIN') {
              fetchEmployees();
            }
            if (tab === 'attendance') {
              fetchAttendance();
            }
          }
        }}
        onLogout={handleLogout}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 w-full">
        {/* Header */}
        <Header
          user={user}
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
          googleStatus={googleStatus}
          onManualSync={handleTriggerSync}
          isSyncing={isManualSyncing}
          theme={theme}
          onToggleTheme={(newTheme) => setTheme(newTheme)}
          onOpenSearch={() => setIsGlobalSearchOpen(true)}
        />

        {/* Body Content by Tab */}
        <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-between min-w-0">
          <div className="w-full flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                {activeTab === 'dashboard' && (
                <EmployeeDashboard
                  user={user}
                  workLogs={workLogs}
                  notes={notes}
                  authenticatedEmployees={authenticatedEmployees}
                  theme={theme}
                  onOpenAddWork={() => {
                    setActiveTab('daily-work');
                    setOpenAddWorkOnLoad(true);
                  }}
                  onOpenAddNote={() => {
                    setActiveTab('notes');
                    setOpenAddNoteOnLoad(true);
                  }}
                  onViewAllWork={() => setActiveTab('daily-work')}
                  onViewAllNotes={() => setActiveTab('notes')}
                  onViewKPI={() => setActiveTab('kpi')}
                  onToggleNoteStatus={async (note) => {
                    const nextStatus = note.status === 'Completed' ? 'Upcoming' : 'Completed';
                    await handleUpdateNote(note.id, { status: nextStatus });
                  }}
                />
              )}

              {activeTab === 'daily-work' && (
                <DailyWorkModule
                  user={user}
                  workLogs={workLogs}
                  presets={presets}
                  onAddWorkLog={handleAddWorkLog}
                  onUpdateWorkLog={handleUpdateWorkLog}
                  onDeleteWorkLog={handleDeleteWorkLog}
                  onAddPreset={handleAddPreset}
                  initialAddOpen={openAddWorkOnLoad}
                  onResetInitialAddOpen={() => setOpenAddWorkOnLoad(false)}
                  prefillPreset={prefillPreset}
                  onClearPrefillPreset={() => setPrefillPreset(null)}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceModule
                  user={user}
                  attendance={attendance}
                  onRefresh={fetchAttendance}
                  isRefreshing={isFetchingAttendance}
                  onAttendanceLogin={handleAttendanceLogin}
                  onAttendanceLogout={handleAttendanceLogout}
                  onDeleteAttendance={handleDeleteAttendance}
                />
              )}

              {activeTab === 'notes' && (
                <MyNotesModule
                  user={user}
                  notes={notes}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  initialAddOpen={openAddNoteOnLoad}
                />
              )}

              {activeTab === 'presets' && (
                <MyPresetsModule
                  user={user}
                  presets={presets}
                  onAddPreset={handleAddPreset}
                  onUpdatePreset={handleUpdatePreset}
                  onDeletePreset={handleDeletePreset}
                  onUsePreset={(preset) => {
                    setPrefillPreset(preset);
                    setOpenAddWorkOnLoad(true);
                    setActiveTab('daily-work');
                  }}
                />
              )}

              {activeTab === 'kpi' && (
                <KPIDashboard user={user} workLogs={workLogs} theme={theme} />
              )}

              {activeTab === 'profile' && (
                <UserProfileSettings
                  user={user}
                  onUpdatePassword={handleUpdatePassword}
                  onUpdateProfile={handleUpdateProfile}
                  googleStatus={googleStatus}
                  onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
                  tabType="profile"
                  onDownloadExcel={handleDownloadExcel}
                  isDownloadingExcel={isDownloadingExcel}
                />
              )}

              {activeTab === 'settings' && (
                <UserProfileSettings
                  user={user}
                  onUpdatePassword={handleUpdatePassword}
                  onUpdateProfile={handleUpdateProfile}
                  googleStatus={googleStatus}
                  onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
                  tabType="settings"
                  onDownloadExcel={handleDownloadExcel}
                  isDownloadingExcel={isDownloadingExcel}
                />
              )}

              {/* Admin Tabs */}
              {user.role === 'ADMIN' && (
                <>
                  {activeTab === 'admin-dashboard' && (
                    <AdminDashboard
                      user={user}
                      employees={employees}
                      workLogs={workLogs}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                  {activeTab === 'admin-employees' && (
                    <AdminEmployees
                      currentUser={user}
                      employees={employees}
                      onAddEmployee={handleAddEmployee}
                      onUpdateEmployee={handleUpdateEmployee}
                      onDeleteEmployee={handleDeleteEmployee}
                      onRefresh={fetchEmployees}
                      isRefreshing={isFetchingEmployees}
                      darkMode={theme === 'dark'}
                    />
                  )}

                  {activeTab === 'admin-team-work' && (
                    <AdminTeamWork
                      employees={employees}
                      workLogs={workLogs}
                    />
                  )}

                  {activeTab === 'admin-performance' && (
                    <AdminPerformance
                      employees={employees}
                      workLogs={workLogs}
                    />
                  )}

                  {activeTab === 'admin-calendar' && (
                    <AdminAttendanceCalendar
                      currentUser={user}
                      employees={employees}
                      initialAttendance={attendance}
                      getAuthHeaders={getAuthHeaders}
                    />
                  )}

                  {activeTab === 'admin-computer-activity' && (
                    <AdminComputerActivity
                      user={user}
                      getAuthHeaders={getAuthHeaders}
                      theme={theme}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Reusable Branded Faded Typography Watermark */}
        <BrandedWatermark />
      </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        workLogs={workLogs}
        onOpenEdit={() => {
          setIsGlobalSearchOpen(false);
          setActiveTab('daily-work');
        }}
      />

      {/* Central Google Sheets & Google Drive Synchronization Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        status={googleStatus}
        onTriggerSync={handleTriggerSync}
      />
    </div>
  );
}
