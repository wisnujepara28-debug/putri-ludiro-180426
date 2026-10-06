import { MediaItem, MediaType, Album, OnlineUser, MediaAuthor, FOUR_TERABYTES_BYTES, THIRTY_DAYS_MS } from '../types/media';
import JSZip from 'jszip';

// Initial default sample assets
import putrekCoupleBg from '../assets/images/exact_couple_bg_1791264638859.jpg';
import samplePantai from '../assets/images/sample_pantai_sunset_1791252997517.jpg';
import sampleGunung from '../assets/images/sample_pegunungan_alam_1791253011450.jpg';
import sampleMakanan from '../assets/images/sample_makanan_kuliner_1791253022343.jpg';
import sampleKucing from '../assets/images/sample_kucing_lucu_1791253034468.jpg';

export { putrekCoupleBg };

const USER_KEY = 'simpanmedia_user_profile';

const AVATAR_PRESETS = ['🦊', '🐯', '🐼', '🦁', '🚀', '⭐', '🎨', '📸', '💎', '🌊'];
const COLOR_PRESETS = ['#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', '#eab308'];

export function getCurrentUser(): MediaAuthor {
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const user: MediaAuthor = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: `User ${randomNum}`,
    avatar: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
    color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
  };
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  return user;
}

export function saveCurrentUser(user: MediaAuthor) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// REST API and WebSocket connection
let socket: WebSocket | null = null;
type SyncCallback = (data: {
  type: string;
  media?: MediaItem[];
  items?: MediaItem[];
  item?: MediaItem;
  id?: string;
  albums?: Album[];
  album?: Album;
  users?: OnlineUser[];
}) => void;

const syncListeners = new Set<SyncCallback>();

export function subscribeToCloudSync(callback: SyncCallback) {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
}

export function connectWebSocket(user: MediaAuthor) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket?.send(
        JSON.stringify({
          type: 'user:join',
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            color: user.color,
            lastActive: Date.now(),
            device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          },
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        for (const listener of syncListeners) {
          listener(msg);
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    socket.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        connectWebSocket(user);
      }, 3000);
    };

    socket.onerror = () => {
      socket?.close();
    };
  } catch (err) {
    console.error('WS connection error:', err);
  }
}

// Media API
export async function getAllMedia(): Promise<MediaItem[]> {
  try {
    const res = await fetch('/api/media');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Fetch media failed, falling back:', err);
  }
  return [];
}

export async function saveMediaBatch(items: MediaItem[]): Promise<void> {
  const currentUser = getCurrentUser();
  const itemsWithAuthor = items.map((item) => ({
    ...item,
    author: item.author || currentUser,
    likes: item.likes || [],
    comments: item.comments || [],
  }));

  try {
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemsWithAuthor),
    });
  } catch (err) {
    console.error('Save media batch failed:', err);
  }
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  return saveMediaBatch([item]);
}

export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<void> {
  try {
    await fetch(`/api/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.error('Update media item failed:', err);
  }
}

export async function updateMediaBatch(ids: string[], updates: Partial<MediaItem>): Promise<void> {
  try {
    const res = await fetch('/api/media/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    if (!res.ok) throw new Error('Batch update failed');
  } catch (err) {
    console.warn('Batch update API failed, falling back to sequential:', err);
    for (const id of ids) {
      await updateMediaItem(id, updates);
    }
  }
}

export async function deleteMediaPermanent(id: string): Promise<void> {
  try {
    await fetch(`/api/media/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Delete media failed:', err);
  }
}

export async function deleteMediaBatchPermanent(ids: string[]): Promise<void> {
  try {
    const res = await fetch('/api/media/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Batch delete failed');
  } catch (err) {
    console.warn('Batch delete API failed, falling back to sequential:', err);
    for (const id of ids) {
      await deleteMediaPermanent(id);
    }
  }
}

export async function emptyTrash(): Promise<void> {
  try {
    await fetch('/api/trash/empty', {
      method: 'POST',
    });
  } catch (err) {
    console.error('Empty trash failed:', err);
  }
}

export function getRemainingTrashDays(trashedAt?: number): number {
  if (!trashedAt) return 30;
  const elapsed = Date.now() - trashedAt;
  const remaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(30, remaining));
}

export async function toggleLikeMedia(id: string, userId: string): Promise<void> {
  try {
    await fetch(`/api/media/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    console.error('Toggle like failed:', err);
  }
}

export async function addCommentMedia(id: string, text: string): Promise<void> {
  const user = getCurrentUser();
  const comment = {
    id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userColor: user.color,
    text,
    createdAt: Date.now(),
  };

  try {
    await fetch(`/api/media/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
  } catch (err) {
    console.error('Add comment failed:', err);
  }
}

// Album API
export async function getAllAlbums(): Promise<Album[]> {
  try {
    const res = await fetch('/api/albums');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Fetch albums failed:', err);
  }
  return [];
}

export async function saveAlbum(album: Album): Promise<void> {
  const user = getCurrentUser();
  const albumWithUser = {
    ...album,
    createdBy: album.createdBy || user.name,
  };
  try {
    await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albumWithUser),
    });
  } catch (err) {
    console.error('Save album failed:', err);
  }
}

export async function deleteAlbum(albumId: string): Promise<void> {
  try {
    await fetch(`/api/albums/${albumId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Delete album failed:', err);
  }
}

// Storage stats calculation with 4TB capacity
export function calculateStorageStats(media: MediaItem[]) {
  const usedBytes = media.reduce((acc, i) => acc + (i.size || 0), 0);
  const totalPhotos = media.filter((i) => i.type === 'image' && !i.isTrash).length;
  const totalVideos = media.filter((i) => i.type === 'video' && !i.isTrash).length;
  const percentage = (usedBytes / FOUR_TERABYTES_BYTES) * 100;

  return {
    quotaBytes: FOUR_TERABYTES_BYTES,
    usedBytes,
    totalPhotos,
    totalVideos,
    percentage: Math.max(0.01, parseFloat(percentage.toFixed(4))),
  };
}

// Helper: Convert File to Base64/DataUrl for network broadcast
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function detectMediaType(fileName: string, mimeType: string): MediaType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = mimeType.toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico', 'heic', 'tiff'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', '3gp', 'flv', 'wmv'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'opus', 'mid'].includes(ext)) {
    return 'audio';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mime.startsWith('text/') ||
    ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'xml', 'log', 'yaml', 'yml', 'sql', 'sh', 'env', 'config'].includes(ext)
  ) {
    return 'document';
  }
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)
  ) {
    return 'archive';
  }
  return 'file';
}

export async function processFileToMedia(file: File, albumId = 'none'): Promise<MediaItem> {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
  const type = detectMediaType(file.name, file.type);
  const dataUrl = await fileToDataUrl(file);
  const author = getCurrentUser();
  const id = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  let textContent: string | undefined = undefined;
  if (type === 'document' && file.size < 2 * 1024 * 1024) {
    try {
      textContent = await file.text();
    } catch (e) {
      console.warn('Could not read text content:', e);
    }
  }

  return {
    id,
    name: file.name,
    type,
    fileExtension: ext,
    textContent,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl,
    albumId,
    tags: [],
    isFavorite: false,
    isTrash: false,
    isVault: false,
    createdAt: Date.now(),
    rotation: 0,
    filter: 'normal',
    author,
    likes: [],
    comments: [],
  };
}

// Pre-seed sample media into cloud server
export async function seedInitialSampleData(): Promise<void> {
  const author = getCurrentUser();
  const sampleDefs = [
    {
      name: 'Foto_Kenangan_PUTREK.jpg',
      url: putrekCoupleBg,
      albumId: 'album_liburan',
      tags: ['PUTREK', 'Favorit', 'Kenangan', 'Romantis'],
      caption: 'Momen kebersamaan ceria dan penuh cinta PUTREK tersimpan abadi di Cloud 4.0 TB.',
      width: 1920,
      height: 1080,
    },
    {
      name: 'Pantai_Sunset_Emas.jpg',
      url: samplePantai,
      albumId: 'album_liburan',
      tags: ['Pantai', 'Sunset', 'Liburan'],
      caption: 'Matahari terbenam di tepi pantai dengan ombak tenang yang memantulkan cahaya keemasan.',
      width: 1440,
      height: 1080,
    },
    {
      name: 'Pegunungan_Hijau_Asri.jpg',
      url: sampleGunung,
      albumId: 'album_liburan',
      tags: ['Gunung', 'Pemandangan', 'Alam'],
      caption: 'Pemandangan perbukitan teh dan pegunungan berkabut di pagi hari.',
      width: 1440,
      height: 1080,
    },
    {
      name: 'Kopi_PourOver_Pastry.jpg',
      url: sampleMakanan,
      albumId: 'album_kuliner',
      tags: ['Kopi', 'Kafe', 'Pastry'],
      caption: 'Menikmati seduhan kopi hangat dengan hidangan pastry renyah di kafe tenang.',
      width: 1440,
      height: 1080,
    },
    {
      name: 'Kucing_Santai_Jendela.jpg',
      url: sampleKucing,
      albumId: 'album_peliharaan',
      tags: ['Kucing', 'Lucu', 'Peliharaan'],
      caption: 'Kucing manis bersantai di atas selimut hangat dekat jendela sinar matahari.',
      width: 1440,
      height: 1080,
    },
  ];

  const items: MediaItem[] = [];

  for (let i = 0; i < sampleDefs.length; i++) {
    const def = sampleDefs[i];
    items.push({
      id: 'cloud_sample_' + (i + 1),
      name: def.name,
      type: 'image',
      mimeType: 'image/jpeg',
      size: 3850000,
      dataUrl: def.url,
      albumId: def.albumId,
      tags: def.tags,
      isFavorite: i === 0,
      isTrash: false,
      isVault: false,
      caption: def.caption,
      createdAt: Date.now() - (4 - i) * 3600000 * 6,
      width: def.width,
      height: def.height,
      rotation: 0,
      filter: 'normal',
      author: {
        id: 'system_admin',
        name: 'Galeri Komunitas',
        avatar: '🌟',
        color: '#f59e0b',
      },
      likes: ['user_demo'],
      comments: [
        {
          id: 'cmt_welcome',
          userId: 'system_admin',
          userName: 'Admin Galeri',
          userAvatar: '🌟',
          userColor: '#f59e0b',
          text: 'Selamat datang di penyimpanan Cloud 4TB bersama! Unggah foto & video Anda agar tersinkronkan ke semua pengguna secara online.',
          createdAt: Date.now() - 3600000,
        },
      ],
    });
  }

  await saveMediaBatch(items);
}

// Export All as ZIP
export async function exportSelectedOrAllAsZip(
  items: MediaItem[],
  zipFilename = 'SimpanMedia_4TB_Cadangan.zip',
  onProgress?: (percent: number, currentFile: string) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 80), item.name);
    }

    try {
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      const safeName = `${item.id.slice(-6)}_${item.name.replace(/[/\\?%*:|"<>]/g, '_')}`;
      zip.file(safeName, blob);
    } catch {
      // skip
    }
  }

  const metadata = items.map((i) => ({
    name: i.name,
    type: i.type,
    mimeType: i.mimeType,
    size: i.size,
    albumId: i.albumId,
    tags: i.tags,
    caption: i.caption,
    author: i.author,
    createdAt: i.createdAt,
  }));
  zip.file('katalog_cloud_4tb.json', JSON.stringify(metadata, null, 2));

  if (onProgress) onProgress(90, 'Mengompres arsip ZIP...');

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  if (onProgress) onProgress(100, 'Selesai!');

  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}

export function downloadSingleItem(item: MediaItem) {
  const a = document.createElement('a');
  a.href = item.dataUrl;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
