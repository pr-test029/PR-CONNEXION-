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
    business_name TEXT,
    sector TEXT,
    city TEXT,
    address TEXT,
    lat REAL,
    lng REAL,
    role TEXT DEFAULT 'MEMBER',
    joined_date TEXT,
    status TEXT DEFAULT 'En Formation',
    training_progress INTEGER DEFAULT 0,
    badges TEXT, -- JSON array
    completed_trainings TEXT -- JSON array
  );

  CREATE TABLE IF NOT EXISTS trainings (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    type TEXT,
    url TEXT,
    date_added TEXT,
    author_name TEXT,
    duration TEXT
  );

  CREATE TABLE IF NOT EXISTS discussion_messages (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    content TEXT,
    timestamp TEXT,
    display_time TEXT,
    FOREIGN KEY(author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT,
    date TEXT,
    author_name TEXT
  );

  CREATE TABLE IF NOT EXISTS strategic_goals (
    id TEXT PRIMARY KEY,
    text TEXT,
    is_completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS victories (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    date TEXT
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
      INSERT INTO users (id, name, email, avatar, joined_date, badges, completed_trainings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar
    `);
    upsertUser.run(
      userData.id, 
      userData.name, 
      userData.email, 
      userData.picture, 
      new Date().toLocaleDateString(),
      JSON.stringify(['Nouvelle']),
      JSON.stringify([])
    );

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

// Members API
app.get('/api/members', (req, res) => {
  const members = db.prepare('SELECT * FROM users').all();
  const formatted = members.map((m: any) => ({
    ...m,
    businessName: m.business_name,
    joinedDate: m.joined_date,
    trainingProgress: m.training_progress,
    location: {
      lat: m.lat,
      lng: m.lng,
      city: m.city,
      address: m.address
    },
    badges: m.badges ? JSON.parse(m.badges) : [],
    completedTrainings: m.completed_trainings ? JSON.parse(m.completed_trainings) : []
  }));
  res.json(formatted);
});

app.post('/api/members', (req, res) => {
  const { id, name, email, businessName, sector, city, address, lat, lng, role } = req.body;
  const insert = db.prepare(`
    INSERT INTO users (id, name, email, avatar, business_name, sector, city, address, lat, lng, role, joined_date, badges, completed_trainings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  insert.run(
    id, name, email, avatar, businessName, sector, city, address, lat, lng, role, 
    new Date().toLocaleDateString(), 
    JSON.stringify(['Nouvelle']), 
    JSON.stringify([])
  );
  res.json({ success: true });
});

app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = [];
  const values = [];
  
  if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.businessName) { fields.push('business_name = ?'); values.push(updates.businessName); }
  if (updates.sector) { fields.push('sector = ?'); values.push(updates.sector); }
  if (updates.city) { fields.push('city = ?'); values.push(updates.city); }
  if (updates.address) { fields.push('address = ?'); values.push(updates.address); }
  if (updates.location) {
    fields.push('lat = ?'); values.push(updates.location.lat);
    fields.push('lng = ?'); values.push(updates.location.lng);
    if (updates.location.city) { fields.push('city = ?'); values.push(updates.location.city); }
    if (updates.location.address) { fields.push('address = ?'); values.push(updates.location.address); }
  }
  if (updates.completedTrainings) { fields.push('completed_trainings = ?'); values.push(JSON.stringify(updates.completedTrainings)); }
  
  if (fields.length === 0) return res.json({ success: true });
  
  values.push(id);
  const update = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  update.run(...values);
  res.json({ success: true });
});

// Trainings API
app.get('/api/trainings', (req, res) => {
  const trainings = db.prepare('SELECT * FROM trainings ORDER BY date_added DESC').all();
  res.json(trainings);
});

app.post('/api/trainings', (req, res) => {
  const t = req.body;
  const insert = db.prepare(`
    INSERT INTO trainings (id, title, description, type, url, date_added, author_name, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(t.id, t.title, t.description, t.type, t.url, t.dateAdded, t.authorName, t.duration);
  res.json({ success: true });
});

// Discussion API
app.get('/api/discussion', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.name as authorName, u.avatar as authorAvatar
    FROM discussion_messages m
    JOIN users u ON m.author_id = u.id
    ORDER BY m.timestamp ASC
  `).all();
  res.json(messages);
});

app.post('/api/discussion', (req, res) => {
  const { id, authorId, content, timestamp, displayTime } = req.body;
  const insert = db.prepare(`
    INSERT INTO discussion_messages (id, author_id, content, timestamp, display_time)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(id, authorId, content, timestamp, displayTime);
  res.json({ success: true });
});

app.delete('/api/discussion/:id', (req, res) => {
  db.prepare('DELETE FROM discussion_messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Notifications API
app.get('/api/notifications', (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications ORDER BY date DESC').all();
  res.json(notifs);
});

app.post('/api/notifications', (req, res) => {
  const n = req.body;
  const insert = db.prepare(`
    INSERT INTO notifications (id, title, message, date, author_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(n.id, n.title, n.message, n.date, n.authorName);
  res.json({ success: true });
});

// Goals API
app.get('/api/goals', (req, res) => {
  const goals = db.prepare('SELECT * FROM strategic_goals').all();
  res.json(goals.map((g: any) => ({ ...g, isCompleted: !!g.is_completed })));
});

app.post('/api/goals', (req, res) => {
  const { id, text } = req.body;
  db.prepare('INSERT INTO strategic_goals (id, text) VALUES (?, ?)').run(id, text);
  res.json({ success: true });
});

app.put('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const { isCompleted } = req.body;
  db.prepare('UPDATE strategic_goals SET is_completed = ? WHERE id = ?').run(isCompleted ? 1 : 0, id);
  res.json({ success: true });
});

app.delete('/api/goals/:id', (req, res) => {
  db.prepare('DELETE FROM strategic_goals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Victories API
app.get('/api/victories', (req, res) => {
  const victories = db.prepare('SELECT * FROM victories ORDER BY date DESC').all();
  res.json(victories);
});

app.post('/api/victories', (req, res) => {
  const v = req.body;
  db.prepare('INSERT INTO victories (id, title, description, date) VALUES (?, ?, ?, ?)').run(v.id, v.title, v.description, v.date);
  res.json({ success: true });
});

app.put('/api/victories/:id', (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  db.prepare('UPDATE victories SET title = ?, description = ? WHERE id = ?').run(title, description, id);
  res.json({ success: true });
});

app.delete('/api/victories/:id', (req, res) => {
  db.prepare('DELETE FROM victories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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
