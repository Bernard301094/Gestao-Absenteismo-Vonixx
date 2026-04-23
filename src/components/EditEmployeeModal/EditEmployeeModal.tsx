import React from 'react';
import { X } from 'lucide-react';

interface EditEmployeeModalProps {
  showEditEmployeeModal: boolean;
  setShowEditEmployeeModal: (show: boolean) => void;
  editingEmployee: { id: string; name: string; admissionDate?: string; role?: string; dismissed?: boolean; dismissalDate?: string } | null;
  setEditingEmployee: (emp: { id: string; name: string; admissionDate?: string; role?: string; dismissed?: boolean; dismissalDate?: string } | null) => void;
  handleUpdateEmployee: (e: React.FormEvent) => void;
}

export default function EditEmployeeModal({
  showEditEmployeeModal,
  setShowEditEmployeeModal,
  editingEmployee,
  setEditingEmployee,
  handleUpdateEmployee
}: EditEmployeeModalProps) {
  if (!showEditEmployeeModal || !editingEmployee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Editar Funcionário</h3>
          <button 
            onClick={() => {
              setShowEditEmployeeModal(false);
              setEditingEmployee(null);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleUpdateEmployee} className="p-4 sm:p-6 space-y-4">
          <div>
            <label htmlFor="editEmployeeName" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              id="editEmployeeName" type="text" required value={editingEmployee.name}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
            />
          </div>
          <div>
            <label htmlFor="editEmployeeRole" className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
            <input
              id="editEmployeeRole" type="text" value={editingEmployee.role || ''}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label htmlFor="editAdmissionDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Admissão</label>
            <input
              id="editAdmissionDate" type="date" required value={editingEmployee.admissionDate || ''}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, admissionDate: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editingEmployee.dismissed}
                onChange={(e) => setEditingEmployee({ 
                  ...editingEmployee, 
                  dismissed: e.target.checked,
                  dismissalDate: e.target.checked ? (editingEmployee.dismissalDate || new Date().toISOString().split('T')[0]) : undefined
                })}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Marcar como Demitido
            </label>

            {editingEmployee.dismissed && (
              <div className="pl-6 animate-in fade-in duration-200">
                <label htmlFor="dismissalDate" className="block text-xs font-medium text-gray-500 mb-1">
                  Data da Demissão (Oculta o funcionário a partir deste dia)
                </label>
                <input
                  id="dismissalDate" type="date" required={!!editingEmployee.dismissed}
                  value={editingEmployee.dismissalDate || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, dismissalDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button" onClick={() => { setShowEditEmployeeModal(false); setEditingEmployee(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={!editingEmployee.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
