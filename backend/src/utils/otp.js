const crypto = require('crypto');

/**
 * Six-digit login OTP.
 *
 * crypto.randomInt draws from the CSPRNG. Math.random() is a seeded PRNG whose
 * internal state can be recovered from a handful of outputs, and every OTP we
 * generate is an observable output to whoever asked for it — so an attacker who
 * triggers a few OTPs against their own account could predict the next one
 * issued to somebody else.
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const generateResetToken = () => {
  // Generate a secure random hex string
  return crypto.randomBytes(32).toString('hex');
};

/**
 * OTPs are stored as a keyed hash, never in the clear.
 *
 * HMAC rather than a bare SHA-256: the search space of a 6-digit OTP is a
 * million entries, so a plain digest of it is reversible by brute force in
 * microseconds. Keying the hash with a server-side secret means a stolen
 * database dump alone does not let an attacker recover live OTPs — they would
 * need the application secret as well.
 *
 * Deliberately not bcrypt: this runs on the login path, the value is
 * high-entropy-free but short-lived (10 minutes) and rate limited, and a slow
 * KDF here buys little while adding cost to every sign-in.
 */
const otpKey = () => {
  // JWT_SECRET is already a required, high-entropy server secret. OTP_PEPPER
  // lets an operator rotate the OTP key independently if they ever need to.
  const secret = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OTP hashing requires JWT_SECRET (or OTP_PEPPER) to be set');
  }
  return secret;
};

const hashOTP = (otp) => {
  return crypto.createHmac('sha256', otpKey()).update(String(otp)).digest('hex');
};

/**
 * Constant-time comparison of a submitted OTP against the stored hash.
 *
 * Both sides are fixed-length hex digests, so timingSafeEqual can be used
 * directly; comparing the hashes rather than the raw values also means the
 * length check below never leaks anything about the OTP itself.
 */
const verifyOTP = (submitted, storedHash) => {
  if (!submitted || !storedHash) return false;

  let candidate;
  try {
    candidate = Buffer.from(hashOTP(submitted), 'hex');
  } catch (err) {
    return false;
  }

  const stored = Buffer.from(String(storedHash), 'hex');
  // A stored value that is not a full digest is legacy plaintext or corrupt —
  // treat it as a non-match rather than falling back to a plaintext compare.
  if (stored.length !== candidate.length) return false;

  return crypto.timingSafeEqual(candidate, stored);
};

module.exports = {
  generateOTP,
  generateResetToken,
  hashOTP,
  verifyOTP,
};
