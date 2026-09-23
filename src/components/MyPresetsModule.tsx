import React, { useState } from 'react';
import { ScrollReveal } from './ScrollReveal';
import { User, Preset, TaskType, TASK_OPTIONS } from '../types';
import {
  Plus,
  Bookmark,
  Edit2,
  Trash2,
  Play,
  X,
  AlertCircle,
  CheckCircle2,
  Video,
  Film,
  Sparkles,
  Camera,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface MyPresetsModuleProps {
  user: User;
  presets: Preset[];
  onAddPreset: (preset: Partial<Preset>) => Promise<void>;
  onUpdatePreset: (id: string, preset: Partial<Preset>) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onUsePreset: (preset: Preset) => void;
  darkMode?: boolean;
}

export const MyPresetsModule: React.FC<MyPresetsModuleProps> = ({
  user,
  presets,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onUsePreset,
}) => {
  // Filter presets strictly personal to this user (one employee NEVER sees another employee's presets)
  const userPresets = presets.filter(
    (p) =>
      p.employeeId === user.id ||
      (p.employeeEmail && p.employeeEmail.toLowerCase() === user.email.toLowerCase())
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form Fields
  const [presetName, setPresetName] = useState('');
  const [task, setTask] = useState<TaskType>('Videos');
  const [title, setTitle] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [workDone, setWorkDone] = useState<'Yes' | 'No'>('Yes');

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const getTaskLabelAndPlaceholder = (selectedTask: TaskType) => {
    switch (selectedTask) {
      case 'Videos':
        return { label: 'Video Title', placeholder: 'e.g., Flying Whales Brand Film - Final Cut' };
      case 'Shorts':
        return { label: 'Short Title', placeholder: 'e.g., Behind the Scenes Cut #1' };
      case 'Reels':
        return { label: 'Reel Title', placeholder: 'e.g., Instagram Teaser Reel' };
      case 'Photos':
        return { label: 'Photo Title / Album', placeholder: 'e.g., Product Stills Batch A' };
      case 'Shootings':
        return { label: 'Shooting Title / Project', placeholder: 'e.g., Downtown Studio Shoot Day 1' };
      case 'Others':
        return { label: 'Work Title', placeholder: 'e.g., Audio Mastering / Color Grading' };
    }
  };

  const getTaskIcon = (t: TaskType) => {
    switch (t) {
      case 'Videos':
        return <Video className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'Shorts':
        return <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Reels':
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'Photos':
        return <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Shootings':
        return <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'Others':
        return <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  const handleOpenAdd = () => {
    setEditingPresetId(null);
    setPresetName('');
    setTask('Videos');
    setTitle('');
    setRequestedBy('');
    setQuantity(1);
    setWorkDone('Yes');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.presetName);
    setTask(preset.task);
    setTitle(preset.title);
    setRequestedBy(preset.requestedBy || '');
    setQuantity(preset.quantity || 1);
    setWorkDone(preset.workDone || 'Yes');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) {
      setFormError('Please provide a preset name.');
      return;
    }
    if (!title.trim()) {
      setFormError('Title template cannot be empty.');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const payload: Partial<Preset> = {
        presetName: presetName.trim(),
        task,
        title: title.trim(),
        requestedBy: requestedBy.trim(),
        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
        workDone,
      };

      if (editingPresetId) {
        await onUpdatePreset(editingPresetId, payload);
        showToast('Preset updated successfully.');
      } else {
        await onAddPreset(payload);
        showToast('New work preset created.');
      }
      setIsModalOpen(false);
      setEditingPresetId(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save preset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await onDeletePreset(deleteConfirmId);
      showToast('Preset removed from Google Sheets.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || 'Unable to delete. Please try again.');
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

      {/* Header Banner */}
      <ScrollReveal distance={20} duration={550}>
        <div className="bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold tracking-wide border border-indigo-100 dark:border-indigo-900/50 mb-2">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Personal Presets</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Work Presets
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Save templates for repetitive production tasks to log daily work with a single click.
            </p>
          </div>

          <button
            id="add-preset-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Preset</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Preset Cards Grid */}
      {userPresets.length === 0 ? (
        <ScrollReveal distance={20} duration={550} delay={100}>
          <div className="bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/40">
              <Bookmark className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No presets saved yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Create presets for your standard reels, video edits, thumbnail shoots, or vlog cuts so you never have to retype common work details.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Preset</span>
            </button>
          </div>
        </ScrollReveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userPresets.map((preset, idx) => (
            <ScrollReveal
              key={preset.id}
              distance={20}
              duration={500}
              delay={Math.min(idx * 50, 300)}
              className="h-full"
            >
              <div
                className="bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-slate-700 p-5 shadow-xs transition-all flex flex-col justify-between group h-full"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        {getTaskIcon(preset.task)}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {preset.presetName}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          {preset.task}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(preset)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Preset"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(preset.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 block">
                        Title Template
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{preset.title}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        Requested by: <strong className="text-slate-700 dark:text-slate-300">{preset.requestedBy || 'Any'}</strong>
                      </span>
                      <span>
                        Qty: <strong className="text-slate-700 dark:text-slate-300">{preset.quantity || 1}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Work Done: <strong className={preset.workDone === 'Yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{preset.workDone || 'Yes'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onUsePreset(preset)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-[#1a66c2] dark:hover:bg-[#1a66c2] text-[#1a66c2] dark:text-sky-300 hover:text-white dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Use in Daily Work</span>
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Add / Edit Preset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#1a66c2] dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPresetId ? 'Edit Preset' : 'Create New Work Preset'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Preset Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preset Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Standard 60s Reel Edit, YouTube Vlog Cut"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Task Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task <span className="text-rose-500">*</span>
                </label>
                <select
                  value={task}
                  onChange={(e) => setTask(e.target.value as TaskType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium text-slate-800 dark:text-white"
                >
                  {TASK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {currentTaskMeta.label} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={currentTaskMeta.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Requested By */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requested By
                </label>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="e.g., Studio Manager, Director, Client Name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Quantity and Work Done */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Done
                  </label>
                  <select
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value as 'Yes' | 'No')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a66c2] hover:bg-[#1555a3] text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loading ? 'Saving...' : editingPresetId ? 'Save Changes' : 'Create Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-100 dark:border-rose-900/40">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Delete Preset?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete this preset? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
