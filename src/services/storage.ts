import { 
  MediaItem, 
  MediaType, 
  Album, 
  OnlineUser, 
  MediaAuthor, 
  FOUR_TERABYTES_BYTES, 
  THIRTY_DAYS_MS 
} from '../types/media';
import JSZip from 'jszip';
import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';

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

// Realtime User Authentication & Sync
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function downloadSingleItem(item: MediaItem) {
  const a = document.createElement('a');
  a.href = item.dataUrl;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function getCurrentUser(): MediaAuthor {
  if (auth.currentUser) {
    return {
      id: auth.currentUser.uid,
      name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User PUTREK',
      avatar: '👑',
      color: '#f59e0b',
    };
  }

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
  updateUserPresence(user);
}

// Google Authentication
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const userAuthor: MediaAuthor = {
        id: result.user.uid,
        name: result.user.displayName || result.user.email?.split('@')[0] || 'Pengguna PUTREK',
        avatar: '⭐',
        color: '#10b981',
      };
      saveCurrentUser(userAuthor);
      return result.user;
    }
  } catch (err) {
    console.error('Google Auth Failed:', err);
  }
  return null;
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Online Presence Tracking in Firestore
export async function updateUserPresence(author: MediaAuthor) {
  try {
    const userRef = doc(db, 'users', author.id);
    await setDoc(
      userRef,
      {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        color: author.color,
        lastActive: Date.now(),
        device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Update user presence warning:', error);
  }
}

// Real-time Firestore Subscriptions
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

export function subscribeToCloudSync(callback: SyncCallback) {
  let initialLoaded = false;

  // 1. Media Realtime Listener
  const mediaRef = collection(db, 'media');
  const unsubMedia = onSnapshot(
    mediaRef,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MediaItem);
      });

      // Sort newest first
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      callback({
        type: 'init',
        media: items,
      });

      // Auto-seed sample data if database is completely empty on boot
      if (items.length === 0 && !initialLoaded) {
        initialLoaded = true;
        seedInitialSampleData().catch(console.error);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'media');
    }
  );

  // 2. Albums Realtime Listener
  const albumsRef = collection(db, 'albums');
  const unsubAlbums = onSnapshot(
    albumsRef,
    (snapshot) => {
      const albumsList: Album[] = [];
      snapshot.forEach((docSnap) => {
        albumsList.push(docSnap.data() as Album);
      });
      callback({
        type: 'init',
        albums: albumsList,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'albums');
    }
  );

  // 3. Online Users Realtime Listener
  const usersRef = collection(db, 'users');
  const unsubUsers = onSnapshot(
    usersRef,
    (snapshot) => {
      const usersList: OnlineUser[] = [];
      snapshot.forEach((docSnap) => {
        usersList.push(docSnap.data() as OnlineUser);
      });
      callback({
        type: 'presence:update',
        users: usersList,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );

  // Heartbeat presence update
  const user = getCurrentUser();
  updateUserPresence(user);
  const interval = setInterval(() => {
    updateUserPresence(getCurrentUser());
  }, 30000);

  return () => {
    unsubMedia();
    unsubAlbums();
    unsubUsers();
    clearInterval(interval);
  };
}

export function connectWebSocket(user: MediaAuthor) {
  // Maintained for backward compatibility; presence is tracked via Firestore Users Collection
  updateUserPresence(user);
}

// Media API via Firestore
export async function getAllMedia(): Promise<MediaItem[]> {
  try {
    const snapshot = await getDocs(collection(db, 'media'));
    const items: MediaItem[] = [];
    snapshot.forEach((docSnap) => items.push(docSnap.data() as MediaItem));
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'media');
    return [];
  }
}

export async function saveMediaBatch(items: MediaItem[]): Promise<void> {
  const currentUser = getCurrentUser();
  for (const item of items) {
    const docItem: MediaItem = {
      ...item,
      author: item.author || currentUser,
      likes: item.likes || [],
      comments: item.comments || [],
    };
    try {
      await setDoc(doc(db, 'media', docItem.id), docItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `media/${docItem.id}`);
    }
  }
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  return saveMediaBatch([item]);
}

export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<void> {
  try {
    const itemRef = doc(db, 'media', id);
    // Sanitize undefined fields
    const sanitizedUpdates: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        sanitizedUpdates[key] = val;
      }
    }
    await updateDoc(itemRef, sanitizedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `media/${id}`);
  }
}

export async function updateMediaBatch(ids: string[], updates: Partial<MediaItem>): Promise<void> {
  const sanitizedUpdates: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      sanitizedUpdates[key] = val;
    }
  }
  for (const id of ids) {
    try {
      await updateDoc(doc(db, 'media', id), sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `media/${id}`);
    }
  }
}

export async function deleteMediaPermanent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'media', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `media/${id}`);
  }
}

export async function deleteMediaBatchPermanent(ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await deleteDoc(doc(db, 'media', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `media/${id}`);
    }
  }
}

export async function emptyTrash(): Promise<void> {
  try {
    const all = await getAllMedia();
    const trashed = all.filter((i) => i.isTrash);
    for (const item of trashed) {
      await deleteDoc(doc(db, 'media', item.id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'media/trash');
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
    const docRef = doc(db, 'media', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const media = docSnap.data() as MediaItem;
      let likes = media.likes || [];
      if (likes.includes(userId)) {
        likes = likes.filter((u) => u !== userId);
      } else {
        likes.push(userId);
      }
      await updateDoc(docRef, { likes });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `media/${id}/like`);
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
    const docRef = doc(db, 'media', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const media = docSnap.data() as MediaItem;
      const comments = [...(media.comments || []), comment];
      await updateDoc(docRef, { comments });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `media/${id}/comment`);
  }
}

// Album API via Firestore
export async function getAllAlbums(): Promise<Album[]> {
  try {
    const snapshot = await getDocs(collection(db, 'albums'));
    const albums: Album[] = [];
    snapshot.forEach((docSnap) => albums.push(docSnap.data() as Album));
    return albums;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'albums');
    return [];
  }
}

export async function saveAlbum(album: Album): Promise<void> {
  const user = getCurrentUser();
  const albumWithUser = {
    ...album,
    createdBy: album.createdBy || user.name,
  };
  try {
    await setDoc(doc(db, 'albums', album.id), albumWithUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `albums/${album.id}`);
  }
}

export async function deleteAlbum(albumId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'albums', albumId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `albums/${albumId}`);
  }
}

// Storage stats calculation with 1000TB capacity
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
    percentage,
  };
}

export async function fileToDataUrl(file: File): Promise<string> {
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

// Pre-seed sample media into Firestore
export async function seedInitialSampleData(): Promise<void> {
  const sampleAlbums: Album[] = [
    {
      id: 'album_liburan',
      name: 'Liburan & Alam',
      description: 'Dokumentasi wisata bersama dan pemandangan alam',
      color: '#059669',
      createdAt: Date.now() - 86400000 * 3,
      createdBy: 'Sistem Cloud',
    },
    {
      id: 'album_kuliner',
      name: 'Kuliner & Kafe',
      description: 'Foto kopi dan kuliner favorit',
      color: '#d97706',
      createdAt: Date.now() - 86400000 * 2,
      createdBy: 'Sistem Cloud',
    },
    {
      id: 'album_peliharaan',
      name: 'Peliharaan Lucu',
      description: 'Foto hewan peliharaan menggemaskan',
      color: '#8b5cf6',
      createdAt: Date.now() - 86400000 * 1,
      createdBy: 'Sistem Cloud',
    },
  ];

  for (const alb of sampleAlbums) {
    await saveAlbum(alb);
  }

  const sampleDefs = [
    {
      name: 'Foto_Kenangan_PUTREK.jpg',
      url: putrekCoupleBg,
      albumId: 'album_liburan',
      tags: ['PUTREK', 'Favorit', 'Kenangan', 'Romantis'],
      caption: 'Momen kebersamaan ceria dan penuh cinta PUTREK tersimpan abadi di Cloud 1000 TB.',
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
  const author = getCurrentUser();

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
      createdAt: Date.now() - (sampleDefs.length - i) * 3600000,
      rotation: 0,
      filter: 'normal',
      author,
      likes: [author.id],
      comments: [
        {
          id: 'cmt_seed_' + i,
          userId: author.id,
          userName: author.name,
          userAvatar: author.avatar,
          userColor: author.color,
          text: 'Tersimpan otomatis di Firestore Realtime PUTREK Cloud 1000 TB! 🚀',
          createdAt: Date.now(),
        },
      ],
    });
  }

  await saveMediaBatch(items);
}

export async function exportSelectedOrAllAsZip(
  items: MediaItem[],
  zipFilename = 'PUTREK_Media_Cloud.zip',
  onProgress?: (percent: number, currentFile: string) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 100), item.name);
    }

    try {
      if (item.dataUrl.startsWith('data:')) {
        const parts = item.dataUrl.split(',');
        const base64Data = parts[1];
        zip.file(item.name, base64Data, { base64: true });
      } else {
        const response = await fetch(item.dataUrl);
        const blob = await response.blob();
        zip.file(item.name, blob);
      }
    } catch (err) {
      console.warn(`Failed to add ${item.name} to zip:`, err);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
