import React from 'react';
import { 
  Images, 
  Image as ImageIcon, 
  Video, 
  Heart, 
  Lock, 
  Trash2, 
  FolderPlus, 
  HardDrive,
  Cloud,
  Sparkles,
  Radio,
  Users
} from 'lucide-react';
import { Album, ViewFilter, OnlineUser, FOUR_TERABYTES_BYTES } from '../types/media';
import { formatBytes } from '../services/storage';

interface SidebarProps {
  currentFilter: ViewFilter;
  selectedAlbumId: string | null;
  onSelectFilter: (filter: ViewFilter) => void;
  onSelectAlbum: (albumId: string | null) => void;
  albums: Album[];
  onOpenCreateAlbum: () => void;
  onDeleteAlbum: (albumId: string) => void;
  totalAll: number;
  totalPhotos: number;
  totalVideos: number;
  totalFavorites: number;
  totalVault: number;
  totalTrash: number;
  mediaCountsByAlbum: Record<string, number>;
  usedBytes: number;
  onlineUsers: OnlineUser[];
  onSeedData: () => void;
  isVaultUnlocked: boolean;
  onLockVault: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  selectedAlbumId,
  onSelectFilter,
  onSelectAlbum,
  albums,
  onOpenCreateAlbum,
  onDeleteAlbum,
  totalAll,
  totalPhotos,
  totalVideos,
  totalFavorites,
  totalVault,
  totalTrash,
  mediaCountsByAlbum,
  usedBytes,
  onlineUsers,
  onSeedData,
  isVaultUnlocked,
  onLockVault,
}) => {
  const isNavActive = (filter: ViewFilter) => currentFilter === filter && selectedAlbumId === null;

  const percentageUsed = ((usedBytes / FOUR_TERABYTES_BYTES) * 100);
  const formattedPercent = percentageUsed < 0.01 ? '< 0.01%' : `${percentageUsed.toFixed(2)}%`;
  const freeBytes = Math.max(0, FOUR_TERABYTES_BYTES - usedBytes);

  return (
    <aside className="w-64 border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="p-3 space-y-6">
        {/* Main Categories */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('all')
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Images className="w-4 h-4 text-amber-500" />
              <span>Semua Media Cloud</span>
            </div>
            <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalAll}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('image')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('image')
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Koleksi Foto</span>
            </div>
            <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalPhotos}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('video')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('video')
                ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-sky-400" />
              <span>Koleksi Video</span>
            </div>
            <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalVideos}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('favorite')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('favorite')
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span>Favorit Bersama</span>
            </div>
            <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalFavorites}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('vault')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('vault')
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Brankas Pribadi</span>
            </div>
            <div className="flex items-center gap-1.5">
              {isVaultUnlocked && (
                <span className="text-[10px] text-emerald-400 font-bold">Terbuka</span>
              )}
              <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalVault}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('trash')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isNavActive('trash')
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-zinc-400" />
              <span>Sampah</span>
            </div>
            <span className="font-mono text-zinc-400 text-[11px] font-semibold">{totalTrash}</span>
          </button>
        </div>

        {/* Albums Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">
              Album Terbuka Bersama
            </span>
            <button
              type="button"
              onClick={onOpenCreateAlbum}
              className="text-zinc-400 hover:text-amber-400 transition-colors p-1 rounded hover:bg-zinc-900 cursor-pointer"
              title="Buat Album Baru"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {albums.length === 0 ? (
              <div className="px-3 py-3 rounded-xl border border-dashed border-zinc-800 text-center">
                <p className="text-[11px] text-zinc-500">Belum ada album</p>
                <button
                  type="button"
                  onClick={onOpenCreateAlbum}
                  className="mt-1 text-xs text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                >
                  <FolderPlus className="w-3 h-3" /> Buat Album
                </button>
              </div>
            ) : (
              albums.map((album) => {
                const count = mediaCountsByAlbum[album.id] || 0;
                const isSelected = selectedAlbumId === album.id;
                return (
                  <div
                    key={album.id}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shadow-sm'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                    onClick={() => {
                      onSelectAlbum(album.id);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: album.color || '#f59e0b' }}
                      />
                      <div className="min-w-0">
                        <span className="truncate block">{album.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-zinc-500 text-[11px]">{count}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAlbum(album.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-zinc-500 p-0.5 transition-opacity cursor-pointer"
                        title="Hapus Album"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Online Active Users List */}
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pengguna Online ({onlineUsers.length || 1})</span>
            </span>
          </div>

          <div className="space-y-1 px-1">
            {onlineUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 bg-zinc-900/40 border border-zinc-850"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{u.avatar}</span>
                  <span className="truncate text-xs font-medium">{u.name}</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4.0 TB Cloud Storage Meter Section */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 space-y-2.5">
        {/* Storage Card */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-200 font-semibold">
              <Cloud className="w-4 h-4 text-amber-400" />
              Kapasitas Cloud 1000 TB
            </span>
            <span className="font-mono text-amber-400 font-bold">{formattedPercent}</span>
          </div>

          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(1, percentageUsed))}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
            <span>Terpakai: {formatBytes(usedBytes)}</span>
            <span>Sisa: {formatBytes(freeBytes)}</span>
          </div>

          <p className="text-[10px] text-zinc-500 leading-tight">
            Tersambung online &amp; tersinkronisasi langsung ke setiap pengguna.
          </p>
        </div>

        <button
          type="button"
          onClick={onSeedData}
          className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Muat Contoh Media Cloud</span>
        </button>
      </div>
    </aside>
  );
};
