const { supabase } = require('../config/supabase');

// Simple in-memory cache to prevent Supabase 429 rate limits on getUser
const tokenCache = new Map();
const CACHE_DURATION_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Verifies the Bearer token from the Authorization header.
 * Attaches user from user_roles to req.user on success.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Check if token user is already verified and cached in memory
        if (tokenCache.has(token)) {
            req.user = tokenCache.get(token);
            return next();
        }

        // Verify JWT via Supabase Auth API safely
        const authResult = await supabase.auth.getUser(token);
        if (authResult.error || !authResult.data?.user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const user = authResult.data.user;

        // Fetch the user's role info from user_roles (keyed by id = auth user id)
        const { data: userRole, error: roleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (roleError || !userRole) {
            return res.status(401).json({ error: 'User profile not found. Contact your administrator.' });
        }

        let ventureData = null;
        if (userRole.venture_id) {
            const { data: vData } = await supabase
                .from('ventures')
                .select('*')
                .eq('id', userRole.venture_id)
                .single();
            ventureData = vData;
        }

        // Attach combined user to request
        const fullUser = {
            id: user.id,
            email: user.email,
            full_name: userRole.full_name,
            role: userRole.role,
            venture_id: userRole.venture_id,
            venture: ventureData,
        };

        // Cache the verified user for future requests
        tokenCache.set(token, fullUser);
        setTimeout(() => tokenCache.delete(token), CACHE_DURATION_MS);

        req.user = fullUser;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('managing_director', 'ceo')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
};

/**
 * Ensures non-MD users can only access data in their own venture.
 */
const requireSameVenture = (req, res, next) => {
    const { role, venture_id } = req.user;
    if (role === 'managing_director' || role === 'admin') return next();

    const targetVentureId = req.params.ventureId || req.body.venture_id || req.query.venture_id;
    if (targetVentureId && targetVentureId !== venture_id) {
        return res.status(403).json({ error: 'Access denied: cross-venture access not allowed' });
    }
    next();
};

module.exports = { authenticate, requireRole, requireSameVenture };
