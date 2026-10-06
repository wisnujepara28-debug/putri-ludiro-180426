import React, { useState } from 'react';
import { 
  X, 
  Archive, 
  Download, 
  Upload, 
  HardDrive, 
  CheckCircle, 
  FileArchive,
  Cloud,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-react';
import { MediaItem, FOUR_TERABYTES_BYTES } from '../types/media';
import { 
  exportSelectedOrAllAsZip, 
  formatBytes, 
  processFileToMedia 
} from '../services/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  usedBytes: number;
  onImportItems: (items: MediaItem[]) => void;
  onResetAllData: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  usedBytes,
  onImportItems,
  onResetAllData,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentFileStatus, setCurrentFileStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const percentageUsed = ((usedBytes / FOUR_TERABYTES_BYTES) * 100);
  const formattedPercent = percentageUsed < 0.01 ? '< 0.01%' : `${percentageUsed.toFixed(2)}%`;
  const freeBytes = Math.max(0, FOUR_TERABYTES_BYTES - usedBytes);

  const handleExportZip = async () => {
    if (mediaItems.length === 0) return;
    setIsExporting(true);
    setIsSuccess(false);

    try {
      await exportSelectedOrAllAsZip(
        mediaItems,
        `PUTREK_4TB_Cadangan_${new Date().toISOString().slice(0, 10)}.zip`,
        (pct, file) => {
          setExportProgress(pct);
          setCurrentFileStatus(file);
        }
      );
      setIsSuccess(true);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newItems: MediaItem[] = [];
      for (const file of files) {
        const item = await processFileToMedia(file);
        newItems.push(item);
      }
      if (newItems.length > 0) {
        onImportItems(newItems);
        alert(`Berhasil memulihkan / mengimpor ${newItems.length} berkas ke Cloud 4TB.`);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Cloud className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display">
                  Pusat Penyimpanan Cloud 1000 TB
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Aktif &amp; Terbuka
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Kapasitas raksasa 1000 TB untuk semua berkas foto, video, &amp; dokumen Anda
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1000 TB Storage Dashboard Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs sm:text-sm">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Rincian Ruang Cloud 1000 TB</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">{formattedPercent} Terpakai</span>
            </div>

            {/* Storage Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(1, percentageUsed))}%`,
                }}
              />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 block uppercase font-medium">Total Kapasitas</span>
                <span className="text-xs font-bold text-zinc-200 font-mono">1000 TB</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 block uppercase font-medium">Ruang Terpakai</span>
                <span className="text-xs font-bold text-amber-400 font-mono">{formatBytes(usedBytes)}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 block uppercase font-medium">Sisa Ruang Bebas</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{formatBytes(freeBytes)}</span>
              </div>
            </div>

            {/* Capacity Power Highlights */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-amber-300">
                <Zap className="w-3.5 h-3.5" />
                <span>Daya Tampung Penyimpanan 1000 Terabytes:</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1 pl-5 list-disc">
                <li>Dapat menampung hingga <strong>~300.000.000 foto</strong> beresolusi tinggi</li>
                <li>Dapat menampung hingga <strong>~200.000 jam video</strong> kualitas 4K/Full HD</li>
                <li>Tersinkronisasi secara online dan dapat diakses dari perangkat mana saja</li>
              </ul>
            </div>
          </div>

          {/* Export to ZIP section */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-amber-400" />
              Cadangkan Semua Berkas (.ZIP)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Unduh salinan cadangan lengkap seluruh {mediaItems.length} berkas yang ada di Cloud 1000 TB ke dalam 1 arsip ZIP langsung ke komputer/ponsel Anda.
            </p>

            {isExporting && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span className="truncate max-w-[200px]">{currentFileStatus}</span>
                  <span className="font-mono">{exportProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Arsip ZIP berhasil diunduh ke perangkat Anda!</span>
              </div>
            )}

            <button
              onClick={handleExportZip}
              disabled={isExporting || mediaItems.length === 0}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Sedang Mengompres...' : 'Unduh Cadangan Cloud (.ZIP)'}</span>
            </button>
          </div>

          {/* Import / Restore Section */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Impor / Masukkan Berkas Tambahan
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tambahkan kumpulan berkas foto atau video dari perangkat Anda ke Cloud 1000 TB secara langsung.
            </p>

            <label className="w-full py-2 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Pilih Berkas untuk Dimasukkan</span>
              <input
                type="file"
                multiple
                onChange={handleImportFiles}
                className="hidden"
              />
            </label>
          </div>

          {/* Danger Zone: Reset */}
          <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/80">
            <span>Manajemen Berkas</span>
            <button
              onClick={() => {
                if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan semua berkas di galeri cloud ini? Pastikan Anda sudah mengunduh cadangan ZIP terlebih dahulu.')) {
                  onResetAllData();
                  onClose();
                }
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Semua Berkas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
