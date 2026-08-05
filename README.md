# The CBC — social network MVP prototype

A working prototype of a Facebook-style social app for mobile, with paid
group subscriptions settled through an in-app wallet and topped up via
real M-Pesa (Safaricom Daraja) STK push.

Two parts:
- **`backend/`** — Node/Express API: auth, feed, reels, stories, groups,
  subscriptions, wallet ledger, sponsored ads, and the M-Pesa integration.
- **`mobile/`** — React Native (Expo) app that talks to that API: login/register,
  Feed with reactions and sponsored ads, Stories, Reels, Groups with a
  subscription paywall, and a Wallet screen with M-Pesa top-ups.

Data currently lives in an in-memory store (`backend/db.js`) so you can run
everything with zero external setup — swap it for Postgres/Mongo when you
move past prototyping (see below).

## Running it

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in Daraja sandbox keys to test real M-Pesa
npm run dev             # http://localhost:4000
```

**Mobile app**
```bash
cd mobile
npm install
npx expo start
```
Edit `mobile/api/client.js` and set `API_BASE_URL` to your machine's LAN IP
(not `localhost`) if you're testing on a physical phone via Expo Go, e.g.
`http://192.168.1.20:4000/api`.

Seeded test login: `amina@example.com` / `password123` (wallet balance
already funded so you can try subscribing to the seeded group immediately),
or register a new account from the app.

## How the money flow works
- **Wallet top-up** (`POST /api/wallet/topup`): triggers a real Safaricom
  Daraja STK push to the user's phone. The wallet is **not** credited
  immediately — Safaricom calls `POST /api/wallet/mpesa/callback`
  asynchronously once the user enters their PIN (or cancels), and that's
  what actually credits the balance. Requires a publicly reachable HTTPS
  callback URL in `.env` — use `ngrok` while developing locally.
- **Group subscription** (`POST /api/groups/:id/subscribe`): pays out of
  the wallet balance you've already topped up (not a fresh M-Pesa prompt
  per subscription — same pattern as Patreon etc.). The subscriber is
  debited, the group admin is credited 90% (platform keeps a 10% fee, see
  `PLATFORM_FEE_PCT` in `backend/routes/groups.js`), and a subscription
  record with an expiry is created.
- Every movement is recorded in `walletTransactions` — a simple ledger you
  can build reporting/payout tooling on top of.

## What's still needed before a real launch

**1. Daraja credentials**
Get sandbox keys at developer.safaricom.co.ke, put them in `backend/.env`.
Sandbox uses shortcode `174379`. Going live requires a paybill/till number
and Safaricom's go-live approval process.

**2. Persistent database**
Replace `backend/db.js` with Postgres (or similar) — the in-memory store
resets on every server restart and won't survive multiple server instances.

**3. Admin payouts**
Right now admin earnings just sit in their in-app wallet balance. You'll
need a "cash out" flow using the M-Pesa **B2C API** to actually send that
money to admins' phones, typically on a schedule with payout minimums.

**4. Compliance**
Handling other people's money in Kenya generally means either partnering
with a licensed payment service provider or engaging with CBK requirements
directly — worth a conversation with a fintech lawyer before real money
moves through this, not an afterthought.

**5. Media**
Reels/Stories/post images currently reference placeholder URLs. Real video
needs upload + transcoding (e.g. Mux) and a player (`expo-av`); images need
object storage (S3/R2) plus a CDN.

**6. Security hardening**
Passwords are stored in plaintext in the seed data — add bcrypt hashing
before this touches real user data. Add rate limiting on auth and
`/wallet/topup` too.

## Suggested next step
The wallet + subscription payment path is the highest-risk, highest-value
part of this product — I'd get the Daraja sandbox flow fully working
end-to-end (real STK push, real callback, ngrok tunnel) next, before
investing further in UI polish.
