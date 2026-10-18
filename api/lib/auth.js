'use strict';

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'myshelter-auth-secret-key-2026';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  try {
    const hash = crypto.scryptSync(String(password), String(salt), 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

function createToken(payload, expiresInMs = 14 * 24 * 60 * 60 * 1000) {
  const data = Object.assign({}, payload, {
    exp: Date.now() + expiresInMs,
    iat: Date.now()
  });
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) {
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function getUserFromReq(req) {
  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ((req.headers && req.headers['x-auth-token']) || null);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getUserFromReq
};
