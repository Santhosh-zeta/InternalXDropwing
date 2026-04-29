const { pool } = require('../config/database');

const logAudit = async (userId, actionType, entityType, entityId, details, ipAddress = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, actionType, entityType, entityId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

module.exports = { logAudit };
