import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ScrollReveal } from './ScrollReveal';
import { User, WorkLog, TaskType, TASK_OPTIONS, WorkStatus, Preset } from '../types';
import { isToday, isWithinPeriod, getLogDate, getLogTask, isLogCompleted } from '../utils/kpi';
import { CATEGORY_META } from './DashboardCharts';
import {
  Plus,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  Video,
  Film,
  Sparkles,
  Camera,
  Layers,
  HelpCircle,
  Search,
  ImageIcon,
  Eye,
} from 'lucide-react';

interface DailyWorkModuleProps {
  user: User;
  workLogs: WorkLog[];
  presets?: Preset[];
  onAddWorkLog: (logData: Partial<WorkLog>) => Promise<void>;
  onUpdateWorkLog: (id: string, logData: Partial<WorkLog>) => Promise<void>;
  onDeleteWorkLog: (id: string) => Promise<void>;
  onAddPreset?: (preset: Partial<Preset>) => Promise<void>;
  darkMode?: boolean;
  initialAddOpen?: boolean;
  onResetInitialAddOpen?: () => void;
  prefillPreset?: Preset | null;
  onClearPrefillPreset?: () => void;
}

export const DailyWorkModule: React.FC<DailyWorkModuleProps> = ({
  user,
  workLogs,
  presets = [],
  onAddWorkLog,
  onUpdateWorkLog,
  onDeleteWorkLog,
  onAddPreset,
  initialAddOpen = false,
  onResetInitialAddOpen,
  prefillPreset = null,
  onClearPrefillPreset,
}) => {
  // Personal presets strictly for this user
  const userPresets = presets.filter(
    (p) =>
      p.employeeId === user.id ||
      (p.employeeEmail && p.employeeEmail.toLowerCase() === user.email.toLowerCase())
  );

  const [isFormOpen, setIsFormOpen] = useState(initialAddOpen || Boolean(prefillPreset));
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal for inspecting details
  const [detailModalLog, setDetailModalLog] = useState<WorkLog | null>(null);

  // Filter & Search state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [filterTask, setFilterTask] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [task, setTask] = useState<TaskType>('Videos');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<WorkStatus>('Completed');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestedDate, setRequestedDate] = useState(todayStr);
  const [quantity, setQuantity] = useState<number>(1);
  const [workDone, setWorkDone] = useState<'Yes' | 'No'>('Yes');

  // Save as preset toggle
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Open add form when triggered externally (e.g. from Dashboard or My Presets)
  useEffect(() => {
    if (initialAddOpen) {
      handleOpenAdd();
      if (onResetInitialAddOpen) {
        onResetInitialAddOpen();
      }
    }
  }, [initialAddOpen, onResetInitialAddOpen]);

  // If prefillPreset was passed from MyPresetsModule
  useEffect(() => {
    if (prefillPreset) {
      setEditingLogId(null);
      setSelectedPresetId(prefillPreset.id);
      setTask(prefillPreset.task);
      setTitle(prefillPreset.title);
      setRequestedBy(prefillPreset.requestedBy || '');
      setQuantity(prefillPreset.quantity || 1);
      setWorkDone(prefillPreset.workDone || 'Yes');
      setStatus(prefillPreset.workDone === 'No' ? 'In Progress' : 'Completed');
      setRequestedDate(todayStr);
      setFormError(null);
      setIsFormOpen(true);
      if (onClearPrefillPreset) onClearPrefillPreset();
    }
  }, [prefillPreset, onClearPrefillPreset, todayStr]);

  // Dynamic Label & Placeholder for Work Title
  const getTaskLabelAndPlaceholder = (selectedTask: TaskType) => {
    switch (selectedTask) {
      case 'Videos':
        return { label: 'Video Title', placeholder: 'e.g., Flying Whales Brand Film - Final Cut' };
      case 'Shorts':
        return { label: 'Short Title', placeholder: 'e.g., Behind the Scenes Cut #1' };
      case 'Reels':
        return { label: 'Reel Title', placeholder: 'e.g., Instagram Teaser Reel' };
      case 'Photos':
        return { label: 'Photo Title', placeholder: 'e.g., Product Stills Batch A' };
      case 'Thumbnail':
        return { label: 'Thumbnail Title', placeholder: 'e.g., Main YouTube Banner / Video Thumbnail' };
      case 'Shootings':
        return { label: 'Shooting Title', placeholder: 'e.g., Downtown Studio Shoot Day 1' };
      case 'Others':
        return { label: 'Work Title', placeholder: 'e.g., Audio Mastering / Color Grading' };
    }
  };

  const getTaskIcon = (t: TaskType) => {
    const meta = CATEGORY_META[t] || CATEGORY_META.Others;
    const Icon = meta.icon;
    return <Icon className="w-4 h-4" />;
  };

  // User's own logs (isolated by employeeId or all for admin)
  const userLogs =
    user.role === 'ADMIN'
      ? workLogs
      : workLogs.filter(
          (l) =>
            l.employeeId === user.id ||
            (l.employeeEmail && l.employeeEmail.toLowerCase() === user.email.toLowerCase())
        );

  // Apply filters & search
  const filteredLogs = userLogs.filter((l) => {
    const logDate = getLogDate(l);
    const logTask = getLogTask(l);

    // Period filter
    if (filterPeriod === 'today' && !isToday(logDate)) return false;
    if (filterPeriod === 'week' && !isWithinPeriod(logDate, 'week')) return false;
    if (filterPeriod === 'month' && !isWithinPeriod(logDate, 'month')) return false;
    if (filterPeriod === 'year' && !isWithinPeriod(logDate, 'year')) return false;

    // Task filter
    if (filterTask !== 'All' && logTask !== filterTask) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchReq = (l.requestedBy || l.clientProject || '').toLowerCase().includes(q);
      if (!matchTitle && !matchReq) return false;
    }

    return true;
  });

  const handleOpenAdd = () => {
    setEditingLogId(null);
    setSelectedPresetId('');
    setTask('Videos');
    setTitle('');
    setStatus('Completed');
    setRequestedBy('');
    setRequestedDate(todayStr);
    setQuantity(1);
    setWorkDone('Yes');
    setSaveAsPreset(false);
    setNewPresetName('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (log: WorkLog) => {
    setEditingLogId(log.id);
    setSelectedPresetId('');
    setTask(getLogTask(log));
    setTitle(log.title);
    setStatus(log.status || 'Completed');
    setRequestedBy(log.requestedBy || log.clientProject || '');
    setRequestedDate(getLogDate(log) || todayStr);
    setQuantity(typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1);
    setWorkDone(log.workDone || (log.status === 'Completed' ? 'Yes' : 'No'));
    setSaveAsPreset(false);
    setNewPresetName('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const selected = userPresets.find((p) => p.id === presetId);
    if (selected) {
      setTask(selected.task);
      setTitle(selected.title);
      setRequestedBy(selected.requestedBy || '');
      setQuantity(selected.quantity || 1);
      setWorkDone(selected.workDone || 'Yes');
      setStatus(selected.workDone === 'No' ? 'In Progress' : 'Completed');
      showToast(`Loaded preset: ${selected.presetName}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const payload: Partial<WorkLog> = {
        task,
        title: title.trim(),
        status,
        requestedBy: requestedBy.trim(),
        requestedDate: requestedDate || todayStr,
        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
        workDone,
        // Fallbacks for backward compatibility
        date: requestedDate || todayStr,
        category: task,
        clientProject: requestedBy.trim() || 'Studio Work',
      };

      if (editingLogId) {
        const existing = userLogs.find((l) => l.id === editingLogId);
        if (existing?.thumbnail) {
          payload.thumbnail = existing.thumbnail;
        }
        await onUpdateWorkLog(editingLogId, payload);
        showToast('Work record updated successfully.');
      } else {
        await onAddWorkLog(payload);
        showToast('Work record logged and synced to Google Sheets.');

        // If user checked "Save as Preset", create a preset as well
        if (saveAsPreset && onAddPreset) {
          const pName = newPresetName.trim() || `${task} - ${title.trim().slice(0, 24)}`;
          await onAddPreset({
            presetName: pName,
            task,
            title: title.trim(),
            requestedBy: requestedBy.trim(),
            quantity: Number(quantity) > 0 ? Number(quantity) : 1,
            workDone,
          });
          showToast('Work logged and saved as reusable preset!');
        }
      }

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save work log.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteWorkLog(deleteConfirmId);
      showToast('Work Log deleted successfully.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || 'Unable to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentTaskMeta = getTaskLabelAndPlaceholder(task);

  return (
    <div className="space-y-6 pb-8">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Header & Summary Card */}
      <ScrollReveal distance={20} duration={550}>
        <div className="liquid-glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-300 text-[11px] font-semibold tracking-wide border border-blue-500/20 dark:border-sky-500/30 mb-2 shadow-xs">
              <Video className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
              <span>Daily Production Log</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Daily Work Records
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Browse and manage daily production records for all video edits, shoots, thumbnails, and deliverables.
            </p>
          </div>

          <button
            id="add-daily-work-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl liquid-btn-primary text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Today's Work</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Filter & Search Bar */}
      <ScrollReveal distance={20} duration={550} delay={60}>
        <div className="liquid-glass-card rounded-2xl p-4 space-y-3 w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
            {/* Period Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
              ].map((p) => {
                const isActive = filterPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFilterPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'liquid-btn-primary text-white shadow-xs'
                        : 'bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-300 dark:hover:border-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2]"
              />
            </div>
          </div>

          {/* Task Category Quick Pills */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Task:
            </span>
            <button
              type="button"
              onClick={() => setFilterTask('All')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                filterTask === 'All'
                  ? 'liquid-btn-primary text-white shadow-xs'
                  : 'bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-white/40 dark:border-white/5'
              }`}
            >
              All
            </button>
            {TASK_OPTIONS.map((t) => {
              const isActive = filterTask === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTask(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    isActive
                      ? 'liquid-btn-primary text-white shadow-xs'
                      : 'bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-white/40 dark:border-white/5'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Main Work Records Table */}
      <ScrollReveal distance={22} duration={600} delay={120}>
        {filteredLogs.length === 0 ? (
        <div className="liquid-glass-card rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20 dark:border-sky-500/30 shadow-xs">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Work Records Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || filterTask !== 'All' || filterPeriod !== 'all'
              ? 'No records match your selected filters. Try resetting the filters or search term.'
              : 'You have not logged any work tasks yet. Start logging your daily work to track your KPI.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Today's Work</span>
          </button>
        </div>
      ) : (
        <div className="liquid-glass-card rounded-2xl overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/40 dark:bg-slate-800/40 backdrop-blur-md">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 hidden md:table-cell">Requested By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">Done?</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                {filteredLogs.map((log, idx) => {
                  const currentTask = getLogTask(log);
                  const meta = CATEGORY_META[currentTask] || CATEGORY_META.Others;
                  const isCompleted = isLogCompleted(log);
                  const logDate = getLogDate(log);
                  const qty = typeof log.quantity === 'number' && log.quantity > 0 ? log.quantity : 1;

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(idx * 0.03, 0.3),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Task Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.bg} ${meta.color} border border-slate-200/60 dark:border-slate-700/60`}
                        >
                          {getTaskIcon(currentTask)}
                          <span>{currentTask}</span>
                        </span>
                      </td>

                      {/* Title (Clickable for full details) */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => setDetailModalLog(log)}
                          className="font-semibold text-slate-900 dark:text-white hover:text-[#1a66c2] dark:hover:text-sky-400 text-left line-clamp-1 cursor-pointer transition-colors"
                          title="Click to view full record"
                        >
                          {log.title}
                        </button>
                        {log.description && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                            {log.description}
                          </div>
                        )}
                      </td>

                      {/* Requested By */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium hidden md:table-cell">
                        {log.requestedBy || log.clientProject || '—'}
                      </td>

                      {/* Requested Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{logDate}</span>
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 whitespace-nowrap text-center font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#1a66c2] dark:text-sky-400 font-bold">
                          {qty}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : log.status === 'In Progress'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : log.status === 'In Progress'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{log.status}</span>
                        </span>
                      </td>

                      {/* Work Done */}
                      <td className="py-3 px-4 whitespace-nowrap text-center font-semibold hidden sm:table-cell">
                        <span
                          className={`text-xs ${
                            log.workDone === 'No' ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {log.workDone || (isCompleted ? 'Yes' : 'No')}
                        </span>
                      </td>

                      {/* Edit, View Details & Delete Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailModalLog(log)}
                            className="p-1.5 text-slate-400 hover:text-[#1a66c2] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="View Full Record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 text-slate-400 hover:text-[#1a66c2] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Work Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(log.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Work Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </ScrollReveal>

      {/* WORK ENTRY / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="liquid-glass-card rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden flex flex-col max-h-[92vh] box-border animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-white/10 shrink-0 box-border">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingLogId ? 'Edit Work Entry' : 'Log Daily Work'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 box-border w-full max-w-full">
              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 box-border w-full max-w-full">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 w-full max-w-full box-border">
                {/* Load Preset Dropdown (Quick template selector) */}
                {!editingLogId && userPresets.length > 0 && (
                  <div className="w-full max-w-full min-w-0 box-border p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-[#1a66c2] dark:text-sky-300 text-xs font-semibold shrink-0">
                      <Bookmark className="w-4 h-4 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                      <span>Load Preset:</span>
                    </div>
                    <select
                      id="daily-work-load-preset-select"
                      value={selectedPresetId || ''}
                      onChange={(e) => {
                        if (e.target.value) handleLoadPreset(e.target.value);
                        else setSelectedPresetId('');
                      }}
                      className="w-full sm:w-auto sm:max-w-[260px] flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#1a66c2] cursor-pointer truncate box-border max-w-full"
                    >
                      <option value="">Choose a saved preset...</option>
                      {userPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.presetName} ({p.task} - {p.title})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Field 1: Task (Dropdown) */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    1. Task <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={task}
                    onChange={(e) => setTask(e.target.value as TaskType)}
                    className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] font-semibold text-slate-900 dark:text-white box-border"
                  >
                    {TASK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2: Dynamic Title / Work Title */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    2. {currentTaskMeta.label} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={currentTaskMeta.placeholder}
                    className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                  />
                </div>

                {/* Field 3: Status */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    3. Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const nextSt = e.target.value as WorkStatus;
                      setStatus(nextSt);
                      if (nextSt === 'Completed') setWorkDone('Yes');
                    }}
                    className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                {/* Field 4: Requested By */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    4. Requested By
                  </label>
                  <input
                    type="text"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    placeholder="e.g., Studio Manager, Director, Client Name"
                    className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                  />
                </div>

                {/* Field 5: Requested Date */}
                <div className="w-full max-w-full min-w-0 box-border">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    5. Requested Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                  />
                </div>

                {/* Fields 6 & 7: Quantity & Work Done */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-full min-w-0 box-border">
                  <div className="w-full max-w-full min-w-0 box-border">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      6. Quantity of Deliverables
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                    />
                  </div>

                  <div className="w-full max-w-full min-w-0 box-border">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      7. Work Done
                    </label>
                    <select
                      value={workDone}
                      onChange={(e) => {
                        const nextDone = e.target.value as 'Yes' | 'No';
                        setWorkDone(nextDone);
                        if (nextDone === 'Yes') setStatus('Completed');
                      }}
                      className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                {/* Save as Preset Checkbox (only when adding new) */}
                {!editingLogId && onAddPreset && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 w-full max-w-full min-w-0 box-border">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={saveAsPreset}
                        onChange={(e) => setSaveAsPreset(e.target.checked)}
                        className="rounded text-[#1a66c2] focus:ring-[#1a66c2]"
                      />
                      <span>Save these details as a reusable Preset</span>
                    </label>
                    {saveAsPreset && (
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Preset name (e.g. Standard Reel Edit)"
                        className="w-full max-w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1a66c2] focus:ring-1 focus:ring-[#1a66c2] box-border"
                      />
                    )}
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5 w-full max-w-full box-border">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl text-xs font-semibold liquid-btn-primary text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Saving...' : editingLogId ? 'Save Changes' : 'Record Work'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-card rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Delete Work Record?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete this work record? This will also be removed from Google Sheets.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Detail Modal */}
      {detailModalLog && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setDetailModalLog(null)}
        >
          <div
            className="max-w-md w-full liquid-glass-card rounded-2xl p-6 shadow-2xl overflow-hidden cursor-default animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30">
                  {getTaskIcon(getLogTask(detailModalLog))}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Work Record Details
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail */}
            {detailModalLog.thumbnail && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-100 dark:bg-slate-800">
                <img
                  src={detailModalLog.thumbnail}
                  alt={detailModalLog.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Title:</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {detailModalLog.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {getLogTask(detailModalLog)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {detailModalLog.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-medium">Requested By:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {detailModalLog.requestedBy || detailModalLog.clientProject || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Requested Date:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {getLogDate(detailModalLog)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-medium">Deliverables Quantity:</span>
                  <div className="font-bold text-[#1a66c2] dark:text-sky-400 mt-0.5">
                    {detailModalLog.quantity || 1}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Work Done:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {detailModalLog.workDone || (isLogCompleted(detailModalLog) ? 'Yes' : 'No')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const logToEdit = detailModalLog;
                  setDetailModalLog(null);
                  handleOpenEdit(logToEdit);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Edit Record
              </button>
              <button
                type="button"
                onClick={() => setDetailModalLog(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
