import React, { useState, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Sparkles, 
  Check, 
  Sliders, 
  Eye, 
  RotateCcw,
  Palette
} from 'lucide-react';
import { fileToDataUrl } from '../services/storage';

export interface CustomWallpaperConfig {
  imageUrl: string | null;
  opacity: number;
  blur: number;
}

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CustomWallpaperConfig;
  onChangeConfig: (newConfig: CustomWallpaperConfig) => void;
}

export const BackgroundModal: React.FC<BackgroundModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(config.imageUrl);
  const [opacity, setOpacity] = useState<number>(config.opacity ?? 0.4);
  const [blur, setBlur] = useState<number>(config.blur ?? 0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      try {
        const file = e.target.files[0];
        const dataUrl = await fileToDataUrl(file);
        setCurrentUrl(dataUrl);
        onChangeConfig({
          imageUrl: dataUrl,
          opacity,
          blur,
        });
      } catch (err) {
        console.error('Failed to read image file:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRemoveBackground = () => {
    setCurrentUrl(null);
    onChangeConfig({
      imageUrl: null,
      opacity,
      blur,
    });
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    onChangeConfig({
      imageUrl: currentUrl,
      opacity: val,
      blur,
    });
  };

  const handleBlurChange = (val: number) => {
    setBlur(val);
    onChangeConfig({
      imageUrl: currentUrl,
      opacity,
      blur: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                Ganti Foto Latar Belakang
              </h3>
              <p className="text-[11px] text-zinc-400">
                Gunakan foto sendiri sebagai wallpaper aplikasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Current Background Preview Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">
              Pratinjau Latar Belakang Aktif
            </label>
            <div className="relative w-full h-36 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center">
              {currentUrl ? (
                <>
                  <img
                    src={currentUrl}
                    alt="Custom Wallpaper"
                    style={{
                      opacity,
                      filter: `blur(${blur}px)`,
                    }}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-white drop-shadow">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Foto Sendiri Terpasang</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      className="px-2 py-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Foto</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2 text-zinc-500">
                  <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                  <p className="text-xs">
                    Latar belakang polos aktif (Tanpa foto)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>{isProcessing ? 'Memproses Foto...' : 'Pilih Foto dari Perangkat Anda'}</span>
            </button>
          </div>

          {/* Background Adjustments (Sliders) */}
          {currentUrl && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 border-b border-zinc-800 pb-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Pengaturan Tampilan Wallpaper</span>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400 font-medium">
                  <span>Transparansi Latar (Kejelasan)</span>
                  <span className="font-mono text-amber-400">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-zinc-400 font-medium">
                  <span>Efek Kelembutan (Blur)</span>
                  <span className="font-mono text-amber-400">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={blur}
                  onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Quick Remove / Reset Action */}
          <div className="flex items-center gap-2 pt-1">
            {currentUrl && (
              <button
                type="button"
                onClick={handleRemoveBackground}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Kembali ke Mode Polos</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
