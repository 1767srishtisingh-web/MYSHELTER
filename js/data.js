/*
 * MYSHELTER — room & hostel listings.
 * All data is local (no backend), as described in the project report.
 * Photos are free-to-use Unsplash images. If one fails to load, the UI swaps in
 * assets/placeholder.svg so a card never shows a broken image.
 *
 * Every money field is a Number (never a string) so totals add correctly.
 */
(function (root) {
  'use strict';

  var U = function (id) {
    return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=900&q=70';
  };

  var P = {
    living1: U('1522708323590-d24dbb6b0267'),
    living2: U('1502672260266-1c1ef2d93688'),
    bed1: U('1505691938895-1758d7feb511'),
    apt1: U('1560448204-e02f11c3d0e2'),
    living3: U('1493809842364-78817add7ffb'),
    living4: U('1554995207-c18c203602cb'),
    kitchen1: U('1484154218962-a197022b5858'),
    living5: U('1586023492125-27b2c045efd7'),
    bed2: U('1540518614846-7eded433c457'),
    bed3: U('1595526114035-0d45ed16cfbf'),
    bed4: U('1505693416388-ac5ce068fe85'),
    bed5: U('1522771739844-6a9f6d5f14af'),
    apt2: U('1560185007-cde436f6a4d0'),
    apt3: U('1560185893-a55cbc8c57e8'),
    living6: U('1502005229762-cf1b2da7c5d6'),
    living7: U('1513694203232-719a280e022f'),
    desk1: U('1536376072261-38c75010e6c9'),
    kitchen2: U('1556020685-ae41abfc9365'),
    bed6: U('1598928506311-c55ded91a20c'),
    bed7: U('1616594039964-ae9021a400a0'),
    bed8: U('1631049307264-da0ec9d70304')
  };

  var ROOMS = [
    { id: 'ms-101', title: 'Green View PG', city: 'Delhi', locality: 'North Campus, Kamla Nagar', type: 'Single Room', category: 'PG', gender: 'Girls', rent: 9500, deposit: 9500, amenities: ['wifi', 'food'], rating: 4.6, reviews: 128, images: [P.bed3, P.desk1, P.kitchen1], highlight: '5 min walk to Hindu College' },
    { id: 'ms-102', title: 'Sunny 1 BHK Flat', city: 'Pune', locality: 'Viman Nagar', type: '1 BHK', category: 'Flat', gender: 'Any', rent: 14000, deposit: 28000, amenities: ['wifi', 'ac'], rating: 4.4, reviews: 76, images: [P.living1, P.bed1, P.kitchen2], highlight: 'Balcony with morning sun' },
    { id: 'ms-103', title: 'Scholars Boys Hostel', city: 'Kota', locality: 'Rajeev Gandhi Nagar', type: 'Shared Room', category: 'Hostel', gender: 'Boys', rent: 6500, deposit: 5000, amenities: ['wifi', 'food'], rating: 4.2, reviews: 214, images: [P.bed5, P.desk1, P.kitchen1], highlight: 'Near coaching hubs, 24×7 study hall' },
    { id: 'ms-104', title: 'Pink City Girls PG', city: 'Jaipur', locality: 'Malviya Nagar', type: 'Single Room', category: 'PG', gender: 'Girls', rent: 8500, deposit: 8500, amenities: ['wifi', 'ac', 'food'], rating: 4.7, reviews: 162, images: [P.bed7, P.bed2, P.kitchen2], highlight: 'CCTV, warden on site, home-style meals' },
    { id: 'ms-105', title: 'Lakeside 2 BHK Apartment', city: 'Bengaluru', locality: 'Bellandur', type: '2 BHK', category: 'Flat', gender: 'Any', rent: 26000, deposit: 78000, amenities: ['wifi', 'ac'], rating: 4.5, reviews: 54, images: [P.apt1, P.living3, P.bed4], highlight: 'Gated society, gym and pool' },
    { id: 'ms-106', title: 'Metro Edge Boys PG', city: 'Hyderabad', locality: 'Ameerpet', type: 'Shared Room', category: 'PG', gender: 'Boys', rent: 7000, deposit: 7000, amenities: ['wifi', 'food'], rating: 4.1, reviews: 98, images: [P.bed6, P.living6, P.kitchen1], highlight: '2 min to Ameerpet metro' },
    { id: 'ms-107', title: 'Cosy 1 BHK Studio', city: 'Mumbai', locality: 'Andheri West', type: '1 BHK', category: 'Flat', gender: 'Any', rent: 32000, deposit: 96000, amenities: ['wifi', 'ac'], rating: 4.3, reviews: 41, images: [P.living4, P.bed8, P.kitchen2], highlight: 'Fully furnished, walk to Lokhandwala' },
    { id: 'ms-108', title: 'Sakura Girls Hostel', city: 'Pune', locality: 'Kothrud', type: 'Shared Room', category: 'Hostel', gender: 'Girls', rent: 7500, deposit: 5000, amenities: ['wifi', 'food'], rating: 4.5, reviews: 187, images: [P.bed2, P.bed5, P.desk1], highlight: 'Near MIT-WPU, biometric entry' },
    { id: 'ms-109', title: 'Campus Corner 2 BHK', city: 'Delhi', locality: 'Mukherjee Nagar', type: '2 BHK', category: 'Flat', gender: 'Any', rent: 22000, deposit: 44000, amenities: ['wifi', 'ac'], rating: 4.0, reviews: 63, images: [P.living2, P.bed1, P.kitchen1], highlight: 'Ideal for 3–4 flatmates' },
    { id: 'ms-110', title: 'Heritage Boys Hostel', city: 'Jaipur', locality: 'Jawahar Nagar', type: 'Shared Room', category: 'Hostel', gender: 'Boys', rent: 6000, deposit: 4000, amenities: ['food'], rating: 3.9, reviews: 132, images: [P.bed6, P.bed5, P.kitchen1], highlight: 'Budget pick near University of Rajasthan' },
    { id: 'ms-111', title: 'Silicon Nest Co-living', city: 'Bengaluru', locality: 'Koramangala 5th Block', type: 'Single Room', category: 'PG', gender: 'Any', rent: 15500, deposit: 15500, amenities: ['wifi', 'ac', 'food'], rating: 4.8, reviews: 245, images: [P.bed8, P.living7, P.kitchen2], highlight: 'Housekeeping, laundry, community events' },
    { id: 'ms-112', title: 'Marine View 2 BHK', city: 'Mumbai', locality: 'Powai', type: '2 BHK', category: 'Flat', gender: 'Any', rent: 48000, deposit: 144000, amenities: ['wifi', 'ac'], rating: 4.6, reviews: 37, images: [P.apt3, P.living5, P.bed4], highlight: 'Lake view, near IIT Bombay' },
    { id: 'ms-113', title: 'Lotus Girls PG', city: 'Hyderabad', locality: 'Gachibowli', type: 'Single Room', category: 'PG', gender: 'Girls', rent: 11000, deposit: 11000, amenities: ['wifi', 'ac', 'food'], rating: 4.4, reviews: 109, images: [P.bed7, P.bed3, P.living6], highlight: 'Near Financial District, AC rooms' },
    { id: 'ms-114', title: 'Budget 1 BHK Near Campus', city: 'Kota', locality: 'Talwandi', type: '1 BHK', category: 'Flat', gender: 'Any', rent: 9000, deposit: 18000, amenities: ['wifi'], rating: 4.0, reviews: 28, images: [P.living6, P.bed1, P.kitchen1], highlight: 'Semi-furnished, quiet lane' },
    { id: 'ms-115', title: 'Marina Girls Hostel', city: 'Chennai', locality: 'Guindy', type: 'Shared Room', category: 'Hostel', gender: 'Girls', rent: 8000, deposit: 6000, amenities: ['wifi', 'food'], rating: 4.3, reviews: 91, images: [P.bed2, P.desk1, P.kitchen2], highlight: 'Walk to Anna University' },
    { id: 'ms-116', title: 'Tech Park 1 BHK', city: 'Chennai', locality: 'OMR, Thoraipakkam', type: '1 BHK', category: 'Flat', gender: 'Any', rent: 16500, deposit: 50000, amenities: ['wifi', 'ac'], rating: 4.2, reviews: 45, images: [P.apt2, P.bed4, P.kitchen2], highlight: 'Power backup, covered parking' },
    { id: 'ms-117', title: 'Rajpath 2 BHK Residency', city: 'Jaipur', locality: 'Vaishali Nagar', type: '2 BHK', category: 'Flat', gender: 'Any', rent: 18000, deposit: 36000, amenities: ['wifi', 'ac'], rating: 4.5, reviews: 58, images: [P.living3, P.bed8, P.kitchen1], highlight: 'Spacious, near Amrapali Circle' },
    { id: 'ms-118', title: 'Scholar Boys PG', city: 'Pune', locality: 'Hinjewadi Phase 1', type: 'Single Room', category: 'PG', gender: 'Boys', rent: 10500, deposit: 10500, amenities: ['wifi', 'ac', 'food'], rating: 4.3, reviews: 84, images: [P.bed1, P.desk1, P.kitchen2], highlight: 'Shuttle to IT park' }
  ];

  var AMENITIES = {
    wifi: 'Wi-Fi',
    ac: 'AC',
    food: 'Food Included'
  };

  var COUPONS = {
    WELCOME500: { code: 'WELCOME500', amount: 500, label: '₹500 off your first booking' }
  };

  var api = { ROOMS: ROOMS, AMENITIES: AMENITIES, COUPONS: COUPONS };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MyShelterData = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
