import React from 'react';
import { X } from 'lucide-react';
import styles from './EditEmployeeModal.module.css';

interface EditEmployeeModalProps {
  showEditEmployeeModal: boolean;
  setShowEditEmployeeModal: (show: boolean) => void;
  editingEmployee: { id: string; name: string } | null;
  setEditingEmployee: (emp: { id: string; name: string } | null) => void;
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
            <label htmlFor="editEmployeeName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              id="editEmployeeName"
              type="text"
              required
              value={editingEmployee.name}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
              placeholder="Digite o nome do funcionário..."
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditEmployeeModal(false);
                setEditingEmployee(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!editingEmployee.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
