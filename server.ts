import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Database setup
const db = new Database('cluster.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    avatar TEXT,
    role TEXT DEFAULT 'MEMBER'
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    score INTEGER,
    category TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    content TEXT,
    type TEXT,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    image TEXT,
    liked_by TEXT, -- JSON array of user IDs
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    author_id TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  );
`);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// OAuth URLs
app.get('/api/auth/google/url', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Failed to get token');
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

    // Save or update user in DB
    const upsertUser = db.prepare(`
      INSERT INTO users (id, name, email, avatar)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar
    `);
    upsertUser.run(userData.id, userData.name, userData.email, userData.picture);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(userData)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentification réussie. Cette fenêtre va se fermer automatiquement.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Posts API
app.get('/api/posts', (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name as authorName, u.avatar as authorAvatar
    FROM posts p
    JOIN users u ON p.author_id = u.id
    ORDER BY p.timestamp DESC
  `).all();
  
  const formattedPosts = posts.map((p: any) => ({
    ...p,
    likedBy: p.liked_by ? JSON.parse(p.liked_by) : [],
    comments: p.comments_count
  }));
  
  res.json(formattedPosts);
});

app.post('/api/posts', (req, res) => {
  const { authorId, content, type, image } = req.body;
  const id = Math.random().toString(36).substring(2, 15);
  
  const insert = db.prepare(`
    INSERT INTO posts (id, author_id, content, type, image, liked_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insert.run(id, authorId, content, type, image || null, JSON.stringify([]));
  
  res.json({ id });
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { likes, likedBy } = req.body;
  
  const update = db.prepare(`
    UPDATE posts SET likes = ?, liked_by = ? WHERE id = ?
  `);
  update.run(likes, JSON.stringify(likedBy), id);
  
  res.json({ success: true });
});

// Comments API
app.get('/api/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const comments = db.prepare(`
    SELECT c.*, u.name as authorName, u.avatar as authorAvatar
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.timestamp ASC
  `).all(postId);
  res.json(comments);
});

app.post('/api/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { authorId, content } = req.body;
  const id = Math.random().toString(36).substring(2, 15);
  
  const insert = db.prepare(`
    INSERT INTO comments (id, post_id, author_id, content)
    VALUES (?, ?, ?, ?)
  `);
  
  const updateCount = db.prepare(`
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?
  `);
  
  const transaction = db.transaction(() => {
    insert.run(id, postId, authorId, content);
    updateCount.run(postId);
  });
  
  transaction();
  res.json({ id });
});

// Scores API
app.get('/api/scores/:userId', (req, res) => {
  const { userId } = req.params;
  const scores = db.prepare('SELECT * FROM scores WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
  res.json(scores);
});

app.post('/api/scores', (req, res) => {
  const { userId, score, category } = req.body;
  if (!userId || score === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const insert = db.prepare('INSERT INTO scores (user_id, score, category) VALUES (?, ?, ?)');
  const result = insert.run(userId, score, category || 'general');
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT u.name, u.avatar, SUM(s.score) as total_score
    FROM users u
    JOIN scores s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY total_score DESC
    LIMIT 10
  `).all();
  res.json(leaderboard);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
