/* OneFit Connect prototype: shared data layer.
   The "Shared DB" is localStorage; the "Booking API" is the OF.api object.
   Every API call validates, writes, and appends a data-feed event, so the
   Member, Staff and Manager screens all read the same live records. */
(function () {
  'use strict';

  var KEY = 'onefit_connect_db_v1';
  var LOCS = {
    LOC01: { code: 'LOC01', name: 'Location 1' },
    LOC02: { code: 'LOC02', name: 'Location 2' },
    LOC03: { code: 'LOC03', name: 'Location 3' }
  };
  var LOC_KEYS = ['LOC01', 'LOC02', 'LOC03'];
  // Capacities match the dataset generator
  var CLASSES = {
    Spin: { cap: 20, color: '#2F80ED' }, HIIT: { cap: 24, color: '#E5484D' },
    Strength: { cap: 24, color: '#0B2E6B' }, Pilates: { cap: 28, color: '#7C5CD6' },
    Yoga: { cap: 36, color: '#12A594' }, Zumba: { cap: 36, color: '#E08A00' }
  };
  var CLASS_KEYS = ['Spin', 'HIIT', 'Strength', 'Pilates', 'Yoga', 'Zumba'];
  var SLOTS = { EM: '06:00', MID: '12:00', AFT: '15:30', EVE: '18:00', WKM: '09:00', WKA: '11:30' };
  var INSTR = {
    LOC01: ['Dana R.', 'Eli M.', 'Priya S.', 'Jon K.', 'Tess W.'],
    LOC02: ['Omar H.', 'Lena B.', 'Chris D.', 'Mia T.', 'Raj P.'],
    LOC03: ['Nora F.', 'Ben A.', 'Zoe L.', 'Hugo V.', 'Ana C.']
  };
  var MIX = {
    LOC01: [1.2, 1.2, 0.8, 0.9, 0.9, 0.63], LOC02: [1, 1, 0.88, 1.08, 1, 0.63],
    LOC03: [0.8, 0.9, 0.72, 0.9, 1.3, 0.98]
  };
  var CONF = ['booked', 'attended', 'noshow'];           // statuses that hold a seat
  var ACTIVE = ['booked', 'attended', 'noshow', 'waitlist'];
  var FIRST = ['Aisha', 'Marcus', 'Sofia', 'Liam', 'Noah', 'Emma', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Zara', 'Omar',
    'Priya', 'Diego', 'Hana', 'Kofi', 'Luna', 'Felix', 'Maya', 'Arjun', 'Isla', 'Theo', 'Nia', 'Caleb'];
  var LAST = ['Khan', 'Lee', 'Reyes', 'Patel', 'Brooks', 'Nguyen', 'Silva', 'Cohen', 'Okafor', 'Murphy', 'Tanaka', 'Rossi'];

  // ---------- helpers ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOf(c) { var p = c.date.split('-'), t = SLOTS[c.slot].split(':'); return new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]); }
  function fmtTime(hhmm) { var t = hhmm.split(':'), h = +t[0]; return ((h + 11) % 12 + 1) + ':' + t[1] + (h < 12 ? ' AM' : ' PM'); }
  function daysBetween(a, b) { return Math.round((parseYmd(ymd(b)) - parseYmd(ymd(a))) / 86400000); }

  // ---------- seed ----------
  function seed() {
    var today = new Date(), todayS = ymd(today), now = today.getTime();
    var db = { v: 1, seededOn: todayS, counter: 1000, members: [], classes: [], bookings: [], events: [],
      stats: { errorsPrevented: 0, duplicatesBlocked: 0, conflictsBlocked: 0, outreachSent: 0, waitlistPromoted: 0 },
      nodes: { 'Member App': 0, 'Staff App': 0, 'Booking API': 0, 'Shared DB': 0, 'Churn Engine': 0, 'Manager Dashboard': 0, 'Messaging': 0 },
      lastFlow: [] };
    var rng = mulberry32(hash('onefit' + todayS));

    // members
    for (var i = 0; i < 48; i++) {
      var name = FIRST[i % 24] + ' ' + LAST[(i * 7 + Math.floor(i / 24) * 3) % 12];
      var home = LOC_KEYS[i % 3];
      var kind = (i % 6 === 1 || i === 2) ? 'declining' : (i % 11 === 4 ? 'lapsed' : (i % 5 === 2 ? 'casual' : 'regular'));
      if (i === 0) kind = 'regular'; if (i === 1) kind = 'casual';
      var ri = function (a, b) { return a + Math.floor(rng() * (b - a + 1)); };
      var m = { id: 'M' + pad3(i + 1), name: name, home: home, plan: 'Chain Membership', kind: kind, outreachTs: null, remind: true };
      if (i === 0) { m.name = 'Aisha Khan'; m.home = 'LOC02'; }
      if (i === 1) { m.name = 'Marcus Lee'; m.home = 'LOC01'; }
      if (i === 2) { m.name = 'Sofia Reyes'; m.home = 'LOC03'; }
      if (kind === 'regular') { m.lastAgo = ri(0, 3); m.v30 = ri(8, 12); m.vPrev = ri(8, 12); m.cancel30 = ri(0, 1); m.rating = 4.5 + rng() * 0.4; }
      if (kind === 'casual') { m.lastAgo = ri(2, 9); m.v30 = ri(3, 5); m.vPrev = ri(3, 5); m.cancel30 = ri(0, 1); m.rating = 4.2 + rng() * 0.4; }
      if (kind === 'declining') { m.lastAgo = ri(12, 24); m.v30 = ri(1, 3); m.vPrev = ri(8, 10); m.cancel30 = ri(2, 4); m.rating = 3.6 + rng() * 0.6; }
      if (kind === 'lapsed') { m.lastAgo = ri(26, 40); m.v30 = ri(0, 1); m.vPrev = ri(5, 7); m.cancel30 = ri(1, 3); m.rating = 3.8 + rng() * 0.5; }
      m.lastVisit = ymd(addDays(today, -m.lastAgo)); delete m.lastAgo;
      m.rating = Math.round(m.rating * 100) / 100; m.ratingN = 8;
      db.members.push(m);
    }

    // classes for the next 7 days
    var mixSum = {}; LOC_KEYS.forEach(function (l) { mixSum[l] = MIX[l].reduce(function (a, b) { return a + b; }, 0); });
    function pickType(loc) {
      var r = rng() * mixSum[loc], acc = 0;
      for (var k = 0; k < 6; k++) { acc += MIX[loc][k]; if (r <= acc) return CLASS_KEYS[k]; }
      return 'Yoga';
    }
    for (var d = 0; d < 7; d++) {
      var date = addDays(today, d), dow = date.getDay(), weekend = (dow === 0 || dow === 6), ds = ymd(date);
      LOC_KEYS.forEach(function (loc) {
        var slots = weekend ? ['WKM', 'WKA'] : ['EM', 'MID', 'EVE'];
        if (!weekend && rng() < 0.5) slots.push('AFT');
        if (!weekend && rng() < 0.6) slots.push('EVE');
        var seen = {};
        slots.forEach(function (slot) {
          seen[slot] = (seen[slot] || 0) + 1;
          var type = pickType(loc), pool = INSTR[loc];
          db.classes.push({ id: ds + '-' + loc + '-' + slot + (seen[slot] > 1 ? '-2' : ''), date: ds, loc: loc, slot: slot, type: type,
            cap: CLASSES[type].cap, instructor: pool[Math.floor(rng() * pool.length)] });
        });
      });
    }
    db.classes.sort(function (a, b) { return startOf(a) - startOf(b) || (a.loc < b.loc ? -1 : 1); });

    // bookings
    var memberSlot = {}, memberCount = {};   // memberSlot: memberId -> {date|slot: true}
    function fillFactor(c) {
      if (c.slot === 'WKM' || c.slot === 'WKA') return 0.5 + rng() * 0.4;
      if (c.slot === 'EVE') return 0.65 + rng() * 0.42;
      if (c.slot === 'EM') return 0.35 + rng() * 0.35;
      if (c.slot === 'MID') return 0.3 + rng() * 0.3;
      return 0.25 + rng() * 0.25;
    }
    function newBooking(memberId, c, status) {
      var m = db.members.filter(function (x) { return x.id === memberId; })[0];
      return { id: 'B' + (++db.counter), memberId: memberId, classId: c.id, status: status, ts: now - Math.floor(rng() * 3 * 86400000),
        cross: m.home !== c.loc, rating: null };
    }
    db.classes.forEach(function (c) {
      var target = Math.min(c.cap, Math.round(c.cap * fillFactor(c)));
      var inClass = {}, tries = 0, added = 0, started = startOf(c).getTime() < now;
      while (added < target && tries < 400) {
        tries++;
        var m = db.members[Math.floor(rng() * db.members.length)];
        if (inClass[m.id]) continue;
        if (m.id <= 'M003' && (memberCount[m.id] || 0) >= 2) continue;   // keep the demo members mostly free to book
        if (m.home !== c.loc && rng() < 0.7) continue;           // most members book their home gym
        var key = c.date + '|' + c.slot;
        memberSlot[m.id] = memberSlot[m.id] || {};
        if (memberSlot[m.id][key]) continue;
        memberSlot[m.id][key] = true; inClass[m.id] = true; memberCount[m.id] = (memberCount[m.id] || 0) + 1;
        var st = 'booked';
        if (started) { var r = rng(); st = r < 0.84 ? 'attended' : (r < 0.92 ? 'noshow' : 'booked'); }
        db.bookings.push(newBooking(m.id, c, st)); added++;
      }
      if (added >= c.cap && !started) {     // full class: add a short waitlist
        var w = 1 + Math.floor(rng() * 3), wt = 0;
        while (w > 0 && wt < 200) {
          wt++;
          var mm = db.members[Math.floor(rng() * db.members.length)];
          if (inClass[mm.id]) continue;
          var k2 = c.date + '|' + c.slot; memberSlot[mm.id] = memberSlot[mm.id] || {};
          if (memberSlot[mm.id][k2]) continue;
          inClass[mm.id] = true; db.bookings.push(newBooking(mm.id, c, 'waitlist')); w--;
        }
      }
    });
    return db;
  }
  function pad3(n) { return (n < 10 ? '00' : n < 100 ? '0' : '') + n; }

  // ---------- storage ----------
  var db = null;
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.v === 1 && o.seededOn === ymd(new Date())) return o; } } catch (e) { }
    return null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  function init() { db = load(); if (!db) { db = seed(); save(); } }
  function reload() { var o = load(); if (o) db = o; }
  init();

  // ---------- queries ----------
  function member(id) { return db.members.filter(function (m) { return m.id === id; })[0]; }
  function cls(id) { return db.classes.filter(function (c) { return c.id === id; })[0]; }
  function classBookings(classId, statuses) { return db.bookings.filter(function (b) { return b.classId === classId && (statuses || CONF).indexOf(b.status) > -1; }); }
  function seatsTaken(classId) { return classBookings(classId, CONF).length; }
  function memberBookings(memberId) { return db.bookings.filter(function (b) { return b.memberId === memberId && b.status !== 'cancelled'; }); }
  function activeBooking(memberId, classId) { return db.bookings.filter(function (b) { return b.memberId === memberId && b.classId === classId && ACTIVE.indexOf(b.status) > -1; })[0]; }
  function conflictFor(memberId, c) {
    return db.bookings.filter(function (b) {
      if (b.memberId !== memberId || ACTIVE.indexOf(b.status) < 0 || b.status === 'waitlist') return false;
      var o = cls(b.classId); return o && o.date === c.date && o.slot === c.slot && o.id !== c.id;
    })[0];
  }

  // ---------- churn engine (rule-based score, explainable) ----------
  function risk(m) {
    var today = new Date(), since = daysBetween(parseYmd(m.lastVisit), today), score = 0, why = [];
    if (since >= 21) { score += 40; why.push(since + ' days since last visit'); }
    else if (since >= 14) { score += 25; why.push(since + ' days since last visit'); }
    else if (since >= 10) { score += 10; why.push(since + ' days since last visit'); }
    if (m.vPrev >= 4 && m.v30 <= m.vPrev * 0.5) { score += 25; why.push('Visits down ' + Math.round((1 - m.v30 / m.vPrev) * 100) + '% vs prior 30 days'); }
    else if (m.v30 < m.vPrev) { score += 10; why.push('Visits trending down'); }
    if (m.cancel30 >= 3) { score += 15; why.push(m.cancel30 + ' cancellations in 30 days'); }
    else if (m.cancel30 >= 2) { score += 8; why.push(m.cancel30 + ' cancellations in 30 days'); }
    if (m.rating < 4.0) { score += 15; why.push('Avg rating ' + m.rating.toFixed(1)); }
    else if (m.rating < 4.3) { score += 7; why.push('Avg rating ' + m.rating.toFixed(1)); }
    score = Math.min(100, score);
    var level = score >= 60 ? 'High' : (score >= 35 ? 'Medium' : 'Low');
    var contacted = m.outreachTs && (Date.now() - m.outreachTs) < 7 * 86400000;
    return { score: score, level: level, why: why, since: since, contacted: !!contacted };
  }

  // ---------- events ----------
  function log(actor, endpoint, summary, flow, level) {
    db.events.unshift({ ts: Date.now(), actor: actor, endpoint: endpoint, summary: summary, flow: flow, level: level || 'ok' });
    if (db.events.length > 120) db.events.length = 120;
    flow.forEach(function (n) { db.nodes[n] = (db.nodes[n] || 0) + 1; });
    db.lastFlow = flow;
  }
  function res(ok, code, message, extra) { var r = { ok: ok, code: code, message: message }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }

  // ---------- Booking API ----------
  var api = {
    book: function (memberId, classId, actor) {
      actor = actor || 'Member App';
      var m = member(memberId), c = cls(classId);
      if (!m || !c) return res(false, 'NOT_FOUND', 'Member or class not found.');
      if (startOf(c) < new Date()) return res(false, 'STARTED', 'This class has already started.');
      if (activeBooking(memberId, classId)) {
        db.stats.duplicatesBlocked++; db.stats.errorsPrevented++;
        log(actor, 'POST /bookings', m.name + ' tried to book ' + c.type + ' twice: duplicate blocked', [actor, 'Booking API'], 'warn'); save();
        return res(false, 'DUPLICATE', 'Duplicate booking blocked. This was a common record error in the old tools.');
      }
      var conf = conflictFor(memberId, c);
      if (conf) {
        db.stats.conflictsBlocked++; db.stats.errorsPrevented++;
        log(actor, 'POST /bookings', m.name + ' double-booked a time slot: conflict blocked', [actor, 'Booking API'], 'warn'); save();
        return res(false, 'CONFLICT', 'You already have a class in this time slot at ' + LOCS[cls(conf.classId).loc].name + '.');
      }
      if (seatsTaken(classId) >= c.cap) {
        log(actor, 'POST /bookings', c.type + ' at ' + LOCS[c.loc].name + ' is full', [actor, 'Booking API'], 'warn'); save();
        return res(false, 'FULL', 'This class is full. You can join the waitlist.');
      }
      var b = { id: 'B' + (++db.counter), memberId: memberId, classId: classId, status: 'booked', ts: Date.now(), cross: m.home !== c.loc, rating: null };
      db.bookings.push(b);
      log(actor, 'POST /bookings', m.name + ' booked ' + c.type + ' at ' + LOCS[c.loc].name + (b.cross ? ' (cross-location)' : ''),
        [actor, 'Booking API', 'Shared DB', 'Staff App', 'Manager Dashboard']); save();
      return res(true, 'OK', 'Booked ' + c.type + ' at ' + LOCS[c.loc].name + '.' + (b.cross ? ' Cross-location booking accepted.' : ''), { booking: b });
    },
    waitlist: function (memberId, classId) {
      var m = member(memberId), c = cls(classId);
      if (activeBooking(memberId, classId)) return res(false, 'DUPLICATE', 'You are already on this class.');
      db.bookings.push({ id: 'B' + (++db.counter), memberId: memberId, classId: classId, status: 'waitlist', ts: Date.now(), cross: m.home !== c.loc, rating: null });
      log('Member App', 'POST /waitlist', m.name + ' joined the waitlist for ' + c.type + ' at ' + LOCS[c.loc].name, ['Member App', 'Booking API', 'Shared DB']); save();
      return res(true, 'OK', 'You are on the waitlist. We will book you automatically if a seat opens.');
    },
    cancel: function (bookingId) {
      var b = db.bookings.filter(function (x) { return x.id === bookingId; })[0]; if (!b) return res(false, 'NOT_FOUND', 'Booking not found.');
      var m = member(b.memberId), c = cls(b.classId), wasConf = CONF.indexOf(b.status) > -1;
      b.status = 'cancelled'; m.cancel30 = (m.cancel30 || 0) + 1;
      log('Member App', 'DELETE /bookings/' + b.id, m.name + ' cancelled ' + c.type + ' at ' + LOCS[c.loc].name, ['Member App', 'Booking API', 'Shared DB', 'Churn Engine']);
      var msg = 'Booking cancelled. Your seat is open again.';
      if (wasConf) {
        var next = db.bookings.filter(function (x) { return x.classId === c.id && x.status === 'waitlist'; }).sort(function (a, z) { return a.ts - z.ts; })[0];
        if (next) {
          next.status = 'booked'; db.stats.waitlistPromoted++;
          var nm = member(next.memberId);
          log('Booking API', 'PATCH /waitlist/' + next.id, nm.name + ' moved from waitlist to booked; notification sent', ['Booking API', 'Shared DB', 'Messaging']);
          msg += ' ' + nm.name + ' was moved up from the waitlist automatically.';
        }
      }
      save(); return res(true, 'OK', msg);
    },
    checkIn: function (bookingId) {
      var b = db.bookings.filter(function (x) { return x.id === bookingId; })[0]; if (!b) return res(false, 'NOT_FOUND', 'Booking not found.');
      if (b.status === 'attended') { db.stats.duplicatesBlocked++; db.stats.errorsPrevented++; log('Staff App', 'PATCH /bookings/' + b.id, 'Second check-in blocked', ['Staff App', 'Booking API'], 'warn'); save(); return res(false, 'DUPLICATE', 'Already checked in.'); }
      var m = member(b.memberId), c = cls(b.classId);
      b.status = 'attended'; m.lastVisit = ymd(new Date()); m.v30 = (m.v30 || 0) + 1;
      var before = risk(m);
      log('Staff App', 'PATCH /bookings/' + b.id, m.name + ' checked in to ' + c.type + (b.cross ? ' (visiting from ' + LOCS[m.home].name + ')' : ''),
        ['Staff App', 'Booking API', 'Shared DB', 'Churn Engine', 'Manager Dashboard']); save();
      return res(true, 'OK', m.name + ' checked in. Risk score now ' + before.score + '.');
    },
    noShow: function (bookingId) {
      var b = db.bookings.filter(function (x) { return x.id === bookingId; })[0]; if (!b) return res(false, 'NOT_FOUND', 'Booking not found.');
      var m = member(b.memberId), c = cls(b.classId);
      b.status = 'noshow'; log('Staff App', 'PATCH /bookings/' + b.id, m.name + ' marked no-show for ' + c.type, ['Staff App', 'Booking API', 'Shared DB', 'Churn Engine']); save();
      return res(true, 'OK', m.name + ' marked as no-show.');
    },
    walkIn: function (memberId, classId) {
      var r = api.book(memberId, classId, 'Staff App'); if (!r.ok && r.code !== 'STARTED') return r;
      if (r.code === 'STARTED') {   // allow staff walk-ins on classes in progress
        var m = member(memberId), c = cls(classId);
        if (activeBooking(memberId, classId)) return res(false, 'DUPLICATE', 'Member is already on this class.');
        var b0 = { id: 'B' + (++db.counter), memberId: memberId, classId: classId, status: 'booked', ts: Date.now(), cross: m.home !== c.loc, rating: null };
        db.bookings.push(b0); r = res(true, 'OK', 'Walk-in added.', { booking: b0 });
      }
      var out = api.checkIn(r.booking.id); out.message = 'Walk-in added and checked in. ' + out.message; return out;
    },
    rate: function (bookingId, stars) {
      var b = db.bookings.filter(function (x) { return x.id === bookingId; })[0]; if (!b || b.status !== 'attended') return res(false, 'NOT_ALLOWED', 'Only attended classes can be rated.');
      var m = member(b.memberId), c = cls(b.classId);
      b.rating = stars; m.rating = Math.round(((m.rating * m.ratingN + stars) / (m.ratingN + 1)) * 100) / 100; m.ratingN++;
      log('Member App', 'POST /ratings', m.name + ' rated ' + c.type + ' ' + stars + ' stars', ['Member App', 'Booking API', 'Shared DB', 'Churn Engine']); save();
      return res(true, 'OK', 'Thanks for the rating.');
    },
    outreach: function (memberId, channel) {
      var m = member(memberId); m.outreachTs = Date.now(); db.stats.outreachSent++;
      log('Manager Dashboard', 'POST /outreach', 'Win-back ' + channel + ' sent to ' + m.name, ['Manager Dashboard', 'Messaging', 'Shared DB']); save();
      return res(true, 'OK', 'Win-back ' + channel + ' sent to ' + m.name + '.');
    },
    setReminder: function (memberId, on) {
      var m = member(memberId); m.remind = on;
      log('Member App', 'PATCH /members/' + m.id, m.name + (on ? ' turned reminders on' : ' turned reminders off'), ['Member App', 'Booking API', 'Shared DB']); save();
      return res(true, 'OK', on ? 'Class reminders are on.' : 'Class reminders are off.');
    },
    rush: function (n) {
      var upcoming = db.classes.filter(function (c) { return startOf(c) > new Date(); }), ok = 0, blocked = 0;
      for (var i = 0; i < n; i++) {
        var m, c, tries = 0, wantBad = Math.random() < 0.15;   // ~15% of requests are deliberately bad (duplicates, conflicts)
        do {
          m = db.members[Math.floor(Math.random() * db.members.length)]; c = upcoming[Math.floor(Math.random() * upcoming.length)]; tries++;
        } while (!wantBad && tries < 25 && (activeBooking(m.id, c.id) || conflictFor(m.id, c) || seatsTaken(c.id) >= c.cap));
        var r = api.book(m.id, c.id, 'Member App'); if (r.ok) ok++; else blocked++;
      }
      return res(true, 'OK', 'Simulated ' + n + ' booking requests: ' + ok + ' accepted, ' + blocked + ' blocked by validation or full.');
    },
    reset: function () { db = seed(); save(); return res(true, 'OK', 'Demo data reset.'); }
  };

  window.OF = {
    LOCS: LOCS, LOC_KEYS: LOC_KEYS, CLASSES: CLASSES, SLOTS: SLOTS, CONF: CONF,
    get db() { return db; }, reload: reload, api: api, risk: risk,
    member: member, cls: cls, classBookings: classBookings, seatsTaken: seatsTaken, memberBookings: memberBookings,
    activeBooking: activeBooking, startOf: startOf, fmtTime: fmtTime, ymd: ymd, parseYmd: parseYmd, addDays: addDays, daysBetween: daysBetween
  };
})();
