import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ONE_THOUSAND_TERABYTES_BYTES = 1099511627776000; // 1000 TB in bytes
const FOUR_TERABYTES_BYTES = ONE_THOUSAND_TERABYTES_BYTES;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days in Milliseconds

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cloud_storage.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Disk Storage Configuration for Unlimited Uploads
const storageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage: storageEngine,
  limits: { fileSize: 20 * 1024 * 1024 * 1024 }, // 20 GB limit per file for photos and videos
});

interface ServerState {
  media: any[];
  albums: any[];
}

let state: ServerState = {
  media: [],
  albums: [],
};

// Load saved data or initialize defaults
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    state = JSON.parse(raw);
  } else {
    // Initial sample albums
    state.albums = [
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
  }
} catch (err) {
  console.error('Error loading data file:', err);
}

const saveStateDebounced = (() => {
  let timeout: NodeJS.Timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to save data to disk:', err);
      }
    }, 1000);
  };
})();

// Automatic Trash Purge (Removes items in Trash older than 30 days)
function purgeExpiredTrash(): boolean {
  const now = Date.now();
  const initialCount = state.media.length;
  state.media = state.media.filter((item) => {
    if (item.isTrash) {
      if (!item.trashedAt) {
        item.trashedAt = now;
        return true;
      }
      const age = now - item.trashedAt;
      if (age >= THIRTY_DAYS_MS) {
        console.log(`[Auto-Purge 30 Hari] Menghapus permanen media kadaluarsa: "${item.name}" (${item.id})`);
        return false;
      }
    }
    return true;
  });

  if (state.media.length !== initialCount) {
    saveStateDebounced();
    return true;
  }
  return false;
}

// Run initial purge
purgeExpiredTrash();

// Periodic auto-purge interval (every 1 minute)
setInterval(() => {
  if (purgeExpiredTrash()) {
    broadcast({
      type: 'init',
      media: state.media,
      albums: state.albums,
      onlineUsers: getOnlineUsers(),
      quota: FOUR_TERABYTES_BYTES,
    });
  }
}, 60 * 1000);

const app = express();
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

const server = http.createServer(app);

// WebSocket real-time broadcast engine
const wss = new WebSocketServer({ server });

interface ConnectedClient {
  ws: WebSocket;
  user?: {
    id: string;
    name: string;
    avatar: string;
    color: string;
    lastActive: number;
    device?: string;
  };
}

const clients = new Set<ConnectedClient>();

function broadcast(message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(payload);
    }
  }
}

function getOnlineUsers() {
  const usersMap = new Map<string, any>();
  for (const client of clients) {
    if (client.user && client.ws.readyState === WebSocket.OPEN) {
      usersMap.set(client.user.id, client.user);
    }
  }
  return Array.from(usersMap.values());
}

wss.on('connection', (ws: WebSocket) => {
  const client: ConnectedClient = { ws };
  clients.add(client);

  purgeExpiredTrash();

  // Send initial data to newly connected client
  ws.send(
    JSON.stringify({
      type: 'init',
      media: state.media,
      albums: state.albums,
      onlineUsers: getOnlineUsers(),
      quota: FOUR_TERABYTES_BYTES,
    })
  );

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'user:join') {
        client.user = msg.user;
        broadcast({
          type: 'presence:update',
          users: getOnlineUsers(),
        });
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(client);
    broadcast({
      type: 'presence:update',
      users: getOnlineUsers(),
    });
  });

  ws.on('error', () => {
    clients.delete(client);
  });
});

// REST API Endpoints
app.get('/api/stats', (_req, res) => {
  purgeExpiredTrash();
  const usedBytes = state.media.reduce((acc, item) => acc + (item.size || 0), 0);
  const trashItems = state.media.filter((m) => m.isTrash);
  res.json({
    quotaBytes: FOUR_TERABYTES_BYTES,
    usedBytes,
    totalFiles: state.media.length,
    trashCount: trashItems.length,
    onlineCount: getOnlineUsers().length,
  });
});

app.get('/api/presence', (_req, res) => {
  res.json(getOnlineUsers());
});

// Multipart Upload Route for Unlimited Photo & Video Uploads
app.post('/api/upload-file', uploadMiddleware.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/api/files/${req.file.filename}`;
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
  });
});

// Direct Binary File Serve Route
app.get('/api/files/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.sendFile(filePath);
});

app.get('/api/media/:id/file', (req, res) => {
  const { id } = req.params;
  const item = state.media.find((m) => m.id === id);
  if (!item || !item.dataUrl) {
    return res.status(404).send('File not found');
  }

  if (typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:')) {
    const matches = item.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }
  }

  res.redirect(item.dataUrl);
});

app.get('/api/media', (_req, res) => {
  purgeExpiredTrash();
  res.json(state.media);
});

app.post('/api/media', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  for (const item of items) {
    if (item.isTrash && !item.trashedAt) {
      item.trashedAt = Date.now();
    }
    const existingIndex = state.media.findIndex((m) => m.id === item.id);
    if (existingIndex >= 0) {
      state.media[existingIndex] = item;
    } else {
      state.media.unshift(item);
    }
  }
  saveStateDebounced();

  broadcast({
    type: 'media:created',
    items,
  });

  res.json({ success: true, count: items.length });
});

app.put('/api/media/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = state.media.findIndex((m) => m.id === id);
  if (index >= 0) {
    const existing = state.media[index];
    // If moving to trash, record trashedAt timestamp
    if (updates.isTrash === true && !existing.isTrash) {
      updates.trashedAt = Date.now();
    } else if (updates.isTrash === false) {
      updates.trashedAt = undefined;
    }

    state.media[index] = { ...existing, ...updates };
    saveStateDebounced();
    broadcast({
      type: 'media:updated',
      item: state.media[index],
    });
    res.json(state.media[index]);
  } else {
    res.status(404).json({ error: 'Media not found' });
  }
});

app.delete('/api/media/:id', (req, res) => {
  const { id } = req.params;
  state.media = state.media.filter((m) => m.id !== id);
  saveStateDebounced();
  broadcast({
    type: 'media:deleted',
    id,
  });
  res.json({ success: true, id });
});

// Batch Update Endpoint
app.post('/api/media/batch-update', (req, res) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be array' });
  }
  const idSet = new Set(ids);
  state.media = state.media.map((m) => {
    if (idSet.has(m.id)) {
      const updated = { ...m, ...updates };
      if (updates.isTrash === true && !m.isTrash) {
        updated.trashedAt = updates.trashedAt || Date.now();
      } else if (updates.isTrash === false) {
        delete updated.trashedAt;
      }
      return updated;
    }
    return m;
  });
  saveStateDebounced();
  broadcast({
    type: 'init',
    media: state.media,
    albums: state.albums,
    onlineUsers: getOnlineUsers(),
    quota: FOUR_TERABYTES_BYTES,
  });
  res.json({ success: true, count: ids.length });
});

// Batch Delete Endpoint
app.post('/api/media/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be array' });
  }
  const idSet = new Set(ids);
  state.media = state.media.filter((m) => !idSet.has(m.id));
  saveStateDebounced();
  broadcast({
    type: 'init',
    media: state.media,
    albums: state.albums,
    onlineUsers: getOnlineUsers(),
    quota: FOUR_TERABYTES_BYTES,
  });
  res.json({ success: true, count: ids.length });
});

// Empty trash endpoint
app.post('/api/trash/empty', (_req, res) => {
  const initial = state.media.length;
  state.media = state.media.filter((m) => !m.isTrash);
  const deletedCount = initial - state.media.length;
  saveStateDebounced();
  broadcast({
    type: 'init',
    media: state.media,
    albums: state.albums,
    onlineUsers: getOnlineUsers(),
    quota: FOUR_TERABYTES_BYTES,
  });
  res.json({ success: true, count: deletedCount });
});

app.post('/api/media/:id/like', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const media = state.media.find((m) => m.id === id);
  if (media) {
    if (!media.likes) media.likes = [];
    if (media.likes.includes(userId)) {
      media.likes = media.likes.filter((u: string) => u !== userId);
    } else {
      media.likes.push(userId);
    }
    saveStateDebounced();
    broadcast({
      type: 'media:updated',
      item: media,
    });
    res.json(media);
  } else {
    res.status(404).json({ error: 'Media not found' });
  }
});

app.post('/api/media/:id/comment', (req, res) => {
  const { id } = req.params;
  const comment = req.body;
  const media = state.media.find((m) => m.id === id);
  if (media) {
    if (!media.comments) media.comments = [];
    media.comments.push(comment);
    saveStateDebounced();
    broadcast({
      type: 'media:updated',
      item: media,
    });
    res.json(media);
  } else {
    res.status(404).json({ error: 'Media not found' });
  }
});

app.get('/api/albums', (_req, res) => {
  res.json(state.albums);
});

app.post('/api/albums', (req, res) => {
  const album = req.body;
  const index = state.albums.findIndex((a) => a.id === album.id);
  if (index >= 0) {
    state.albums[index] = album;
  } else {
    state.albums.push(album);
  }
  saveStateDebounced();
  broadcast({
    type: 'album:created',
    album,
  });
  res.json(album);
});

app.delete('/api/albums/:id', (req, res) => {
  const { id } = req.params;
  state.albums = state.albums.filter((a) => a.id !== id);
  // Unassign media
  for (const m of state.media) {
    if (m.albumId === id) m.albumId = 'none';
  }
  saveStateDebounced();
  broadcast({
    type: 'album:deleted',
    id,
  });
  res.json({ success: true, id });
});

// Mount Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud Media Server running on port ${PORT} with 4TB Cloud Tier & 30-Day Auto Trash Purge`);
  });
}

startServer();
