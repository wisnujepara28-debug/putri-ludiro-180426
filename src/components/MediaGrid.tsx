import React, { useState } from 'react';
import { 
  Grid3X3, 
  LayoutGrid, 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  Download, 
  Trash2, 
  Heart, 
  FolderInput, 
  X, 
  Upload, 
  Camera, 
  FolderOpen, 
  RotateCcw, 
  SearchX, 
  Sparkles, 
  Cloud,
  Clock,
  Images,
  Image as ImageIcon,
  Video,
  Lock,
  Check,
  AlertTriangle
} from 'lucide-react';
import { MediaItem, Album, ViewFilter, SortOption, ViewMode, MediaAuthor } from '../types/media';
import { MediaCard } from './MediaCard';
import { exportSelectedOrAllAsZip } from '../services/storage';

interface MediaGridProps {
  items: MediaItem[];
  allMedia: MediaItem[];
  albums: Album[];
  currentUser: MediaAuthor;
  currentFilter: ViewFilter;
  selectedAlbumId: string | null;
  searchQuery: string;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onItemClick: (item: MediaItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  onTrash: (id: string, e: React.MouseEvent) => void;
  onRestore: (id: string, e: React.MouseEvent) => void;
  onDeletePermanent: (id: string, e: React.MouseEvent) => void;
  onEmptyTrash: () => void;
  onMoveToAlbum: (id: string, albumId: string) => void;
  onToggleVault: (id: string, e: React.MouseEvent) => void;
  onBatchMoveAlbum: (ids: string[], albumId: string) => void;
  onBatchTrash: (ids: string[]) => void;
  onBatchRestore: (ids: string[]) => void;
  onBatchDeletePermanent: (ids: string[]) => void;
  onBatchFavorite: (ids: string[], status: boolean) => void;
  onOpenUpload: () => void;
  onOpenCamera: () => void;
  onSeedData: () => void;
  onSelectFilter?: (filter: ViewFilter) => void;
  onSelectAlbum?: (albumId: string | null) => void;
  counts?: {
    totalAll: number;
    totalPhotos: number;
    totalVideos: number;
    totalFavorites: number;
    totalVault: number;
    totalTrash: number;
  };
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  allMedia,
  albums,
  currentUser,
  currentFilter,
  selectedAlbumId,
  searchQuery,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onItemClick,
  onToggleFavorite,
  onToggleLike,
  onTrash,
  onRestore,
  onDeletePermanent,
  onEmptyTrash,
  onMoveToAlbum,
  onToggleVault,
  onBatchMoveAlbum,
  onBatchTrash,
  onBatchRestore,
  onBatchDeletePermanent,
  onBatchFavorite,
  onOpenUpload,
  onOpenCamera,
  onSeedData,
  onSelectFilter,
  onSelectAlbum,
  counts,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchAlbumMenu, setShowBatchAlbumMenu] = useState(false);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const handleDownloadSelectedZip = async () => {
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    if (selectedItems.length > 0) {
      await exportSelectedOrAllAsZip(selectedItems, `Cloud_Media_Terpilih_${Date.now()}.zip`);
    }
  };

  const handleRestoreAllTrash = () => {
    if (items.length > 0) {
      onBatchRestore(items.map((i) => i.id));
    }
  };

  const handleConfirmEmptyTrash = () => {
    onEmptyTrash();
    setShowEmptyTrashConfirm(false);
  };

  const getViewTitle = () => {
    if (searchQuery) return `Hasil Pencarian: "${searchQuery}"`;
    if (selectedAlbum) return `Album Bersama: ${selectedAlbum.name}`;
    switch (currentFilter) {
      case 'image':
        return 'Koleksi Foto Cloud';
      case 'video':
        return 'Koleksi Video Cloud';
      case 'favorite':
        return 'Favorit Bersama';
      case 'vault':
        return 'Brankas Rahasia Pribadi';
      case 'trash':
        return 'Tempat Sampah Bersama (Auto-Hapus 30 Hari)';
      default:
        return 'Semua Foto & Video Cloud (1000 TB)';
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto w-full">
      {/* Category Pills Strip (Universal Navigation across all devices) */}
      {onSelectFilter && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-zinc-850/80">
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'all' && !selectedAlbumId
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Semua Media</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'all' && !selectedAlbumId ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {counts.totalAll}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('image')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'image' && !selectedAlbumId
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Koleksi Foto</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'image' && !selectedAlbumId ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {counts.totalPhotos}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'video' && !selectedAlbumId
                ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/20'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Koleksi Video</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'video' && !selectedAlbumId ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {counts.totalVideos}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('favorite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'favorite' && !selectedAlbumId
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorit Bersama</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'favorite' && !selectedAlbumId ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {counts.totalFavorites}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('vault')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'vault' && !selectedAlbumId
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Brankas Pribadi</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'vault' && !selectedAlbumId ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {counts.totalVault}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('trash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              currentFilter === 'trash' && !selectedAlbumId
                ? 'bg-rose-950 text-rose-200 border border-rose-700 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sampah</span>
            {counts && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                currentFilter === 'trash' && !selectedAlbumId ? 'bg-rose-900 text-rose-200' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {counts.totalTrash}
              </span>
            )}
          </button>

          {/* Quick Album Pills */}
          {albums.map((alb) => (
            <button
              key={alb.id}
              type="button"
              onClick={() => onSelectAlbum?.(alb.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                selectedAlbumId === alb.id
                  ? 'bg-zinc-800 text-amber-300 border border-amber-500/50 font-bold'
                  : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: alb.color || '#f59e0b' }}
              />
              <span>{alb.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 font-display flex items-center gap-2">
            <span>{getViewTitle()}</span>
            {selectedAlbum && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedAlbum.color || '#f59e0b' }}
              />
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
            <span>{items.length} berkas {currentFilter === 'trash' ? 'di tempat sampah' : 'tersimpan'}</span>
            {currentFilter === 'trash' ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Dihapus otomatis setelah 30 hari</span>
                </span>
              </>
            ) : selectedAlbum?.createdBy ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Dibuat oleh: {selectedAlbum.createdBy}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Sorting & Layout Toggles */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {items.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {selectedIds.length === items.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Batalkan Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Pilih Semua</span>
                </>
              )}
            </button>
          )}

          {/* Sort Selector */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-300 font-medium hover:border-zinc-700 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
              <option value="size-desc">Ukuran Terbesar</option>
              <option value="size-asc">Ukuran Terkecil</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          </div>

          {/* View Modes */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tampilan Kisi Reguler"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('masonry')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'masonry'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tampilan Bento Dinamis"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Trash Notice Banner */}
      {currentFilter === 'trash' && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
          <div className="flex items-start gap-3 text-xs text-zinc-300">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-rose-300 text-sm block">
                Penyimpanan Sampah Terpusat (Batas 30 Hari)
              </span>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                Semua berkas yang dihapus dikumpulkan di sini dan <strong>akan hilang/terhapus otomatis secara permanen setelah 30 hari</strong> jika tidak dipulihkan.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
              <button
                type="button"
                onClick={handleRestoreAllTrash}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                <span>Pulihkan Semua ({items.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmptyTrashConfirm(true)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
                <span>Kosongkan Sampah Sekarang</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {showEmptyTrashConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">
                Kosongkan Tempat Sampah?
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Semua <strong>{items.length} berkas</strong> di tempat sampah akan dihapus secara permanen dari server Cloud 4TB dan <strong>tidak dapat dikembalikan</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyTrashConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 p-2.5 px-4 rounded-xl bg-amber-500 text-zinc-950 font-semibold shadow-xl shadow-amber-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 stroke-[2.5]" />
            <span>{selectedIds.length} item dipilih</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={handleDownloadSelectedZip}
              className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-medium hover:bg-zinc-900 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Unduh ZIP untuk berkas terpilih"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Unduh ZIP ({selectedIds.length})</span>
            </button>

            {currentFilter !== 'trash' && (
              <>
                <button
                  type="button"
                  onClick={() => onBatchFavorite(selectedIds, true)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-medium hover:bg-zinc-900 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>Favoritkan</span>
                </button>

                {albums.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBatchAlbumMenu(!showBatchAlbumMenu)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-medium hover:bg-zinc-900 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pindah Album</span>
                    </button>

                    {showBatchAlbumMenu && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-1 text-xs text-zinc-200">
                        <button
                          type="button"
                          onClick={() => {
                            onBatchMoveAlbum(selectedIds, 'none');
                            setShowBatchAlbumMenu(false);
                            setSelectedIds([]);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 cursor-pointer"
                        >
                          Tanpa Album
                        </button>
                        {albums.map((alb) => (
                          <button
                            key={alb.id}
                            type="button"
                            onClick={() => {
                              onBatchMoveAlbum(selectedIds, alb.id);
                              setShowBatchAlbumMenu(false);
                              setSelectedIds([]);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: alb.color || '#f59e0b' }}
                            />
                            <span className="truncate">{alb.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onBatchTrash(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ke Sampah (30 Hari)</span>
                </button>
              </>
            )}

            {currentFilter === 'trash' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onBatchRestore(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 text-emerald-400 font-medium hover:bg-zinc-900 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Terpilih</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBatchDeletePermanent(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Permanen</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-lg text-zinc-950 hover:bg-amber-600/50 cursor-pointer"
              title="Batal pilih"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* Media Grid Canvas */}
      {items.length === 0 ? (
        <div className="py-20 px-4 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-inner">
            {searchQuery ? (
              <SearchX className="w-7 h-7 text-zinc-500" />
            ) : currentFilter === 'trash' ? (
              <Trash2 className="w-7 h-7 text-zinc-500" />
            ) : currentFilter === 'vault' ? (
              <Lock className="w-7 h-7 text-amber-500" />
            ) : (
              <Cloud className="w-7 h-7 text-amber-500/70" />
            )}
          </div>

          <h3 className="text-base font-bold text-zinc-200 font-display">
            {searchQuery
              ? 'Tidak ada berkas yang cocok'
              : currentFilter === 'trash'
              ? 'Tempat Sampah Bersih & Kosong'
              : currentFilter === 'vault'
              ? 'Brankas Pribadi Masih Kosong'
              : currentFilter === 'image'
              ? 'Belum ada foto tersimpan'
              : currentFilter === 'video'
              ? 'Belum ada video tersimpan'
              : currentFilter === 'favorite'
              ? 'Belum ada media favorit'
              : 'Belum ada foto atau video di Cloud 1000 TB'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
            {searchQuery
              ? `Tidak ditemukan berkas dengan kata kunci "${searchQuery}".`
              : currentFilter === 'trash'
              ? 'Berkas yang Anda buang akan dikumpulkan di sini dan akan dihapus permanen secara otomatis setelah 30 hari.'
              : currentFilter === 'vault'
              ? 'Pindahkan foto & video rahasia ke brankas ini melalui menu titik tiga pada setiap media.'
              : 'Unggah foto, video, dan berkas apa saja ke Cloud 1000 TB secara mudah dan aman.'}
          </p>

          {!searchQuery && currentFilter !== 'trash' && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={onOpenUpload}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-950/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                <span>Unggah ke Cloud 4TB</span>
              </button>

              <button
                type="button"
                onClick={onOpenCamera}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Buka Kamera</span>
              </button>

              {allMedia.length === 0 && (
                <button
                  type="button"
                  onClick={onSeedData}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Muat Sampel Cloud</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'masonry'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[220px]'
              : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5'
          }
        >
          {items.map((item, index) => {
            const isSelected = selectedIds.includes(item.id);
            const isFeatured = viewMode === 'masonry' && index % 7 === 0;

            return (
              <div
                key={item.id}
                className={
                  viewMode === 'masonry' && isFeatured
                    ? 'col-span-2 row-span-2'
                    : 'col-span-1 row-span-1'
                }
              >
                <MediaCard
                  item={item}
                  isSelected={isSelected}
                  currentUser={currentUser}
                  onToggleSelect={handleToggleSelect}
                  onClick={onItemClick}
                  onToggleFavorite={onToggleFavorite}
                  onToggleLike={onToggleLike}
                  onTrash={onTrash}
                  onRestore={onRestore}
                  onDeletePermanent={onDeletePermanent}
                  albums={albums}
                  onMoveToAlbum={onMoveToAlbum}
                  onToggleVault={onToggleVault}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
