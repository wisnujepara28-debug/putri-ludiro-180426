import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText,
  Trash2, 
  FolderPlus, 
  CheckCircle2, 
  HardDrive,
  Sparkles 
} from 'lucide-react';
import { Album, MediaItem } from '../types/media';
import { processFileToMedia, formatBytes } from '../services/storage';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: MediaItem[]) => void;
  albums: Album[];
  defaultAlbumId?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  albums,
  defaultAlbumId,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [targetAlbumId, setTargetAlbumId] = useState<string>(defaultAlbumId || 'none');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartSave = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setProgressPercent(10);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const processedItems: MediaItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const item = await processFileToMedia(file, targetAlbumId);
      item.tags = [...parsedTags];
      processedItems.push(item);
      setProgressPercent(Math.round(((i + 1) / selectedFiles.length) * 90));
    }

    setProgressPercent(100);
    onSaveBatch(processedItems);
    setIsProcessing(false);
    setSelectedFiles([]);
    setTagsInput('');
    onClose();
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100 font-display">
                  Unggah Berkas ke Cloud 1000 TB
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  1000 TB Siap
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pilih atau seret foto, video, atau berkas apa saja tanpa batas ukuran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {/* Hidden folder input */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard for folder upload in browsers
              webkitdirectory=""
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-amber-400">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Tarik dan lepas berkas foto, video, atau dokumen ke sini
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Kapasitas 4.0 TB super luas untuk semua berkas Anda
                </p>
              </div>

              {/* Supported formats unboxed text */}
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1">
                <span>Foto: JPG, PNG, RAW, WEBP, GIF</span>
                <span aria-hidden="true">·</span>
                <span>Video: MP4, MOV, MKV, 4K</span>
                <span aria-hidden="true">·</span>
                <span>Semua Dokumen</span>
              </div>
            </div>
          </div>

          {/* Quick folder upload button */}
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Penyimpanan Cloud 4.0 TB (4.096 GB) Aktif</span>
            </span>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1.5 transition-colors font-medium"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Unggah 1 Folder Sekaligus</span>
            </button>
          </div>

          {/* Staging selected list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-200">
                  {selectedFiles.length} Berkas Siap Diunggah ke Cloud
                </span>
                <span className="font-mono text-amber-400/90">{formatBytes(totalBytes)}</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.type.startsWith('video/') ? (
                        <VideoIcon className="w-4 h-4 text-sky-400 shrink-0" />
                      ) : file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-zinc-500 text-[11px]">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Album & Tagging Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Simpan ke Album Cloud
                  </label>
                  <select
                    value={targetAlbumId}
                    onChange={(e) => setTargetAlbumId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  >
                    <option value="none">Tanpa Album (Semua Media)</option>
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Tagar Tambahan (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="misal: Liburan, Dokumen, Arsip"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Progress bar during processing */}
          {isProcessing && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Mengunggah dan menyinkronkan ke Cloud 4TB...</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleStartSave}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-950/30 transition-all active:scale-95 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Simpan ke Cloud ({selectedFiles.length} Berkas)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
