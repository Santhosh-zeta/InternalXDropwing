const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');
const { twoFactorConfigRules, updateAccessLevelRules } = require('../middleware/validate.middleware');

// GET /api/access-control — Get all access levels with their permissions (L1 only)
router.get('/', authenticate, requireLevel(1), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT level_number, level_name, description, permissions FROM access_levels ORDER BY level_number ASC'
    );
    // Parse permissions JSON safely
    const levels = rows.map(row => ({
      ...row,
      permissions: (() => {
        if (!row.permissions) return {};
        if (typeof row.permissions === 'object') return row.permissions;
        try { return JSON.parse(row.permissions); } catch { return {}; }
      })()
    }));
    res.json({ success: true, data: levels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/access-control/2fa-config — Get current 2FA status (L1 only)
router.get('/2fa-config', authenticate, requireLevel(1), (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../config.json');
    let enable2FA = true;
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (configData.enable2FA === false) {
        enable2FA = false;
      }
    }
    res.json({ success: true, enable2FA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/access-control/2fa-config — Update 2FA status (L1 only)
router.put('/2fa-config', authenticate, requireLevel(1), twoFactorConfigRules, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../config.json');
    const { enable2FA } = req.body;
    
    let configData = {};
    if (fs.existsSync(configPath)) {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    configData.enable2FA = !!enable2FA;
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    
    await logAudit(req.user.id, 'UPDATE_2FA_CONFIG', 'system', 0, { enable2FA });
    res.json({ success: true, message: '2FA configuration updated successfully', enable2FA: configData.enable2FA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/access-control/:level — Update permissions for a specific level (L1 only)
router.put('/:level', authenticate, requireLevel(1), updateAccessLevelRules, async (req, res) => {
  try {
    const levelNumber = parseInt(req.params.level);
    if (levelNumber === 1) {
      return res.status(403).json({ success: false, message: 'Cannot modify Super Admin permissions' });
    }
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid permissions payload' });
    }
    await pool.query(
      'UPDATE access_levels SET permissions = ? WHERE level_number = ?',
      [JSON.stringify(permissions), levelNumber]
    );
    await logAudit(req.user.id, 'UPDATE_PERMISSIONS', 'access_level', levelNumber, { level: levelNumber });
    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
