import React from 'react';
import { X } from 'lucide-react';

interface AddEmployeeModalProps {
  showAddEmployeeModal: boolean;
  setShowAddEmployeeModal: (show: boolean) => void;
  handleAddEmployee: (e: React.FormEvent) => void;
  newEmployeeName: string;
  setNewEmployeeName: (name: string) => void;
  newEmployeeAdmissionDate: string;
  setNewEmployeeAdmissionDate: (date: string) => void;
}

export default function AddEmployeeModal({
  showAddEmployeeModal,
  setShowAddEmployeeModal,
  handleAddEmployee,
  newEmployeeName,
  setNewEmployeeName,
  newEmployeeAdmissionDate,
  setNewEmployeeAdmissionDate
}: AddEmployeeModalProps) {
  if (!showAddEmployeeModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Novo Funcionário</h3>
          <button 
            onClick={() => setShowAddEmployeeModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAddEmployee} className="p-4 sm:p-6 space-y-4">
          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              id="employeeName"
              type="text"
              required
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder="Digite o nome do funcionário..."
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
            />
          </div>
          <div>
            <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700 mb-1">
              Data de Admissão
            </label>
            <input
              id="admissionDate"
              type="date"
              required
              value={newEmployeeAdmissionDate}
              onChange={(e) => setNewEmployeeAdmissionDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddEmployeeModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newEmployeeName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
