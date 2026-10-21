'use strict';

/**
 * Standardized JSON response helper.
 * Compatible with Vercel Serverless Functions and Node.js http.ServerResponse.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {object} data
 */
function json(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * Standardized JSON error response helper.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object} [extra]
 */
function error(res, statusCode, message, extra = {}) {
  const payload = Object.assign({ ok: false, error: message }, extra);
  return json(res, statusCode, payload);
}

module.exports = {
  json,
  error
};

