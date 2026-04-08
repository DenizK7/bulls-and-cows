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
    res.json({ token, user: { id: user._id, displayName: user.displayName, tag: user.tag, avatarUrl: user.avatarUrl, stats: user.stats, setupComplete: user.setupComplete } });
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

    res.json({ id: user._id, displayName: user.displayName, tag: user.tag, avatarUrl: user.avatarUrl, stats: user.stats, settings: user.settings, setupComplete: user.setupComplete });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update display name
router.patch('/me', async (req, res) => {
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

    const { displayName, tag } = req.body;
    const update: Record<string, string> = {};

    if (displayName) {
      if (displayName.length < 2 || displayName.length > 20 || /\s/.test(displayName)) {
        res.status(400).json({ error: 'Username must be 2-20 chars, no spaces' });
        return;
      }
      update.displayName = displayName;
    }

    if (tag) {
      if (!/^\d{4}$/.test(tag)) {
        res.status(400).json({ error: 'Tag must be exactly 4 digits' });
        return;
      }
      // Check unique combo
      if (displayName || update.displayName) {
        const existing = await User.findOne({ displayName: displayName || undefined, tag, _id: { $ne: payload.userId } });
        if (existing) {
          res.status(409).json({ error: 'This username#tag combination is taken' });
          return;
        }
      }
      update.tag = tag;
    }

    update.setupComplete = 'true';
    if (Object.keys(update).length === 1) { // only setupComplete
      res.status(400).json({ error: 'Nothing to update' });
      return;
    }

    const user = await User.findByIdAndUpdate(payload.userId, update, { new: true });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ id: user._id, displayName: user.displayName, tag: user.tag });
  } catch (err) {
    console.error('Auth patch me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
