# TBO API Setup & Credentials Guide

**Platform:** Vantage
**Last Updated:** February 2026

---

## Overview

Vantage integrates with two TBO APIs:

| API                              | Purpose                                                   | Auth Method                                    |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| **TBO Hotel API** (B2B Holidays) | Hotel search, room booking, cancellation                  | HTTP Basic Auth                                |
| **TBO Air API** (B2C GDS)        | Flight search, fare quote, fare rules, booking, ticketing | Token-based (session token via ValidateAgency) |

All API calls are **server-side only**. The browser (React frontend) never directly contacts TBO servers — it calls your Express backend which proxies requests.

---

## Step 1: Get Your Credentials

### TBO Hotel API (B2B)

Contact your TBO account manager or log in to the TBO B2B portal. You will receive:

- **Username** (e.g., `tbo_agent_xxxxx`)
- **Password**
- **Base URL**: `http://api.tbotechnology.in/TBOHolidays_HotelAPI` (standard endpoint)

### TBO Air API (B2C/GDS)

From the Postman environment file (`TBOIndia BE.postman_environment.json`) you will have:

- **RC_TBOAIR_URL** — the base URL for the flight API
- **ClientId / UserName** — your agency username (e.g., `albukhari`)
- **Password** — your agency password
- **IPAddress** — the IP address of your server (used in auth payload)

---

## Step 2: Add Credentials to `.env`

Open the `.env` file at the project root and fill in your values:

```bash
# ─── TBO Hotel API (B2B Holidays) ───────────────────────────────────────
# Base URL (do NOT include trailing slash)
TBO_HOTEL_URL=http://api.tbotechnology.in/TBOHolidays_HotelAPI

# Your TBO B2B Hotel credentials
TBO_HOTEL_USERNAME=your_hotel_username_here
TBO_HOTEL_PASSWORD=your_hotel_password_here

# ─── TBO Air API (B2C/GDS) ──────────────────────────────────────────────
# Base URL (from RC_TBOAIR_URL in Postman environment)
TBO_AIR_URL=https://api.tbotech.com

# Your TBO Air credentials (from Postman: ClientId / UserName / Password)
TBO_AIR_CLIENT_ID=your_air_client_id_here
TBO_AIR_PASSWORD=your_air_password_here

# Your server's public IP (required by TBO auth payload)
TBO_AIR_SERVER_IP=127.0.0.1
```

> **Security Note:** Never commit `.env` to git. The `.gitignore` already excludes it. Only `.env.example` (with placeholder values) is tracked.

---

## Step 3: Verify Hotel API Connection

Test with curl (or use the provided Postman collection):

```bash
# Get country list (no body required)
curl -X GET \
  "http://api.tbotechnology.in/TBOHolidays_HotelAPI/CountryList" \
  -H "Authorization: Basic $(echo -n 'YOUR_USERNAME:YOUR_PASSWORD' | base64)" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "Status": { "Code": 200, "Description": "Successful" },
  "CountryList": [
    { "Code": "IN", "Name": "India" },
    { "Code": "AE", "Name": "United Arab Emirates" },
    ...
  ]
}
```

---

## Step 4: Verify Air API Authentication

```bash
# Get a session token
curl -X POST \
  "YOUR_TBO_AIR_URL/Authenticate/ValidateAgency" \
  -H "Content-Type: application/json" \
  -d '{
    "ClientId": "YOUR_CLIENT_ID",
    "UserName": "YOUR_USERNAME",
    "Password": "YOUR_PASSWORD",
    "EndUserIp": "YOUR_SERVER_IP",
    "BookingMode": "API"
  }'
```

Expected response:

```json
{
  "TokenId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "Member": {
    "AgencyId": "12345",
    "AgencyName": "Your Agency Name",
    "Email": "you@agency.com"
  },
  "Error": { "ErrorCode": 0, "ErrorMessage": "" }
}
```

The `TokenId` is automatically cached server-side for 55 minutes. You will NOT need to call this endpoint manually — the flight service handles it transparently.

---

## Step 5: Test via Vantage Routes

Once credentials are set and the server is running (`npm run dev`), test the proxy endpoints:

```bash
# Hotel: Get countries
curl http://localhost:5000/api/tbo/hotel/countries \
  -H "Cookie: your_session_cookie_here"

# Hotel: Get cities for India
curl "http://localhost:5000/api/tbo/hotel/cities?countryCode=IN" \
  -H "Cookie: your_session_cookie_here"

# Flight: Search (example payload)
curl -X POST http://localhost:5000/api/tbo/flight/search \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie_here" \
  -d '{
    "origin": "DEL",
    "destination": "DXB",
    "departureDate": "2026-04-15",
    "journeyType": "OneWay",
    "adults": 10,
    "children": 0,
    "infants": 0,
    "directFlight": false
  }'
```

> **Note:** All proxy routes require an authenticated agent session. Sign in at `/auth/agent/signin` first and use the session cookie.

---

## TBO Air API — Full Flow Reference

The flight booking flow is multi-step. Each step depends on data from the previous:

```
1. ValidateAgency → TokenId (cached server-side, you don't need to call this)
          ↓
2. /Search/ → TraceId + array of results (each with ResultIndex)
          ↓
3. /FareQuote/ (TraceId + ResultIndex) → confirmed Fare + LastTicketDate + MiniFareRules
          ↓
4. /FareRule/ (TraceId + ResultIndex) → full cancellation rules text
          ↓ (optional — show to agent before booking)
5. /SSR/ (TraceId + ResultIndex) → seat map + baggage options
          ↓
6. /Booking/Book (full passenger details + ResultIndex + TraceId) → PNR
          ↓
7. /Booking/Ticket (PNR + passenger details) → Ticket numbers (eTickets issued)
```

**Critical:** `TraceId` from step 2 must be passed to ALL subsequent steps. It identifies the search session on TBO's end. It is NOT stored in the database until step 7 completes — it lives in server memory/React state during the booking flow.

---

## TBO Hotel API — Full Flow Reference

```
1. /CountryList → country codes
          ↓
2. /CityList (CountryCode) → city codes
          ↓
3. /TBOHotelCodeList (CityCode) → hotel codes + names
          ↓
4. /Hoteldetails (HotelCodes) → full hotel info (amenities, images, description)
          ↓
5. /search (CheckIn, CheckOut, HotelCodes, PaxRooms) → room availability + rates + BookingCode
          ↓
6. /PreBook (BookingCode, PaymentMode) → confirms rate hold, returns updated BookingCode
          ↓
7. /Book (BookingCode, CustomerDetails, ClientReferenceId) → ConfirmationNumber
          ↓
8. /BookingDetail (ConfirmationNumber) → full booking details (for display)
   /Cancel (ConfirmationNumber) → cancellation (with refund policy applied)
```

**PaymentMode options:**

- `"Limit"` — charged against your TBO credit limit (B2B standard)
- `"CreditCard"` — direct card payment

---

## Environment Variables Quick Reference

| Variable             | API   | Description                                  |
| -------------------- | ----- | -------------------------------------------- |
| `TBO_HOTEL_URL`      | Hotel | Base URL (no trailing slash)                 |
| `TBO_HOTEL_USERNAME` | Hotel | B2B username                                 |
| `TBO_HOTEL_PASSWORD` | Hotel | B2B password                                 |
| `TBO_AIR_URL`        | Air   | Base URL from `RC_TBOAIR_URL`                |
| `TBO_AIR_CLIENT_ID`  | Air   | Agency ClientId for ValidateAgency           |
| `TBO_AIR_PASSWORD`   | Air   | Agency password for ValidateAgency           |
| `TBO_AIR_SERVER_IP`  | Air   | Your server public IP (sent in auth payload) |

---

## Troubleshooting

| Error                                   | Cause                                                | Fix                                                                            |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `401 Unauthorized` on Hotel API         | Wrong credentials in Basic Auth header               | Check `TBO_HOTEL_USERNAME` and `TBO_HOTEL_PASSWORD` in `.env`                  |
| `TokenId` not returned from Air Auth    | Wrong `ClientId` or `Password`                       | Verify `TBO_AIR_CLIENT_ID` and `TBO_AIR_PASSWORD` match Postman environment    |
| Hotel search returns empty `HotelRooms` | Hotel code invalid or no availability                | Try different hotel codes from `/TBOHotelCodeList`                             |
| `TraceId` mismatch error on FareQuote   | Search session expired (TBO sessions expire quickly) | Re-run flight search; don't wait more than ~5 min between search and fareQuote |
| `403 Forbidden` on `/api/tbo/*` routes  | Not signed in as agent                               | Sign in at `/auth/agent/signin` first                                          |
