import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  Video, 
  Circle, 
  Square, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  SwitchCamera, 
  Clock, 
  Smartphone,
  Sparkles,
  ShieldAlert,
  Sliders,
  Volume2,
  VolumeX,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Palette,
  Timer,
  Maximize2,
  Monitor
} from 'lucide-react';
import { MediaItem } from '../types/media';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMedia: (item: MediaItem) => void;
}

// Visual filter presets
const CAMERA_FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none', ctxFilter: 'none' },
  { id: 'vivid', name: 'Vivid Cerah', css: 'contrast(1.15) saturate(1.3)', ctxFilter: 'contrast(1.15) saturate(1.3)' },
  { id: 'warm', name: 'Warm Gold', css: 'sepia(0.25) saturate(1.2) hue-rotate(-10deg)', ctxFilter: 'sepia(0.25) saturate(1.2) hue-rotate(-10deg)' },
  { id: 'noir', name: 'Hitam Putih', css: 'grayscale(1) contrast(1.2)', ctxFilter: 'grayscale(1) contrast(1.2)' },
  { id: 'vintage', name: 'Vintage Film', css: 'sepia(0.4) contrast(0.9) brightness(1.05)', ctxFilter: 'sepia(0.4) contrast(0.9) brightness(1.05)' },
  { id: 'cool', name: 'Cool Blue', css: 'saturate(1.1) hue-rotate(20deg) brightness(1.02)', ctxFilter: 'saturate(1.1) hue-rotate(20deg) brightness(1.02)' },
];

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onSaveMedia,
}) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Advanced features: Filter, Zoom, Timer Countdown
  const [activeFilterId, setActiveFilterId] = useState('normal');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [countdownTimer, setCountdownTimer] = useState<number>(0); // 0 = off, 3, 5, 10
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);

  // Flash effect on photo capture
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Capture preview states
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Native File Inputs for 100% Guaranteed Native Fallback
  const nativePhotoInputRef = useRef<HTMLInputElement>(null);
  const nativeVideoInputRef = useRef<HTMLInputElement>(null);

  // Synthesize camera shutter sound via Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }

    // Trigger haptic vibration on mobile devices
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }
  }, []);

  // Stop camera tracks helper
  const stopTracks = useCallback((activeStream: MediaStream | null) => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track', e);
        }
      });
    }
  }, []);

  const resetCaptures = useCallback(() => {
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    if (capturedVideoUrl) URL.revokeObjectURL(capturedVideoUrl);
    setCapturedPhotoUrl(null);
    setCapturedVideoUrl(null);
    setCapturedBlob(null);
    setIsRecording(false);
    setRecordSeconds(0);
    setActiveCountdown(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, [capturedPhotoUrl, capturedVideoUrl]);

  // Request & Start Camera Stream
  const startCameraStream = useCallback(async (deviceIdOverride?: string) => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop existing stream first
    if (stream) {
      stopTracks(stream);
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini membatasi akses WebRTC. Gunakan tombol kamera sistem di bawah untuk mengakses kamera.');
      setIsLoadingCamera(false);
      return;
    }

    let mediaStream: MediaStream | null = null;
    const targetDeviceId = deviceIdOverride || selectedDeviceId;

    // Multi-tier constraint candidates for universal device compatibility
    const constraintsList: MediaStreamConstraints[] = [
      // 1. Specific device ID if selected
      ...(targetDeviceId
        ? [
            {
              video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: mode === 'video',
            },
            {
              video: { deviceId: { exact: targetDeviceId } },
              audio: false,
            },
          ]
        : []),
      // 2. Ideal facing mode with high-res
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: mode === 'video',
      },
      // 3. Facing mode without audio
      {
        video: {
          facingMode: { ideal: facingMode },
        },
        audio: false,
      },
      // 4. Basic video only (works on older laptops & restricted browsers)
      {
        video: true,
        audio: false,
      },
    ];

    let lastError: any = null;
    for (const constraints of constraintsList) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (mediaStream) {
      setStream(mediaStream);

      // Attach stream immediately to video ref
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
        videoPreviewRef.current.play().catch((err) => {
          console.warn('Video play error on start:', err);
        });
      }

      // Enumerate devices for selector
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoDevs);
      } catch (e) {
        console.warn('Could not enumerate devices:', e);
      }
    } else {
      console.error('Camera access failed completely:', lastError);
      let errorMsg = 'Tidak dapat mengakses kamera web.';
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        errorMsg = 'Izin kamera belum diizinkan di peramban. Klik ikon gembok pada URL untuk mengizinkan atau gunakan tombol Kamera Sistem di bawah.';
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        errorMsg = 'Perangkat kamera tidak terdeteksi. Hubungkan webcam atau gunakan HP.';
      } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
        errorMsg = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
      }
      setCameraError(errorMsg);
    }

    setIsLoadingCamera(false);
  }, [facingMode, mode, selectedDeviceId, stopTracks, stream]);

  // Synchronize stream with video element whenever stream changes or video element mounts
  const handleVideoRef = useCallback((videoEl: HTMLVideoElement | null) => {
    videoPreviewRef.current = videoEl;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch((err) => {
        console.warn('Auto play failed:', err);
      });
    }
  }, [stream]);

  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      if (videoPreviewRef.current.srcObject !== stream) {
        videoPreviewRef.current.srcObject = stream;
      }
      videoPreviewRef.current.play().catch((err) => {
        console.warn('Playback play failed:', err);
      });
    }
  }, [stream]);

  // Manage modal open / close
  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      if (stream) {
        stopTracks(stream);
        setStream(null);
      }
      resetCaptures();
    }

    return () => {
      if (stream) {
        stopTracks(stream);
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setIsMirrored(nextMode === 'user');
    setTimeout(() => {
      startCameraStream();
    }, 50);
  };

  // Perform actual photo snapshot from live video canvas
  const performActualCapture = useCallback(() => {
    if (!videoPreviewRef.current) return;
    const video = videoPreviewRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    playShutterSound();
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    // Apply Filter to Canvas context
    const currentFilter = CAMERA_FILTERS.find((f) => f.id === activeFilterId);
    if (currentFilter && currentFilter.ctxFilter !== 'none') {
      ctx.filter = currentFilter.ctxFilter;
    }

    // Mirror if front camera
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Handle digital zoom cropping
    if (zoomLevel > 1) {
      const cropW = width / zoomLevel;
      const cropH = height / zoomLevel;
      const cropX = (width - cropW) / 2;
      const cropY = (height - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, width, height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedPhotoUrl(url);
        }
      },
      'image/jpeg',
      0.95
    );
  }, [activeFilterId, isMirrored, playShutterSound, zoomLevel]);

  // Initiate photo take (with countdown if configured)
  const takePhotoFromStream = () => {
    if (countdownTimer > 0) {
      setActiveCountdown(countdownTimer);
      let remaining = countdownTimer;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current!);
          setActiveCountdown(null);
          performActualCapture();
        } else {
          setActiveCountdown(remaining);
        }
      }, 1000);
    } else {
      performActualCapture();
    }
  };

  // Start recording video from live stream
  const startRecordingStream = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    
    // Check supported mime types
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    let chosenType = '';
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) {
        chosenType = t;
        break;
      }
    }

    try {
      const recorder = chosenType
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream);
        
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedVideoUrl(url);
      };

      recorder.start(500); // 500ms time slice
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recorder:', err);
      alert('Gagal merekam video dari kamera web: ' + (err as any)?.message);
    }
  };

  const stopRecordingStream = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder', e);
      }
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Native Mobile / System Camera File Handlers
  const handleNativePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCapturedBlob(file);
      setCapturedPhotoUrl(url);
      setMode('photo');
    }
  };

  const handleNativeVideoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCapturedBlob(file);
      setCapturedVideoUrl(url);
      setMode('video');
    }
  };

  const handleRetake = () => {
    resetCaptures();
    startCameraStream();
  };

  const handleSaveToGallery = () => {
    if (!capturedBlob) return;

    const timestamp = Date.now();
    const id = 'cam_' + timestamp;

    if (capturedPhotoUrl) {
      const item: MediaItem = {
        id,
        name: `Foto_Kamera_${new Date(timestamp).toLocaleDateString('id-ID').replace(/\//g, '-')}_${timestamp.toString().slice(-4)}.jpg`,
        type: 'image',
        mimeType: 'image/jpeg',
        size: capturedBlob.size,
        dataUrl: capturedPhotoUrl,
        blob: capturedBlob,
        albumId: 'none',
        tags: ['Kamera Web', 'Foto'],
        isFavorite: false,
        isTrash: false,
        isVault: false,
        createdAt: timestamp,
        rotation: 0,
        filter: activeFilterId,
      };
      onSaveMedia(item);
    } else if (capturedVideoUrl) {
      const item: MediaItem = {
        id,
        name: `Video_Kamera_${new Date(timestamp).toLocaleDateString('id-ID').replace(/\//g, '-')}_${timestamp.toString().slice(-4)}.webm`,
        type: 'video',
        mimeType: capturedBlob.type || 'video/webm',
        size: capturedBlob.size,
        dataUrl: capturedVideoUrl,
        blob: capturedBlob,
        albumId: 'none',
        tags: ['Kamera Web', 'Video'],
        isFavorite: false,
        isTrash: false,
        isVault: false,
        createdAt: timestamp,
        duration: recordSeconds || 5,
      };
      onSaveMedia(item);
    }

    if (stream) {
      stopTracks(stream);
      setStream(null);
    }
    resetCaptures();
    onClose();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const hasCapture = Boolean(capturedPhotoUrl || capturedVideoUrl);
  const currentFilterObj = CAMERA_FILTERS.find((f) => f.id === activeFilterId) || CAMERA_FILTERS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden Native Camera Inputs for 100% Guaranteed Native Camera Trigger on every phone/OS */}
      <input
        ref={nativePhotoInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleNativePhotoCapture}
        className="hidden"
      />
      <input
        ref={nativeVideoInputRef}
        type="file"
        accept="video/*"
        capture="user"
        onChange={handleNativeVideoCapture}
        className="hidden"
      />

      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl my-auto">
        {/* Header Bar */}
        <div className="px-3 sm:px-6 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-display flex items-center gap-2">
                <span>Kamera Web Universal</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                  stream 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {stream ? '● LIVE' : 'STANDBY'}
                </span>
              </h3>
            </div>
          </div>

          {/* Mode Switcher */}
          {!hasCapture && (
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMode('photo');
                  resetCaptures();
                  if (!stream) startCameraStream();
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === 'photo'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('video');
                  resetCaptures();
                  if (!stream) startCameraStream();
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === 'video'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (stream) stopTracks(stream);
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden select-none">
          {/* Flash Effect on photo capture */}
          {isFlashActive && (
            <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
          )}

          {/* Countdown Overlay Animation */}
          {activeCountdown !== null && (
            <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center pointer-events-none">
              <div className="text-7xl sm:text-9xl font-black text-amber-400 animate-ping font-display">
                {activeCountdown}
              </div>
            </div>
          )}

          {/* 1. Captured Photo Preview */}
          {capturedPhotoUrl && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPhotoUrl}
                alt="Foto Tangkapan"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* 2. Captured Video Preview */}
          {capturedVideoUrl && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video
                src={capturedVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* 3. Live Video Viewfinder Element */}
          {!hasCapture && (
            <div className={`w-full h-full relative flex items-center justify-center overflow-hidden ${!stream ? 'hidden' : 'block'}`}>
              <video
                ref={handleVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  filter: currentFilterObj.css,
                  transform: `${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
                className="w-full h-full object-cover bg-black transition-all duration-150"
              />

              {/* Floating Camera Quick Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                {/* Timer toggle */}
                <button
                  type="button"
                  onClick={() => setCountdownTimer((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 0))}
                  className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    countdownTimer > 0
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="Timer Hitung Mundur"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{countdownTimer > 0 ? `${countdownTimer}s` : 'Timer'}</span>
                </button>

                {/* Mirror toggle */}
                <button
                  type="button"
                  onClick={() => setIsMirrored((m) => !m)}
                  className={`p-2 rounded-xl backdrop-blur-md border text-xs flex items-center gap-1 transition-all shadow-md cursor-pointer ${
                    isMirrored
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="Cermin Layar (Mirror)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Switch Camera */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-amber-400 hover:bg-black/80 transition-all shadow-md flex items-center gap-1 cursor-pointer"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px] font-medium">
                    {facingMode === 'user' ? 'Depan' : 'Belakang'}
                  </span>
                </button>
              </div>

              {/* Digital Zoom Controls on bottom left of viewfinder */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 z-20 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
                {[1, 1.5, 2].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoomLevel(z)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      zoomLevel === z
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg animate-pulse z-20 border border-rose-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>MEREKAM: {formatTimer(recordSeconds)}</span>
                </div>
              )}
            </div>
          )}

          {/* 4. Loading State */}
          {!hasCapture && isLoadingCamera && (
            <div className="flex flex-col items-center gap-3 text-zinc-300 text-xs z-10 bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
              <div className="w-10 h-10 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
              <span className="font-medium">Menghubungkan ke kamera web sistem...</span>
            </div>
          )}

          {/* 5. Fallback & Activation Box when Stream is Not Active */}
          {!hasCapture && !stream && !isLoadingCamera && (
            <div className="p-6 text-center text-zinc-300 max-w-md space-y-4 z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-950/20">
                <Camera className="w-7 h-7 stroke-[2]" />
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-100 font-display">
                  Nyalakan Kamera Web Sistem
                </h4>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {cameraError || 'Aplikasi siap mengakses kamera web di HP, Laptop, atau Komputer Anda. Klik tombol di bawah untuk menyalakan.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => startCameraStream()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Aktifkan Kamera Web (Live)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    mode === 'photo'
                      ? nativePhotoInputRef.current?.click()
                      : nativeVideoInputRef.current?.click()
                  }
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-100 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Kamera Bawaan HP</span>
                </button>
              </div>

              {availableDevices.length > 1 && (
                <div className="pt-2 text-left bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                  <label className="text-[11px] text-zinc-400 block mb-1">Pilih Perangkat Kamera:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCameraStream(e.target.value);
                    }}
                    className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Default Kamera Sistem</option>
                    {availableDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Kamera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Filter Strip (When Live or taking photo) */}
        {!hasCapture && stream && (
          <div className="px-3 sm:px-6 py-2 bg-zinc-950 border-t border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mr-1 flex items-center gap-1 shrink-0">
              <Palette className="w-3 h-3 text-amber-400" />
              <span>Filter:</span>
            </span>
            {CAMERA_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilterId(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeFilterId === f.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/70 text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          {hasCapture ? (
            /* Results Controls: Retake or Save */
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Foto / Rekam Ulang</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveToGallery}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Simpan ke Cloud 4TB</span>
                </button>
              </div>
            </div>
          ) : stream ? (
            /* Live Stream Active Controls */
            <div className="w-full flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() =>
                  mode === 'photo'
                    ? nativePhotoInputRef.current?.click()
                    : nativeVideoInputRef.current?.click()
                }
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                title="Buka kamera perangkat langsung"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">Kamera HP/Sistem</span>
              </button>

              {/* Big Shutter Button */}
              <div className="flex items-center justify-center">
                {mode === 'photo' ? (
                  <button
                    type="button"
                    onClick={takePhotoFromStream}
                    className="w-14 h-14 rounded-full border-4 border-amber-500/40 bg-amber-500 hover:bg-amber-400 p-1 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/30 active:scale-90 transition-all cursor-pointer"
                    title="Jepret Foto Sekarang"
                  >
                    <Circle className="w-6 h-6 fill-zinc-950 text-zinc-950" />
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecordingStream}
                    className="w-14 h-14 rounded-full border-4 border-rose-500/40 bg-rose-600 hover:bg-rose-500 p-1 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer"
                    title="Hentikan Rekaman Video"
                  >
                    <Square className="w-5 h-5 fill-white text-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecordingStream}
                    className="w-14 h-14 rounded-full border-4 border-rose-500/40 bg-rose-600 hover:bg-rose-500 p-1 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 active:scale-90 transition-all cursor-pointer"
                    title="Mulai Rekam Video"
                  >
                    <Circle className="w-6 h-6 fill-white text-white" />
                  </button>
                )}
              </div>

              {/* Turn off Stream button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopTracks(stream);
                    setStream(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-rose-400 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                >
                  Matikan
                </button>
              </div>
            </div>
          ) : (
            /* Stream Inactive Bar: Quick triggers */
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => startCameraStream()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>Nyalakan Kamera Web</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => nativePhotoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Foto HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => nativeVideoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-sky-400" />
                  <span>Video HP</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
