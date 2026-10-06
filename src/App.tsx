/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  getAllMedia, 
  getAllAlbums, 
  saveMediaItem, 
  saveMediaBatch, 
  updateMediaItem, 
  updateMediaBatch, 
  deleteMediaPermanent, 
  deleteMediaBatchPermanent, 
  emptyTrash,
  saveAlbum, 
  deleteAlbum as deleteAlbumStorage, 
  seedInitialSampleData, 
  processFileToMedia,
  getCurrentUser,
  connectWebSocket,
  subscribeToCloudSync,
  toggleLikeMedia,
  addCommentMedia,
  calculateStorageStats,
  formatBytes
} from './services/storage';
import { MediaItem, Album, ViewFilter, SortOption, ViewMode, OnlineUser, MediaAuthor, FOUR_TERABYTES_BYTES } from './types/media';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MediaGrid } from './components/MediaGrid';
import { LightboxModal } from './components/LightboxModal';
import { UploadModal } from './components/UploadModal';
import { CameraModal } from './components/CameraModal';
import { AlbumModal } from './components/AlbumModal';
import { VaultPinModal } from './components/VaultPinModal';
import { BackupModal } from './components/BackupModal';
import { BackgroundModal, CustomWallpaperConfig } from './components/BackgroundModal';
import { UploadCloud, CheckCircle, Camera, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<MediaAuthor>(getCurrentUser());
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentFilter, setCurrentFilter] = useState<ViewFilter>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Custom Wallpaper State
  const [customWallpaper, setCustomWallpaper] = useState<CustomWallpaperConfig>(() => {
    try {
      const saved = localStorage.getItem('putrek_wallpaper_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { imageUrl: null, opacity: 0.4, blur: 0 };
  });

  const handleUpdateWallpaper = (cfg: CustomWallpaperConfig) => {
    setCustomWallpaper(cfg);
    try {
      localStorage.setItem('putrek_wallpaper_config', JSON.stringify(cfg));
    } catch (err) {
      console.error('Failed to save wallpaper config:', err);
    }
  };

  // Vault state
  const [vaultPin, setVaultPinState] = useState<string | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);

  // Lightbox Viewer
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);

  // Keep activeMediaItem in sync with latest mediaList
  useEffect(() => {
    if (activeMediaItem) {
      const latest = mediaList.find((m) => m.id === activeMediaItem.id);
      if (latest && (latest.likes !== activeMediaItem.likes || latest.comments !== activeMediaItem.comments || latest.name !== activeMediaItem.name)) {
        setActiveMediaItem(latest);
      }
    }
  }, [mediaList]);

  // Global window drag and drop
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Reload data from Cloud API
  const refreshData = useCallback(async () => {
    try {
      const items = await getAllMedia();
      const allAlbs = await getAllAlbums();
      setMediaList(items);
      setAlbums(allAlbs);
    } catch (err) {
      console.error('Failed to load storage data:', err);
    }
  }, []);

  // Connect WebSocket & subscribe to real-time events
  useEffect(() => {
    connectWebSocket(currentUser);

    const unsubscribe = subscribeToCloudSync((event) => {
      if (event.type === 'init') {
        if (event.media) setMediaList(event.media);
        if (event.albums) setAlbums(event.albums);
        if (event.users) setOnlineUsers(event.users);
      } else if (event.type === 'media:created' && event.items) {
        setMediaList((prev) => {
          const ids = new Set(event.items!.map((i) => i.id));
          const filtered = prev.filter((i) => !ids.has(i.id));
          return [...event.items!, ...filtered];
        });
      } else if (event.type === 'media:updated' && event.item) {
        setMediaList((prev) =>
          prev.map((i) => (i.id === event.item!.id ? event.item! : i))
        );
      } else if (event.type === 'media:deleted' && event.id) {
        setMediaList((prev) => prev.filter((i) => i.id !== event.id));
      } else if (event.type === 'presence:update' && event.users) {
        setOnlineUsers(event.users);
      } else if (event.type === 'album:created' && event.album) {
        setAlbums((prev) => {
          if (prev.some((a) => a.id === event.album!.id)) return prev;
          return [...prev, event.album!];
        });
      } else if (event.type === 'album:deleted' && event.id) {
        setAlbums((prev) => prev.filter((a) => a.id !== event.id));
      }
    });

    // Initial load
    const init = async () => {
      const existing = await getAllMedia();
      if (existing.length === 0) {
        await seedInitialSampleData();
      }
      await refreshData();
    };
    init();

    return () => {
      unsubscribe();
    };
  }, [currentUser, refreshData]);

  // Global Drag & Drop Handler
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsWindowDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsWindowDragOver(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          const newItems: MediaItem[] = [];
          for (const file of files) {
            const item = await processFileToMedia(file, selectedAlbumId || 'none');
            newItems.push(item);
          }
          // Optimistic update
          setMediaList((prev) => [...newItems, ...prev]);
          await saveMediaBatch(newItems);
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 },
          });
          showToast(`Berhasil menyimpan ${newItems.length} berkas ke Cloud 4TB!`);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [selectedAlbumId]);

  // Storage Stats (4 TB Tier)
  const stats = useMemo(() => calculateStorageStats(mediaList), [mediaList]);

  // Filtered & Sorted Media items
  const filteredItems = useMemo(() => {
    let result = [...mediaList];

    if (currentFilter === 'trash') {
      result = result.filter((i) => i.isTrash);
    } else if (currentFilter === 'vault') {
      result = result.filter((i) => i.isVault && !i.isTrash);
    } else {
      result = result.filter((i) => !i.isTrash && !i.isVault);

      if (selectedAlbumId) {
        result = result.filter((i) => i.albumId === selectedAlbumId);
      } else if (currentFilter === 'image') {
        result = result.filter((i) => i.type === 'image');
      } else if (currentFilter === 'video') {
        result = result.filter((i) => i.type === 'video');
      } else if (currentFilter === 'favorite') {
        result = result.filter((i) => i.isFavorite);
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const matchName = item.name.toLowerCase().includes(q);
        const matchCaption = item.caption?.toLowerCase().includes(q);
        const matchAuthor = item.author?.name.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const album = albums.find((a) => a.id === item.albumId);
        const matchAlbum = album?.name.toLowerCase().includes(q);
        return matchName || matchCaption || matchAuthor || matchTags || matchAlbum;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return (b.size || 0) - (a.size || 0);
        case 'size-asc':
          return (a.size || 0) - (b.size || 0);
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [mediaList, currentFilter, selectedAlbumId, searchQuery, sortBy, albums]);

  // Counts for sidebar
  const counts = useMemo(() => {
    let totalAll = 0;
    let totalPhotos = 0;
    let totalVideos = 0;
    let totalFavorites = 0;
    let totalVault = 0;
    let totalTrash = 0;
    const mediaCountsByAlbum: Record<string, number> = {};

    for (const item of mediaList) {
      if (item.isTrash) {
        totalTrash++;
      } else if (item.isVault) {
        totalVault++;
      } else {
        totalAll++;
        if (item.type === 'image') totalPhotos++;
        if (item.type === 'video') totalVideos++;
        if (item.isFavorite) totalFavorites++;
        if (item.albumId && item.albumId !== 'none') {
          mediaCountsByAlbum[item.albumId] = (mediaCountsByAlbum[item.albumId] || 0) + 1;
        }
      }
    }

    return {
      totalAll,
      totalPhotos,
      totalVideos,
      totalFavorites,
      totalVault,
      totalTrash,
      mediaCountsByAlbum,
    };
  }, [mediaList]);

  // Action Handlers
  const handleSelectFilter = (filter: ViewFilter) => {
    if (filter === 'vault' && !isVaultUnlocked) {
      setIsVaultModalOpen(true);
      return;
    }
    setCurrentFilter(filter);
    setSelectedAlbumId(null);
    setSearchQuery('');
  };

  const handleSelectAlbum = (albumId: string | null) => {
    setSelectedAlbumId(albumId);
    if (albumId !== null) {
      setCurrentFilter('all');
    }
    setSearchQuery('');
  };

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = mediaList.find((i) => i.id === id);
    if (!target) return;
    const nextState = !target.isFavorite;
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isFavorite: nextState } : i))
    );
    await updateMediaItem(id, { isFavorite: nextState });
    showToast(nextState ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit');
  };

  const handleToggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await toggleLikeMedia(id, currentUser.id);
  };

  const handleAddComment = async (id: string, text: string) => {
    await addCommentMedia(id, text);
    showToast('Komentar terkirim ke semua pengguna!');
  };

  // Instant Manual Delete to Trash
  const handleTrash = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trashedAt = Date.now();
    // Instant optimistic state update
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isTrash: true, trashedAt } : i))
    );
    await updateMediaItem(id, { isTrash: true, trashedAt });
    showToast('Berkas dipindahkan ke Tempat Sampah (Auto-Hapus dalam 30 hari)');
  };

  // Instant Manual Restore
  const handleRestore = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Instant optimistic state update
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isTrash: false, trashedAt: undefined } : i))
    );
    await updateMediaItem(id, { isTrash: false, trashedAt: undefined });
    showToast('Berkas berhasil dipulihkan ke galeri utama');
  };

  // Instant Permanent Delete
  const handleDeletePermanent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Instant optimistic state update
    setMediaList((prev) => prev.filter((i) => i.id !== id));
    await deleteMediaPermanent(id);
    showToast('Berkas telah dihapus permanen');
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    setMediaList((prev) => prev.filter((i) => !i.isTrash));
    await emptyTrash();
    showToast('Semua berkas di tempat sampah telah dikosongkan permanen');
  };

  const handleMoveToAlbum = async (id: string, albumId: string) => {
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, albumId } : i))
    );
    await updateMediaItem(id, { albumId });
    const albumName = albums.find((a) => a.id === albumId)?.name || 'Tanpa Album';
    showToast(`Dipindahkan ke ${albumName}`);
  };

  const handleToggleVault = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = mediaList.find((i) => i.id === id);
    if (!target) return;
    const nextState = !target.isVault;
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isVault: nextState } : i))
    );
    await updateMediaItem(id, { isVault: nextState });
    showToast(nextState ? 'Disimpan aman di Brankas Rahasia' : 'Dikeluarkan dari Brankas');
  };

  // Batch actions
  const handleBatchMoveAlbum = async (ids: string[], albumId: string) => {
    const idSet = new Set(ids);
    setMediaList((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, albumId } : i))
    );
    await updateMediaBatch(ids, { albumId });
    showToast(`${ids.length} berkas dipindahkan ke album`);
  };

  const handleBatchTrash = async (ids: string[]) => {
    const trashedAt = Date.now();
    const idSet = new Set(ids);
    setMediaList((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, isTrash: true, trashedAt } : i))
    );
    for (const id of ids) {
      await updateMediaItem(id, { isTrash: true, trashedAt });
    }
    showToast(`${ids.length} berkas dipindahkan ke Tempat Sampah (30 hari)`);
  };

  const handleBatchRestore = async (ids: string[]) => {
    const idSet = new Set(ids);
    setMediaList((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, isTrash: false, trashedAt: undefined } : i))
    );
    await updateMediaBatch(ids, { isTrash: false, trashedAt: undefined });
    showToast(`${ids.length} berkas berhasil dipulihkan ke galeri utama`);
  };

  const handleBatchDeletePermanent = async (ids: string[]) => {
    const idSet = new Set(ids);
    setMediaList((prev) => prev.filter((i) => !idSet.has(i.id)));
    await deleteMediaBatchPermanent(ids);
    showToast(`${ids.length} berkas dihapus permanen`);
  };

  const handleBatchFavorite = async (ids: string[], status: boolean) => {
    const idSet = new Set(ids);
    setMediaList((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, isFavorite: status } : i))
    );
    await updateMediaBatch(ids, { isFavorite: status });
    showToast(`${ids.length} berkas ${status ? 'difavoritkan' : 'dibatalkan favorit'}`);
  };

  // Save new media
  const handleSaveBatchMedia = async (items: MediaItem[]) => {
    setMediaList((prev) => [...items, ...prev]);
    await saveMediaBatch(items);
    if (currentFilter === 'trash') {
      setCurrentFilter('all');
    }
    setSearchQuery('');
    if (items.length > 0) {
      // Automatically open the first uploaded file in the viewer
      setActiveMediaItem(items[0]);
    }
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
    });
    showToast(`${items.length} berkas berhasil diunggah & tersimpan di Cloud 1000 TB!`);
  };

  const handleSaveSingleMedia = async (item: MediaItem) => {
    setMediaList((prev) => [item, ...prev]);
    await saveMediaItem(item);
    if (currentFilter === 'trash') {
      setCurrentFilter('all');
    }
    setSearchQuery('');
    setActiveMediaItem(item);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.8 },
    });
    showToast('Media berhasil disimpan di Cloud 1000 TB!');
  };

  // Save new album
  const handleSaveAlbum = async (album: Album) => {
    setAlbums((prev) => [...prev, album]);
    await saveAlbum(album);
    showToast(`Album "${album.name}" berhasil dibuat`);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (selectedAlbumId === albumId) setSelectedAlbumId(null);
    await deleteAlbumStorage(albumId);
    showToast('Album berhasil dihapus');
  };

  const handleSeedData = async () => {
    await seedInitialSampleData();
    await refreshData();
    showToast('Sampel media Cloud 4TB berhasil dimuat!');
  };

  // Vault PIN management
  const handleSetNewPin = async (newPin: string) => {
    setVaultPinState(newPin);
    setIsVaultUnlocked(true);
    setCurrentFilter('vault');
    showToast('PIN Brankas berhasil dibuat dan dibuka');
  };

  const handleUnlockSuccess = () => {
    setIsVaultUnlocked(true);
    setCurrentFilter('vault');
    showToast('Brankas berhasil dibuka');
  };

  const handleLockVault = () => {
    setIsVaultUnlocked(false);
    if (currentFilter === 'vault') setCurrentFilter('all');
    showToast('Brankas berhasil dikunci kembali');
  };

  const handleUpdateItem = async (id: string, updates: Partial<MediaItem>) => {
    setMediaList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
    await updateMediaItem(id, updates);
  };

  const handleResetAllData = async () => {
    setMediaList([]);
    await deleteMediaBatchPermanent(mediaList.map((i) => i.id));
    showToast('Semua data galeri cloud berhasil dibersihkan');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Dynamic Custom Photographic Background Wallpaper */}
      {customWallpaper.imageUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-300"
          style={{ 
            backgroundImage: `url(${customWallpaper.imageUrl})`,
            opacity: customWallpaper.opacity,
            filter: customWallpaper.blur > 0 ? `blur(${customWallpaper.blur}px)` : 'none',
            backgroundPosition: 'center center',
          }}
        />
      )}
      {/* Ambient Gradient & Soft Glass Tint Layer when wallpaper active */}
      {customWallpaper.imageUrl && (
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/60 to-zinc-950/80 pointer-events-none" />
      )}

      {/* Relative wrapper for interactive content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700 text-xs font-medium text-zinc-100 shadow-2xl animate-bounce">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Global Drag and Drop Overlay */}
        {isWindowDragOver && (
          <div className="fixed inset-0 z-50 bg-amber-500/10 backdrop-blur-sm border-4 border-dashed border-amber-500 flex flex-col items-center justify-center p-6 pointer-events-none">
            <div className="p-6 rounded-2xl bg-zinc-950/95 border border-amber-500/50 shadow-2xl flex flex-col items-center gap-3 animate-pulse">
              <UploadCloud className="w-12 h-12 text-amber-400 stroke-[2]" />
              <h3 className="text-lg font-bold text-white font-display">
                Lepaskan Berkas ke Cloud 1000 TB!
              </h3>
              <p className="text-xs text-zinc-400">
                Media akan otomatis tersimpan dan tersinkron ke semua orang secara online
              </p>
            </div>
          </div>
        )}

        {/* Navbar with 4TB Cloud Indicator & Online Presence */}
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onOpenCamera={() => setIsCameraModalOpen(true)}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenBackground={() => setIsBackgroundModalOpen(true)}
          totalPhotos={counts.totalPhotos}
          totalVideos={counts.totalVideos}
          usedBytes={stats.usedBytes}
          onlineUsers={onlineUsers}
          currentUser={currentUser}
          onUpdateCurrentUser={setCurrentUser}
          onSeedData={handleSeedData}
        />

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            currentFilter={currentFilter}
            selectedAlbumId={selectedAlbumId}
            onSelectFilter={handleSelectFilter}
            onSelectAlbum={handleSelectAlbum}
            albums={albums}
            onOpenCreateAlbum={() => setIsAlbumModalOpen(true)}
            onDeleteAlbum={handleDeleteAlbum}
            totalAll={counts.totalAll}
            totalPhotos={counts.totalPhotos}
            totalVideos={counts.totalVideos}
            totalFavorites={counts.totalFavorites}
            totalVault={counts.totalVault}
            totalTrash={counts.totalTrash}
            mediaCountsByAlbum={counts.mediaCountsByAlbum}
            usedBytes={stats.usedBytes}
            onlineUsers={onlineUsers}
            onSeedData={handleSeedData}
            isVaultUnlocked={isVaultUnlocked}
            onLockVault={handleLockVault}
          />

          {/* Gallery Content Area */}
          <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)]">
            <MediaGrid
              items={filteredItems}
              allMedia={mediaList}
              albums={albums}
              currentUser={currentUser}
              currentFilter={currentFilter}
              selectedAlbumId={selectedAlbumId}
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onItemClick={(item) => {
                setActiveMediaItem(item);
              }}
              onToggleFavorite={handleToggleFavorite}
              onToggleLike={handleToggleLike}
              onTrash={handleTrash}
              onRestore={handleRestore}
              onDeletePermanent={handleDeletePermanent}
              onEmptyTrash={handleEmptyTrash}
              onMoveToAlbum={handleMoveToAlbum}
              onToggleVault={handleToggleVault}
              onBatchMoveAlbum={handleBatchMoveAlbum}
              onBatchTrash={handleBatchTrash}
              onBatchRestore={handleBatchRestore}
              onBatchDeletePermanent={handleBatchDeletePermanent}
              onBatchFavorite={handleBatchFavorite}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onOpenCamera={() => setIsCameraModalOpen(true)}
              onSeedData={handleSeedData}
              onSelectFilter={handleSelectFilter}
              onSelectAlbum={handleSelectAlbum}
              counts={counts}
            />
          </main>
        </div>

        {/* Floating Quick Action Camera Button on Mobile / Universal View */}
        <button
          onClick={() => setIsCameraModalOpen(true)}
          className="fixed bottom-6 right-6 z-30 p-3.5 sm:p-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-400/40 group"
          title="Buka Kamera Web & Foto/Video Instan"
        >
          <Camera className="w-6 h-6 stroke-[2.4]" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-0 group-hover:pl-1">
            Kamera Sistem
          </span>
        </button>
      </div>

      {/* Lightbox Modal */}
      {activeMediaItem && (
        <LightboxModal
          currentItem={activeMediaItem}
          items={filteredItems.length > 0 ? filteredItems : mediaList}
          currentUser={currentUser}
          onClose={() => setActiveMediaItem(null)}
          onNavigateItem={(item) => setActiveMediaItem(item)}
          onUpdateItem={(id, updates) => {
            handleUpdateItem(id, updates);
            setActiveMediaItem((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
          }}
          onToggleFavorite={(id) => {
            handleToggleFavorite(id);
            setActiveMediaItem((prev) => (prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev));
          }}
          onToggleLike={(id) => {
            handleToggleLike(id);
          }}
          onAddComment={handleAddComment}
          onTrash={(id) => {
            handleTrash(id);
            setActiveMediaItem(null);
          }}
          albums={albums}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSaveBatch={handleSaveBatchMedia}
        albums={albums}
        defaultAlbumId={selectedAlbumId || undefined}
      />

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSaveMedia={handleSaveSingleMedia}
      />

      {/* Album Creation Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        onSaveAlbum={handleSaveAlbum}
      />

      {/* Vault PIN Security Modal */}
      <VaultPinModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        existingPin={vaultPin}
        onUnlockSuccess={handleUnlockSuccess}
        onSetNewPin={handleSetNewPin}
      />

      {/* Backup & Storage Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        mediaItems={mediaList.filter((i) => !i.isTrash)}
        usedBytes={stats.usedBytes}
        onImportItems={handleSaveBatchMedia}
        onResetAllData={handleResetAllData}
      />

      {/* Custom Background Modal */}
      <BackgroundModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        config={customWallpaper}
        onChangeConfig={handleUpdateWallpaper}
      />
    </div>
  );
}
