/* OneFit Connect prototype: screens and interactions (no framework, no build step). */
(function () {
  'use strict';
  var app = document.getElementById('app'), layer = document.getElementById('layer');
  var CFG = window.ONEFIT_CONFIG || {};
  var ui = { loc: 'ALL', day: 0, type: 'ALL', sday: 0, rLevel: 'ALL', rLoc: 'ALL', sFilter: 'ALL', feed: false, modal: null, toast: null };
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
    member: [['home', 'Home'], ['classes', 'Find a class'], ['bookings', 'My bookings']],
    staff: [['roster', 'Class roster'], ['members', 'Members']],
    manager: [['overview', 'Overview'], ['risk', 'Churn risk'], ['flow', 'Data flow']]
  };
  var TOUR = {
    member: [
      ['member/home', 'Your membership works everywhere', 'One membership books classes at all three locations.'],
      ['member/classes', 'Find and book a class', 'Filter by location, day and type. Seats update for everyone the moment you book. Press Book on any class.'],
      ['member/classes', 'Try to double-book', 'Press Book on the same class again. The system blocks the duplicate booking.'],
      ['member/bookings', 'Manage your bookings', 'Cancel, show your check-in code, and rate classes you attended. Reminders reduce no-shows.'],
      ['member/bookings', 'See the data flow', 'Open the Data feed button (bottom right) to see each API call and where the data went.']
    ],
    staff: [
      ['staff/roster', 'One roster for your location', 'Every booking from every app lands here, including members visiting from other locations.'],
      ['staff/roster', 'Check members in', 'Press Check in. This replaces the manual sign-in sheet and updates the member record instantly.'],
      ['staff/roster', 'Add a walk-in', 'Pick a member in a class panel and press Add walk-in. The booking and check-in are written together.'],
      ['staff/members', 'Add a new member', 'Press Add new member to sign someone up. Then use Send message on members who have not visited in a while.']
    ],
    manager: [
      ['manager/overview', 'Live KPIs for all locations', 'Utilization, cross-location bookings and at-risk members are calculated from the same shared records.'],
      ['manager/risk', 'Catch churn early', 'The graphs show how many members are at high, medium or low risk and where. Staff send the win-back messages.'],
      ['manager/flow', 'How the data moves', 'See the pipeline, the live event log and what is entered, retrieved and processed.'],
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
    var nav = NAV[role].map(function (n) { return '<a href="#/' + role + '/' + n[0] + '" class="' + (n[0] === tab ? 'on' : '') + '">' + n[1] + '</a>'; }).join('');
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
      '<nav class="nav">' + nav + '</nav><main>' + (tab === NAV[role][0][0] ? '<div class="banner" style="background-image:url(img/' + BANNER[role][0] + ');background-position:' + BANNER[role][1] + '"></div>' : '') + body + '</main>' +
      '<div class="foot">OneFit Connect prototype · Team 4 · Saint Louis University. Demo data is synthetic and stored only in this browser.</div>' +
      '<button class="fab" data-act="feed-toggle">Data feed<b>' + d.events.length + '</b></button>' +
      '<aside class="drawer ' + (ui.feed ? 'open' : '') + '"><header><h3>Live data feed</h3><button class="btn sec sm" data-act="feed-toggle">Close</button></header><div class="body ev">' + ev + '</div></aside>' + t;
  }

  // ---------- landing ----------
  function landing() {
    var d = DB(), mopts = d.members.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + ' (' + m.id + ', ' + OF.LOCS[m.home].name + ')</option>'; }).join('');
    var lopts = OF.LOC_KEYS.map(function (l) { return '<option value="' + l + '">' + OF.LOCS[l].name + ' (' + l + ')</option>'; }).join('');
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><div class="sp"></div><a class="hbtn" href="#/tutorial" style="text-decoration:none">Tutorial</a></header><main>' +
      '<section class="hero slim"><h1>One membership. Three locations.</h1><p>Choose how you want to enter. No password needed.</p></section>' +
      '<div class="grid g3">' +
      '<div class="card role"><div class="rimg" style="background-image:url(img/member.jpg)"></div><h3>Member</h3><p class="muted small" style="margin:0">Book and manage classes.</p>' +
      '<select id="loginMember">' + mopts + '</select><button class="btn" data-act="login-member">Enter as member</button>' +
      '<button class="btn sec" data-act="signup-open">New here? Create an account</button></div>' +
      '<div class="card role"><div class="rimg" style="background-image:url(img/staff.jpg)"></div><h3>Front-desk staff</h3><p class="muted small" style="margin:0">Check members in, add members, send messages.</p>' +
      '<select id="loginLoc">' + lopts + '</select><button class="btn" data-act="login-staff">Enter as staff</button></div>' +
      '<div class="card role"><div class="rimg" style="background-image:url(img/hero.jpg);background-position:80% 50%"></div><h3>Manager</h3><p class="muted small" style="margin:0">See utilization and churn risk across locations.</p>' +
      '<div style="flex:1"></div><button class="btn" data-act="login-manager">Enter as manager</button></div></div></main>' +
      '<div class="foot">Team 4: Sree Kavya, Siddhartha, Surya Sunder, Krishna Vamsi · Saint Louis University, Information Systems.</div>';
  }
  function tourCardLanding() { return ''; }

  // ---------- tutorial ----------
  function tutorial() {
    return '<header class="hdr"><a class="logo" href="#/landing"><i>◎</i>OneFit Connect</a><div class="sp"></div><a class="hbtn" href="#/landing" style="text-decoration:none">Back to prototype</a></header><main>' +
      '<div class="pagehead"><h1>Tutorial: how to try OneFit Connect</h1><p>About 3 minutes. No login or password is needed.</p></div>' +
      '<div class="card"><h3>Quick demo path</h3><ol class="steps">' +
      '<li><b>Member:</b> choose Aisha Khan (or press <i>Create an account</i> to join as a new member), open <i>Find a class</i>, filter to another location and press <b>Book</b>.</li>' +
      '<li><b>Member:</b> press <b>Book</b> on the same class again. The duplicate is blocked and counted as an error prevented.</li>' +
      '<li><b>Staff:</b> switch role, enter as staff for the class location. The new booking is on the roster. Press <b>Check in</b>.</li>' +
      '<li><b>Staff:</b> open <i>Members</i>, press <b>Add new member</b>, then press <b>Send message</b> on a member who has not visited in a while.</li>' +
      '<li><b>Manager:</b> switch role, open <i>Overview</i> to see utilization and errors prevented, then <i>Churn risk</i> to see the graphs.</li>' +
      '<li><b>Anyone:</b> press <b>Data feed</b> (bottom right) or open <i>Data flow</i> to see each API call and where the data went.</li></ol></div>' +
      '<div class="grid g3" style="margin-top:14px">' +
      '<div class="card"><h3>Member screens</h3><p class="small muted" style="margin:0">Home: next class and membership. Find a class: filters, live seats, book or waitlist. My bookings: cancel, check-in code, ratings, reminder toggle.</p></div>' +
      '<div class="card"><h3>Staff screens</h3><p class="small muted" style="margin:0">Class roster: check in, mark no-show, add walk-ins. Members: add a new member and send SMS or email to members who stopped coming.</p></div>' +
      '<div class="card"><h3>Manager screens</h3><p class="small muted" style="margin:0">Overview KPIs and errors prevented, churn-risk graphs by level and location, and the data-flow pipeline with event log.</p></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Data integration logic</h3><div class="tablewrap"><table><tr><th>Step</th><th>What happens</th><th>Where you see it</th></tr>' +
      '<tr><td><b>Entered</b></td><td>New members, bookings, cancellations, check-ins, ratings, win-back messages</td><td>Member and staff screens</td></tr>' +
      '<tr><td><b>Validated</b></td><td>Duplicate, time-conflict and full-class rules run in the Booking API before anything is saved</td><td>Warning messages, Errors prevented on the manager Overview</td></tr>' +
      '<tr><td><b>Stored</b></td><td>One Shared DB for all three locations (this demo uses browser storage)</td><td>Every screen reads the same records</td></tr>' +
      '<tr><td><b>Processed</b></td><td>Waitlist promotion and the churn engine, which re-scores a member after every visit, cancellation or rating</td><td>Churn risk graphs, Data flow</td></tr>' +
      '<tr><td><b>Retrieved</b></td><td>Class availability, rosters, KPIs and risk lists are queried live from the Shared DB</td><td>Find a class, Roster, Overview</td></tr></table></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Notes</h3><p class="small muted" style="margin:0">This is a prototype. Data is synthetic and stays in your browser (use <i>Reset demo data</i> on the Data flow screen to start over). Messaging, payments and real authentication are represented by the API log, not connected to live services.</p></div></main>';
  }

  // ---------- member ----------
  function memberHome() {
    var m = OF.member(session.memberId), now = new Date();
    var ups = OF.memberBookings(m.id).filter(function (b) { var c = OF.cls(b.classId); return b.status === 'booked' && OF.startOf(c) >= now; })
      .sort(function (a, z) { return OF.startOf(OF.cls(a.classId)) - OF.startOf(OF.cls(z.classId)); });
    var nx = ups[0], nc = nx && OF.cls(nx.classId);
    var nextHtml = nx ? '<div class="row between"><div><h4 style="font-size:18px">' + nc.type + ' with ' + esc(nc.instructor) + '</h4><div class="muted">' + dayLabel(OF.daysBetween(now, OF.parseYmd(nc.date))) + ' · ' + tm(nc) + ' · ' + OF.LOCS[nc.loc].name +
      (nx.cross ? ' <span class="chip blue">Cross-location</span>' : '') + '</div></div><a class="btn" href="#/member/bookings" style="text-decoration:none">Open booking</a></div>'
      : '<p class="muted">You have no upcoming classes.</p><a class="btn" href="#/member/classes" style="text-decoration:none">Find a class</a>';
    return pagehead('Hi, ' + first(m.name), 'Home gym: ' + OF.LOCS[m.home].name + '. Your membership works at all 3 locations.') +
      '<div class="grid g3"><div class="card kpi"><div class="v">' + m.v30 + '</div><div class="l">Visits in the last 30 days</div></div>' +
      '<div class="card kpi"><div class="v">' + ups.length + '</div><div class="l">Upcoming classes</div></div>' +
      '<div class="card kpi"><div class="v">' + (m.ratingN ? m.rating.toFixed(1) : 'None yet') + '</div><div class="l">Your average class rating</div></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Your next class</h3>' + nextHtml + '</div>' +
      '<div class="card" style="margin-top:14px"><h3>How it works</h3><ul class="small" style="margin:0;padding-left:18px">' +
      '<li>One membership works at Location 1, 2 and 3.</li><li>Duplicate and double bookings are blocked.</li>' +
      '<li>Full class? Join the waitlist and you are booked automatically if a seat opens.</li><li>Reminders (' + (m.remind ? 'on' : 'off') + ') help you remember your class.</li></ul></div>';
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
        (x.b.status === 'booked' ? '<button class="btn sec sm" data-act="code" data-b="' + x.b.id + '">Check-in code</button> ' : '') + '<button class="btn danger sm" data-act="cancel" data-b="' + x.b.id + '">Cancel</button></td></tr>';
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
      var opts = d.members.filter(function (m) { return !inClass[m.id]; }).map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + ' (' + m.id + ')</option>'; }).join('');
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
    var loc = session.loc, all = riskList().filter(function (x) { return x.m.home === loc; });
    var need = all.filter(function (x) { return x.r.level !== 'Low'; });
    var list = (ui.sFilter === 'NEED' ? need : all);
    var rows = list.slice(0, 40).map(function (x) {
      var act = x.r.contacted ? '<span class="chip green">Messaged</span>' : (x.r.level === 'Low' ? '' : '<button class="btn sm" data-act="outreach" data-m="' + x.m.id + '">Send message</button>');
      return '<tr><td><b>' + esc(x.m.name) + '</b> <span class="muted small">' + x.m.id + '</span>' + (x.m.kind === 'new' ? ' <span class="chip blue">New</span>' : '') + '</td>' +
        '<td class="small">' + dAgo(x.r.since) + '</td><td>' + lvlChip(x.r) + '</td><td class="right">' + act + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">No members to show.</td></tr>';
    var f = [['ALL', 'All members (' + all.length + ')'], ['NEED', 'Not coming lately (' + need.length + ')']];
    return pageheadBtn('Members · ' + OF.LOCS[loc].name, 'Add new members and message anyone who has stopped coming. Staff send the SMS or email.', '<button class="btn" data-act="addmember-open">+ Add new member</button>') +
      '<div class="card flat" style="margin-bottom:14px">' + seg('sFilter', f, ui.sFilter) + '</div>' +
      '<div class="card"><div class="tablewrap"><table><tr><th>Member</th><th>Last visit</th><th>Churn risk</th><th></th></tr>' + rows + '</table></div></div>';
  }

  // ---------- manager ----------
  function weekStats() {
    var d = DB(), r = { cap: 0, taken: 0, today: 0, cross: 0, loc: {}, day: [] };
    OF.LOC_KEYS.forEach(function (l) { r.loc[l] = { cap: 0, taken: 0 }; });
    for (var i = 0; i < 7; i++) r.day.push({ cap: 0, taken: 0 });
    var today = OF.ymd(new Date());
    d.classes.forEach(function (c) {
      var bs = OF.classBookings(c.id, OF.CONF), di = OF.daysBetween(new Date(), OF.parseYmd(c.date));
      r.cap += c.cap; r.taken += bs.length; r.loc[c.loc].cap += c.cap; r.loc[c.loc].taken += bs.length;
      if (di >= 0 && di < 7) { r.day[di].cap += c.cap; r.day[di].taken += bs.length; }
      if (c.date === today) r.today += bs.length;
      bs.forEach(function (b) { if (b.cross) r.cross++; });
    });
    return r;
  }
  function riskList() { return DB().members.map(function (m) { return { m: m, r: OF.risk(m) }; }).sort(function (a, z) { return z.r.score - a.r.score; }); }
  function mgrOverview() {
    var w = weekStats(), d = DB(), rl = riskList(), high = rl.filter(function (x) { return x.r.level === 'High'; }).length;
    var util = Math.round(w.taken / w.cap * 1000) / 10;
    var locBars = OF.LOC_KEYS.map(function (l) { var p = Math.round(w.loc[l].taken / w.loc[l].cap * 100); return '<div class="r"><span>' + OF.LOCS[l].name + '</span><div class="t"><i style="width:' + p + '%"></i></div><b>' + p + '%</b></div>'; }).join('');
    var dayBars = w.day.map(function (x, i) { var p = x.cap ? Math.round(x.taken / x.cap * 100) : 0; return '<div><span style="font-weight:700;color:#0B2E6B">' + p + '%</span><i style="height:' + Math.max(3, p) + '%"></i><span>' + dayLabel(i).replace('Today', 'Tdy').replace('Tomorrow', 'Tmr').split(' ')[0] + '</span></div>'; }).join('');
    var top = rl.slice(0, 5).map(function (x) { return '<tr><td><b>' + esc(x.m.name) + '</b> <span class="muted small">' + OF.LOCS[x.m.home].name + '</span></td><td>' + lvlChip(x.r) + '</td><td class="muted small">' + x.r.since + ' days since last visit</td></tr>'; }).join('');
    return pagehead('Manager overview', 'Live numbers for all three locations, calculated from the shared records (next 7 days).') +
      '<div class="grid g6" style="margin-bottom:14px">' +
      kpi(util + '%', 'Seat utilization (7 days)') + kpi(w.today, 'Bookings today') + kpi(w.cross, 'Cross-location bookings') +
      kpi(d.stats.errorsPrevented, 'Errors prevented (this demo)') + kpi(high, 'High-risk members') + kpi(d.stats.outreachSent, 'Messages sent by staff') + '</div>' +
      '<div class="grid g2"><div class="card"><h3>Utilization by location</h3><div class="hbars">' + locBars + '</div></div><div class="card"><h3>Utilization by day</h3><div class="cols">' + dayBars + '</div></div></div>' +
      '<div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">Members to watch</h3><a class="btn sec sm" href="#/manager/risk" style="text-decoration:none">Open churn risk</a></div><div class="tablewrap"><table>' + top + '</table></div></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn warn" data-act="rush">Simulate rush (25 booking requests)</button>' +
      (CFG.DASHBOARD_URL ? '<a class="btn sec" href="' + esc(CFG.DASHBOARD_URL) + '" target="_blank" rel="noopener" style="text-decoration:none">Open KPI dashboard</a>' : '') + '</div>';
  }
  function kpi(v, l) { return '<div class="card kpi"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

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
      '<div class="card flat" style="margin-bottom:14px"><div class="grid" style="gap:10px"><div>' + seg('rLevel', lvf, ui.rLevel) + '</div><div>' + seg('rLoc', lc, ui.rLoc) + '</div></div></div>' +
      '<div class="card"><div class="tablewrap"><table><tr><th>Member</th><th>Risk</th><th>Last visit</th><th>Staff message</th></tr>' + rows + '</table></div></div>';
  }

  function mgrFlow() {
    var d = DB(), names = ['Member App', 'Staff App', 'Booking API', 'Shared DB', 'Churn Engine', 'Manager Dashboard', 'Messaging'], sub = {
      'Member App': 'book, cancel, rate', 'Staff App': 'check-in, walk-ins', 'Booking API': 'validate + route', 'Shared DB': 'one record store', 'Churn Engine': 'risk scoring', 'Manager Dashboard': 'KPIs + alerts', 'Messaging': 'reminders, win-back' };
    var pipe = names.map(function (n, i) {
      return '<div class="node ' + (d.lastFlow.indexOf(n) > -1 ? 'lit' : '') + '"><b>' + n + '</b><span>' + (d.nodes[n] || 0) + '</span><small>' + sub[n] + '</small></div>' + (i < names.length - 1 ? '<div class="arrow">→</div>' : '');
    }).join('');
    var ev = d.events.slice(0, 25).map(function (e) { return '<tr><td class="muted small">' + ago(e.ts) + '</td><td><code>' + esc(e.endpoint) + '</code></td><td class="' + (e.level === 'warn' ? 'w' : '') + '">' + esc(e.summary) + '</td><td class="muted small">' + e.flow.join(' → ') + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="muted">No events yet. Use the Member or Staff screens, or press Simulate rush.</td></tr>';
    return pagehead('Data flow', 'How data enters, moves and is processed. Counters show how many events passed through each component; the last event is highlighted.') +
      '<div class="card"><div class="pipe">' + pipe + '</div></div>' +
      '<div class="grid g3" style="margin-top:14px"><div class="card"><h3>Entered</h3><p class="small muted" style="margin:0">Bookings, cancellations, waitlist joins, check-ins, no-shows, ratings and win-back messages arrive through the Booking API from the Member, Staff and Manager screens.</p></div>' +
      '<div class="card"><h3>Processed</h3><p class="small muted" style="margin:0">Rules block duplicates, time conflicts and overbooking. Cancellations promote the waitlist. The churn engine re-scores members after each visit, cancellation or rating.</p></div>' +
      '<div class="card"><h3>Retrieved</h3><p class="small muted" style="margin:0">Class availability, rosters, utilization, cross-location counts and the risk list are queried live from the Shared DB, so every screen agrees.</p></div></div>' +
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
    if (role === 'tutorial') { app.innerHTML = tutorial(); window.scrollTo(0, 0); return; }
    if (!session || session.role !== role || !NAV[role]) { location.hash = '#/landing'; return; }
    var valid = NAV[role].map(function (n) { return n[0]; }); if (valid.indexOf(tab) < 0) tab = valid[0];
    var map = { 'member/home': memberHome, 'member/classes': memberClasses, 'member/bookings': memberBookings, 'staff/roster': staffRoster, 'staff/members': staffMembers, 'manager/overview': mgrOverview, 'manager/risk': mgrRisk, 'manager/flow': mgrFlow };
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
  function after(r) { if (r) toast(r.message, r.ok ? '' : (r.code === 'FULL' ? 'warn' : 'err')); render(); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), v = el.getAttribute('data-v'), A = OF.api;
    switch (a) {
      case 'login-member': setSession({ role: 'member', memberId: document.getElementById('loginMember').value }); go('member/home'); break;
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
      case 'signup-open': memberModal('landing'); break;
      case 'addmember-open': memberModal('staff'); break;
      case 'save-member': var from = el.getAttribute('data-from'), nr = A.addMember(document.getElementById('nm-name').value, document.getElementById('nm-contact').value, document.getElementById('nm-home').value, from === 'staff' ? 'Staff App' : 'Member App');
        if (!nr.ok) { toast(nr.message, nr.code === 'DUPLICATE' ? 'warn' : 'err'); break; }
        ui.modal = null; if (from === 'staff') { after(nr); } else { setSession({ role: 'member', memberId: nr.member.id }); go('member/home'); toast(nr.message); } break;
      case 'sFilter': ui.sFilter = v; render(); break;
      case 'outreach': outreachModal(el.getAttribute('data-m')); break;
      case 'chan': Array.prototype.forEach.call(el.parentNode.children, function (b) { b.classList.remove('on'); }); el.classList.add('on'); var sb = document.getElementById('sendbtn'); sb.setAttribute('data-ch', v); sb.textContent = 'Send ' + v; break;
      case 'send-outreach': var r = A.outreach(el.getAttribute('data-m'), el.getAttribute('data-ch'), 'Staff App'); ui.modal = null; after(r); break;
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
  document.addEventListener('change', function (e) { var el = e.target.closest('[data-act="type"]'); if (el) { ui.type = el.value; render(); } });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', function (e) { if (e.key === 'onefit_connect_db_v1') { OF.reload(); render(); } });
  render();
})();
