'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Plus, Edit2, Trash2, X, Save, AlertTriangle, Blocks } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface ModuloSistema {
  id: number;
  nombre: string;
  descripcion?: string;
  ruta: string;
  icono?: string;
  activo: boolean;
  fecha_creacion: string;
}

export default function SystemModulesManagement() {
  const [modulos, setModulos] = useState<ModuloSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<Partial<ModuloSistema>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/modulos`);
      if (res.ok) {
        setModulos(await res.json());
      } else {
        setErrorMsg('Error al cargar los módulos.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar cargar módulos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewModal = () => {
    setFormData({ activo: true });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (mod: ModuloSistema) => {
    setFormData(mod);
    setEditingId(mod.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/api/modulos/${editingId}` : `${API_URL}/api/modulos`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        loadData();
        closeModal();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este módulo?')) return;
    try {
      const res = await fetch(`${API_URL}/api/modulos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Blocks className="w-6 h-6 text-indigo-500" />
            Módulos del Sistema
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestión de los módulos y accesos del sistema (ej. Torneos, Academias)
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nuevo Módulo
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6">
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-5 h-5" /> {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando módulos...</p>
          </div>
        ) : modulos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <Blocks className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No hay módulos configurados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-sm">Nombre</th>
                  <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-sm">Ruta</th>
                  <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-sm">Descripción</th>
                  <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-sm">Estado</th>
                  <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((mod) => (
                  <tr key={mod.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                        {mod.nombre}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                      {mod.ruta}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {mod.descripcion || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${mod.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {mod.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(mod)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(mod.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Editar Módulo' : 'Nuevo Módulo'}
              </h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  value={formData.nombre || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: Torneos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruta</label>
                <input
                  type="text"
                  name="ruta"
                  required
                  value={formData.ruta || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: /torneos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={formData.activo || false}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="activo" className="text-sm text-gray-700 dark:text-gray-300">
                  Módulo activo
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
