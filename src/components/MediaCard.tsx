import React, { useState } from 'react';
import { 
  Play, 
  Heart, 
  Download, 
  MoreVertical, 
  Trash2, 
  FolderInput, 
  Shield, 
  Maximize2, 
  FileVideo, 
  Check, 
  MessageSquare, 
  RotateCcw, 
  Clock,
  Eye,
  Music,
  FileText,
  FileCode,
  Archive,
  File,
  FileSpreadsheet
} from 'lucide-react';
import { MediaItem, Album, MediaAuthor } from '../types/media';
import { formatBytes, downloadSingleItem, getRemainingTrashDays } from '../services/storage';

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  currentUser: MediaAuthor;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onClick: (item: MediaItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  onTrash: (id: string, e: React.MouseEvent) => void;
  onRestore?: (id: string, e: React.MouseEvent) => void;
  onDeletePermanent?: (id: string, e: React.MouseEvent) => void;
  albums: Album[];
  onMoveToAlbum?: (id: string, albumId: string) => void;
  onToggleVault?: (id: string, e: React.MouseEvent) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  currentUser,
  onToggleSelect,
  onClick,
  onToggleFavorite,
  onToggleLike,
  onTrash,
  onRestore,
  onDeletePermanent,
  albums,
  onMoveToAlbum,
  onToggleVault,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isLikedByMe = item.likes?.includes(currentUser.id) || false;
  const likesCount = item.likes?.length || 0;
  const commentsCount = item.comments?.length || 0;
  const remainingDays = item.isTrash ? getRemainingTrashDays(item.trashedAt) : 30;

  const ext = item.fileExtension || item.name.split('.').pop()?.toUpperCase() || 'FILE';

  // Compute CSS filter style if applied
  const getFilterStyle = () => {
    switch (item.filter) {
      case 'grayscale':
      case 'noir':
        return 'grayscale(100%)';
      case 'sepia':
      case 'vintage':
        return 'sepia(90%) contrast(110%)';
      case 'vivid':
        return 'saturate(160%) contrast(115%)';
      case 'warm':
        return 'sepia(30%) saturate(130%) hue-rotate(-10deg)';
      case 'cool':
        return 'hue-rotate(25deg) saturate(110%)';
      default:
        return 'none';
    }
  };

  const getRotationTransform = () => {
    return item.rotation ? `rotate(${item.rotation}deg)` : 'none';
  };

  // Render thumbnail depending on media format
  const renderThumbnail = () => {
    if (item.type === 'video') {
      return (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
          <video
            src={item.dataUrl}
            className={`w-full h-full object-cover pointer-events-none ${item.isTrash ? 'opacity-60 grayscale' : ''}`}
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/15 transition-colors">
            <div className="w-11 h-11 rounded-full bg-black/65 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transform group-hover:scale-110 transition-transform shadow-lg">
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono font-medium text-white flex items-center gap-1 border border-white/10">
            <FileVideo className="w-3 h-3 text-sky-400" />
            <span>
              {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : 'Video'}
            </span>
          </div>
        </div>
      );
    }

    if (item.type === 'audio') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-purple-950/70 to-zinc-950 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <Music className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-purple-200 font-mono tracking-wider">{ext}</span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400 font-medium bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800">
            <span>Audio &amp; Musik</span>
          </div>
        </div>
      );
    }

    if (item.type === 'pdf') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-rose-950/70 to-zinc-950 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-rose-300 font-mono tracking-wider">PDF DOKUMEN</span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400 font-medium bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800">
            <span>Klik untuk membaca</span>
          </div>
        </div>
      );
    }

    if (item.type === 'document') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-amber-950/50 to-zinc-950 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <FileCode className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-amber-300 font-mono tracking-wider">{ext}</span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400 font-medium bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800">
            <span>Dokumen / Teks</span>
          </div>
        </div>
      );
    }

    if (item.type === 'archive') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-sky-950/60 to-zinc-950 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <Archive className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-sky-300 font-mono tracking-wider">{ext}</span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400 font-medium bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800">
            <span>Arsip Terkompresi</span>
          </div>
        </div>
      );
    }

    if (item.type === 'file') {
      return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <File className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-zinc-300 font-mono tracking-wider">{ext}</span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400 font-medium bg-zinc-900/80 px-2.5 py-0.5 rounded-full border border-zinc-800">
            <span>Berkas Lainnya</span>
          </div>
        </div>
      );
    }

    // Default image rendering
    if (!imgError) {
      return (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
          <img
            src={item.dataUrl}
            alt={item.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${item.isTrash ? 'opacity-70 grayscale-[50%]' : ''}`}
            style={{
              filter: getFilterStyle(),
              transform: getRotationTransform(),
            }}
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Buka Media</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-400">
        <Maximize2 className="w-8 h-8 stroke-1 text-amber-500 mb-1" />
        <span className="text-xs truncate max-w-[80%] font-medium">{item.name}</span>
        <span className="text-[10px] text-zinc-500 mt-1">Klik untuk membuka</span>
      </div>
    );
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={`group relative rounded-xl overflow-hidden bg-zinc-900 border transition-all duration-200 cursor-pointer select-none flex flex-col hover:scale-[1.01] active:scale-[0.99] ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/30 bg-zinc-850'
          : item.isTrash
          ? 'border-rose-950/60 hover:border-rose-700 bg-zinc-900/90'
          : 'border-zinc-800/80 hover:border-amber-500/60 hover:shadow-xl hover:shadow-black/50'
      }`}
    >
      {/* Media Preview Container */}
      <div className="relative aspect-[4/3] w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
        {renderThumbnail()}

        {/* 30-Day Auto Delete Badge for Trash items */}
        {item.isTrash && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-950/90 border border-rose-800 text-[10px] font-medium text-rose-300 flex items-center gap-1 backdrop-blur-sm z-10">
            <Clock className="w-3 h-3 text-rose-400" />
            <span>Hapus dlm {remainingDays} hari</span>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
          {/* Select Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id, e);
            }}
            className={`pointer-events-auto w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
              item.isTrash ? 'mt-6' : ''
            } ${
              isSelected
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/40'
                : 'bg-black/60 backdrop-blur-sm border border-white/20 text-transparent hover:border-white/60 opacity-0 group-hover:opacity-100'
            }`}
            title={isSelected ? 'Batalkan pilihan' : 'Pilih item'}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>

          {/* Action buttons (Favorite, Direct Trash, Menu) */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {!item.isTrash ? (
              <>
                {/* Live Like Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(item.id, e);
                  }}
                  className={`px-2 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold backdrop-blur-sm transition-all cursor-pointer ${
                    isLikedByMe
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-black/60 border border-white/20 text-white/90 hover:text-rose-400'
                  }`}
                  title="Sukai media ini"
                >
                  <Heart className={`w-3 h-3 ${isLikedByMe ? 'fill-white' : ''}`} />
                  {likesCount > 0 && <span>{likesCount}</span>}
                </button>

                {/* Direct Trash / Delete Button on Card */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrash(item.id, e);
                  }}
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:text-rose-400 hover:border-rose-500/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Hapus ke Tempat Sampah (30 Hari)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              /* In Trash: Quick Restore & Permanent Delete */
              <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-white/20">
                {onRestore && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(item.id, e);
                    }}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    title="Pulihkan media ke galeri"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeletePermanent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePermanent(item.id, e);
                    }}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Hapus permanen sekarang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {!item.isTrash && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Pilihan lainnya"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseLeave={() => setShowMenu(false)}
                    className="absolute right-0 top-8 z-30 w-48 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-1 text-xs text-zinc-200"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSingleItem(item);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> Unduh Berkas
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id, e);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 cursor-pointer"
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'}`} />
                      {item.isFavorite ? 'Hapus Favorit' : 'Tambah Favorit'}
                    </button>

                    {onToggleVault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVault(item.id, e);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        {item.isVault ? 'Keluarkan dr Brankas' : 'Pindah ke Brankas'}
                      </button>
                    )}

                    {albums.length > 0 && onMoveToAlbum && !item.isTrash && (
                      <div className="border-t border-zinc-800 my-1 py-1">
                        <div className="px-3 py-1 text-[10px] text-zinc-500 uppercase font-semibold">
                          Pindah ke Album:
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveToAlbum(item.id, 'none');
                            setShowMenu(false);
                          }}
                          className={`w-full px-3 py-1 text-left flex items-center gap-2 hover:bg-zinc-800 cursor-pointer ${
                            item.albumId === 'none' ? 'text-amber-400 font-semibold' : ''
                          }`}
                        >
                          <FolderInput className="w-3 h-3 text-zinc-400" /> Tanpa Album
                        </button>
                        {albums.map((album) => (
                          <button
                            key={album.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveToAlbum(item.id, album.id);
                              setShowMenu(false);
                            }}
                            className={`w-full px-3 py-1 text-left flex items-center gap-2 hover:bg-zinc-800 cursor-pointer ${
                              item.albumId === album.id ? 'text-amber-400 font-semibold' : ''
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: album.color || '#f59e0b' }}
                            />
                            <span className="truncate">{album.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-zinc-800 my-1" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrash(item.id, e);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus ke Tempat Sampah
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5">
        <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-amber-400 transition-colors" title={item.name}>
          {item.name}
        </h4>

        {/* Author / Community info + unboxed metadata */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 truncate">
            {item.isTrash ? (
              <span className="text-rose-400 text-[10px] font-medium">
                Sampah · Tersisa {remainingDays} hari
              </span>
            ) : (
              <>
                {item.author && (
                  <span className="text-zinc-400 font-medium truncate flex items-center gap-1">
                    <span>{item.author.avatar || '👤'}</span>
                    <span className="truncate max-w-[70px]">{item.author.name}</span>
                  </span>
                )}
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-zinc-400">{formatBytes(item.size)}</span>
              </>
            )}
          </div>

          {!item.isTrash && commentsCount > 0 && (
            <span className="flex items-center gap-1 text-zinc-400 shrink-0">
              <MessageSquare className="w-3 h-3 text-amber-400" />
              <span>{commentsCount}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
