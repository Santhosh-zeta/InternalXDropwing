const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/chat/messages
// Query params: ventureId (for channel) OR receiverId (for DM)
router.get('/messages', authenticate, async (req, res) => {
  try {
    const { ventureId, receiverId } = req.query;
    
    let query = `
      SELECT m.*, u.full_name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (ventureId) {
      if (ventureId === 'global') {
        query += ` AND m.venture_id IS NULL AND m.receiver_id IS NULL`;
      } else {
        query += ` AND m.venture_id = ? AND m.receiver_id IS NULL`;
        params.push(ventureId);
      }
    } else if (receiverId) {
      // DM between req.user.id and receiverId
      query += ` AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))`;
      params.push(req.user.id, receiverId, receiverId, req.user.id);
    } else {
      return res.status(400).json({ success: false, message: 'Must provide ventureId or receiverId' });
    }

    query += ` ORDER BY m.created_at ASC LIMIT 100`;

    const [messages] = await pool.query(query, params);
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/chat/messages (Fallback or main send method)
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { content, ventureId, receiverId } = req.body;
    
    if (!content) return res.status(400).json({ success: false, message: 'Content required' });

    let vId = null;
    let rId = null;

    if (ventureId) {
      vId = ventureId === 'global' ? null : ventureId;
    } else if (receiverId) {
      rId = receiverId;
    } else {
      return res.status(400).json({ success: false, message: 'Must provide ventureId or receiverId' });
    }

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, venture_id, content) VALUES (?, ?, ?, ?) RETURNING id',
      [req.user.id, rId, vId, content]
    );

    // Fetch the newly created message to return it
    const [newMessage] = await pool.query(
      'SELECT m.*, u.full_name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
      [result.insertId]
    );

    res.json({ success: true, data: newMessage[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
