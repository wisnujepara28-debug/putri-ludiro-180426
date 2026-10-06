import React, { useState } from 'react';
import { 
  Camera, 
  Upload, 
  Archive, 
  Search, 
  X, 
  Cloud, 
  Users, 
  Radio, 
  Sparkles,
  UserCheck,
  Edit3,
  Check,
  Palette
} from 'lucide-react';
import { OnlineUser, MediaAuthor, FOUR_TERABYTES_BYTES } from '../types/media';
import { formatBytes, saveCurrentUser } from '../services/storage';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
  onOpenCamera: () => void;
  onOpenBackup: () => void;
  onOpenBackground: () => void;
  totalPhotos: number;
  totalVideos: number;
  usedBytes: number;
  onlineUsers: OnlineUser[];
  currentUser: MediaAuthor;
  onUpdateCurrentUser: (user: MediaAuthor) => void;
  onSeedData: () => void;
}

const AVATAR_OPTIONS = ['🦊', '🐯', '🐼', '🦁', '🚀', '⭐', '🎨', '📸', '💎', '🌊', '👑', '⚡'];

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenCamera,
  onOpenBackup,
  onOpenBackground,
  totalPhotos,
  totalVideos,
  usedBytes,
  onlineUsers,
  currentUser,
  onUpdateCurrentUser,
  onSeedData,
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    const updated = {
      ...currentUser,
      name: editName.trim(),
      avatar: editAvatar,
    };
    saveCurrentUser(updated);
    onUpdateCurrentUser(updated);
    setShowProfileModal(false);
  };

  const percentageUsed = ((usedBytes / FOUR_TERABYTES_BYTES) * 100).toFixed(3);

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between gap-3 shadow-sm">
      {/* Zone 1: Wordmark with 4TB Cloud Tier */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-amber-500/10">
          <Cloud className="w-5 h-5 text-zinc-950 stroke-[2.4]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 font-display">
              PUTREK
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              1000 TB
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Clean Search Input & Live Online Status */}
      <div className="flex-1 max-w-xl mx-auto flex items-center gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari foto, video, album, pengunggah..."
            className="w-full h-9.5 pl-10 pr-9 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Cloud Unboxed Metadata with Typographic Separator */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-zinc-400 whitespace-nowrap shrink-0">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{onlineUsers.length || 1} Online</span>
          </span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="text-zinc-300 font-medium">{totalPhotos} Foto</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="text-zinc-300 font-medium">{totalVideos} Video</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="font-mono text-amber-400/90">{formatBytes(usedBytes)} / 1000 TB</span>
        </div>
      </div>

      {/* Zone 3: Live Presence Avatars & Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Active Online Users Cluster */}
        <div className="hidden md:flex items-center -space-x-2 mr-1">
          {onlineUsers.slice(0, 4).map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-zinc-950 flex items-center justify-center text-xs shadow-sm cursor-pointer hover:z-10 hover:scale-110 transition-transform"
              style={{ backgroundColor: user.color || '#f59e0b' }}
              title={`${user.name} (Online)`}
            >
              <span>{user.avatar || '👤'}</span>
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-bold text-zinc-300">
              +{onlineUsers.length - 4}
            </div>
          )}
        </div>

        {/* User Profile Button */}
        <button
          onClick={() => {
            setEditName(currentUser.name);
            setEditAvatar(currentUser.avatar);
            setShowProfileModal(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
          title="Ubah Profil Pengguna Anda"
        >
          <span className="text-sm">{currentUser.avatar}</span>
          <span className="hidden lg:inline max-w-[80px] truncate font-medium">{currentUser.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>

        <button
          onClick={onOpenBackground}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
          title="Ganti foto latar belakang aplikasi dengan foto Anda sendiri"
        >
          <Palette className="w-4 h-4 text-amber-400 stroke-[2.2]" />
          <span className="hidden sm:inline font-semibold">Background</span>
        </button>

        <button
          onClick={onOpenBackup}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
          title="Cadangkan semua media ke arsip ZIP"
        >
          <Archive className="w-4 h-4 text-zinc-400" />
          <span className="hidden md:inline">Cadangan</span>
        </button>

        <button
          onClick={onOpenCamera}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
          title="Ambil foto atau video dari kamera"
        >
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Kamera</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-950/30 transition-all active:scale-95 whitespace-nowrap"
          title="Unggah foto atau video ke Cloud 4TB"
        >
          <Upload className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          <span>Unggah Cloud</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 font-display flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Profil Pengguna Online</span>
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Nama Tampilan (Terlihat oleh pengguna lain)
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  placeholder="Nama Anda..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Pilih Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setEditAvatar(av)}
                      className={`h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                        editAvatar === av
                          ? 'bg-amber-500/20 border-2 border-amber-500 scale-105'
                          : 'bg-zinc-950 border border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-semibold hover:bg-amber-400 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Simpan Profil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
