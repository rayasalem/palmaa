/**
 * Admin Users tab: list, filters, delete modal, user actions. Lazy-loaded.
 */

import React, { useRef } from 'react';
import { Search } from 'lucide-react';
import { useAdminView } from './AdminViewContext';
import { AdminUserRow } from './AdminUserRow';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export default function AdminUsersTab() {
  const {
    lang,
    t,
    loading,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    actionLoading,
    onViewProfile,
    handleStatusChange,
    handleRestoreUser,
    openDeleteUserModal,
    deleteModal,
    closeDeleteUserModal,
    dispatchDeleteModal,
    confirmDeleteUser,
  } = useAdminView();
  const { userToDelete, deleteReason, deleteLoading } = deleteModal;
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, !!userToDelete, {
    onEscape: closeDeleteUserModal,
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {userToDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={closeDeleteUserModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-user-title"
            aria-describedby="admin-delete-user-desc"
            tabIndex={-1}
            ref={dialogRef}
            className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="admin-delete-user-title" className="text-xl font-black text-palma-navy mb-2">
              {lang === 'ar' ? 'تأكيد حذف المستخدم' : 'Confirm user deletion'}
            </h3>
            <p id="admin-delete-user-desc" className="text-sm text-slate-600">
              {lang === 'ar'
                ? 'سيتم نقل الحساب إلى وضع المسودة ولن يتمكن صاحبه من تسجيل الدخول، وسيُحذف نهائياً بعد 30 يوماً ما لم يتم استرجاعه.'
                : 'The account will be moved to draft, the user will not be able to log in, and it will be permanently removed after 30 days unless restored.'}
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-700">
              <div>{userToDelete.name}</div>
              <div className="text-slate-500 font-mono mt-1">{userToDelete.email}</div>
            </div>
            <div>
              <label
                htmlFor="admin-delete-reason"
                className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2"
              >
                {lang === 'ar' ? 'سبب الحذف (يظهر في السجل الداخلي)' : 'Deletion reason (internal log)'}
              </label>
              <textarea
                id="admin-delete-reason"
                name="deleteReason"
                aria-label={lang === 'ar' ? 'سبب الحذف' : 'Deletion reason'}
                className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 outline-none resize-none"
                rows={3}
                value={deleteReason}
                onChange={(e) => dispatchDeleteModal({ type: 'SET_REASON', value: e.target.value })}
                placeholder={
                  lang === 'ar'
                    ? 'مثال: طلب المستخدم إغلاق الحساب / نشاط مخالف / حساب مكرر...'
                    : 'e.g. User requested closure / policy violation / duplicate account...'
                }
                disabled={deleteLoading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={confirmDeleteUser}
                disabled={deleteLoading}
                className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleteLoading
                  ? lang === 'ar'
                    ? 'جاري الحذف...'
                    : 'Deleting...'
                  : lang === 'ar'
                    ? 'تأكيد الحذف'
                    : 'Confirm delete'}
              </button>
              <button
                onClick={closeDeleteUserModal}
                disabled={deleteLoading}
                className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-card dashboard-card-body flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
        <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-palma-primary"></span>
          {t.common.activeUsersDB} ({filteredUsers.length})
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t.common.searchUsers}
              className="dashboard-input-search rtl:pl-4 rtl:pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="dashboard-filter-pills">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`dashboard-filter-pill ${filterStatus === 'ALL' ? 'bg-white text-palma-navy shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.common.showAll}
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`dashboard-filter-pill ${filterStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.common.approvedOnly}
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`dashboard-filter-pill ${filterStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.common.pendingOnly}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-empty py-20">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-palma-primary rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold text-slate-500">{t.common.loading}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="dashboard-empty">
          <span className="text-4xl block mb-4 grayscale opacity-60">👥</span>
          <p className="text-slate-500 font-semibold text-sm">{t.common.noData}</p>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table min-w-full text-left rtl:text-right">
              <thead>
                <tr>
                  <th className="w-64">
                    {t.auth.name} / {t.auth.email}
                  </th>
                  <th>{t.auth.role}</th>
                  <th>{t.common.status}</th>
                  <th>Source</th>
                  <th>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {filteredUsers.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    isProcessing={actionLoading === user.id}
                    lang={lang}
                    t={t}
                    onStatusChange={handleStatusChange}
                    onViewProfile={onViewProfile}
                    onRestore={handleRestoreUser}
                    onOpenDelete={openDeleteUserModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
