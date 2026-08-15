import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, FolderKanban, Check, Sparkles } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectName: string) => void;
  existingProjects: string[];
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProjects,
}) => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = projectName.trim();
    if (!clean) {
      setError('Por favor, ingresa un nombre para el proyecto.');
      return;
    }
    if (clean.toLowerCase() === '__all__') {
      setError('Nombre de proyecto no permitido.');
      return;
    }
    onSave(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-blue-500/40 rounded-xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(37,99,235,0.25)] relative text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FolderPlus size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Nuevo Proyecto <span className="text-xs text-blue-400 font-mono font-normal">WORKSPACE</span>
            </h3>
            <p className="text-xs text-slate-400">
              Crea un espacio de trabajo para categorizar tus registros de ingeniería.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
              Nombre del Proyecto:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={projectName}
              onChange={e => {
                setProjectName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej: Microservicios Backend, App Móvil, Refactor UI..."
              className="w-full bg-[#020617] border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono transition"
            />
            {error && (
              <p className="text-xs text-red-400 font-mono mt-1.5 flex items-center gap-1">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* Existing Projects Quick List */}
          {existingProjects.length > 0 && (
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Proyectos Existentes:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {existingProjects.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onSave(p);
                      onClose();
                    }}
                    className="text-xs bg-slate-800/80 hover:bg-blue-900/40 text-slate-300 hover:text-blue-200 px-2.5 py-1 rounded border border-slate-700 hover:border-blue-500/50 font-mono transition flex items-center gap-1"
                    title={`Seleccionar y activar "${p}"`}
                  >
                    <FolderKanban size={11} className="text-blue-400" />
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition flex items-center space-x-1.5"
            >
              <Check size={14} />
              <span>Crear y Activar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
