import { Router } from 'express';
import { User } from '../models/User.model.js';
import { Friendship } from '../models/Friendship.model.js';
import { verifyJwt } from '../services/auth.service.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// Auth middleware - extract userId from Bearer token
function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  const payload = verifyJwt(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  (req as any).userId = payload.userId;
  next();
}

router.use(auth);

// GET /api/v1/friends - list accepted friends
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const friendships = await Friendship.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
      status: 'accepted',
    })
      .populate('requesterId', 'displayName avatarUrl tag stats.eloRating')
      .populate('recipientId', 'displayName avatarUrl tag stats.eloRating');

    const friends = friendships.map((f) => {
      const friend = f.requesterId._id.toString() === userId ? f.recipientId : f.requesterId;
      return friend;
    });

    res.json({ friends });
  } catch (err) {
    console.error('List friends error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/friends/requests - list pending incoming requests
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const requests = await Friendship.find({
      recipientId: userId,
      status: 'pending',
    }).populate('requesterId', 'displayName avatarUrl tag stats.eloRating');

    res.json({ requests });
  } catch (err) {
    console.error('List requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/friends/requests/sent - list pending outgoing requests
router.get('/requests/sent', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const requests = await Friendship.find({
      requesterId: userId,
      status: 'pending',
    }).populate('recipientId', 'displayName avatarUrl tag');

    res.json({ requests });
  } catch (err) {
    console.error('List sent requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/friends/request - send friend request by displayName#tag
router.post('/request', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { displayName, tag } = req.body;

    if (!displayName || !tag) {
      res.status(400).json({ error: 'displayName and tag are required' });
      return;
    }

    const target = await User.findOne({ displayName, tag });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target._id!.toString() === userId) {
      res.status(400).json({ error: 'Cannot send friend request to yourself' });
      return;
    }

    // Check if friendship already exists in either direction
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: userId, recipientId: target._id },
        { requesterId: target._id, recipientId: userId },
      ],
    });

    if (existing) {
      res.status(409).json({ error: 'Friend request already exists or you are already friends' });
      return;
    }

    const friendship = await Friendship.create({
      requesterId: userId,
      recipientId: target._id,
    });

    res.status(201).json({ friendship });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/friends/accept/:requestId - accept request
router.post('/accept/:requestId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship || friendship.status !== 'pending') {
      res.status(404).json({ error: 'Pending request not found' });
      return;
    }

    if (friendship.recipientId.toString() !== userId) {
      res.status(403).json({ error: 'Not your request to accept' });
      return;
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ friendship });
  } catch (err) {
    console.error('Accept request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/friends/decline/:requestId - decline request
router.post('/decline/:requestId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship || friendship.status !== 'pending') {
      res.status(404).json({ error: 'Pending request not found' });
      return;
    }

    if (friendship.recipientId.toString() !== userId) {
      res.status(403).json({ error: 'Not your request to decline' });
      return;
    }

    await friendship.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error('Decline request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/friends/:friendId - remove friend
router.delete('/:friendId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const friendship = await Friendship.findOne({
      $or: [
        { requesterId: userId, recipientId: req.params.friendId },
        { requesterId: req.params.friendId, recipientId: userId },
      ],
      status: 'accepted',
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await friendship.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/friends/search?q=name - search users by name
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 1) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const users = await User.find(
      { displayName: { $regex: q, $options: 'i' } },
      { _id: 1, displayName: 1, tag: 1, avatarUrl: 1 },
    ).limit(20);

    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
