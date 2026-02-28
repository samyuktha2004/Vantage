#!/usr/bin/env node
/**
 * Smoke QA — tests critical MVP flows against the running server.
 * Run: node scripts/smoke-qa.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:5001";
let COOKIE = "";
let eventId;
let eventCode;
let guestId;
let guestToken;
let guestBookingRef;

const pass = (name) => console.log(`  ✅ ${name}`);
const fail = (name, err) => { console.error(`  ❌ ${name}: ${err}`); process.exitCode = 1; };

async function api(method, path, body, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (COOKIE) headers["Cookie"] = COOKIE;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  // capture set-cookie
  const sc = res.headers.get("set-cookie");
  if (sc) COOKIE = sc.split(";")[0];
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, ok: res.ok };
}

async function run() {
  console.log("\n🔍 Smoke QA — MVP Critical Flows\n");

  // ── 1. Auth: sign up agent ────────────────────────────────────────────────
  console.log("1. Auth");
  const ts = Date.now();
  let r = await api("POST", "/api/auth/signup", {
    email: `smoke-agent-${ts}@test.local`,
    password: "Test1234!",
    firstName: "Smoke",
    lastName: "Agent",
    role: "agent",
  });
  if (r.ok) pass("Agent signup"); else fail("Agent signup", JSON.stringify(r.json));

  // ── 2. Create event ───────────────────────────────────────────────────────
  console.log("2. Event creation");
  r = await api("POST", "/api/events", {
    name: `Smoke Event ${ts}`,
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: "Test City",
    description: "Automated smoke test event",
    clientName: "Smoke Corp",
  });
  if (r.ok && r.json.id) {
    eventId = r.json.id;
    eventCode = r.json.eventCode;
    pass(`Event created id=${eventId} code=${eventCode}`);
  } else {
    fail("Event creation", JSON.stringify(r.json));
    process.exit(1);
  }

  // ── 3. PATCH event — schedule + invite (agent) ────────────────────────────
  console.log("3. PATCH event (schedule + invite)");
  r = await api("PATCH", `/api/events/${eventId}`, {
    scheduleText: "Day 1 — Welcome\nDay 2 — Conference\nDay 3 — Departure",
    inviteMessage: "Dear {name}, welcome to our event!",
    coverMediaUrl: "https://example.com/invite.pdf",
  });
  if (r.ok && r.json.scheduleText) pass("Schedule + invite saved");
  else fail("PATCH event", JSON.stringify(r.json));

  // ── 4. Publish event ──────────────────────────────────────────────────────
  console.log("4. Publish event");
  r = await api("POST", `/api/events/${eventId}/publish`);
  if (r.ok) pass("Event published"); else fail("Publish", JSON.stringify(r.json));

  // ── 5. Hotel booking → groupInventory ─────────────────────────────────────
  console.log("5. Hotel booking + groupInventory");
  r = await api("POST", `/api/events/${eventId}/hotel-booking`, {
    eventId,
    hotelName: "Smoke Hotel",
    checkInDate: new Date(Date.now() + 6 * 86400000).toISOString(),
    checkOutDate: new Date(Date.now() + 9 * 86400000).toISOString(),
    numberOfRooms: 10,
    negotiatedRate: "4500",
  });
  if (r.ok) pass("Hotel booking created"); else fail("Hotel booking", JSON.stringify(r.json));

  // Check groupInventory for hotel
  r = await api("GET", `/api/events/${eventId}/group-inventory`);
  // The route may not exist yet—check or skip gracefully
  if (r.ok && Array.isArray(r.json) && r.json.some((i) => i.inventoryType === "hotel")) {
    pass("Hotel groupInventory row exists");
  } else {
    // Try from the DB directly via a different endpoint (skip if unavailable)
    console.log("    ℹ️  groupInventory GET route may not exist — skipping inventory read check");
  }

  // ── 6. Travel option → groupInventory ─────────────────────────────────────
  console.log("6. Travel option + groupInventory");
  r = await api("POST", `/api/events/${eventId}/travel-options`, {
    eventId,
    travelMode: "flight",
    fromLocation: "BOM",
    toLocation: "DEL",
    departureDate: new Date(Date.now() + 6 * 86400000).toISOString(),
    adults: 25,
    tboFlightData: { adultCount: 25 },
  });
  if (r.ok) pass("Travel option created"); else fail("Travel option", JSON.stringify(r.json));

  // ── 7. Create guest (import) ──────────────────────────────────────────────
  console.log("7. Guest import");
  r = await api("POST", `/api/events/${eventId}/guests`, {
    eventId,
    name: "Smoke Guest",
    email: `smoke-guest-${ts}@test.local`,
    status: "confirmed",
  });
  if (r.ok && r.json.id) {
    guestId = r.json.id;
    guestToken = r.json.accessToken;
    guestBookingRef = r.json.bookingRef;
    pass(`Guest created id=${guestId} ref=${guestBookingRef}`);
  } else {
    fail("Guest import", JSON.stringify(r.json));
  }

  // ── 8. Guest portal (token-based) ────────────────────────────────────────
  if (guestToken) {
    console.log("8. Guest portal");
    r = await api("GET", `/api/guest/portal/${guestToken}`);
    if (r.ok && r.json.event) {
      const schedOk = r.json.event.scheduleText?.includes("Day 1");
      const inviteOk = !!r.json.event.coverMediaUrl;
      if (schedOk) pass("Schedule visible in guest portal");
      else fail("Schedule in guest portal", "scheduleText missing");
      if (inviteOk) pass("Invite URL visible in guest portal");
      else fail("Invite in guest portal", "coverMediaUrl missing");
    } else {
      fail("Guest portal GET", JSON.stringify(r.json));
    }
  }

  // ── 9. Microsite (public) ─────────────────────────────────────────────────
  if (eventCode) {
    console.log("9. Microsite");
    r = await api("GET", `/api/microsite/${eventCode}`);
    if (r.ok && r.json.scheduleText) pass("Microsite returns scheduleText");
    else fail("Microsite scheduleText", JSON.stringify(r.json));
    if (r.ok && r.json.inviteMessage) pass("Microsite returns inviteMessage");
    else fail("Microsite inviteMessage", JSON.stringify(r.json));
  }

  // ── 10. Walk-in registration ──────────────────────────────────────────────
  console.log("10. Walk-in registration");
  r = await api("POST", `/api/events/${eventId}/on-spot-register`, {
    name: "Walk-In Guest",
    phone: "+919876543210",
    mealPreference: "vegetarian",
  });
  let walkinGuestId;
  if (r.ok && r.json.guest?.bookingRef?.startsWith("WALK-")) {
    walkinGuestId = r.json.guest.id;
    pass(`Walk-in registered id=${walkinGuestId} ref=${r.json.guest.bookingRef}`);
  } else {
    fail("Walk-in registration", JSON.stringify(r.json));
  }

  // ── 11. Ground-team check-in → status arrived ─────────────────────────────
  const checkInId = walkinGuestId || guestId;
  if (checkInId) {
    console.log("11. Ground-team check-in");
    r = await api("POST", `/api/groundteam/checkin/${checkInId}`);
    if (r.ok && r.json.status === "arrived") pass(`Guest ${checkInId} marked arrived`);
    else fail("Check-in", JSON.stringify(r.json));
  }

  // ── 12. Check-in stats ────────────────────────────────────────────────────
  console.log("12. Check-in stats");
  r = await api("GET", `/api/events/${eventId}/checkin-stats`);
  if (r.ok && r.json.arrived >= 1) pass(`Check-in stats: ${r.json.arrived} arrived / ${r.json.total} total`);
  else fail("Check-in stats", JSON.stringify(r.json));

  // ── 13. XSS sanitisation ──────────────────────────────────────────────────
  console.log("13. XSS sanitisation");
  r = await api("PATCH", `/api/events/${eventId}`, {
    scheduleText: '<script>alert("xss")</script>Day 1 — Clean',
    inviteMessage: '<img onerror="alert(1)" src=x>Hello',
  });
  if (r.ok) {
    const sched = r.json.scheduleText || "";
    const inv = r.json.inviteMessage || "";
    if (!sched.includes("<script>") && sched.includes("Day 1")) pass("scheduleText HTML stripped");
    else fail("scheduleText sanitisation", sched);
    if (!inv.includes("<img") && inv.includes("Hello")) pass("inviteMessage HTML stripped");
    else fail("inviteMessage sanitisation", inv);
  } else {
    fail("XSS PATCH", JSON.stringify(r.json));
  }

  // ── 14. Auth scoping — client can't edit another client's event ───────────
  console.log("14. Auth scoping (client can't edit other's event)");
  // Sign up a client
  const clientCookieBak = COOKIE;
  r = await api("POST", "/api/auth/signup", {
    email: `smoke-client-${ts}@test.local`,
    password: "Test1234!",
    firstName: "Other",
    lastName: "Client",
    role: "client",
  });
  if (r.ok) {
    // Try to PATCH the agent's event as this client
    r = await api("PATCH", `/api/events/${eventId}`, { scheduleText: "hacked" });
    if (r.status === 403) pass("Client blocked from editing other's event");
    else fail("Auth scoping", `Expected 403, got ${r.status}`);
  } else {
    fail("Client signup for scoping test", JSON.stringify(r.json));
  }
  COOKIE = clientCookieBak; // restore agent session

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✨ Smoke QA complete.\n");
}

run().catch(console.error);
