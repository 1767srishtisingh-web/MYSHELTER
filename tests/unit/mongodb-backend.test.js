'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getDb } = require('../../api/_lib/mongodb');
const registerHandler = require('../../api/auth/register');
const loginHandler = require('../../api/auth/login');
const bookingsHandler = require('../../api/bookings');
const cancelHandler = require('../../api/bookings/cancel');
const preferencesHandler = require('../../api/preferences');
const { isValidPhone, normalizePhone } = require('../../api/_lib/validate');

function mockReqRes(method, body = {}, headers = {}) {
  const req = {
    method,
    body,
    headers,
    query: {}
  };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader() {},
    json(data) {
      responseData = data;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
  return { req, res };
}

test('mongodb: getDb connects or returns in-memory fallback', async () => {
  const { db } = await getDb();
  assert.ok(db, 'db instance should exist');
  const usersCol = db.collection('users');
  assert.ok(usersCol, 'users collection should be accessible');
});

test('phone validation: strictly enforces 10-digit Indian mobile number', () => {
  assert.equal(isValidPhone('9876543210'), true);
  assert.equal(isValidPhone('+91 9876543210'), true);
  assert.equal(isValidPhone('09876543210'), true);
  assert.equal(isValidPhone('98765-43210'), true);

  assert.equal(isValidPhone('12345'), false);
  assert.equal(isValidPhone('9876543210123'), false);
  assert.equal(isValidPhone('abcdefghij'), false);
  assert.equal(isValidPhone('5876543210'), false);
  assert.equal(isValidPhone(''), false);
  assert.equal(isValidPhone(null), false);
});

test('backend auth flow: register user and login with fixed OTP', async () => {
  const email = 'student_test_' + Date.now() + '@gmail.com';
  const password = 'Password@123';

  const badPhoneReq = mockReqRes('POST', {
    name: 'Test Student',
    email,
    phone: '12345',
    password
  });
  await registerHandler(badPhoneReq.req, badPhoneReq.res);
  assert.equal(badPhoneReq.res.getStatusCode(), 400);

  const reg = mockReqRes('POST', {
    name: 'Test Student',
    email,
    phone: '9876543210',
    password
  });
  await registerHandler(reg.req, reg.res);
  assert.equal(reg.res.getStatusCode(), 201);
  const regData = reg.res.getData();
  assert.equal(regData.ok, true);
  assert.equal(regData.user.email, email);
  assert.equal(regData.user.phone, '9876543210');

  const loginReq = mockReqRes('POST', { email, password });
  await loginHandler(loginReq.req, loginReq.res);
  assert.equal(loginReq.res.getStatusCode(), 200);
  const loginData = loginReq.res.getData();
  assert.equal(loginData.ok, true);
  assert.equal(loginData.requireOtp, true);

  const otpVerifyReq = mockReqRes('POST', { email, password, otp: '842619' });
  await loginHandler(otpVerifyReq.req, otpVerifyReq.res);
  assert.equal(otpVerifyReq.res.getStatusCode(), 200);
  const verifyData = otpVerifyReq.res.getData();
  assert.equal(verifyData.ok, true);
  assert.ok(verifyData.token, 'Session JWT should be issued');
});

test('backend bookings flow: create, query, and cancel booking', async () => {
  const token = require('../../api/_lib/auth').createToken({
    userId: 'usr_booking_test',
    email: 'booking_tester@gmail.com',
    name: 'Booking Tester'
  });

  const createReq = mockReqRes('POST', {
    roomId: 'room_delhi_101',
    hotel: 'The Grand Delhi',
    type: 'Deluxe Room',
    city: 'Delhi',
    locality: 'Connaught Place',
    checkIn: '2026-10-25',
    nights: 2,
    guestName: 'Booking Tester',
    phone: '9876543210',
    tariff: 4500,
    taxes: '810',
    total: 5310
  }, { authorization: 'Bearer ' + token });

  await bookingsHandler(createReq.req, createReq.res);
  assert.equal(createReq.res.getStatusCode(), 201);
  const booking = createReq.res.getData().booking;
  assert.ok(booking.booking_id);

  const getReq = mockReqRes('GET', {}, { authorization: 'Bearer ' + token });
  await bookingsHandler(getReq.req, getReq.res);
  assert.equal(getReq.res.getStatusCode(), 200);
  const list = getReq.res.getData().bookings;
  assert.ok(list.some((b) => b.bookingId === booking.booking_id));

  const cancelReq = mockReqRes('POST', { bookingId: booking.booking_id }, { authorization: 'Bearer ' + token });
  await cancelHandler(cancelReq.req, cancelReq.res);
  assert.equal(cancelReq.res.getStatusCode(), 200);
  assert.equal(cancelReq.res.getData().cancelled, booking.booking_id);
});

