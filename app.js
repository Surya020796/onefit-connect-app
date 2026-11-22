/* OneFit Connect prototype: screens and interactions (no framework, no build step). */
(function () {
  'use strict';
  var app = document.getElementById('app'), layer = document.getElementById('layer');
  var CFG = window.ONEFIT_CONFIG || {};
  var ui = { loc: 'ALL', day: 0, type: 'ALL', sday: 0, rLevel: 'ALL', rLoc: 'ALL', sFilter: 'ALL', feed: false, modal: null, toast: null, auth: 'login', lu: '', su: { first: '', last: '', email: '', phone: '', home: '' }, plan: 'Standard', pay: { method: 'card', num: '', exp: '', cvv: '', zip: '' }, hTab: 'week', mp: '', sq: '', lr: '', mLoc: 'ALL', mDay: 0, nc: { loc: 'LOC01', day: 0, slot: 'EM', type: 'Yoga' } };
  var session = rd('of_session'), tour = rd('of_tour') || { on: false, i: 0 };
  function rd(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function wr(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function setSession(s) { session = s; wr('of_session', s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DB = function () { return OF.db; };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dayLabel(n) { var d = OF.addDays(new Date(), n); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : DAYS[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate(); }
  function dAgo(n) { return n === 0 ? 'Today' : n === 1 ? '1 day ago' : n + ' days ago'; }
  function tm(c) { return OF.fmtTime(OF.SLOTS[c.slot]); }
  function first(n) { return n.split(' ')[0]; }
  function ago(ts) { var s = Math.round((Date.now() - ts) / 1000); if (s < 5) return 'now'; if (s < 60) return s + 's'; if (s < 3600) return Math.round(s / 60) + 'm'; return Math.round(s / 3600) + 'h'; }
  function lvlChip(r) { return '<span class="chip ' + (r.level === 'High' ? 'red' : r.level === 'Medium' ? 'amber' : 'green') + '">' + r.level + '</span>'; }

  // ---------- navigation and shell ----------
  var NAV = {
    member: [['home', 'Home'], ['classes', 'Book a class'], ['bookings', 'My bookings'], ['inbox', 'Inbox'], ['activity', 'My activity'], ['profile', 'Profile']],
    staff: [['roster', 'Class roster'], ['members', 'Members']],
    manager: [['overview', 'Overview'], ['schedule', 'Schedule'], ['risk', 'Churn risk'], ['flow', 'Data flow']]
  };
  var TOUR = {
    member: [
      ['member/home', 'Your membership works everywhere', 'One membership books classes at all three locations.'],
      ['member/classes', 'Find and book a class', 'Filter by location, day and type. Seats update for everyone the moment you book. Press Book on any class.'],
      ['member/classes', 'Try to double-book', 'Press Book on the same class again. The system blocks the duplicate booking.'],
      ['member/bookings', 'Manage your bookings', 'Cancel, show your check-in code, and rate classes you attended. Reminders reduce no-shows.'],
      ['member/inbox', 'Your inbox', 'Booking confirmations, waitlist updates and messages from the front desk arrive here.'],
      ['member/activity', 'Track your progress', 'See your weekly attendance, favorite classes and which locations you have used.'],
      ['member/profile', 'Your plan and profile', 'Change your plan or home location. Open the Data feed button (bottom right) to see each API call and where the data went.']
    ],
    staff: [
      ['staff/roster', 'One roster for your location', 'Every booking from every app lands here, including members visiting from other locations.'],
      ['staff/roster', 'Check members in', 'Press Check in. This replaces the manual sign-in sheet and updates the member record instantly.'],
      ['staff/roster', 'Add a walk-in', 'Pick a member in a class panel and press Add walk-in. The booking and check-in are written together.'],
      ['staff/members', 'Add a new member', 'Press Add new member to sign someone up. Then use Send message on members who have not visited in a while.']
    ],
    manager: [
      ['manager/overview', 'Live KPIs for all locations', 'Off-peak utilization, seat utilization and at-risk members are calculated from the same shared records.'],
      ['manager/schedule', 'Manage the schedule', 'Add an off-peak class or cancel one. Members who booked it are notified automatically.'],
      ['manager/risk', 'Catch churn early', 'The graphs show how many members are at high, medium or low risk and where. Staff send the win-back messages.'],
      ['manager/flow', 'How the data moves', 'See the pipeline and the live event log of every API call.'],
      ['manager/overview', 'Try the rush simulator', 'Press Simulate rush and watch utilization and the data feed change.']
    ]
  };

  var BANNER = { member: ['staff.jpg', 'center 62%'], staff: ['hero.jpg', 'center 55%'], manager: ['hero.jpg', 'center 22%'] };
  function go(hash) { if (location.hash === '#/' + hash) render(); else location.hash = '#/' + hash; }
  function shell(role, tab, body) {
    var d = DB(), who, sub;
    if (role === 'member') { var m = OF.member(session.memberId); who = m.name; sub = 'Member · home ' + OF.LOCS[m.home].name; }
    else if (role === 'staff') { who = 'Front desk'; sub = OF.LOCS[session.loc].name + ' · ' + session.loc; }
    else { who = 'Manager'; sub = 'All 3 locations'; }
    var nav = NAV[role].map(function (n) { return '<a href="#/' + role + '/' + n[0] + '" class="' + (n[0] === tab ? 'on' : '') + '">' + n[1] + (role === 'member' && n[0] === 'inbox' && unread(session.memberId) ? ' <span class="badge">' + unread(session.memberId) + '</span>' : '') + '</a>'; }).join('');
    var ev = d.events.slice(0, 40).map(function (e) {
      return '<div class="e"><span class="muted small">' + ago(e.ts) + '</span><div><code>' + esc(e.endpoint) + '</code><div class="' + (e.level === 'warn' ? 'w' : '') + '">' + esc(e.summary) + '</div>' +
        '<div class="muted small">' + e.flow.join(' → ') + '</div></div></div>';
    }).join('') || '<p class="muted">Nothing yet. Book a class or check someone in to see data move through the system.</p>';
    var t = '';
    if (tour.on && TOUR[role]) {
      var st = TOUR[role][tour.i], total = TOUR[role].length;
      t = '<div class="tour"><span class="chip amber">Guided tour · step ' + (tour.i + 1) + ' of ' + total + '</span><h4>' + st[1] + '</h4><p>' + st[2] + '</p><div class="row between">' +
        '<button class="btn sec sm" data-act="tour-end">End tour</button><div class="row">' +
        (tour.i > 0 ? '<button class="btn sec sm" data-act="tour-prev">Back</button>' : '') +
        '<button class="btn sm" data-act="tour-next">' + (tour.i === total - 1 ? 'Finish' : 'Next') + '</button></div></div></div>';
    }
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><span class="pill">' + role.charAt(0).toUpperCase() + role.slice(1) + '</span><div class="sp"></div>' +
      '<div class="who"><b>' + esc(who) + '</b>' + esc(sub) + '</div>' +
      '<button class="hbtn" data-act="tour-start">Tour</button><a class="hbtn" href="#/tutorial" style="text-decoration:none">Tutorial</a><button class="hbtn" data-act="logout">Switch role</button></header>' +
      '<nav class="nav">' + nav + '</nav><main>' + (tab === NAV[role][0][0] && role !== 'member' ? '<div class="banner" style="background-image:url(' + BANNER[role][0] + ');background-position:' + BANNER[role][1] + '"></div>' : '') + body + '</main>' +
      '<div class="foot">OneFit Connect prototype · Team 4 · Saint Louis University. Demo data is synthetic and stored only in this browser.</div>' +
      '<button class="fab" data-act="feed-toggle">Data feed<b>' + d.events.length + '</b></button>' +
      '<aside class="drawer ' + (ui.feed ? 'open' : '') + '"><header><h3>Live data feed</h3><button class="btn sec sm" data-act="feed-toggle">Close</button></header><div class="body ev">' + ev + '</div></aside>' + t;
  }

  // ---------- landing ----------
  function landing() {
    var lopts = OF.LOC_KEYS.map(function (l) { return '<option value="' + l + '">' + OF.LOCS[l].name + ' (' + l + ')</option>'; }).join('');
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><div class="sp"></div><a class="hbtn" href="#/tutorial" style="text-decoration:none">Tutorial</a></header><main>' +
      '<section class="hero slim"><h1>One membership. Three locations.</h1><p>Choose how you want to enter.</p></section>' +
      '<div class="grid g3">' +
      '<div class="card role"><div class="rimg" style="background-image:url(member.jpg)"></div><h3>Member</h3><p class="muted small" style="margin:0">Log in to book and manage classes, or join and pick a plan.</p>' +
      '<div style="flex:1"></div><button class="btn" data-act="go-login">Member login</button>' +
      '<button class="btn sec" data-act="go-signup">New here? Create an account</button></div>' +
      '<div class="card role"><div class="rimg" style="background-image:url(staff.jpg)"></div><h3>Front-desk staff</h3><p class="muted small" style="margin:0">Check members in, add members, send messages.</p>' +
      '<select id="loginLoc">' + lopts + '</select><button class="btn" data-act="login-staff">Enter as staff</button></div>' +
      '<div class="card role"><div class="rimg" style="background-image:url(hero.jpg);background-position:80% 50%"></div><h3>Manager</h3><p class="muted small" style="margin:0">See utilization and churn risk across locations.</p>' +
      '<div style="flex:1"></div><button class="btn" data-act="login-manager">Enter as manager</button></div></div></main>' +
      '<div class="foot">Team 4: Sree Kavya, Siddhartha, Surya Sundar, Krishna Vamsi · Saint Louis University, Information Systems.</div>';
  }
  function tourCardLanding() { return ''; }

  // ---------- tutorial ----------
  function tutorial() {
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><div class="sp"></div><a class="hbtn" href="#/landing" style="text-decoration:none">Back to prototype</a></header><main>' +
      '<div class="pagehead"><h1>Tutorial: how to try OneFit Connect</h1><p>About 3 minutes. No login or password is needed.</p></div>' +
      '<div class="card"><h3>Quick demo path</h3><ol class="steps">' +
      '<li><b>Member:</b> press <i>Member login</i> and enter the username <b>M001</b> (Aisha Khan, no password needed). Or press <i>Create an account</i>, choose a plan and pay with the demo card to join as a new member. Then open <i>Book a class</i>, filter to another location and press <b>Book</b>.</li>' +
      '<li><b>Member:</b> press <b>Book</b> on the same class again. The duplicate booking is blocked.</li>' +
      '<li><b>Staff:</b> switch role, enter as staff for the class location. The new booking is on the roster. Press <b>Check in</b>.</li>' +
      '<li><b>Staff:</b> open <i>Members</i>, press <b>Add new member</b>, then press <b>Send message</b> on a member who has not visited in a while.</li>' +
      '<li><b>Manager:</b> switch role, open <i>Overview</i> to see off-peak utilization and the live KPIs, then <i>Churn risk</i> to see the graphs.</li>' +
      '<li><b>Anyone:</b> press <b>Data feed</b> (bottom right) or open <i>Data flow</i> to see each API call and where the data went.</li></ol></div>' +
      '<div class="grid g3" style="margin-top:14px">' +
      '<div class="card"><h3>Member screens</h3><p class="small muted" style="margin:0">Home: weekly progress, recommended classes and your plan. Book a class: filters, live seats, book or waitlist. My bookings: cancel, check-in code, ratings. Inbox: confirmations and messages from staff. My activity and Profile: history, plan, home location and cancelling a membership. Class Details has Add to calendar.</p></div>' +
      '<div class="card"><h3>Staff screens</h3><p class="small muted" style="margin:0">Class roster: check in, mark no-show, add walk-ins. Members: search, view a member profile, add a new member, reactivate a cancelled one, and send SMS or email to members who stopped coming (it arrives in the member Inbox).</p></div>' +
      '<div class="card"><h3>Manager screens</h3><p class="small muted" style="margin:0">Overview KPIs with CSV exports, Schedule (add or cancel classes), churn-risk graphs with cancellation reasons by level and location, and the data-flow pipeline with event log.</p></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Data integration logic</h3><div class="tablewrap"><table><tr><th>Step</th><th>What happens</th><th>Where you see it</th></tr>' +
      '<tr><td><b>Entered</b></td><td>New members and plan payments, bookings, cancellations, check-ins, ratings, win-back messages</td><td>Member and staff screens</td></tr>' +
      '<tr><td><b>Validated</b></td><td>Duplicate, time-conflict and full-class rules run in the Booking API before anything is saved</td><td>Warning messages when a booking is blocked</td></tr>' +
      '<tr><td><b>Stored</b></td><td>One Shared DB for all three locations (this demo uses browser storage)</td><td>Every screen reads the same records</td></tr>' +
      '<tr><td><b>Processed</b></td><td>Waitlist promotion and the churn engine, which re-scores a member after every visit, cancellation or rating</td><td>Churn risk graphs, Data flow</td></tr>' +
      '<tr><td><b>Retrieved</b></td><td>Class availability, rosters, KPIs and risk lists are queried live from the Shared DB</td><td>Find a class, Roster, Overview</td></tr></table></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Notes</h3><p class="small muted" style="margin:0">This is a prototype. Data is synthetic and stays in your browser (use <i>Reset demo data</i> on the Data flow screen to start over). Messaging, payments (the Payment Gateway step) and real authentication are represented by the API log, not connected to live services.</p></div></main>';
  }

  // ---------- member ----------
  // ---------- member helpers (history is demo data built from each member's visit counts) ----------
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DOWN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var GOAL = 4, MINS = 45, CAL_PER_MIN = 6;
  function ic(n) {
    var P = { cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>', check: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 14l3 3 5-6M8 3v4M16 3v4"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14.5L7 21l5-3 5 3-1.5-6.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 013-2z"/>' };
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[n] + '</svg>';
  }
  function planOf(m) { return OF.PLANS[m.plan] || OF.PLANS.Standard; }
  function fmtDate(d) { return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function nextBill(m) { var t = new Date(), day = (parseInt(m.id.slice(1), 10) * 7) % 27 + 1, n = new Date(t.getFullYear(), t.getMonth(), day); if (n <= t) n = new Date(t.getFullYear(), t.getMonth() + 1, day); return n; }
  function hashS(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hist(m) {   // attended classes in the last 30 days, newest first
    var today = new Date(), real = [], keys = {};
    OF.memberBookings(m.id).forEach(function (b) {
      var c = OF.cls(b.classId); if (b.status !== 'attended' || !c) return;
      var age = OF.daysBetween(OF.parseYmd(c.date), today); if (age < 0 || age > 29) return;
      real.push({ key: c.date, type: c.type, loc: c.loc, rating: b.rating, real: true }); keys[c.date] = true;
    });
    var need = Math.max(0, (m.v30 || 0) - real.length), r = prng(hashS(m.id + OF.ymd(today))), last = OF.parseYmd(m.lastVisit), out = real.slice(), types = Object.keys(OF.CLASSES), cand = [];
    for (var k = 0; k < 30; k++) { var d = OF.addDays(today, -k); if (d <= last && !keys[OF.ymd(d)]) cand.push(d); }
    var pick = [];
    if (cand.length && OF.daysBetween(last, today) < 30 && !keys[OF.ymd(last)]) { pick.push(cand.filter(function (d) { return OF.ymd(d) === OF.ymd(last); })[0]); }
    pick = pick.filter(Boolean);
    var rest = cand.filter(function (d) { return pick.indexOf(d) < 0; }).sort(function () { return r() - 0.5; });
    while (pick.length < need && rest.length) pick.push(rest.shift());
    pick.slice(0, need).forEach(function (d) {
      var loc = r() < 0.72 ? m.home : OF.LOC_KEYS[Math.floor(r() * 3)];
      out.push({ key: OF.ymd(d), type: types[Math.floor(r() * types.length)], loc: loc, rating: r() < 0.6 ? 4 + Math.round(r()) : null, real: false });
    });
    return out.sort(function (a, z) { return a.key < z.key ? 1 : -1; });
  }
  function weekRange(off) { var t = new Date(), dow = (t.getDay() + 6) % 7, st = OF.addDays(t, -dow + off * 7); return st; }
  function countIn(h, from, days) { var a = OF.ymd(from), b = OF.ymd(OF.addDays(from, days - 1)); return h.filter(function (x) { return x.key >= a && x.key <= b; }).length; }
  function ring(pct) { var c = 2 * Math.PI * 34, o = c * (1 - pct / 100); return '<svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="#e6eef9" stroke-width="9"/><circle cx="42" cy="42" r="34" fill="none" stroke="#2F80ED" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + o.toFixed(1) + '" transform="rotate(-90 42 42)"/><text x="42" y="48" text-anchor="middle" font-size="18" font-weight="800" fill="#0B2E6B">' + pct + '%</text></svg>'; }
  function recommended(m) {
    var now = new Date(), h = hist(m), cnt = {}; h.forEach(function (x) { cnt[x.type] = (cnt[x.type] || 0) + 1; });
    var fav = Object.keys(cnt).sort(function (a, z) { return cnt[z] - cnt[a]; })[0];
    return DB().classes.filter(function (c) { return OF.startOf(c) > now && OF.seatsTaken(c.id) < c.cap && !OF.activeBooking(m.id, c.id); })
      .map(function (c) { return { c: c, sc: (c.type === fav ? 2 : 0) + (c.loc === m.home ? 1 : 0) }; })
      .sort(function (a, z) { return z.sc - a.sc || OF.startOf(a.c) - OF.startOf(z.c); }).slice(0, 3).map(function (x) { return x.c; });
  }
  function clsImg(t) { return 'cls_' + t.toLowerCase() + '.jpg'; }
  function usedThisMonth(m) {
    var ym = OF.ymd(new Date()).slice(0, 7); return DB().bookings.filter(function (x) { var o = OF.cls(x.classId); return x.memberId === m.id && OF.CONF.indexOf(x.status) > -1 && o && o.date.slice(0, 7) === ym; }).length;
  }
  function planLine(m) { var p = planOf(m); return p.limit ? usedThisMonth(m) + ' of ' + p.limit + ' classes used this month' : 'Unlimited classes'; }

  // ---------- member ----------
  function memberHome() {
    var m = OF.member(session.memberId), now = new Date(), h = hist(m), p = planOf(m);
    var ups = OF.memberBookings(m.id).filter(function (b) { var c = OF.cls(b.classId); return b.status === 'booked' && OF.startOf(c) >= now; });
    var ws = weekRange(0), thisW = countIn(h, ws, 7), lastW = countIn(h, weekRange(-1), 7), a30 = h.length;
    var glance = DOWN.map(function (d, i) {
      var dt = OF.addDays(ws, i), on = h.some(function (x) { return x.key === OF.ymd(dt); }), fut = dt > now && OF.ymd(dt) !== OF.ymd(now);
      return '<div class="dayc"><span class="cir ' + (on ? 'on' : fut ? 'fut' : '') + '">' + (on ? '✓' : '') + '</span><small>' + d + '</small></div>';
    }).join('');
    var goalPct = Math.min(100, Math.round(thisW / GOAL * 100));
    var tab = ui.hTab, cls_ = tab === 'week' ? thisW : a30, cmp = tab === 'week' ? lastW : (m.vPrev || 0), gp = tab === 'week' ? goalPct : Math.min(100, Math.round(a30 / (GOAL * 4) * 100));
    var vs = cmp > 0 ? (Math.round((cls_ - cmp) / cmp * 100) >= 0 ? '+' : '') + Math.round((cls_ - cmp) / cmp * 100) + '%' : (cls_ > 0 ? 'New' : '0%');
    var mins = cls_ * MINS, cal = Math.round(cls_ * MINS * CAL_PER_MIN / 10) * 10;
    var recs = recommended(m).map(function (c) {
      var di = OF.daysBetween(now, OF.parseYmd(c.date));
      return '<div class="rec"><img src="' + clsImg(c.type) + '" alt=""><div><b>' + c.type + '</b><div class="muted small">' + dayLabel(di) + ', ' + tm(c) + '</div><div class="muted small">' + OF.LOCS[c.loc].name + '</div>' +
        '<button class="btn sec sm" data-act="book" data-c="' + c.id + '">Book</button></div></div>';
    }).join('') || '<p class="muted small">No open classes to recommend right now.</p>';
    return '<section class="mhero"><div><h1>Hi, ' + esc(first(m.name)) + '!</h1><p>' + (m.joined === OF.ymd(now) ? 'Welcome to OneFit Connect.' : 'Welcome back to OneFit Connect.') + '</p><p>One membership. Three locations.</p><span class="chip pinchip">' + ic('pin') + 'Home Location: ' + OF.LOCS[m.home].name + '</span></div></section>' +
      (unread(m.id) ? '<a class="unreadbar" href="#/member/inbox">You have ' + unread(m.id) + ' unread message' + (unread(m.id) === 1 ? '' : 's') + '. Open your inbox ›</a>' : '') + '<h2 class="sech">Your overview</h2><div class="grid g4 ovr">' +
      '<div class="card ov b">' + ic('check') + '<div><div class="v">' + a30 + '</div><div class="l">Classes attended (last 30 days)</div></div></div>' +
      '<div class="card ov g">' + ic('cal') + '<div><div class="v">' + ups.length + '</div><div class="l">Upcoming classes</div></div></div>' +
      '<div class="card ov y">' + ic('star') + '<div><div class="v">' + (m.ratingN ? m.rating.toFixed(1) + ' / 5' : 'None yet') + '</div><div class="l">Average class rating</div></div></div>' +
      '<div class="card ov p">' + ic('pin') + '<div><div class="v">3</div><div class="l">Locations access (Location 1, 2 and 3)</div></div></div></div>' +
      '<div class="grid g2" style="margin-top:14px;align-items:start"><div class="stackcol">' +
      '<div class="card"><div class="row between"><h3>' + ic('cal') + ' This week at a glance</h3><a href="#/member/activity" class="small" style="font-weight:700;text-decoration:none">View activity ›</a></div>' +
      '<div class="row between small" style="margin:6px 0 4px"><span>Classes attended: ' + thisW + ' of ' + GOAL + ' goal</span><b>' + thisW + '/' + GOAL + '</b></div><div class="bar"><i style="width:' + goalPct + '%"></i></div><div class="week">' + glance + '</div></div>' +
      '<div class="card"><div class="row between"><h3>' + ic('flame') + ' Recommended for you</h3><a href="#/member/classes" class="small" style="font-weight:700;text-decoration:none">View all ›</a></div><p class="muted small" style="margin:0 0 8px">Open classes based on your activity and home location.</p><div class="recs">' + recs + '</div></div></div>' +
      '<div class="stackcol"><div class="card"><div class="row between"><h3>' + ic('trend') + ' Your fitness insights</h3>' + seg('hTab', [['week', 'This week'], ['month', 'This month']], ui.hTab) + '</div>' +
      '<div class="ins"><div class="goal">' + ring(gp) + '<div><b>Goal progress</b><div class="muted small">' + (tab === 'week' ? thisW + ' of ' + GOAL + ' weekly goal' : a30 + ' of ' + GOAL * 4 + ' monthly goal') + '</div></div></div>' +
      '<div class="stat">' + ic('flame') + '<b>' + cal.toLocaleString() + '</b><span class="muted small">Est. calories burned</span></div><div class="stat">' + ic('clock') + '<b>' + mins + ' min</b><span class="muted small">Total workout time</span></div><div class="stat">' + ic('trend') + '<b>' + vs + '</b><span class="muted small">vs. ' + (tab === 'week' ? 'last week' : 'previous 30 days') + '</span></div></div>' +
      '<p class="muted small" style="margin:8px 0 0">Estimates use ' + MINS + ' minutes per class.</p></div>' +
      '<div class="card"><h3>' + ic('award') + ' Membership</h3><div class="memrow"><div><span class="chip blue big">' + p.name + ' Plan</span> <span class="chip green">Active</span><div class="muted small" style="margin-top:8px">' + planLine(m) + ' · All 3 locations</div></div>' +
      '<div class="small"><div>Next billing: <b>' + fmtDate(nextBill(m)) + '</b></div><div>$' + p.price.toFixed(2) + ' / month</div></div><button class="btn sec" data-act="plan-open">Manage plan ›</button></div></div></div></div>';
  }

  function memberActivity() {
    var m = OF.member(session.memberId), h = hist(m), ws = weekRange(0), N = h.length;
    var wk = [3, 2, 1, 0].map(function (k) { var st = weekRange(-k); return { l: k === 0 ? 'This week' : MON[st.getMonth()] + ' ' + st.getDate(), n: countIn(h, st, 7) }; });
    var mx = Math.max.apply(null, wk.map(function (x) { return x.n; }).concat([1]));
    var cols = wk.map(function (x) { return '<div><span style="font-weight:700;color:#0B2E6B">' + x.n + '</span><i style="height:' + Math.max(3, Math.round(x.n / mx * 100)) + '%"></i><span>' + x.l + '</span></div>'; }).join('');
    function tally(f) { var o = {}; h.forEach(function (x) { var k = f(x); o[k] = (o[k] || 0) + 1; }); return Object.keys(o).sort(function (a, z) { return o[z] - o[a]; }).map(function (k) { return [k, o[k]]; }); }
    function bars(arr) { return arr.map(function (x) { return '<div class="r"><span>' + x[0] + '</span><div class="t"><i style="width:' + Math.round(x[1] / Math.max(N, 1) * 100) + '%"></i></div><b>' + x[1] + '</b></div>'; }).join('') || '<p class="muted small">No classes yet.</p>'; }
    var cross = h.filter(function (x) { return x.loc !== m.home; }).length, rated = h.filter(function (x) { return x.rating; });
    var rows = h.slice(0, 12).map(function (x) {
      var dt = OF.parseYmd(x.key);
      return '<tr><td>' + MON[dt.getMonth()] + ' ' + dt.getDate() + '</td><td><b>' + x.type + '</b></td><td>' + OF.LOCS[x.loc].name + (x.loc !== m.home ? ' <span class="chip blue">Cross-location</span>' : '') + '</td><td>' + (x.rating ? '<span style="color:#F5A524">' + '★'.repeat(x.rating) + '</span>' : '<span class="muted small">Not rated</span>') + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">Attended classes will appear here.</td></tr>';
    return pagehead('My activity', 'Your last 30 days: attendance, favorite classes and the locations you use.') +
      '<div class="grid g4" style="margin-bottom:14px">' + kpi(N, 'Classes attended (30 days)') + kpi(cross, 'At other locations') + kpi(m.ratingN ? m.rating.toFixed(1) : 'None yet', 'Average rating') + kpi(m.lastVisit === OF.ymd(new Date()) ? 'Today' : dAgo(OF.daysBetween(OF.parseYmd(m.lastVisit), new Date())), 'Last visit') + '</div>' +
      '<div class="grid g3"><div class="card"><h3>Classes per week</h3><div class="cols">' + cols + '</div></div><div class="card"><h3>By class type</h3><div class="hbars">' + bars(tally(function (x) { return x.type; }).slice(0, 5)) + '</div></div><div class="card"><h3>By location</h3><div class="hbars">' + bars(tally(function (x) { return OF.LOCS[x.loc].name; })) + '</div></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Recent classes</h3><div class="tablewrap"><table><tr><th>Date</th><th>Class</th><th>Location</th><th>Your rating</th></tr>' + rows + '</table></div></div>';
  }

  function memberProfile() {
    var m = OF.member(session.memberId), p = planOf(m), opts = OF.LOC_KEYS.map(function (l) { return '<option value="' + l + '"' + (l === m.home ? ' selected' : '') + '>' + OF.LOCS[l].name + '</option>'; }).join('');
    function row(i, l, v) { return '<div class="prow">' + ic(i) + '<div><div class="muted small">' + l + '</div><b>' + v + '</b></div></div>'; }
    return pagehead('Profile', 'Your account, plan and preferences.') +
      '<div class="grid g2" style="align-items:start"><div class="card"><h3>Account</h3>' + row('user', 'Name', esc(m.name)) + row('lock', 'Username', m.id) + row('mail', 'Email', esc(m.contact || 'Not set')) + row('phone', 'Phone', esc(m.phone || 'Not set')) + row('cal', 'Member since', fmtDate(OF.parseYmd(m.joined || OF.ymd(new Date())))) +
      '<label class="lbl" for="homeloc">Home location</label><select id="homeloc" data-act="homeloc">' + opts + '</select><p class="muted small" style="margin:6px 0 0">Your membership works at all three locations whatever you choose here.</p></div>' +
      '<div class="stackcol"><div class="card"><h3>Membership</h3><div class="memrow"><div><span class="chip blue big">' + p.name + ' Plan</span> <span class="chip green">Active</span><div class="muted small" style="margin-top:8px">' + planLine(m) + '</div></div><div class="small"><div>$' + p.price.toFixed(2) + ' / month</div><div>Next billing: <b>' + fmtDate(nextBill(m)) + '</b></div></div></div>' +
      '<ul class="small" style="margin:10px 0 12px;padding-left:18px">' + p.perks.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><button class="btn" data-act="plan-open">Manage plan</button></div>' +
      '<div class="card"><h3>Payment method</h3><p class="small" style="margin:0 0 4px"><b>' + (m.card ? 'Card ending ' + esc(m.card) : 'Card on file (demo)') + '</b></p><p class="muted small" style="margin:0">Demo only: no real payment is processed in this prototype.</p></div>' +
      '<div class="card"><div class="row between"><div><h3>Class reminders</h3><div class="muted small">SMS and push reminders help you remember your class.</div></div><button class="btn ' + (m.remind ? '' : 'sec') + '" data-act="remind">' + (m.remind ? 'Reminders on' : 'Reminders off') + '</button></div></div>' +
      '<div class="row"><button class="btn sec" data-act="logout">Log out</button><button class="btn danger" data-act="leave-open">Cancel membership</button></div></div></div>';
  }

  // ---------- member portal (login, sign up) and plan + payment ----------
  function portalHead(back) {
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><div class="sp"></div><a class="hbtn" href="#/tutorial" style="text-decoration:none">Tutorial</a><button class="hbtn" data-act="back-landing">' + (back || 'Switch role') + '</button></header>';
  }
  function portal() {
    var su = ui.su, lopts = '<option value="">Select your home location</option>' + OF.LOC_KEYS.map(function (l) { return '<option value="' + l + '"' + (su.home === l ? ' selected' : '') + '>' + OF.LOCS[l].name + '</option>'; }).join('');
    var feat = [['cal', 'Book classes at any location', 'Choose from classes at Location 1, 2, or 3.'], ['user', 'Manage your bookings', 'View, cancel, and check in to your classes.'], ['star', 'Track your progress', 'See your visits, ratings, and upcoming classes.']].map(function (f) { return '<div class="feat"><span>' + ic(f[0]) + '</span><div><b>' + f[1] + '</b><div class="small">' + f[2] + '</div></div></div>'; }).join('');
    var body;
    if (ui.auth === 'login') {
      body = '<h2>Welcome back!</h2><p class="muted small">Log in to access your classes, bookings, and member profile.</p>' +
        '<label class="lbl" for="lu">Username</label><div class="inp">' + ic('user') + '<input type="text" id="lu" data-lu="1" value="' + esc(ui.lu) + '" placeholder="Enter your username (e.g., M001)" autocomplete="off"></div>' +
        '<label class="lbl" for="lp">Password</label><div class="inp">' + ic('lock') + '<input type="password" id="lp" placeholder="Enter your password" autocomplete="off"></div>' +
        '<div class="note">Password is not required because this is a prototype.</div><button class="btn big" data-act="do-login">Log In</button>' +
        '<div class="or"><span>New to OneFit Connect?</span></div><button class="btn sec big" data-act="auth-tab" data-v="signup">Create a new account</button>';
    } else {
      body = '<h2>Create your account</h2><p class="muted small">Join once and book classes at all three locations.</p>' +
        '<div class="two"><div><label class="lbl">First name <b class="req">*</b></label><div class="inp"><input type="text" data-su="first" value="' + esc(su.first) + '" placeholder="Enter first name"></div></div><div><label class="lbl">Last name <b class="req">*</b></label><div class="inp"><input type="text" data-su="last" value="' + esc(su.last) + '" placeholder="Enter last name"></div></div></div>' +
        '<label class="lbl">Email <b class="req">*</b></label><div class="inp">' + ic('mail') + '<input type="text" data-su="email" value="' + esc(su.email) + '" placeholder="Enter your email (e.g., aisha@email.com)"></div>' +
        '<label class="lbl">Phone <b class="req">*</b></label><div class="inp">' + ic('phone') + '<input type="tel" data-su="phone" value="' + esc(su.phone) + '" placeholder="Enter your phone number (e.g., 314 555 0123)"></div>' +
        '<label class="lbl">Password</label><div class="inp">' + ic('lock') + '<input type="password" placeholder="Enter password" autocomplete="off"></div><div class="note">Password is not required because this is just a prototype.</div>' +
        '<label class="lbl">Home location <b class="req">*</b></label><div class="inp">' + ic('pin') + '<select data-su="home">' + lopts + '</select></div>' +
        '<div class="row" style="margin-top:14px"><button class="btn sec big grow" data-act="auth-tab" data-v="login">Cancel</button><button class="btn big grow" data-act="su-next">Create account</button></div>';
    }
    return portalHead() + '<div class="portalbg"><div class="portal"><div class="pleft"><h1>Member Portal</h1><p>One membership. Three locations.</p>' + feat +
      '<div class="plocs">' + ic('pin') + '<b>Location 1</b><i></i><b>Location 2</b><i></i><b>Location 3</b></div></div><div class="pright">' +
      '<div class="ptabs"><button class="' + (ui.auth === 'login' ? 'on' : '') + '" data-act="auth-tab" data-v="login">Login (Existing Member)</button><button class="' + (ui.auth === 'signup' ? 'on' : '') + '" data-act="auth-tab" data-v="signup">Sign Up (New Member)</button></div>' + body + '</div></div></div>';
  }
  function stepper(cur) {
    return '<div class="stepper">' + ['Create Account', 'Select Plan', 'Payment', 'Get Started'].map(function (t, i) { return '<div class="st ' + (i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : '') + '"><span>' + (i + 1 < cur ? '✓' : i + 1) + '</span>' + t + '</div>' + (i < 3 ? '<i></i>' : ''); }).join('') + '</div>';
  }
  function planPage() {
    var pk = Object.keys(OF.PLANS), P = OF.PLANS[ui.plan], pay = ui.pay;
    var cards = pk.map(function (k) {
      var p = OF.PLANS[k];
      return '<div class="plan ' + (k === ui.plan ? 'sel' : '') + '" data-act="plan-pick" data-v="' + k + '">' + (k === 'Standard' ? '<em>Most Popular</em>' : '') + '<span class="radio"></span><h3>' + p.name + '</h3><p class="muted small">' + p.tag + '</p><div class="price">$' + p.price + '<small> / month</small></div><ul>' + p.perks.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    var tiles = ['HIIT', 'Yoga', 'Zumba', 'Spin', 'Pilates', 'Strength'].map(function (t) { return '<div class="tile"><img src="' + clsImg(t) + '" alt=""><span>' + t + '</span></div>'; }).join('');
    var card = pay.method === 'card' ? '<label class="lbl">Card number <b class="req">*</b></label><div class="inp"><input type="text" data-pay="num" value="' + esc(pay.num) + '" placeholder="4242 4242 4242 4242" autocomplete="off" inputmode="numeric"></div>' +
      '<div class="three"><div><label class="lbl">Expiration date <b class="req">*</b></label><div class="inp"><input type="text" data-pay="exp" value="' + esc(pay.exp) + '" placeholder="MM / YY" autocomplete="off"></div></div><div><label class="lbl">CVV <b class="req">*</b></label><div class="inp"><input type="text" data-pay="cvv" value="' + esc(pay.cvv) + '" placeholder="123" autocomplete="off" inputmode="numeric"></div></div><div><label class="lbl">Billing ZIP <b class="req">*</b></label><div class="inp"><input type="text" data-pay="zip" value="' + esc(pay.zip) + '" placeholder="63103" autocomplete="off" inputmode="numeric"></div></div></div>' +
      '<div class="note">Prototype only: no real payment is processed. Use any test numbers, for example 4242 4242 4242 4242, 12 / 30, 123.</div>' : '<div class="note">Prototype only: ' + (pay.method === 'paypal' ? 'PayPal' : 'Apple Pay') + ' is simulated, so no sign-in or card details are needed.</div>';
    return portalHead('Back') + '<main class="planmain">' + stepper(2) + '<h1 style="margin-top:14px">Choose your membership plan</h1><p class="muted" style="margin:4px 0 14px">One membership. Book classes at all 3 locations.</p>' +
      '<div class="planrow"><div class="plans">' + cards + '</div><div class="card"><h3>Explore our classes</h3><p class="muted small" style="margin:0 0 8px">Included in all plans. Book the classes you love.</p><div class="tiles">' + tiles + '</div></div></div>' +
      '<div class="grid g2pay" style="margin-top:14px;align-items:start"><div class="card"><h3>Payment details</h3><p class="muted small" style="margin:0 0 10px">Your payment information is secure and encrypted (demo).</p>' +
      '<div class="paym">' + [['card', 'Credit / Debit Card'], ['paypal', 'PayPal'], ['apple', 'Apple Pay']].map(function (x) { return '<button class="' + (pay.method === x[0] ? 'on' : '') + '" data-act="pay-method" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' + card + '</div>' +
      '<div class="card sum"><h3>Order Summary</h3><div class="srow"><span>Plan</span><span>' + P.name + '</span></div><div class="srow"><span>Billing</span><span>Monthly</span></div><div class="srow"><span>Monthly Price</span><span>$' + P.price.toFixed(2) + '</span></div><div class="srow tot"><span>Total Due Today</span><span>$' + P.price.toFixed(2) + '</span></div>' +
      '<button class="btn big" data-act="pay-complete" style="width:100%;margin-top:10px">Complete Membership</button><p class="muted small" style="margin:8px 0 0">Account for ' + esc(ui.su.first + ' ' + ui.su.last) + ' (' + esc(ui.su.email) + ')</p></div></div></main>';
  }
  function planModal() {
    var m = OF.member(session.memberId), sel = ui.mp || m.plan;
    ui.modal = '<div class="overlay"><div class="modal" style="max-width:560px"><h3>Manage plan</h3><p class="muted small">You are on the <b>' + m.plan + '</b> plan. The new price starts at your next billing date.</p><div class="mplans">' +
      Object.keys(OF.PLANS).map(function (k) { var p = OF.PLANS[k]; return '<div class="plan ' + (k === sel ? 'sel' : '') + '" data-act="mp-pick" data-v="' + k + '"><span class="radio"></span><h3>' + p.name + '</h3><div class="price">$' + p.price + '<small> / month</small></div><ul>' + p.perks.slice(0, 3).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }).join('') +
      '</div><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="plan-confirm">Change plan</button></div></div></div>';
    render();
  }

  function unread(mid) { return (DB().inbox || []).filter(function (n) { return n.memberId === mid && !n.read; }).length; }
  function download(name, text, mime) { try { var b = new Blob([text], { type: mime || 'text/plain' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500); } catch (e) { toast('Download is not available in this browser.', 'err'); } }
  function csv(rows) { return rows.map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n'); }
  function icsFor(c) {
    function f(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00'; }
    var st = OF.startOf(c), en = new Date(st.getTime() + MINS * 60000);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OneFit Connect//EN', 'BEGIN:VEVENT', 'UID:' + c.id + '@onefit-connect', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en), 'SUMMARY:' + c.type + ' at OneFit ' + OF.LOCS[c.loc].name, 'LOCATION:OneFit Connect ' + OF.LOCS[c.loc].name, 'DESCRIPTION:Instructor ' + c.instructor, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  var DESC = { Spin: 'Indoor cycling with a coach-led ride: intervals, hills and sprints on your own resistance.', HIIT: 'Short, hard intervals with rest between them. Full-body work, scaled to your level.', Strength: 'Weights and bodyweight moves for the whole body, with coaching on form.', Pilates: 'Controlled core and mobility work on the mat. Low impact, high focus.', Yoga: 'Flowing postures with breath work for strength, balance and flexibility.', Zumba: 'Dance-based cardio to upbeat music. No dance experience needed.' };
  function classModal(cid) {
    var c = OF.cls(cid); if (!c) return; var m = OF.member(session.memberId), now = new Date(), taken = OF.seatsTaken(cid), left = c.cap - taken, mine = OF.activeBooking(m.id, cid), started = OF.startOf(c) < now;
    var peak = (c.slot === 'EM' || c.slot === 'EVE');
    var act = mine && mine.status === 'waitlist' ? '<span class="chip amber">On waitlist</span>' : mine ? '<button class="btn danger" data-act="cancel" data-b="' + mine.id + '">Cancel booking</button>' : started ? '<button class="btn" disabled>Started</button>' : left <= 0 ? '<button class="btn warn" data-act="waitlist" data-c="' + c.id + '">Join waitlist</button>' : '<button class="btn" data-act="book" data-c="' + c.id + '">Book this class</button>';
    ui.modal = '<div class="overlay"><div class="modal"><div class="row"><img src="' + clsImg(c.type) + '" alt="" style="width:84px;height:84px;border-radius:12px;object-fit:cover"><div><h3>' + c.type + '</h3><div class="muted small">' + dayLabel(OF.daysBetween(now, OF.parseYmd(c.date))) + ' · ' + tm(c) + ' · ' + MINS + ' min</div><div style="margin-top:4px"><span class="chip gray">' + OF.LOCS[c.loc].name + '</span> <span class="chip ' + (peak ? 'amber' : 'green') + '">' + (peak ? 'Peak time' : 'Off-peak') + '</span>' + (m.home !== c.loc ? ' <span class="chip blue">Cross-location</span>' : '') + '</div></div></div>' +
      '<p class="small" style="margin:12px 0 6px">' + DESC[c.type] + '</p><table><tr><td class="muted small">Instructor</td><td><b>' + esc(c.instructor) + '</b></td></tr><tr><td class="muted small">Seats</td><td><b>' + (left <= 0 ? 'Full' : left + ' of ' + c.cap + ' left') + '</b></td></tr>' + (mine ? '<tr><td class="muted small">Your status</td><td><b>' + (mine.status === 'waitlist' ? 'Waitlist' : 'Booked') + '</b></td></tr>' : '') + '</table>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn sec" data-act="close">Close</button><button class="btn sec" data-act="ics" data-c="' + c.id + '">Add to calendar</button>' + act + '</div></div></div>';
    render();
  }
  function memberInbox() {
    var m = OF.member(session.memberId), items = (DB().inbox || []).filter(function (n) { return n.memberId === m.id; }), k = { message: ['blue', 'From the gym'], booking: ['green', 'Booking'], waitlist: ['amber', 'Waitlist'], plan: ['gray', 'Membership'], info: ['gray', 'Info'] };
    var list = items.map(function (n) {
      var c = k[n.kind] || k.info;
      return '<div class="card inb ' + (n.read ? '' : 'unread') + '"><div class="row between"><div><span class="chip ' + c[0] + '">' + c[1] + '</span> <b>' + esc(n.title) + '</b></div><span class="muted small">' + ago(n.ts) + ' ago</span></div><p class="small" style="margin:6px 0 0">' + esc(n.text) + '</p></div>';
    }).join('') || '<div class="card muted">No messages yet. Booking confirmations, waitlist updates and messages from the front desk appear here.</div>';
    return pageheadBtn('Inbox', 'Booking confirmations, waitlist updates and messages from the front desk.', '<div class="row"><button class="btn sec" data-act="inbox-read">Mark all as read</button><button class="btn danger" data-act="inbox-clear">Clear</button></div>') + '<div class="list">' + list + '</div>';
  }
  function pageheadBtn(t, p, btn) { return '<div class="pagehead row between"><div><h1>' + t + '</h1>' + (p ? '<p>' + p + '</p>' : '') + '</div>' + btn + '</div>'; }
  function pagehead(t, p) { return '<div class="pagehead"><h1>' + t + '</h1>' + (p ? '<p>' + p + '</p>' : '') + '</div>'; }
  function seg(act, items, cur) { return '<div class="seg">' + items.map(function (i) { return '<button data-act="' + act + '" data-v="' + i[0] + '" class="' + (String(i[0]) === String(cur) ? 'on' : '') + '">' + i[1] + '</button>'; }).join('') + '</div>'; }

  function memberClasses() {
    var m = OF.member(session.memberId), now = new Date(), dstr = OF.ymd(OF.addDays(now, ui.day));
    var list = DB().classes.filter(function (c) { return c.date === dstr && (ui.loc === 'ALL' || c.loc === ui.loc) && (ui.type === 'ALL' || c.type === ui.type); });
    var locs = [['ALL', 'All locations']].concat(OF.LOC_KEYS.map(function (l) { return [l, OF.LOCS[l].name]; }));
    var days = []; for (var i = 0; i < 7; i++) days.push([i, dayLabel(i)]);
    var types = '<select data-act="type" style="width:auto"><option value="ALL">All class types</option>' + Object.keys(OF.CLASSES).map(function (t) { return '<option ' + (ui.type === t ? 'selected' : '') + '>' + t + '</option>'; }).join('') + '</select>';
    var cards = list.map(function (c) {
      var taken = OF.seatsTaken(c.id), left = c.cap - taken, pct = Math.round(taken / c.cap * 100), mine = OF.activeBooking(m.id, c.id), started = OF.startOf(c) < now, cross = m.home !== c.loc;
      var act;
      if (mine && mine.status === 'waitlist') act = '<span class="chip amber">On waitlist</span>';
      else if (mine) act = '<span class="chip green">Booked ✓</span> <button class="btn sec sm" data-act="book" data-c="' + c.id + '">Book again</button>';
      else if (started) act = '<button class="btn sm" disabled>Started</button>';
      else if (left <= 0) act = '<button class="btn warn sm" data-act="waitlist" data-c="' + c.id + '">Join waitlist</button>';
      else act = '<button class="btn" data-act="book" data-c="' + c.id + '">Book</button>';
      act = '<button class="btn sec sm" data-act="cdetail" data-c="' + c.id + '">Details</button> ' + act;
      return '<div class="card cls"><div class="time">' + tm(c) + '<small>' + c.slot + '</small></div><div><h4><span class="dot" style="background:' + OF.CLASSES[c.type].color + '"></span>' + c.type +
        ' <span class="chip gray">' + OF.LOCS[c.loc].name + '</span>' + (cross ? ' <span class="chip blue">Cross-location</span>' : '') + '</h4><div class="muted small">with ' + esc(c.instructor) + ' · ' +
        (left <= 0 ? 'Full' : left + ' of ' + c.cap + ' seats left') + '</div><div class="bar ' + (pct >= 100 ? 'full' : pct >= 80 ? 'mid' : '') + '"><i style="width:' + Math.min(100, pct) + '%"></i></div></div><div class="act">' + act + '</div></div>';
    }).join('') || '<div class="card muted">No classes match these filters.</div>';
    return pagehead('Find a class', 'Book any class at any of the three locations. Seats are shared live with staff and managers.') +
      '<div class="card flat" style="margin-bottom:14px"><div class="grid" style="gap:10px"><div>' + seg('loc', locs, ui.loc) + '</div><div>' + seg('day', days, ui.day) + '</div><div>' + types + '</div></div></div><div class="list">' + cards + '</div>';
  }

  function memberBookings() {
    var m = OF.member(session.memberId), now = new Date(), all = OF.memberBookings(m.id).map(function (b) { return { b: b, c: OF.cls(b.classId) }; }).filter(function (x) { return x.c; });
    var up = all.filter(function (x) { return (x.b.status === 'booked' || x.b.status === 'waitlist') && OF.startOf(x.c) >= now; }).sort(function (a, z) { return OF.startOf(a.c) - OF.startOf(z.c); });
    var done = all.filter(function (x) { return x.b.status === 'attended'; }).sort(function (a, z) { return OF.startOf(z.c) - OF.startOf(a.c); });
    function line(x) { return '<div><b>' + x.c.type + '</b> with ' + esc(x.c.instructor) + '<div class="muted small">' + dayLabel(OF.daysBetween(now, OF.parseYmd(x.c.date))) + ' · ' + tm(x.c) + ' · ' + OF.LOCS[x.c.loc].name + (x.b.cross ? ' · <span class="chip blue">Cross-location</span>' : '') + '</div></div>'; }
    var upH = up.map(function (x) {
      return '<tr><td>' + line(x) + '</td><td>' + (x.b.status === 'waitlist' ? '<span class="chip amber">Waitlist</span>' : '<span class="chip green">Booked</span>') + '</td><td class="right">' +
        (x.b.status === 'booked' ? '<button class="btn sec sm" data-act="code" data-b="' + x.b.id + '">Check-in code</button> <button class="btn sec sm" data-act="ics" data-c="' + x.c.id + '">Add to calendar</button> ' : '') + '<button class="btn sec sm" data-act="cdetail" data-c="' + x.c.id + '">Details</button> ' + '<button class="btn danger sm" data-act="cancel" data-b="' + x.b.id + '">Cancel</button></td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">No upcoming bookings.</td></tr>';
    var doneH = done.slice(0, 6).map(function (x) {
      var st = '<span class="stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-act="rate" data-b="' + x.b.id + '" data-v="' + n + '" class="' + (x.b.rating && n <= x.b.rating ? 'on' : '') + '">★</button>'; }).join('') + '</span>';
      return '<tr><td>' + line(x) + '</td><td>' + (x.b.rating ? 'You rated ' + x.b.rating : 'Rate this class') + '</td><td class="right">' + st + '</td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">Attended classes appear here so you can rate them.</td></tr>';
    return pagehead('My bookings', 'Cancel, show your check-in code, and rate classes you attended.') +
      '<div class="card"><h3>Upcoming</h3><div class="tablewrap"><table>' + upH + '</table></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Attended</h3><div class="tablewrap"><table>' + doneH + '</table></div></div>' +
      '<div class="card" style="margin-top:14px"><div class="row between"><div><h3>Class reminders</h3><div class="muted small">SMS and push reminders before each class help reduce no-shows.</div></div>' +
      '<button class="btn ' + (m.remind ? '' : 'sec') + '" data-act="remind">' + (m.remind ? 'Reminders on' : 'Reminders off') + '</button></div></div>';
  }
  function codeSvg(id) {
    var h = 2166136261; for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0;
    var cells = '', n = 11, s = 14;
    function finder(x, y) { return '<rect x="' + x * s + '" y="' + y * s + '" width="' + 3 * s + '" height="' + 3 * s + '" fill="#0B2E6B"/><rect x="' + (x * s + 4) + '" y="' + (y * s + 4) + '" width="' + (3 * s - 8) + '" height="' + (3 * s - 8) + '" fill="#fff"/><rect x="' + (x * s + 14) + '" y="' + (y * s + 14) + '" width="' + (s - 0) + '" height="' + s + '" fill="#0B2E6B"/>'; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if ((x < 3 && y < 3) || (x > n - 4 && y < 3) || (x < 3 && y > n - 4)) continue;
      h = (Math.imul(h, 1103515245) + 12345) >>> 0; if ((h >>> 16) & 1) cells += '<rect x="' + x * s + '" y="' + y * s + '" width="' + s + '" height="' + s + '" fill="#0B2E6B"/>';
    }
    return '<svg width="' + n * s + '" height="' + n * s + '" viewBox="0 0 ' + n * s + ' ' + n * s + '" style="border:8px solid #fff;outline:1px solid #D3E1F2;border-radius:6px">' + cells + finder(0, 0) + finder(n - 3, 0) + finder(0, n - 3) + '</svg>';
  }

  // ---------- staff ----------
  function staffRoster() {
    var d = DB(), dstr = OF.ymd(OF.addDays(new Date(), ui.sday)), loc = session.loc;
    var cl = d.classes.filter(function (c) { return c.date === dstr && c.loc === loc; });
    var allB = []; cl.forEach(function (c) { allB = allB.concat(OF.classBookings(c.id, OF.CONF)); });
    var checked = allB.filter(function (b) { return b.status === 'attended'; }).length, guests = allB.filter(function (b) { return b.cross; }).length;
    var days = [[0, 'Today'], [1, 'Tomorrow'], [2, dayLabel(2)]];
    var panels = cl.map(function (c) {
      var bs = OF.classBookings(c.id, OF.CONF).map(function (b) { return { b: b, m: OF.member(b.memberId) }; }).sort(function (a, z) { return a.m.name < z.m.name ? -1 : 1; });
      var wl = OF.classBookings(c.id, ['waitlist']).length, inClass = {}; bs.forEach(function (x) { inClass[x.m.id] = 1; });
      var rows = bs.map(function (x) {
        var st = x.b.status === 'attended' ? '<span class="chip green">Checked in</span>' : x.b.status === 'noshow' ? '<span class="chip red">No-show</span>' : '<span class="chip gray">Booked</span>';
        var act = x.b.status === 'attended' ? '' : '<button class="btn sm" data-act="checkin" data-b="' + x.b.id + '">Check in</button> ' + (x.b.status === 'booked' ? '<button class="btn sec sm" data-act="noshow" data-b="' + x.b.id + '">No-show</button>' : '');
        return '<tr><td><b>' + esc(x.m.name) + '</b> <span class="muted small">' + x.m.id + '</span>' + (x.b.cross ? ' <span class="chip blue">Visiting from ' + OF.LOCS[x.m.home].name + '</span>' : '') + '</td><td>' + st + '</td><td class="right">' + act + '</td></tr>';
      }).join('') || '<tr><td colspan="3" class="muted">No bookings yet.</td></tr>';
      var opts = OF.activeMembers().filter(function (m) { return !inClass[m.id]; }).map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + ' (' + m.id + ')</option>'; }).join('');
      return '<div class="card" style="margin-bottom:14px"><div class="row between"><h3 style="margin:0"><span class="dot" style="background:' + OF.CLASSES[c.type].color + '"></span> ' + tm(c) + ' · ' + c.type + '</h3>' +
        '<span class="muted small">' + esc(c.instructor) + ' · ' + bs.length + '/' + c.cap + ' booked' + (wl ? ' · ' + wl + ' on waitlist' : '') + '</span></div>' +
        '<div class="tablewrap"><table>' + rows + '</table></div><div class="hr"></div><div class="row"><select id="walk-' + c.id + '" style="flex:1;min-width:200px">' + opts + '</select><button class="btn warn sm" data-act="walkin" data-c="' + c.id + '">Add walk-in</button></div></div>';
    }).join('') || '<div class="card muted">No classes scheduled.</div>';
    return pageheadBtn('Class roster · ' + OF.LOCS[loc].name, 'Bookings from every app land here. Check members in with one tap.', '<button class="btn" data-act="addmember-open">+ Add new member</button>') +
      '<div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><div class="v">' + cl.length + '</div><div class="l">Classes (' + dayLabel(ui.sday).toLowerCase() + ')</div></div>' +
      '<div class="card kpi"><div class="v">' + checked + '/' + allB.length + '</div><div class="l">Checked in</div></div>' +
      '<div class="card kpi"><div class="v">' + guests + '</div><div class="l">Members visiting from other locations</div></div></div>' +
      '<div style="margin-bottom:14px">' + seg('sday', days, ui.sday) + '</div>' + panels;
  }

  function staffMembers() {
    var loc = session.loc, q = ui.sq.trim().toLowerCase();
    var all = DB().members.filter(function (m) { return m.home === loc; }).map(function (m) { return { m: m, r: OF.risk(m) }; }).sort(function (a, z) { return (a.m.left ? 1 : 0) - (z.m.left ? 1 : 0) || z.r.score - a.r.score; });
    var need = all.filter(function (x) { return !x.m.left && x.r.level !== 'Low'; });
    var list = (ui.sFilter === 'NEED' ? need : all).filter(function (x) { return !q || x.m.name.toLowerCase().indexOf(q) > -1 || x.m.id.toLowerCase().indexOf(q) > -1 || (x.m.contact || '').toLowerCase().indexOf(q) > -1; });
    var rows = list.slice(0, 40).map(function (x) {
      var act = x.m.left ? '<button class="btn sm" data-act="reactivate" data-m="' + x.m.id + '">Reactivate</button>' : (x.r.contacted ? '<span class="chip green">Messaged</span>' : (x.r.level === 'Low' ? '' : '<button class="btn sm" data-act="outreach" data-m="' + x.m.id + '">Send message</button>'));
      return '<tr><td><b>' + esc(x.m.name) + '</b> <span class="muted small">' + x.m.id + ' · ' + x.m.plan + '</span>' + (x.m.kind === 'new' ? ' <span class="chip blue">New</span>' : '') + (x.m.left ? ' <span class="chip gray">Cancelled</span>' : '') + '</td>' +
        '<td class="small">' + dAgo(x.r.since) + '</td><td>' + (x.m.left ? '' : lvlChip(x.r)) + '</td><td class="right"><button class="btn sec sm" data-act="mview" data-m="' + x.m.id + '">View</button> ' + act + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">No members match.</td></tr>';
    var f = [['ALL', 'All members (' + all.length + ')'], ['NEED', 'Not coming lately (' + need.length + ')']];
    return pageheadBtn('Members · ' + OF.LOCS[loc].name, 'Search members, view a profile, add new members and message anyone who has stopped coming.', '<button class="btn" data-act="addmember-open">+ Add new member</button>') +
      '<div class="card flat" style="margin-bottom:14px"><div class="row between"><div>' + seg('sFilter', f, ui.sFilter) + '</div><div style="flex:1;min-width:220px;max-width:340px"><input type="text" id="sq" data-sq="1" value="' + esc(ui.sq) + '" placeholder="Search by name, ID or email" autocomplete="off"></div></div></div>' +
      '<div class="card"><div class="tablewrap"><table><tr><th>Member</th><th>Last visit</th><th>Churn risk</th><th></th></tr>' + rows + '</table></div></div>';
  }
  function memberView(mid) {
    var m = OF.member(mid), r = OF.risk(m), p = OF.PLANS[m.plan] || OF.PLANS.Standard, now = new Date();
    var ups = OF.memberBookings(mid).filter(function (b) { var c = OF.cls(b.classId); return c && (b.status === 'booked' || b.status === 'waitlist') && OF.startOf(c) >= now; }).sort(function (a, z) { return OF.startOf(OF.cls(a.classId)) - OF.startOf(OF.cls(z.classId)); })
      .map(function (b) { var c = OF.cls(b.classId); return '<li>' + c.type + ' · ' + dayLabel(OF.daysBetween(now, OF.parseYmd(c.date))) + ' ' + tm(c) + ' · ' + OF.LOCS[c.loc].name + (b.status === 'waitlist' ? ' <span class="chip amber">Waitlist</span>' : '') + '</li>'; }).join('') || '<li class="muted">No upcoming bookings.</li>';
    function row(l, v) { return '<tr><td class="muted small">' + l + '</td><td><b>' + v + '</b></td></tr>'; }
    ui.modal = '<div class="overlay"><div class="modal"><h3>' + esc(m.name) + (m.left ? ' <span class="chip gray">Cancelled</span>' : '') + '</h3><p class="muted small" style="margin-top:2px">' + m.id + ' · home ' + OF.LOCS[m.home].name + '</p>' +
      '<table>' + row('Plan', p.name + ' ($' + p.price + ' a month)') + row('Email', esc(m.contact || 'Not set')) + row('Phone', esc(m.phone || 'Not set')) + row('Member since', fmtDate(OF.parseYmd(m.joined || OF.ymd(now)))) +
      row('Last visit', dAgo(r.since)) + row('Visits (last 30 days)', m.v30) + row('Churn risk', m.left ? 'Cancelled (' + esc(m.left.reason) + ')' : r.level) + '</table>' +
      '<h4 style="margin:12px 0 4px;font-size:14px">Upcoming bookings</h4><ul class="small" style="margin:0;padding-left:18px">' + ups + '</ul>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn sec" data-act="close">Close</button>' + (m.left ? '<button class="btn" data-act="reactivate" data-m="' + m.id + '">Reactivate</button>' : (r.level !== 'Low' && !r.contacted ? '<button class="btn" data-act="outreach" data-m="' + m.id + '">Send message</button>' : '')) + '</div></div></div>';
    render();
  }

  // ---------- manager ----------
  function weekStats() {
    var d = DB(), r = { cap: 0, taken: 0, today: 0, cross: 0, offCap: 0, offTaken: 0, loc: {}, day: [] };
    OF.LOC_KEYS.forEach(function (l) { r.loc[l] = { cap: 0, taken: 0 }; });
    for (var i = 0; i < 7; i++) r.day.push({ cap: 0, taken: 0 });
    var today = OF.ymd(new Date());
    d.classes.forEach(function (c) {
      var bs = OF.classBookings(c.id, OF.CONF), di = OF.daysBetween(new Date(), OF.parseYmd(c.date));
      r.cap += c.cap; r.taken += bs.length; if (c.slot !== 'EM' && c.slot !== 'EVE') { r.offCap += c.cap; r.offTaken += bs.length; } r.loc[c.loc].cap += c.cap; r.loc[c.loc].taken += bs.length;
      if (di >= 0 && di < 7) { r.day[di].cap += c.cap; r.day[di].taken += bs.length; }
      if (c.date === today) r.today += bs.length;
      bs.forEach(function (b) { if (b.cross) r.cross++; });
    });
    return r;
  }
  function riskList() { return OF.activeMembers().map(function (m) { return { m: m, r: OF.risk(m) }; }).sort(function (a, z) { return z.r.score - a.r.score; }); }
  function mgrOverview() {
    var w = weekStats(), d = DB(), rl = riskList(), high = rl.filter(function (x) { return x.r.level === 'High'; }).length;
    var util = Math.round(w.taken / w.cap * 1000) / 10;
    var locBars = OF.LOC_KEYS.map(function (l) { var p = Math.round(w.loc[l].taken / w.loc[l].cap * 100); return '<div class="r"><span>' + OF.LOCS[l].name + '</span><div class="t"><i style="width:' + p + '%"></i></div><b>' + p + '%</b></div>'; }).join('');
    var dayBars = w.day.map(function (x, i) { var p = x.cap ? Math.round(x.taken / x.cap * 100) : 0; return '<div><span style="font-weight:700;color:#0B2E6B">' + p + '%</span><i style="height:' + Math.max(3, p) + '%"></i><span>' + dayLabel(i).replace('Today', 'Tdy').replace('Tomorrow', 'Tmr').split(' ')[0] + '</span></div>'; }).join('');
    var top = rl.slice(0, 5).map(function (x) { return '<tr><td><b>' + esc(x.m.name) + '</b> <span class="muted small">' + OF.LOCS[x.m.home].name + '</span></td><td>' + lvlChip(x.r) + '</td><td class="muted small">' + x.r.since + ' days since last visit</td></tr>'; }).join('');
    return pagehead('Manager overview', 'Live numbers for all three locations, calculated from the shared records (next 7 days).') +
      '<div class="grid g6" style="margin-bottom:14px">' +
      kpi(Math.round(w.offTaken / w.offCap * 1000) / 10 + '%', 'Off-peak utilization (7 days)') + kpi(util + '%', 'Seat utilization (7 days)') + kpi(w.today, 'Bookings today') + kpi(w.cross, 'Cross-location bookings') +
      kpi(high, 'High-risk members') + kpi(d.stats.outreachSent, 'Messages sent by staff') + '</div>' +
      '<div class="grid g2"><div class="card"><h3>Utilization by location</h3><div class="hbars">' + locBars + '</div></div><div class="card"><h3>Utilization by day</h3><div class="cols">' + dayBars + '</div></div></div>' +
      '<div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">Members to watch</h3><a class="btn sec sm" href="#/manager/risk" style="text-decoration:none">Open churn risk</a></div><div class="tablewrap"><table>' + top + '</table></div></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn warn" data-act="rush">Simulate rush (25 booking requests)</button>' +
      '<button class="btn sec" data-act="export-bookings">Export bookings (CSV)</button><button class="btn sec" data-act="export-members">Export members (CSV)</button>' + (CFG.DASHBOARD_URL ? '<a class="btn sec" href="' + esc(CFG.DASHBOARD_URL) + '" target="_blank" rel="noopener" style="text-decoration:none">Open KPI dashboard</a>' : '') + '</div>';
  }
  function slotsFor(day) { var dw = OF.addDays(new Date(), day).getDay(); return (dw === 0 || dw === 6) ? ['WKM', 'WKA'] : ['EM', 'MID', 'AFT', 'EVE']; }
  function mgrSchedule() {
    var now = new Date(), nc = ui.nc, sl = slotsFor(nc.day); if (sl.indexOf(nc.slot) < 0) nc.slot = sl[0];
    var dstr = OF.ymd(OF.addDays(now, ui.mDay)), list = DB().classes.filter(function (c) { return c.date === dstr && (ui.mLoc === 'ALL' || c.loc === ui.mLoc) && OF.startOf(c) > new Date(0); });
    var wk = DB().classes.filter(function (c) { return OF.daysBetween(now, OF.parseYmd(c.date)) < 7; }), off = wk.filter(function (c) { return c.slot !== 'EM' && c.slot !== 'EVE'; });
    var offFill = off.length ? Math.round(off.reduce(function (a, c) { return a + OF.seatsTaken(c.id); }, 0) / off.reduce(function (a, c) { return a + c.cap; }, 0) * 100) : 0;
    var rows = list.map(function (c) {
      var t = OF.seatsTaken(c.id), p = Math.round(t / c.cap * 100), future = OF.startOf(c) > now, pk = (c.slot === 'EM' || c.slot === 'EVE');
      return '<tr><td><b>' + tm(c) + '</b></td><td><span class="dot" style="background:' + OF.CLASSES[c.type].color + '"></span> ' + c.type + '</td><td>' + OF.LOCS[c.loc].name + '</td><td class="small">' + esc(c.instructor) + '</td><td style="min-width:130px"><div class="bar ' + (p >= 100 ? 'full' : p >= 80 ? 'mid' : '') + '" style="margin:0"><i style="width:' + Math.min(100, p) + '%"></i></div><span class="small muted">' + t + '/' + c.cap + ' (' + p + '%)</span></td><td><span class="chip ' + (pk ? 'amber' : 'green') + '">' + (pk ? 'Peak' : 'Off-peak') + '</span></td><td class="right">' + (future ? '<button class="btn danger sm" data-act="cancelclass" data-c="' + c.id + '">Cancel class</button>' : '<span class="muted small">Started</span>') + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="muted">No classes match.</td></tr>';
    var locs = [['ALL', 'All locations']].concat(OF.LOC_KEYS.map(function (l) { return [l, OF.LOCS[l].name]; })), days = []; for (var i = 0; i < 7; i++) days.push([i, dayLabel(i)]);
    function opts(arr, cur) { return arr.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === String(cur) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join(''); }
    var form = '<div class="card" style="margin-bottom:14px"><h3>Add a class</h3><p class="muted small" style="margin:0 0 10px">Fill an empty off-peak slot. Members can book it straight away, and the utilization numbers update.</p><div class="grid g6" style="gap:10px;align-items:end">' +
      '<div><label class="lbl">Location</label><select data-nc="loc">' + opts(OF.LOC_KEYS.map(function (l) { return [l, OF.LOCS[l].name]; }), nc.loc) + '</select></div>' +
      '<div><label class="lbl">Day</label><select data-nc="day">' + opts(days, nc.day) + '</select></div>' +
      '<div><label class="lbl">Time</label><select data-nc="slot">' + opts(sl.map(function (k) { return [k, OF.fmtTime(OF.SLOTS[k]) + ((k === 'EM' || k === 'EVE') ? ' (peak)' : ' (off-peak)')]; }), nc.slot) + '</select></div>' +
      '<div><label class="lbl">Class</label><select data-nc="type">' + opts(Object.keys(OF.CLASSES).map(function (t) { return [t, t]; }), nc.type) + '</select></div>' +
      '<div style="grid-column:span 2"><button class="btn" data-act="addclass" style="width:100%">Add class</button></div></div></div>';
    return pagehead('Schedule', 'Add or cancel classes. Cancelling a class notifies every member who booked it and frees their seats.') +
      '<div class="grid g3" style="margin-bottom:14px">' + kpi(wk.length, 'Classes in the next 7 days') + kpi(off.length, 'Off-peak classes') + kpi(offFill + '%', 'Off-peak fill rate') + '</div>' + form +
      '<div class="card flat" style="margin-bottom:14px"><div class="grid" style="gap:10px"><div>' + seg('mLoc', locs, ui.mLoc) + '</div><div>' + seg('mDay', days, ui.mDay) + '</div></div></div>' +
      '<div class="card"><div class="tablewrap"><table><tr><th>Time</th><th>Class</th><th>Location</th><th>Instructor</th><th>Seats</th><th>Hours</th><th></th></tr>' + rows + '</table></div></div>';
  }
  function kpi(v, l) { return '<div class="card kpi"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  function reasonBars() {
    var lv = DB().leaves || [], o = {}; lv.forEach(function (x) { o[x.reason] = (o[x.reason] || 0) + 1; });
    var ks = Object.keys(o).sort(function (a, z) { return o[z] - o[a]; });
    return ks.length ? '<div class="hbars">' + ks.map(function (k) { return '<div class="r" style="grid-template-columns:200px 1fr 40px"><span>' + esc(k) + '</span><div class="t"><i style="width:' + Math.round(o[k] / lv.length * 100) + '%"></i></div><b>' + o[k] + '</b></div>'; }).join('') + '</div>' : '<p class="muted small" style="margin:0">No cancellations yet. When a member cancels from their Profile, the reason shows up here.</p>';
  }
  function mgrRisk() {
    var all = riskList(), N = all.length, lv = ['High', 'Medium', 'Low'], col = { High: 'red', Medium: 'amber', Low: 'green' };
    var cnt = { High: 0, Medium: 0, Low: 0 }, byLoc = {}, buckets = [0, 0, 0, 0];
    OF.LOC_KEYS.forEach(function (l) { byLoc[l] = { High: 0, Medium: 0, Low: 0, n: 0 }; });
    all.forEach(function (x) { cnt[x.r.level]++; byLoc[x.m.home][x.r.level]++; byLoc[x.m.home].n++; buckets[x.r.since < 7 ? 0 : x.r.since < 14 ? 1 : x.r.since < 21 ? 2 : 3]++; });
    var levelBars = lv.map(function (k) { var p = Math.round(cnt[k] / N * 100); return '<div class="r"><span>' + k + '</span><div class="t"><i class="' + col[k] + '" style="width:' + p + '%"></i></div><b>' + cnt[k] + '</b></div>'; }).join('');
    var locStacks = OF.LOC_KEYS.map(function (l) {
      var t = byLoc[l];
      return '<div class="r"><span>' + OF.LOCS[l].name + '</span><div class="stack">' + lv.map(function (k) { return '<i class="' + col[k] + '" style="width:' + (t.n ? t[k] / t.n * 100 : 0) + '%" title="' + k + ': ' + t[k] + '"></i>'; }).join('') + '</div><b>' + t.High + ' high</b></div>';
    }).join('');
    var mx = Math.max.apply(null, buckets.concat([1])), bl = ['0-6 days', '7-13 days', '14-20 days', '21+ days'];
    var cols = buckets.map(function (v, i) { return '<div><span style="font-weight:700;color:#0B2E6B">' + v + '</span><i class="' + (i === 3 ? 'red' : i === 2 ? 'amber' : '') + '" style="height:' + Math.max(3, Math.round(v / mx * 100)) + '%"></i><span>' + bl[i] + '</span></div>'; }).join('');
    var rl = all.filter(function (x) { return (ui.rLevel === 'ALL' || x.r.level === ui.rLevel) && (ui.rLoc === 'ALL' || x.m.home === ui.rLoc); });
    var rows = rl.slice(0, 30).map(function (x) {
      return '<tr><td><b>' + esc(x.m.name) + '</b><div class="muted small">' + x.m.id + ' · ' + OF.LOCS[x.m.home].name + '</div></td><td>' + lvlChip(x.r) + '</td>' +
        '<td class="small">' + dAgo(x.r.since) + '</td><td>' + (x.r.contacted ? '<span class="chip green">Messaged by staff</span>' : (x.r.level === 'Low' ? '' : '<span class="muted small">Not yet</span>')) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">No members match.</td></tr>';
    var lvf = [['ALL', 'All levels'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']];
    var lc = [['ALL', 'All locations']].concat(OF.LOC_KEYS.map(function (l) { return [l, OF.LOCS[l].name]; }));
    return pagehead('Churn risk', 'Graphs update after every check-in, cancellation and rating. Front-desk staff send the win-back messages.') +
      '<div class="grid g3" style="margin-bottom:14px">' +
      '<div class="card"><h3>Members by risk level</h3><div class="hbars">' + levelBars + '</div></div>' +
      '<div class="card"><h3>Risk mix by location</h3><div class="hbars stackrows">' + locStacks + '</div><div class="legend2"><span><s class="red"></s>High</span><span><s class="amber"></s>Medium</span><span><s class="green"></s>Low</span></div></div>' +
      '<div class="card"><h3>Days since last visit</h3><div class="cols">' + cols + '</div></div></div>' +
      '<div class="card" style="margin-bottom:14px"><h3>Why members cancelled</h3>' + reasonBars() + '</div>' +
      '<div class="card flat" style="margin-bottom:14px"><div class="grid" style="gap:10px"><div>' + seg('rLevel', lvf, ui.rLevel) + '</div><div>' + seg('rLoc', lc, ui.rLoc) + '</div></div></div>' +
      '<div class="card"><div class="tablewrap"><table><tr><th>Member</th><th>Risk</th><th>Last visit</th><th>Staff message</th></tr>' + rows + '</table></div></div>';
  }

  function mgrFlow() {
    var d = DB(), names = ['Member App', 'Staff App', 'Booking API', 'Payment Gateway', 'Shared DB', 'Churn Engine', 'Manager Dashboard', 'Messaging'], sub = {
      'Payment Gateway': 'plans, payments',
      'Member App': 'book, cancel, rate', 'Staff App': 'check-in, walk-ins', 'Booking API': 'validate + route', 'Shared DB': 'one record store', 'Churn Engine': 'risk scoring', 'Manager Dashboard': 'KPIs + alerts', 'Messaging': 'reminders, win-back' };
    var pipe = names.map(function (n, i) {
      return '<div class="node ' + (d.lastFlow.indexOf(n) > -1 ? 'lit' : '') + '"><b>' + n + '</b><span>' + (d.nodes[n] || 0) + '</span><small>' + sub[n] + '</small></div>' + (i < names.length - 1 ? '<div class="arrow">→</div>' : '');
    }).join('');
    var ev = d.events.slice(0, 25).map(function (e) { return '<tr><td class="muted small">' + ago(e.ts) + '</td><td><code>' + esc(e.endpoint) + '</code></td><td class="' + (e.level === 'warn' ? 'w' : '') + '">' + esc(e.summary) + '</td><td class="muted small">' + e.flow.join(' → ') + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">No events yet. Use the Member or Staff screens, or press Simulate rush.</td></tr>';
    return pagehead('Data flow', 'Counters show how many events passed through each component; the last event is highlighted.') +
      '<div class="card"><div class="pipe">' + pipe + '</div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Event log (latest 25)</h3><div class="tablewrap ev"><table><tr><th>Age</th><th>API call</th><th>What happened</th><th>Path</th></tr>' + ev + '</table></div></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn warn" data-act="rush">Simulate rush (25 booking requests)</button><button class="btn danger" data-act="reset">Reset demo data</button></div>';
  }

  // ---------- render ----------
  function toast(msg, type) {
    var old = document.getElementById('toast'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'toast'; el.className = 'toast ' + (type || ''); el.textContent = msg; document.body.appendChild(el);
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.remove(); }, 4200);
  }
  function render() {
    var parts = (location.hash || '#/landing').replace(/^#\/?/, '').split('/'), role = parts[0] || 'landing', tab = parts[1], html;
    layer.innerHTML = ui.modal || '';
    if (role === 'landing') { app.innerHTML = landing(); return; }
    if (role === 'login') { app.innerHTML = portal(); window.scrollTo(0, 0); return; }
    if (role === 'plan') { if (!ui.su.first || !ui.su.email) { location.hash = '#/login'; return; } app.innerHTML = planPage(); window.scrollTo(0, 0); return; }
    if (role === 'tutorial') { app.innerHTML = tutorial(); window.scrollTo(0, 0); return; }
    if (!session || session.role !== role || !NAV[role]) { location.hash = '#/landing'; return; }
    var valid = NAV[role].map(function (n) { return n[0]; }); if (valid.indexOf(tab) < 0) tab = valid[0];
    var map = { 'member/home': memberHome, 'member/classes': memberClasses, 'member/bookings': memberBookings, 'member/activity': memberActivity, 'member/inbox': memberInbox, 'manager/schedule': mgrSchedule, 'member/profile': memberProfile, 'staff/roster': staffRoster, 'staff/members': staffMembers, 'manager/overview': mgrOverview, 'manager/risk': mgrRisk, 'manager/flow': mgrFlow };
    var y = window.scrollY; app.innerHTML = shell(role, tab, map[role + '/' + tab]()); window.scrollTo(0, y);
  }

  function outreachModal(mid) {
    var m = OF.member(mid), r = OF.risk(m);
    var msg = 'Hi ' + first(m.name) + ', we noticed you have not been in for a while. Your membership works at all three locations, so you can book a class that fits your schedule. Reply here if we can help.';
    ui.modal = '<div class="overlay"><div class="modal"><h3>Send win-back message</h3><p class="muted small">To ' + esc(m.name) + ' · last visit ' + dAgo(r.since) + ' · ' + lvlChip(r) + '</p>' +
      '<div class="seg" style="margin-bottom:10px"><button class="on" data-act="chan" data-v="SMS">SMS</button><button data-act="chan" data-v="email">Email</button></div>' +
      '<textarea id="msgbody">' + esc(msg) + '</textarea><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="send-outreach" data-m="' + m.id + '" data-ch="SMS" id="sendbtn">Send SMS</button></div></div></div>';
    render();
  }

  function leaveModal() {
    var rs = ['Too expensive', 'Moving away', 'Not using it enough', 'Class times do not suit me', 'Other'];
    ui.modal = '<div class="overlay"><div class="modal"><h3>Cancel your membership?</h3><p class="muted small">Your upcoming bookings will be released. Tell us why so we can improve. You can ask the front desk to reactivate later.</p>' +
      rs.map(function (r) { return '<div class="reason ' + (ui.lr === r ? 'sel' : '') + '" data-act="leave-pick" data-v="' + r + '"><span class="radio"></span>' + r + '</div>'; }).join('') +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn sec" data-act="close">Keep my membership</button><button class="btn danger" data-act="leave-confirm">Cancel membership</button></div></div></div>';
    render();
  }
  function memberModal(from) {
    var home = from === 'staff' && session ? session.loc : 'LOC01';
    var opts = OF.LOC_KEYS.map(function (l) { return '<option value="' + l + '"' + (l === home ? ' selected' : '') + '>' + OF.LOCS[l].name + '</option>'; }).join('');
    ui.modal = '<div class="overlay"><div class="modal"><h3>' + (from === 'staff' ? 'Add new member' : 'Create your account') + '</h3>' +
      '<p class="muted small">' + (from === 'staff' ? 'Sign someone up at the front desk. Their membership works at all three locations.' : 'Join once and book at all three locations. No password needed in this prototype.') + '</p>' +
      '<label class="lbl" for="nm-name">Full name</label><input type="text" id="nm-name" placeholder="Jordan Smith" autocomplete="off">' +
      '<label class="lbl" for="nm-contact">Email or phone</label><input type="text" id="nm-contact" placeholder="name@email.com or 314 555 0123" autocomplete="off">' +
      '<label class="lbl" for="nm-home">Home location</label><select id="nm-home">' + opts + '</select>' +
      '<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn sec" data-act="close">Cancel</button><button class="btn" data-act="save-member" data-from="' + from + '">' + (from === 'staff' ? 'Add member' : 'Create account') + '</button></div></div></div>';
    render();
  }

  // ---------- actions ----------
  function after(r) { ui.modal = null; if (r) toast(r.message, r.ok ? '' : (r.code === 'FULL' || r.code === 'PLAN_LIMIT' ? 'warn' : 'err')); render(); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), v = el.getAttribute('data-v'), A = OF.api;
    switch (a) {
      case 'go-login': ui.auth = 'login'; go('login'); break;
      case 'go-signup': ui.auth = 'signup'; go('login'); break;
      case 'back-landing': go(location.hash === '#/plan' ? 'login' : 'landing'); break;
      case 'auth-tab': ui.auth = v; render(); break;
      case 'do-login': var lr = A.login(ui.lu); if (!lr.ok) { toast(lr.message, 'err'); render(); break; } setSession({ role: 'member', memberId: lr.member.id }); ui.lu = ''; go('member/home'); toast(lr.message); break;
      case 'su-next': var sv = A.validateMember((ui.su.first + ' ' + ui.su.last).trim(), ui.su.email, ui.su.home, ui.su.phone || '');
        if (!ui.su.first.trim() || !ui.su.last.trim()) { toast('Enter your first and last name.', 'err'); break; }
        if (!ui.su.phone.trim()) { toast('Enter your phone number.', 'err'); break; }
        if (!sv.ok) { toast(sv.message, sv.code === 'DUPLICATE' ? 'warn' : 'err'); break; }
        go('plan'); break;
      case 'plan-pick': ui.plan = v; render(); break;
      case 'pay-method': ui.pay.method = v; render(); break;
      case 'pay-complete':
        var pm = ui.pay, num = pm.num.replace(/\D/g, '');
        if (pm.method === 'card') {
          if (num.length < 13 || num.length > 19) { toast('Enter a valid card number (13 to 19 digits).', 'err'); break; }
          if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(pm.exp.trim())) { toast('Enter the expiration date as MM / YY.', 'err'); break; }
          if (!/^\d{3,4}$/.test(pm.cvv.trim())) { toast('Enter the 3 or 4 digit CVV.', 'err'); break; }
          if (!/^\d{5}$/.test(pm.zip.trim())) { toast('Enter a 5 digit billing ZIP.', 'err'); break; }
        }
        var pr = A.addMember((ui.su.first + ' ' + ui.su.last).trim(), ui.su.email, ui.su.home, 'Member App', { phone: ui.su.phone, plan: ui.plan, paid: true, card: pm.method === 'card' ? num.slice(-4) : '' });
        if (!pr.ok) { toast(pr.message, 'err'); break; }
        setSession({ role: 'member', memberId: pr.member.id }); ui.su = { first: '', last: '', email: '', phone: '', home: '' }; ui.pay = { method: 'card', num: '', exp: '', cvv: '', zip: '' }; ui.auth = 'login'; go('member/home'); toast(pr.message); break;
      case 'plan-open': ui.mp = ''; planModal(); break;
      case 'mp-pick': ui.mp = v; planModal(); break;
      case 'plan-confirm': var cr = A.setPlan(session.memberId, ui.mp || OF.member(session.memberId).plan); if (!cr.ok) { toast(cr.message, 'warn'); break; } ui.modal = null; after(cr); break;
      case 'hTab': ui.hTab = v; render(); break;
      case 'cdetail': classModal(el.getAttribute('data-c')); break;
      case 'ics': var ic_ = OF.cls(el.getAttribute('data-c')); download(ic_.type.toLowerCase() + '-' + ic_.date + '.ics', icsFor(ic_), 'text/calendar'); toast('Calendar file downloaded. Open it to add the class.'); break;
      case 'inbox-read': after(A.markRead(session.memberId)); break;
      case 'inbox-clear': after(A.clearInbox(session.memberId)); break;
      case 'mview': memberView(el.getAttribute('data-m')); break;
      case 'reactivate': ui.modal = null; after(A.reactivate(el.getAttribute('data-m'), 'Staff App')); break;
      case 'mLoc': ui.mLoc = v; render(); break;
      case 'mDay': ui.mDay = +v; render(); break;
      case 'addclass': var ar = A.addClass(ui.nc.loc, +ui.nc.day, ui.nc.slot, ui.nc.type, null, 'Manager Dashboard'); toast(ar.message, ar.ok ? '' : (ar.code === 'DUPLICATE' ? 'warn' : 'err')); render(); break;
      case 'cancelclass': var cc = OF.cls(el.getAttribute('data-c')), nb = OF.classBookings(cc.id, ['booked', 'waitlist']).length;
        ui.modal = '<div class="overlay"><div class="modal"><h3>Cancel this class?</h3><p class="small">' + cc.type + ' at ' + OF.LOCS[cc.loc].name + ', ' + tm(cc) + '. ' + nb + ' member' + (nb === 1 ? '' : 's') + ' booked or on the waitlist will be notified and their seats released.</p><div class="row" style="justify-content:flex-end"><button class="btn sec" data-act="close">Keep class</button><button class="btn danger" data-act="cancelclass-yes" data-c="' + cc.id + '">Cancel class</button></div></div></div>'; render(); break;
      case 'cancelclass-yes': after(A.cancelClass(el.getAttribute('data-c'), 'Manager Dashboard')); break;
      case 'export-bookings': download('onefit-bookings.csv', csv([['Booking_ID', 'Member_ID', 'Member', 'Class_Date', 'Time', 'Location', 'Class', 'Status', 'Cross_Location']].concat(DB().bookings.map(function (b) { var c = OF.cls(b.classId), m = OF.member(b.memberId); return [b.id, b.memberId, m ? m.name : '', c ? c.date : '', c ? tm(c) : '', c ? OF.LOCS[c.loc].name : '', c ? c.type : '', b.status, b.cross ? 'Yes' : 'No']; }))), 'text/csv'); toast('Bookings exported.'); break;
      case 'export-members': download('onefit-members.csv', csv([['Member_ID', 'Name', 'Email', 'Phone', 'Home', 'Plan', 'Visits_30d', 'Last_Visit', 'Churn_Risk', 'Status']].concat(DB().members.map(function (m) { var r = OF.risk(m); return [m.id, m.name, m.contact || '', m.phone || '', OF.LOCS[m.home].name, m.plan, m.v30, m.lastVisit, r.level, m.left ? 'Cancelled' : 'Active']; }))), 'text/csv'); toast('Members exported.'); break;
      case 'leave-open': ui.lr = ''; leaveModal(); break;
      case 'leave-pick': ui.lr = v; leaveModal(); break;
      case 'leave-confirm': if (!ui.lr) { toast('Choose a reason so we can improve.', 'warn'); break; } var lr_ = A.leave(session.memberId, ui.lr); ui.modal = null; session = null; try { sessionStorage.removeItem('of_session'); } catch (x) { } tour.on = false; wr('of_tour', tour); go('landing'); toast(lr_.message); break;
      case 'login-staff': setSession({ role: 'staff', loc: document.getElementById('loginLoc').value }); go('staff/roster'); break;
      case 'login-manager': setSession({ role: 'manager' }); go('manager/overview'); break;
      case 'logout': session = null; try { sessionStorage.removeItem('of_session'); } catch (x) { } tour.on = false; wr('of_tour', tour); go('landing'); break;
      case 'loc': ui.loc = v; render(); break;
      case 'day': ui.day = +v; render(); break;
      case 'sday': ui.sday = +v; render(); break;
      case 'rLevel': ui.rLevel = v; render(); break;
      case 'rLoc': ui.rLoc = v; render(); break;
      case 'book': after(A.book(session.memberId, el.getAttribute('data-c'))); break;
      case 'waitlist': after(A.waitlist(session.memberId, el.getAttribute('data-c'))); break;
      case 'cancel': after(A.cancel(el.getAttribute('data-b'))); break;
      case 'checkin': after(A.checkIn(el.getAttribute('data-b'))); break;
      case 'noshow': after(A.noShow(el.getAttribute('data-b'))); break;
      case 'walkin': var sel = document.getElementById('walk-' + el.getAttribute('data-c')); after(A.walkIn(sel.value, el.getAttribute('data-c'))); break;
      case 'rate': after(A.rate(el.getAttribute('data-b'), +v)); break;
      case 'remind': after(A.setReminder(session.memberId, !OF.member(session.memberId).remind)); break;
      case 'rush': after(A.rush(25)); break;
      case 'reset': after(A.reset()); break;
      case 'addmember-open': memberModal('staff'); break;
      case 'save-member': var from = el.getAttribute('data-from'), nr = A.addMember(document.getElementById('nm-name').value, document.getElementById('nm-contact').value, document.getElementById('nm-home').value, from === 'staff' ? 'Staff App' : 'Member App');
        if (!nr.ok) { toast(nr.message, nr.code === 'DUPLICATE' ? 'warn' : 'err'); break; }
        ui.modal = null; if (from === 'staff') { after(nr); } else { setSession({ role: 'member', memberId: nr.member.id }); go('member/home'); toast(nr.message); } break;
      case 'sFilter': ui.sFilter = v; render(); break;
      case 'outreach': outreachModal(el.getAttribute('data-m')); break;
      case 'chan': Array.prototype.forEach.call(el.parentNode.children, function (b) { b.classList.remove('on'); }); el.classList.add('on'); var sb = document.getElementById('sendbtn'); sb.setAttribute('data-ch', v); sb.textContent = 'Send ' + v; break;
      case 'send-outreach': var r = A.outreach(el.getAttribute('data-m'), el.getAttribute('data-ch'), 'Staff App', (document.getElementById('msgbody') || {}).value); ui.modal = null; after(r); break;
      case 'code': var b = DB().bookings.filter(function (x) { return x.id === el.getAttribute('data-b'); })[0], c = OF.cls(b.classId);
        ui.modal = '<div class="overlay"><div class="modal" style="text-align:center"><h3>Check-in code</h3><p class="muted small">' + c.type + ' · ' + tm(c) + ' · ' + OF.LOCS[c.loc].name + '</p><div class="code">' + codeSvg(b.id) + '<b style="letter-spacing:3px;font-size:20px;color:#0B2E6B">' + b.id + '</b><span class="muted small">Demo code. Staff check you in from the roster.</span></div><button class="btn" data-act="close">Done</button></div></div>'; render(); break;
      case 'close': ui.modal = null; render(); break;
      case 'feed-toggle': ui.feed = !ui.feed; render(); break;
      case 'tour-start': var role = session && session.role; if (role) { tour = { on: true, i: 0 }; wr('of_tour', tour); go(TOUR[role][0][0]); } break;
      case 'tour-next': var rl = session.role, last = TOUR[rl].length - 1; if (tour.i >= last) { tour.on = false; } else { tour.i++; } wr('of_tour', tour); if (tour.on) go(TOUR[rl][tour.i][0]); else render(); break;
      case 'tour-prev': tour.i = Math.max(0, tour.i - 1); wr('of_tour', tour); go(TOUR[session.role][tour.i][0]); break;
      case 'tour-end': tour.on = false; wr('of_tour', tour); render(); break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-act="type"]'); if (el) { ui.type = el.value; render(); return; }
    var hl = e.target.closest('[data-act="homeloc"]'); if (hl) { after(OF.api.updateProfile(session.memberId, hl.value)); }
  });
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t.getAttribute) return;
    if (t.getAttribute('data-su')) ui.su[t.getAttribute('data-su')] = t.value;
    if (t.getAttribute('data-pay')) ui.pay[t.getAttribute('data-pay')] = t.value;
    if (t.getAttribute('data-lu')) ui.lu = t.value;
    if (t.getAttribute('data-sq')) { ui.sq = t.value; var pos = t.selectionStart; render(); var n = document.getElementById('sq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } }
    if (t.getAttribute('data-nc')) { ui.nc[t.getAttribute('data-nc')] = t.getAttribute('data-nc') === 'day' ? +t.value : t.value; if (t.getAttribute('data-nc') === 'day') render(); }
    if (t.getAttribute('data-su') === 'home') { /* select */ }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && (e.target.id === 'lu' || e.target.id === 'lp')) { var b = document.querySelector('[data-act="do-login"]'); if (b) b.click(); } });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', function (e) { if (e.key === 'onefit_connect_db_v1') { OF.reload(); render(); } });
  render();
})();
