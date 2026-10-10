import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { store } from '../db/store.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token && isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user) {
            req.user = data.user;
            userId = data.user.id;
          }
        } catch {
          // Ignore invalid Supabase token and check headers
        }
      }
    }

    // Check optional x-user-id header for development/demo mode
    if (!userId && req.headers['x-user-id']) {
      userId = String(req.headers['x-user-id']).trim();
      req.user = { id: userId, email: req.headers['x-user-email'] || `${userId}@campusloop.local` };
    }

    if (userId) {
      req.profile = await store.getProfile(userId);
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const currentRole = req.profile?.role || 'student';
    if (!roles.includes(currentRole)) {
      return res.status(403).json({ error: `Access denied. Requires one of [${roles.join(', ')}] role.` });
    }
    next();
  };
}
