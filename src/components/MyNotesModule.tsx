import React, { useState } from 'react';
import { ScrollReveal } from './ScrollReveal';
import { User, Note, NoteStatus } from '../types';
import {
  Plus,
  StickyNote,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Lock,
  X,
  AlertCircle,
} from 'lucide-react';

interface MyNotesModuleProps {
  user: User;
  notes: Note[];
  onAddNote: (noteData: Partial<Note>) => Promise<void>;
  onUpdateNote: (id: string, noteData: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  darkMode?: boolean;
  initialAddOpen?: boolean;
}

const CATEGORIES = [
  'Upcoming work',
  'Ideas',
  'Reminders',
  'Things to complete',
  'Personal work planning',
  'Important information',
  'General',
];

const STATUS_LIST: NoteStatus[] = ['Upcoming', 'In Progress', 'Completed'];

export const MyNotesModule: React.FC<MyNotesModuleProps> = ({
  user,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  initialAddOpen = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(initialAddOpen);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Upcoming work');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<NoteStatus>('Upcoming');

  const filteredNotes = notes.filter((n) => {
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setCategory('Upcoming work');
    setDueDate('');
    setStatus('Upcoming');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'General');
    setDueDate(note.dueDate || '');
    setStatus(note.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Note title is required.');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        dueDate: dueDate || undefined,
        status,
      };

      if (editingNoteId) {
        await onUpdateNote(editingNoteId, payload);
        showNotice('Note updated successfully.');
      } else {
        await onAddNote(payload);
        showNotice('New private note created.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save note.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await onDeleteNote(deleteConfirmId);
      showNotice('Note deleted from Google Sheets.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showNotice(err.message || 'Unable to delete. Please try again.');
    }
  };

  const handleToggleComplete = async (note: Note) => {
    const nextStatus: NoteStatus = note.status === 'Completed' ? 'Upcoming' : 'Completed';
    try {
      await onUpdateNote(note.id, { status: nextStatus });
      showNotice(nextStatus === 'Completed' ? 'Note marked as completed.' : 'Note marked as upcoming.');
    } catch (err: any) {
      showNotice('Failed to update note: ' + err.message);
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <ScrollReveal distance={20} duration={550}>
        <div className="liquid-glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a66c2] dark:text-sky-300">
                Strictly Private Workspace
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Only you ({user.email}) can view or edit these notes. Confidential notes are never shared.
              </p>
            </div>
          </div>

          <button
            id="new-note-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl liquid-btn-primary text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Category Filter Pills */}
      <ScrollReveal distance={20} duration={550} delay={60}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'liquid-btn-primary text-white shadow-xs'
                  : 'bg-slate-200/50 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Notes Grid Display */}
      {filteredNotes.length === 0 ? (
        <ScrollReveal distance={20} duration={550} delay={100}>
          <div className="p-12 text-center rounded-2xl liquid-glass-card">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-sky-500/15 text-[#1a66c2] dark:text-sky-400 border border-blue-500/20 dark:border-sky-500/30 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <StickyNote className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              No personal notes in this category
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Capture ideas, camera rig settings, client revisions, or upcoming personal tasks.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl liquid-btn-primary text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Note</span>
            </button>
          </div>
        </ScrollReveal>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, idx) => {
            const isDone = note.status === 'Completed';
            return (
              <ScrollReveal
                key={note.id}
                distance={20}
                duration={500}
                delay={Math.min(idx * 50, 300)}
                className="h-full"
              >
                <div
                  className={`p-5 rounded-2xl liquid-glass-tile flex flex-col justify-between transition-all h-full ${
                    isDone ? 'opacity-70' : ''
                  }`}
                >
                  <div>
                    {/* Category & Status Pill */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-[#1a66c2] dark:bg-sky-500/15 dark:text-sky-300 border border-blue-500/20 dark:border-sky-500/30">
                        {note.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : note.status === 'In Progress'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : 'bg-slate-200/50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/10'
                        }`}
                      >
                        {note.status}
                      </span>
                    </div>

                    {/* Title & Content */}
                    <h4
                      className={`text-sm font-bold tracking-tight mb-1.5 ${
                        isDone
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {note.title}
                    </h4>
                    {note.content && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Due Date & Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs">
                    <div>
                      {note.dueDate ? (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" /> Due: {note.dueDate}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> No due date
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(note)}
                        title={isDone ? 'Mark Upcoming' : 'Mark Completed'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDone
                            ? 'text-emerald-600 bg-emerald-500/15'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(note)}
                        title="Edit note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(note.id)}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl liquid-glass-card p-6 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1a66c2] dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingNoteId ? 'Edit Private Note' : 'New Private Note'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rough cut review checklist"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Add your thoughts, links, equipment notes, or deliverables checklist..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a66c2]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as NoteStatus)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none"
                  >
                    {STATUS_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-note-btn"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl liquid-btn-primary text-white text-xs font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Save Note</span>
                </button>
              </div>
            </form>
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
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Delete Note?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete this private note? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
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
