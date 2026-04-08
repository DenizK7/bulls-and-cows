import { Router } from 'express';
import { User } from '../models/User.model.js';
import { upsertUser, signJwt, verifyJwt } from '../services/auth.service.js';

const router = Router();

// Called by NextAuth after Google login - upserts user and returns JWT for socket
router.post('/token', async (req, res) => {
  try {
    const { googleId, email, name, image } = req.body;
    if (!googleId || !email) {
      res.status(400).json({ error: 'Missing googleId or email' });
      return;
    }

    const user = await upsertUser({
      googleId,
      email,
      displayName: name || email.split('@')[0],
      avatarUrl: image || '',
    });

    const token = signJwt(String(user._id));
    res.json({ token, user: { id: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl, stats: user.stats } });
  } catch (err) {
    console.error('Auth token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token' });
      return;
    }

    const payload = verifyJwt(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ id: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl, stats: user.stats, settings: user.settings });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
