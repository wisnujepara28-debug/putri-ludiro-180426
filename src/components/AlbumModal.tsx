import React, { useState } from 'react';
import { X, FolderPlus, Palette, Check, AlertCircle } from 'lucide-react';
import { Album } from '../types/media';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAlbum: (album: Album) => void;
}

const PRESET_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const AlbumModal: React.FC<AlbumModalProps> = ({
  isOpen,
  onClose,
  onSaveAlbum,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama album wajib diisi.');
      return;
    }
    if (trimmedName.length < 2) {
      setErrorMsg('Nama album minimal 2 karakter.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Nama album maksimal 100 karakter.');
      return;
    }

    const newAlbum: Album = {
      id: 'album_' + Date.now(),
      name: trimmedName,
      description: description.trim().slice(0, 500),
      color,
      createdAt: Date.now(),
    };

    onSaveAlbum(newAlbum);
    setName('');
    setDescription('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                Buat Album Baru
              </h3>
              <p className="text-[11px] text-zinc-400">
                Kelompokkan foto &amp; video secara rapi di Firestore
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nama Album <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="misal: Liburan Bali, Wisuda, Kuliner"
              maxLength={100}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 transition-all"
            />
            <div className="flex justify-end text-[10px] text-zinc-500 mt-1">
              <span>{name.length}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Keterangan (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan ringkas mengenai album ini..."
              maxLength={500}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 resize-none transition-all"
            />
            <div className="flex justify-end text-[10px] text-zinc-500 mt-1">
              <span>{description.length}/500</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Warna Penanda Album
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-sm"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/30 active:scale-95 transition-all cursor-pointer"
            >
              Simpan Album
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
