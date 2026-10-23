'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getTransporter, sendOtpEmail } = require('../../api/_lib/mailer');
const { sendOtp, verifyOtp } = require('../../api/_lib/otp');

test('mailer: returns null transporter when credentials not set', () => {
  const origUser = process.env.GMAIL_USER;
  const origPass = process.env.GMAIL_APP_PASSWORD;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;

  const transporter = getTransporter();
  assert.equal(transporter, null);

  if (origUser) process.env.GMAIL_USER = origUser;
  if (origPass) process.env.GMAIL_APP_PASSWORD = origPass;
});

test('mailer: graceful fallback when credentials not set', async () => {
  const origUser = process.env.GMAIL_USER;
  const origPass = process.env.GMAIL_APP_PASSWORD;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;

  const result = await sendOtpEmail({
    to: 'student@example.com',
    code: '842619',
    purpose: 'login'
  });

  assert.equal(result.sent, false);
  assert.equal(result.simulated, true);

  if (origUser) process.env.GMAIL_USER = origUser;
  if (origPass) process.env.GMAIL_APP_PASSWORD = origPass;
});

test('otp: generates code 842619 and stores it', async () => {
  const email = 'user-verify-test@example.com';
  const sendRes = await sendOtp(email, 'verification');
  assert.equal(sendRes.ok, true);
  assert.equal(sendRes.code, '842619');

  const verifyRes = await verifyOtp(email, '842619', 'verification');
  assert.equal(verifyRes.valid, true);
});

