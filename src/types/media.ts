export interface MediaComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  text: string;
  createdAt: number;
}

export interface MediaAuthor {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'archive' | 'file';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  size: number; // in bytes
  blob?: Blob;
  dataUrl: string; // Object URL, Base64, or asset path
  textContent?: string; // For text/code documents
  fileExtension?: string; // e.g. 'PDF', 'MP3', 'ZIP', 'DOCX'
  albumId: string; // 'none' or album UUID
  tags: string[];
  isFavorite: boolean;
  isTrash: boolean;
  trashedAt?: number; // Timestamp when item was moved to Trash
  isVault: boolean;
  caption?: string;
  createdAt: number;
  width?: number;
  height?: number;
  duration?: number; // for video & audio in seconds
  rotation?: number; // 0, 90, 180, 270
  filter?: string; // 'normal' | 'grayscale' | 'sepia' | 'warm' | 'vivid' | 'cool'
  author?: MediaAuthor;
  likes?: string[]; // Array of user IDs who liked
  comments?: MediaComment[];
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  color?: string;
  coverImage?: string;
  createdAt: number;
  createdBy?: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lastActive: number;
  device?: string;
}

export type ViewFilter = 'all' | 'image' | 'video' | 'favorite' | 'vault' | 'trash';

export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';

export type ViewMode = 'grid' | 'masonry' | 'compact';

// 1000 Terabytes in Bytes = 1000 * 1024 * 1024 * 1024 * 1024
export const ONE_THOUSAND_TERABYTES_BYTES = 1099511627776000;
export const FOUR_TERABYTES_BYTES = ONE_THOUSAND_TERABYTES_BYTES;

// 30 Days in Milliseconds
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
