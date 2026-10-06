import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Heart, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Info, 
  Maximize, 
  Repeat, 
  Clock, 
  Send, 
  MessageSquare, 
  Users,
  RotateCcw,
  Sparkles,
  Music,
  FileText,
  FileCode,
  Archive,
  File,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { MediaItem, Album, MediaAuthor } from '../types/media';
import { formatBytes, downloadSingleItem, getRemainingTrashDays } from '../services/storage';

interface LightboxModalProps {
  currentItem: MediaItem;
  items: MediaItem[];
  currentUser: MediaAuthor;
  onClose: () => void;
  onNavigateItem: (item: MediaItem) => void;
  onUpdateItem: (id: string, updates: Partial<MediaItem>) => void;
  onToggleFavorite: (id: string) => void;
  onToggleLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onTrash: (id: string) => void;
  albums: Album[];
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  currentItem,
  items,
  currentUser,
  onClose,
  onNavigateItem,
  onUpdateItem,
  onToggleFavorite,
  onToggleLike,
  onAddComment,
  onTrash,
  albums,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(currentItem.rotation || 0);
  const [filter, setFilter] = useState(currentItem.filter || 'normal');
  const [showInfo, setShowInfo] = useState(false);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [captionInput, setCaptionInput] = useState(currentItem.caption || '');
  const [nameInput, setNameInput] = useState(currentItem.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Audio / Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentItem.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  // Find index of currentItem in the array
  const currentIndex = Math.max(0, items.findIndex((i) => i.id === currentItem.id));
  const ext = currentItem.fileExtension || currentItem.name.split('.').pop()?.toUpperCase() || 'FILE';

  // Reset per item when changed
  useEffect(() => {
    setZoom(1);
    setRotation(currentItem.rotation || 0);
    setFilter(currentItem.filter || 'normal');
    setCaptionInput(currentItem.caption || '');
    setNameInput(currentItem.name || '');
    setIsEditingName(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setCopiedText(false);
  }, [currentItem.id]);

  const handlePrev = () => {
    if (items.length <= 1) return;
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    onNavigateItem(items[prevIdx]);
  };

  const handleNext = () => {
    if (items.length <= 1) return;
    const nextIdx = (currentIndex + 1) % items.length;
    onNavigateItem(items[nextIdx]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') {
        if (currentItem.type === 'video') {
          e.preventDefault();
          togglePlayVideo();
        } else if (currentItem.type === 'audio') {
          e.preventDefault();
          togglePlayAudio();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items, isPlaying, currentItem]);

  // Slideshow auto timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSlideshow && items.length > 1) {
      timer = setInterval(() => {
        handleNext();
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isSlideshow, currentIndex, items]);

  const remainingDays = currentItem.isTrash ? getRemainingTrashDays(currentItem.trashedAt) : 30;

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    onUpdateItem(currentItem.id, { rotation: nextRot });
  };

  const handleFilterSelect = (newFilter: string) => {
    setFilter(newFilter);
    onUpdateItem(currentItem.id, { filter: newFilter });
  };

  const handleSaveCaption = () => {
    onUpdateItem(currentItem.id, { caption: captionInput.trim() });
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateItem(currentItem.id, { name: nameInput.trim() });
      setIsEditingName(false);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(currentItem.id, commentText.trim());
    setCommentText('');
  };

  const handleDeleteItem = () => {
    onTrash(currentItem.id);
    onClose();
  };

  const handleCopyTextContent = () => {
    if (currentItem.textContent) {
      navigator.clipboard.writeText(currentItem.textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Video controls
  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Audio controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getFilterStyle = () => {
    switch (filter) {
      case 'grayscale':
      case 'noir':
        return 'grayscale(100%) contrast(110%)';
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

  const isLikedByMe = currentItem.likes?.includes(currentUser.id) || false;
  const likesCount = currentItem.likes?.length || 0;
  const comments = currentItem.comments || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-md">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="bg-zinc-800 text-xs sm:text-sm px-2.5 py-1 rounded border border-amber-500/60 text-white outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="text-xs bg-amber-500 text-zinc-950 font-semibold px-2 py-1 rounded cursor-pointer"
              >
                Simpan
              </button>
            </div>
          ) : (
            <h3
              onClick={() => setIsEditingName(true)}
              className="text-xs sm:text-sm font-semibold text-zinc-200 truncate cursor-pointer hover:text-amber-400 flex items-center gap-1.5"
              title="Klik untuk mengubah nama berkas"
            >
              <span>{currentItem.name}</span>
            </h3>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 shrink-0">
            <span aria-hidden="true">·</span>
            <span className="font-mono text-amber-400 font-bold">{ext}</span>
            <span aria-hidden="true">·</span>
            <span>{currentIndex + 1} dari {items.length}</span>
            {currentItem.isTrash && (
              <span className="text-rose-400 font-medium">
                (Sampah · {remainingDays} hari lagi)
              </span>
            )}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!currentItem.isTrash && (
            <button
              onClick={() => onToggleLike(currentItem.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isLikedByMe
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-rose-400'
              }`}
              title="Sukai media ini"
            >
              <Heart className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-white' : ''}`} />
              <span className="hidden sm:inline">{likesCount > 0 ? `${likesCount} Suka` : 'Suka'}</span>
              {likesCount > 0 && <span className="sm:hidden">{likesCount}</span>}
            </button>
          )}

          <button
            onClick={() => setIsSlideshow(!isSlideshow)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isSlideshow
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-semibold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Tayangan Slide Otomatis"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Slide</span>
          </button>

          {!currentItem.isTrash && (
            <button
              onClick={() => onToggleFavorite(currentItem.id)}
              className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
                currentItem.isFavorite
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Favorit"
            >
              <Heart className={`w-4 h-4 ${currentItem.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          )}

          <button
            onClick={() => downloadSingleItem(currentItem)}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Unduh Berkas Asli"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer ${
              showInfo
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Info & Komentar Online"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Delete to Trash Button */}
          <button
            onClick={handleDeleteItem}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors cursor-pointer"
            title={currentItem.isTrash ? 'Hapus permanen' : 'Hapus ke Tempat Sampah (30 Hari)'}
          >
            <Trash2 className="w-4 h-4 stroke-[2.2]" />
          </button>

          <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Content */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
            title="Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Viewing Canvas */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative">
          {/* 1. Video Viewer */}
          {currentItem.type === 'video' && (
            <div className="w-full max-w-4xl max-h-[75vh] flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                src={currentItem.dataUrl}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                loop={isLooping}
                playsInline
                className="max-h-[60vh] sm:max-h-[68vh] max-w-full rounded-xl shadow-2xl object-contain bg-black cursor-pointer"
                onClick={togglePlayVideo}
              />

              {/* Video Controls */}
              <div className="w-full mt-2 sm:mt-3 p-2.5 sm:p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl backdrop-blur-md flex flex-col gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleVideoSeek}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />

                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={togglePlayVideo}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-bold hover:bg-amber-400 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="font-mono text-[11px] sm:text-xs text-zinc-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-md">
                      {[0.75, 1, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.playbackRate = spd;
                              setPlaybackSpeed(spd);
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono cursor-pointer ${
                            playbackSpeed === spd
                              ? 'bg-amber-500 text-zinc-950 font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`p-1.5 rounded cursor-pointer ${isLooping ? 'text-amber-400 bg-amber-500/20' : 'text-zinc-400 hover:text-white'}`}
                      title={isLooping ? 'Pengulangan aktif' : 'Ulangi video'}
                    >
                      <Repeat className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
                          else videoRef.current.requestFullscreen().catch(console.error);
                        }
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-white cursor-pointer"
                      title="Layar Penuh"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Audio Player */}
          {currentItem.type === 'audio' && (
            <div className="w-full max-w-xl p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-6">
              <audio
                ref={audioRef}
                src={currentItem.dataUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                loop={isLooping}
              />

              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-950/50 animate-pulse">
                <Music className="w-12 h-12 stroke-[2]" />
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-bold text-zinc-100 font-display">
                  {currentItem.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Berkas Audio Cloud ({formatBytes(currentItem.size)})
                </p>
              </div>

              {/* Progress & Controls */}
              <div className="w-full space-y-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleAudioSeek}
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />

                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-zinc-950" /> : <Play className="w-6 h-6 fill-zinc-950 ml-1" />}
                </button>
              </div>
            </div>
          )}

          {/* 3. PDF Document Reader */}
          {currentItem.type === 'pdf' && (
            <div className="w-full max-w-5xl h-[75vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">
                    PDF
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 truncate max-w-xs">{currentItem.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadSingleItem(currentItem)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </button>
                </div>
              </div>
              <iframe
                src={currentItem.dataUrl}
                title={currentItem.name}
                className="w-full flex-1 bg-zinc-800"
              />
            </div>
          )}

          {/* 4. Text & Code Document Viewer */}
          {currentItem.type === 'document' && (
            <div className="w-full max-w-4xl h-[75vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                    {ext}
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 truncate max-w-xs">{currentItem.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {currentItem.textContent && (
                    <button
                      onClick={handleCopyTextContent}
                      className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText ? 'Tersalin!' : 'Salin Teks'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => downloadSingleItem(currentItem)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-auto bg-zinc-950 font-mono text-xs text-zinc-200 whitespace-pre leading-relaxed select-text">
                {currentItem.textContent ? (
                  currentItem.textContent
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 space-y-3">
                    <FileCode className="w-12 h-12 stroke-1 text-amber-400" />
                    <p>Pratinjau berkas teks dapat diunduh untuk dibuka.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Archive & Generic File Inspector */}
          {(currentItem.type === 'archive' || currentItem.type === 'file') && (
            <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shadow-xl">
                {currentItem.type === 'archive' ? <Archive className="w-10 h-10" /> : <File className="w-10 h-10" />}
              </div>

              <div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {ext} BERKAS
                </span>
                <h4 className="text-base font-bold text-zinc-100 font-display mt-3 break-all">
                  {currentItem.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Ukuran: {formatBytes(currentItem.size)} · Tipe: {currentItem.mimeType}
                </p>
              </div>

              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={() => downloadSingleItem(currentItem)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Unduh Berkas Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. High-Res Image Viewer */}
          {currentItem.type === 'image' && (
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden">
              <img
                src={currentItem.dataUrl}
                alt={currentItem.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  filter: getFilterStyle(),
                  transition: 'transform 0.15s ease-out, filter 0.2s ease',
                }}
                className="max-h-[72vh] sm:max-h-[78vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
            title="Berikutnya (Panah Kanan)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Live Comments & Metadata Drawer */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto z-40 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rincian &amp; Diskusi Cloud</span>
                </span>
                <button
                  onClick={() => setShowInfo(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Author Card */}
              {currentItem.author && (
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
                  <span className="text-xl">{currentItem.author.avatar || '👤'}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-100 block truncate">
                      {currentItem.author.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Pengunggah Media Cloud
                    </span>
                  </div>
                </div>
              )}

              {/* Information list */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <span className="text-zinc-500">Format &amp; Tipe</span>
                  <span className="font-mono font-bold text-amber-300 uppercase">{ext} ({currentItem.type})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <span className="text-zinc-500">Ukuran Berkas</span>
                  <span className="font-mono text-amber-400">{formatBytes(currentItem.size)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <span className="text-zinc-500">Ditambahkan</span>
                  <span className="text-zinc-300">
                    {new Date(currentItem.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Album selector */}
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Album Bersama
                  </label>
                  <select
                    value={currentItem.albumId || 'none'}
                    onChange={(e) => onUpdateItem(currentItem.id, { albumId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  >
                    <option value="none">Tanpa Album</option>
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caption / Note */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Keterangan / Cerita
                    </label>
                    <button
                      onClick={handleSaveCaption}
                      className="text-[11px] text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder="Tuliskan cerita berkas ini..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Direct Action in Drawer */}
                <div className="pt-2">
                  <button
                    onClick={handleDeleteItem}
                    className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{currentItem.isTrash ? 'Hapus Permanen' : 'Hapus ke Tempat Sampah (30 Hari)'}</span>
                  </button>
                </div>

                {/* Live Real-Time Comments Stream */}
                <div className="pt-2 border-t border-zinc-850">
                  <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Komentar Online ({comments.length})</span>
                  </span>

                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 mb-2">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-zinc-500 italic">
                        Belum ada komentar. Jadilah yang pertama berkomentar!
                      </p>
                    ) : (
                      comments.map((cmt) => (
                        <div key={cmt.id} className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-850 text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-amber-300 flex items-center gap-1">
                              <span>{cmt.userAvatar || '👤'}</span>
                              <span>{cmt.userName}</span>
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-zinc-200 text-xs">{cmt.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleSendComment} className="flex gap-1.5">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Tulis komentar..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Photo Filters (for images only) */}
      {currentItem.type === 'image' && (
        <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950/90 z-30">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-zinc-400 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white ml-1 cursor-pointer"
              title="Putar 90 Derajat"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Segmented Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80 overflow-x-auto max-w-full">
            {[
              { id: 'normal', label: 'Asli' },
              { id: 'vivid', label: 'Cerah' },
              { id: 'warm', label: 'Hangat' },
              { id: 'cool', label: 'Sejuk' },
              { id: 'grayscale', label: 'B&W' },
              { id: 'sepia', label: 'Vintage' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterSelect(f.id)}
                className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  filter === f.id
                    ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block text-xs text-zinc-500">
            Gunakan tombol panah ◀ ▶ untuk navigasi
          </div>
        </div>
      )}
    </div>
  );
};
