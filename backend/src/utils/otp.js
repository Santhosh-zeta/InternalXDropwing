const crypto = require('crypto');

const generateOTP = () => {
  // Generate a 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetToken = () => {
  // Generate a secure random hex string
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateOTP,
  generateResetToken
};
