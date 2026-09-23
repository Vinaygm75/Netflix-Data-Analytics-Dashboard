import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WorkLog } from '../types';
import {
  Search,
  X,
  Calendar,
  User as UserIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  Film,
  Clapperboard,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { WorkDetailModal } from './WorkDetailModal';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workLogs: WorkLog[];
  onOpenEdit?: (log: WorkLog) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  workLogs,
  onOpenEdit,
}) => {
  const [query, setQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedLog(null);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedLog) {
          setSelectedLog(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedLog, onClose]);

  // Helper to extract log date consistently
  const getLogDate = (log: WorkLog): string => {
    return (
      log.requestedDate ||
      log.date ||
      (log.createdAt ? new Date(log.createdAt).toISOString().split('T')[0] : '')
    );
  };

  // Helper to extract category/task
  const getLogCategory = (log: WorkLog): string => {
    return log.task || log.category || 'Videos';
  };

  // Filter real work logs across 5 dimensions: Employee, Work title, Category, Date, Status
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show most recent 10 records by default when query is empty
      return workLogs.slice(0, 10);
    }

    return workLogs.filter((log) => {
      const title = (log.title || '').toLowerCase();
      const employeeName = (log.employeeName || '').toLowerCase();
      const employeeEmail = (log.employeeEmail || '').toLowerCase();
      const employeeId = (log.employeeId || '').toLowerCase();
      const category = getLogCategory(log).toLowerCase();
      const date = getLogDate(log).toLowerCase();
      const status = (log.status || '').toLowerCase();
      const client = (log.clientProject || log.requestedBy || '').toLowerCase();
      const notes = (log.notes || '').toLowerCase();

      return (
        title.includes(q) ||
        employeeName.includes(q) ||
        employeeEmail.includes(q) ||
        employeeId.includes(q) ||
        category.includes(q) ||
        date.includes(q) ||
        status.includes(q) ||
        client.includes(q) ||
        notes.includes(q)
      );
    });
  }, [query, workLogs]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Videos':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'Shorts':
        return <Film className="w-4 h-4 text-purple-500" />;
      case 'Reels':
        return <Clapperboard className="w-4 h-4 text-pink-500" />;
      case 'Photos':
        return <Camera className="w-4 h-4 text-amber-500" />;
      case 'Thumbnail':
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'Shootings':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-20 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl liquid-glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-slate-200/70 dark:border-white/10 flex items-center gap-3 bg-white/50 dark:bg-slate-900/50">
            <Search className="w-5 h-5 text-[#1a66c2] dark:text-sky-400 shrink-0" />
            <input
              ref={inputRef}
              id="global-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search work, employee, category, status, date..."
              className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 font-medium"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium"
            >
              ESC
            </button>
          </div>

          {/* Quick Info & Stats */}
          <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {query
                ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} matching "${query}"`
                : `Showing ${searchResults.length} recent genuine work records`}
            </span>
            <span className="hidden sm:inline text-[11px] font-mono">
              Press Enter or click to inspect details
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
            {searchResults.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No work records found
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  Try searching by employee name, project title, category, date, or status.
                </p>
              </div>
            ) : (
              searchResults.map((log) => {
                const category = getLogCategory(log);
                const date = getLogDate(log);
                const employeeDisplay = log.employeeName || log.employeeEmail || 'Employee';
                const isCompleted = log.status === 'Completed';
                const isInProgress = log.status === 'In Progress';

                return (
                  <div
                    key={log.id}
                    id={`search-result-${log.id}`}
                    onClick={() => setSelectedLog(log)}
                    className="p-3 sm:p-3.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Category Icon */}
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                        {getCategoryIcon(category)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#1a66c2] dark:group-hover:text-sky-400 transition-colors">
                            {log.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-[#1a66c2] dark:text-sky-400" />
                            <strong className="text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[120px]">
                              {employeeDisplay}
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{date || '—'}</span>
                          </span>
                          {log.timeSpent && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{log.timeSpent}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badge & Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : isInProgress
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{log.status}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Existing Work Detail Modal for inspecting clicked search result */}
      {selectedLog && (
        <WorkDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onEdit={
            onOpenEdit
              ? (log) => {
                  setSelectedLog(null);
                  onClose();
                  onOpenEdit(log);
                }
              : undefined
          }
        />
      )}
    </>
  );
};
