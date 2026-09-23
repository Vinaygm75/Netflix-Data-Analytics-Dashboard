import React, { useState } from 'react';
import { User, Role } from '../types';
import {
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminEmployeesProps {
  currentUser: User;
  employees: User[];
  onAddEmployee: (data: {
    id?: string;
    name: string;
    email: string;
    loginId?: string;
    password?: string;
    role: Role;
    status?: 'Active' | 'Inactive';
  }) => Promise<void>;
  onUpdateEmployee: (id: string, data: Partial<User> & { password?: string }) => Promise<void>;
  onDeleteEmployee?: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  darkMode?: boolean;
}

export const AdminEmployees: React.FC<AdminEmployeesProps> = ({
  currentUser,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onRefresh,
  isRefreshing = false,
  darkMode,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Search & Filter
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-generate next suggested ID (e.g. EMP004)
  const getNextSuggestedId = () => {
    const existingNumbers = employees
      .map((e) => {
        const m = (e.id || '').toUpperCase().match(/^(?:EMP|FW)(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const max = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 3;
    return `EMP${String(max + 1).padStart(3, '0')}`;
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setEmployeeId(getNextSuggestedId());
    setName('');
    setLoginId('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setRole('EMPLOYEE');
    setStatus('Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: User) => {
    setEditingEmployee(emp);
    setEmployeeId(emp.id);
    setName(emp.name);
    setLoginId(emp.email);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setRole(emp.role);
    setStatus(emp.status || 'Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = employeeId.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanLoginId = (loginId.trim() || editingEmployee?.email || `${cleanId.toLowerCase()}@flyingwhales`).toLowerCase();

    if (!cleanName) {
      setFormError('Employee Name cannot be blank.');
      return;
    }

    if (!cleanId) {
      setFormError('Employee ID cannot be blank.');
      return;
    }

    // Duplicate ID validation
    const duplicateId = employees.find(
      (u) =>
        u.id.toUpperCase() === cleanId &&
        (!editingEmployee || u.id.toUpperCase() !== editingEmployee.id.toUpperCase())
    );
    if (duplicateId) {
      setFormError('Employee ID already exists.');
      return;
    }

    // Password validation for new employee
    if (!editingEmployee) {
      if (!password) {
        setFormError('Password is required.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Password and Confirm Password must match.');
        return;
      }
    } else {
      // Optional password update in edit mode
      if (password.trim()) {
        if (password.length < 6) {
          setFormError('New password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setFormError('Password and Confirm Password must match.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (editingEmployee) {
        await onUpdateEmployee(editingEmployee.id, {
          id: cleanId,
          name: cleanName,
          email: cleanLoginId,
          role,
          status,
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        showNotice(`Employee ${cleanName} updated and saved to Google Sheets.`);
      } else {
        await onAddEmployee({
          id: cleanId,
          name: cleanName,
          email: cleanLoginId,
          loginId: cleanLoginId,
          password: password.trim(),
          role,
          status,
        });
        showNotice(`Employee ${cleanName} created and saved to Google Sheets.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (emp: User) => {
    const nextStatus: 'Active' | 'Inactive' = emp.status === 'Inactive' ? 'Active' : 'Inactive';
    try {
      await onUpdateEmployee(emp.id, { status: nextStatus });
      showNotice(`${emp.name} is now marked ${nextStatus}.`);
    } catch (err: any) {
      showNotice('Error updating status: ' + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEmp || !onDeleteEmployee) return;
    setIsDeleting(true);
    try {
      await onDeleteEmployee(deleteConfirmEmp.id);
      showNotice(`Employee ${deleteConfirmEmp.name} deleted successfully from Google Sheets.`);
      setDeleteConfirmEmp(null);
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete employee. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const isActive = emp.status !== 'Inactive';
    if (filterTab === 'active' && !isActive) return false;
    if (filterTab === 'inactive' && isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchEmail = emp.email.toLowerCase().includes(q);
      const matchId = emp.id.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const activeCount = employees.filter((e) => e.status !== 'Inactive').length;
  const inactiveCount = employees.filter((e) => e.status === 'Inactive').length;

  return (
    <div className="space-y-5">
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Studio Team Members ({employees.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Managed by Studio Admin & synchronized directly with Google Sheets <code className="text-emerald-600 dark:text-emerald-400 font-mono">Employees</code> tab
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onRefresh && (
            <button
              id="refresh-employees-btn"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Fetch latest employees from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Team'}</span>
            </button>
          )}

          <button
            id="add-employee-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, Login ID, or Employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131D31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1a66c2]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('inactive')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'inactive'
                ? 'bg-white dark:bg-slate-700 text-slate-500 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131D31] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {emp.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a66c2] to-[#1555a3] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                          emp.role === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-[#1a66c2] dark:text-sky-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {emp.role === 'ADMIN' && <Shield className="w-3 h-3 text-purple-600" />}
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          emp.status !== 'Inactive'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.status !== 'Inactive' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{emp.status || 'Active'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {emp.lastLoginAt ? new Date(emp.lastLoginAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1a66c2] hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit employee details and credentials"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEmp(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete employee account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131D31] p-6 shadow-2xl animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Delete Employee?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{deleteConfirmEmp.name}</strong> ({deleteConfirmEmp.id})? This will delete their row from the Google Sheets Employees directory.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmEmp(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131D31] shadow-2xl animate-fade-in overflow-hidden">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEmployee ? `Edit Employee (${editingEmployee.name})` : 'Add New Employee'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingEmployee
                    ? 'Update employee details, role, or reset password'
                    : 'Create credentials and synchronize to Google Sheets'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:px-6 overflow-y-auto flex-1">
              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="employee-modal-form" onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Employee Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vinay Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                  />
                </div>

                {/* 2. Employee ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP004"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Unique employee ID used for identification
                  </p>
                </div>

                {/* 3. Login ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Login ID {editingEmployee ? '' : '(Optional - defaults to ID@flyingwhales)'}
                  </label>
                  <input
                    type="text"
                    placeholder={employeeId ? `${employeeId.toLowerCase()}@flyingwhales` : 'e.g. vinay@flyingwhales'}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value.toLowerCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Credential used to sign in on the Flying Whales login screen
                  </p>
                </div>

                {/* 4 & 5: Password & Confirm Password */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Lock className="w-3.5 h-3.5 text-[#1a66c2] dark:text-sky-400" />
                      <span>{editingEmployee ? 'Password (Optional Reset)' : 'Account Password *'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#1a66c2] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  {editingEmployee && (
                    <p className="text-[11px] text-slate-400">
                      Leave blank to keep employee's existing password unchanged.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        {editingEmployee ? 'New Password' : 'Password (min 6 chars) *'}
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={editingEmployee ? 'Enter new password' : 'Create password'}
                        className="w-full px-3.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                      />
                    </div>
                  </div>
                </div>

                {/* 6 & 7: Role & Status Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1a66c2]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Pinned Footer */}
            <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-employee-btn"
                type="submit"
                form="employee-modal-form"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#1a66c2] hover:bg-[#1555a3] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingEmployee ? 'Save Changes' : 'Create Employee'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
