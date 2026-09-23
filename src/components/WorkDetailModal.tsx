import React from 'react';
import { WorkLog } from '../types';
import {
  X,
  Video,
  Film,
  Clapperboard,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  User as UserIcon,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface WorkDetailModalProps {
  log: WorkLog | null;
  onClose: () => void;
  onEdit?: (log: WorkLog) => void;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
  log,
  onClose,
  onEdit,
}) => {
  if (!log) return null;

  const getTaskIcon = (task?: string) => {
    switch (task) {
      case 'Videos':
        return <Video className="w-4 h-4" />;
      case 'Shorts':
        return <Film className="w-4 h-4" />;
      case 'Reels':
        return <Clapperboard className="w-4 h-4" />;
      case 'Photos':
        return <Camera className="w-4 h-4" />;
      case 'Thumbnail':
        return <ImageIcon className="w-4 h-4" />;
      case 'Shootings':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const taskType = log.task || log.category || 'Videos';
  const displayDate = log.requestedDate || log.date || (log.createdAt ? new Date(log.createdAt).toISOString().split('T')[0] : '—');
  const employeeDisplay = log.employeeName || log.employeeEmail || 'Employee';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full liquid-glass-card rounded-2xl p-6 shadow-2xl overflow-hidden cursor-default my-8 animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="p-2 rounded-xl bg-[#1a66c2]/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-[#1a66c2]/20 dark:border-sky-500/30 shrink-0">
              {getTaskIcon(taskType)}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold truncate block">
                Work Record Details
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {log.id}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close record details"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail preview if present */}
        {log.thumbnail && (
          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 bg-slate-100 dark:bg-slate-800 shadow-inner">
            <img
              src={log.thumbnail}
              alt={log.title}
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Work Title */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Work Title
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
            {log.title}
          </h3>
        </div>

        {/* Details Grid */}
        <div className="space-y-2.5 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
            <div>
              <span className="text-slate-400 font-medium block">Employee:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400 shrink-0" />
                <span className="truncate">{employeeDisplay}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Status:</span>
              <div className="mt-0.5">{getStatusBadge(log.status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
            <div>
              <span className="text-slate-400 font-medium block">Category:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {taskType}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Date:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{displayDate}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
            <div>
              <span className="text-slate-400 font-medium block">Requested By / Client:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {log.requestedBy || log.clientProject || '—'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Deliverables Quantity:</span>
              <div className="font-bold text-[#1a66c2] dark:text-sky-400 mt-0.5">
                {log.quantity || 1} units
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 font-medium block">Time Spent:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{log.timeSpent || '1h 00m'}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Work Completed:</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {log.workDone || (log.status === 'Completed' ? 'Yes' : 'No')}
              </div>
            </div>
          </div>

          {log.notes && (
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="text-slate-400 font-medium block">Notes / Description:</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                {log.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(log);
              }}
              className="px-4 py-2 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Edit Record
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
