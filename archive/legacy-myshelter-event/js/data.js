/*
 * MYSHELTER — hotel rooms in Delhi, Noida and Ghaziabad.
 * All data is local (no backend). Tariffs are indicative per night.
 * Photos are representative Unsplash images; if one fails to load the UI
 * shows assets/placeholder.svg instead.
 */
(function (root) {
  'use strict';

  var U = function (id) {
    return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=900&q=70';
  };

  var PHOTOS = {
    room: [
      U('1582719478250-c89cae4dc85b'), U('1611892440504-42a792e24d32'), U('1590490360182-c33d57733427'),
      U('1618773928121-c32242e63f39'), U('1578683010236-d716f9a3f461'), U('1631049307264-da0ec9d70304'),
      U('1591088398332-8a7791972843'), U('1566665797739-1674de7a421a'), U('1595576508898-0ad5c879a061')
    ],
    suite: [U('1578683010236-d716f9a3f461'), U('1590490360182-c33d57733427'), U('1618773928121-c32242e63f39')],
    hotel: [
      U('1566073771259-6a8506099945'), U('1542314831-068cd1dbfeeb'), U('1551882547-ff40c63fe5fa'),
      U('1564501049412-61c2a3083791'), U('1520250497591-112f2f40a3f4'), U('1571896349842-33c89424de2d')
    ]
  };

  // name, stars, city, area, address, hotel amenities, base tariff for the entry room type
  var HOTELS = [
    // ---------- Delhi ----------
    ['The Imperial New Delhi', 5, 'Delhi', 'Connaught Place', '1, Janpath, Connaught Place, New Delhi 110001', ['pool', 'parking'], 16500],
    ['Taj Palace, New Delhi', 5, 'Delhi', 'Chanakyapuri', '2, Sardar Patel Marg, Diplomatic Enclave, Chanakyapuri, New Delhi 110021', ['pool', 'parking'], 15000],
    ['The Leela Palace New Delhi', 5, 'Delhi', 'Chanakyapuri', 'Diplomatic Enclave, Chanakyapuri, New Delhi 110023', ['pool', 'parking'], 19500],
    ['The Oberoi, New Delhi', 5, 'Delhi', 'Lodhi Road', 'Dr. Zakir Hussain Marg, New Delhi 110003', ['pool', 'parking'], 21000],
    ['ITC Maurya', 5, 'Delhi', 'Chanakyapuri', 'Sardar Patel Marg, Diplomatic Enclave, Chanakyapuri, New Delhi 110021', ['pool', 'parking'], 14500],
    ['Shangri-La Eros New Delhi', 5, 'Delhi', 'Connaught Place', '19, Ashoka Road, Connaught Place, New Delhi 110001', ['pool', 'parking'], 13000],
    ['The Lalit New Delhi', 5, 'Delhi', 'Connaught Place', 'Barakhamba Avenue, Connaught Place, New Delhi 110001', ['pool', 'parking'], 11500],
    ['Le Méridien New Delhi', 5, 'Delhi', 'Janpath', 'Windsor Place, Janpath, New Delhi 110001', ['pool', 'parking'], 11000],
    ['The Claridges New Delhi', 5, 'Delhi', 'Lutyens’ Delhi', '12, Dr. APJ Abdul Kalam Road, New Delhi 110011', ['pool', 'parking'], 12500],
    ['Hyatt Regency Delhi', 5, 'Delhi', 'Bhikaiji Cama Place', 'Bhikaiji Cama Place, Ring Road, New Delhi 110066', ['pool', 'parking'], 12000],
    ['JW Marriott Hotel New Delhi Aerocity', 5, 'Delhi', 'Aerocity', 'Asset Area 4, Hospitality District, Aerocity, New Delhi 110037', ['pool', 'parking'], 13500],
    ['Andaz Delhi', 5, 'Delhi', 'Aerocity', 'Asset No. 1, Aerocity, New Delhi 110037', ['pool', 'parking'], 14000],
    ['Pullman New Delhi Aerocity', 5, 'Delhi', 'Aerocity', 'Asset No. 2, GMR Hospitality District, Aerocity, New Delhi 110037', ['pool', 'parking'], 10500],
    ['Novotel New Delhi Aerocity', 4, 'Delhi', 'Aerocity', 'Asset No. 2, GMR Hospitality District, Aerocity, New Delhi 110037', ['pool', 'parking'], 7800],
    ['Holiday Inn New Delhi International Airport', 4, 'Delhi', 'Aerocity', 'Asset No. 12, Aerocity, New Delhi 110037', ['pool', 'parking'], 7200],
    ['Radisson Blu Plaza Delhi Airport', 5, 'Delhi', 'Mahipalpur', 'National Highway 8, Mahipalpur, New Delhi 110037', ['pool', 'parking'], 8900],
    ['Sheraton New Delhi Hotel', 5, 'Delhi', 'Saket', 'District Centre, Saket, New Delhi 110017', ['pool', 'parking'], 9800],
    ['Eros Hotel New Delhi, Nehru Place', 5, 'Delhi', 'Nehru Place', 'American Plaza, International Trade Tower, Nehru Place, New Delhi 110019', ['pool', 'parking'], 9200],
    ['Crowne Plaza New Delhi Mayur Vihar Noida', 5, 'Delhi', 'Mayur Vihar', '13B, Mayur Place, District Centre, Mayur Vihar, New Delhi 110091', ['pool', 'parking'], 8200],
    ['Holiday Inn New Delhi Mayur Vihar Noida', 4, 'Delhi', 'Mayur Vihar', '13A, Mayur Place, District Centre, Mayur Vihar, New Delhi 110091', ['pool', 'parking'], 6900],
    ['Bloomrooms @ Janpath', 3, 'Delhi', 'Janpath', '9, Janpath Lane, Connaught Place, New Delhi 110001', [], 4200],

    // ---------- Noida ----------
    ['Radisson Blu MBD Hotel Noida', 5, 'Noida', 'Sector 18', 'L-2, Sector 18, beside Centrestage Mall, Noida 201301', ['pool', 'parking'], 8800],
    ['Radisson Noida', 4, 'Noida', 'Sector 55', 'C Block, Sector 55, Noida 201307', ['parking'], 5600],
    ['Fortune Inn Grazia', 4, 'Noida', 'Sector 27', 'Plot 1A, Block I, Sector 27, Noida 201301', ['parking'], 5200],
    ['Mosaic Hotel Noida', 4, 'Noida', 'Sector 18', 'C-1, Sector 18, Noida 201301', ['parking'], 5800],
    ['Sandal Suites by Lemon Tree Hotels', 4, 'Noida', 'Sector 135', 'Assotech Business Cresterra, Noida–Greater Noida Expressway, Sector 135, Noida 201301', ['parking'], 6100],
    ['Ginger Noida Sector 63', 3, 'Noida', 'Sector 63', 'Plot 46/1A, Block H, Sector 63, Noida 201301', ['parking'], 3400],
    ['Mint City Centre Suites', 3, 'Noida', 'Sector 50', 'A-17, Block A, Sector 50, Noida 201301', ['parking'], 3200],
    ['Nirula’s Hotel Noida', 3, 'Noida', 'Sector 2', 'C-135, DSC Marg, Sector 2, Noida 201301', ['parking'], 3600],
    ['The Royale Park', 3, 'Noida', 'Sector 6', 'G-43, Sector 6, Noida 201301', ['parking'], 3000],
    ['Hotel Royale Paradise', 3, 'Noida', 'Sector 12', 'Y-349C, Amaltash Marg, Sector 12, Noida 201301', ['parking'], 2900],
    ['Savoy Suites Greater Noida', 4, 'Noida', 'Greater Noida', 'Destination Point, Institutional Area, Greater Noida Expressway, Greater Noida 201301', ['pool', 'parking'], 5900],
    ['Crowne Plaza Greater Noida', 5, 'Noida', 'Greater Noida', 'Institutional Green 1, Greater Noida 201306', ['pool', 'parking'], 8400],
    ['Jaypee Greens Golf & Spa Resort', 5, 'Noida', 'Greater Noida', 'G Block, Surajpur–Kasna Road, Jaypee Greens, Greater Noida 201308', ['pool', 'parking'], 9500],
    ['Radisson Blu Greater Noida', 5, 'Noida', 'Greater Noida', 'C-8, Site IV, Kasna, Greater Noida 201306', ['pool', 'parking'], 7600],

    // ---------- Ghaziabad ----------
    ['Radisson Blu Kaushambi Delhi NCR', 5, 'Ghaziabad', 'Kaushambi', 'Plot 3, Kaushambi, Ghaziabad 201010', ['pool', 'parking'], 8300],
    ['Radisson Blu Towers Kaushambi Delhi NCR', 5, 'Ghaziabad', 'Kaushambi', 'Kaushambi, Ghaziabad 201010', ['pool', 'parking'], 8700],
    ['Lemon Tree Hotel, East Delhi Mall', 4, 'Ghaziabad', 'Kaushambi', 'East Delhi Mall, Kaushambi, Ghaziabad 201010', ['parking'], 5400],
    ['Country Inn & Suites by Radisson, Sahibabad', 4, 'Ghaziabad', 'Sahibabad', 'Site IV, Sahibabad Industrial Area, Ghaziabad 201010', ['pool', 'parking'], 5700],
    ['Ramada by Wyndham Ghaziabad Vasundhara', 4, 'Ghaziabad', 'Vasundhara', 'Vasundhara, Ghaziabad 201012', ['pool', 'parking'], 5300],
    ['Golden Tulip Vasundhara', 4, 'Ghaziabad', 'Vasundhara', 'Vasundhara, Ghaziabad 201012', ['parking'], 4900],
    ['Mahagun Sarovar Portico Suites', 4, 'Ghaziabad', 'Vaishali', 'Sector 4, Vaishali, Ghaziabad 201010', ['parking'], 5000],
    ['Orana Hotel & Convention', 4, 'Ghaziabad', 'Vaishali', 'Vaishali, Ghaziabad 201010', ['parking'], 4700],
    ['KPG Sarovar Portico', 4, 'Ghaziabad', 'Raj Nagar Extension', 'Raj Nagar Extension, Ghaziabad 201017', ['parking'], 4600],
    ['Ginger Ghaziabad, Raj Nagar Extension', 3, 'Ghaziabad', 'Raj Nagar Extension', 'Raj Nagar Extension, Ghaziabad 201017', ['parking'], 3200],
    ['Hotel Krishna Sagar', 3, 'Ghaziabad', 'Raj Nagar', 'Raj Nagar, Ghaziabad 201002', ['parking'], 2800],
    ['Hotel Black Stone', 3, 'Ghaziabad', 'Vasundhara', 'Vasundhara, Ghaziabad 201012', [], 2600]
  ];

  // Room types offered by each hotel class. factor = tariff multiplier on the hotel base.
  var LADDER = {
    5: [
      { type: 'Deluxe', bed: 'King bed', guests: 2, size: 36, factor: 1, breakfast: false, freeCancellation: true },
      { type: 'Executive', bed: 'King bed', guests: 2, size: 42, factor: 1.4, breakfast: true, freeCancellation: true },
      { type: 'Suite', bed: 'King bed · Living room', guests: 3, size: 75, factor: 2.6, breakfast: true, freeCancellation: false }
    ],
    4: [
      { type: 'Standard', bed: 'Queen bed', guests: 2, size: 26, factor: 1, breakfast: false, freeCancellation: false },
      { type: 'Deluxe', bed: 'King bed', guests: 2, size: 30, factor: 1.25, breakfast: true, freeCancellation: true },
      { type: 'Executive', bed: 'King bed', guests: 3, size: 36, factor: 1.6, breakfast: true, freeCancellation: true }
    ],
    3: [
      { type: 'Standard', bed: 'Double bed', guests: 2, size: 20, factor: 1, breakfast: false, freeCancellation: false },
      { type: 'Deluxe', bed: 'Queen bed', guests: 2, size: 24, factor: 1.3, breakfast: true, freeCancellation: true },
      { type: 'Standard', bed: 'Twin beds', guests: 2, size: 22, factor: 1.05, breakfast: true, freeCancellation: true }
    ]
  };

  function slug(s) {
    return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
  }

  function roundTo(n, step) { return Math.round(n / step) * step; }

  // GST on hotel rooms: 5% up to ₹7,500 per night, 18% above.
  function gstFor(price) { return Math.round(price * (price <= 7500 ? 0.05 : 0.18)); }

  var ROOMS = [];
  HOTELS.forEach(function (h, hi) {
    var name = h[0], stars = h[1], city = h[2], area = h[3], address = h[4], hotelAmenities = h[5], base = h[6];
    LADDER[stars].forEach(function (t, ti) {
      var price = roundTo(base * t.factor, 100);
      var amenities = ['wifi'];
      if (t.breakfast) amenities.push('breakfast');
      hotelAmenities.forEach(function (a) { amenities.push(a); });
      var pool = t.type === 'Suite' ? PHOTOS.suite : PHOTOS.room;
      ROOMS.push({
        id: slug(name) + '-' + slug(t.type) + (ti === 2 && stars === 3 ? '-twin' : ''),
        hotel: name,
        stars: stars,
        city: city,
        area: area,
        address: address,
        type: t.type,
        bed: t.bed,
        guests: t.guests,
        size: t.size,
        price: price,
        taxes: String(gstFor(price)),
        freeCancellation: t.freeCancellation,
        amenities: amenities,
        available: true,
        images: [
          pool[(hi + ti) % pool.length],
          PHOTOS.room[(hi * 2 + ti + 3) % PHOTOS.room.length],
          PHOTOS.hotel[(hi + ti) % PHOTOS.hotel.length]
        ]
      });
    });
  });

  var CITIES = ['Delhi', 'Noida', 'Ghaziabad'];

  // Default order: one room per hotel at a time, alternating cities, so the
  // first screen shows a mix of hotels and locations.
  (function interleave() {
    var queues = CITIES.map(function (c) {
      return ROOMS.filter(function (r) { return r.city === c; })
        .map(function (r, i) { return { r: r, tier: i % 3 }; }) // each hotel has 3 rooms in a row
        .sort(function (a, b) { return a.tier - b.tier; })
        .map(function (x) { return x.r; });
    });
    var ordered = [];
    while (queues.some(function (q) { return q.length; })) {
      queues.forEach(function (q) { if (q.length) ordered.push(q.shift()); });
    }
    ROOMS.length = 0;
    Array.prototype.push.apply(ROOMS, ordered);
  })();

  var ROOM_TYPES = ['Standard', 'Deluxe', 'Executive', 'Suite'];

  var AMENITIES = {
    wifi: 'Free Wi-Fi',
    breakfast: 'Breakfast included',
    pool: 'Swimming pool',
    parking: 'Free parking'
  };

  var COUPONS = {
    WELCOME500: { code: 'WELCOME500', amount: 500, label: '₹500 off your first booking' }
  };

  var api = { ROOMS: ROOMS, HOTELS_COUNT: HOTELS.length, CITIES: CITIES, ROOM_TYPES: ROOM_TYPES, AMENITIES: AMENITIES, COUPONS: COUPONS };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MyShelterData = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
