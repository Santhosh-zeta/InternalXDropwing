const { pool } = require('../config/database');

/**
 * Create a new notification for a user
 * @param {number} userId - The recipient user ID
 * @param {string} type - 'task_assigned', 'task_updated', 'project_update', 'mention', 'deadline', 'system'
 * @param {string} title - Short title
 * @param {string} message - Notification content
 * @param {string} [link] - Optional URL/path for the notification
 */
async function createNotification(userId, type, title, message, link = null) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, type, title, message, link]
    );
    return true;
  } catch (err) {
    console.error('Error creating notification:', err);
    return false;
  }
}

module.exports = { createNotification };
