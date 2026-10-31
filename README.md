# QueueFree

A responsive React + Vite hospital OPD queue app with a Django REST Framework API, PostgreSQL support, demo token booking, and hospital-scoped staff dashboards.

## Start the frontend

```sh
npm install
npm run build
npm run dev
```

Copy `.env.example` to `.env.local` when the API is not at `http://127.0.0.1:8000/api/v1`. The frontend uses `VITE_API_URL`; `VITE_API_POLL_MS` controls dashboard refresh polling.

### Local dashboard preview

To inspect the Doctor and Reception dashboards without signing in, set `VITE_ENABLE_DASHBOARD_PREVIEW=true` in `.env.local` and run the Vite development server (`npm run dev`). The preview uses clearly labelled synthetic sample rows and local-only queue controls; it does not connect to the API or modify database records. This flag is honored only by Vite's non-production development server and is always disabled in builds. Remove the setting or set it to `false` to restore the normal staff login flow.

## Backend setup

The backend runs with PostgreSQL when `DATABASE_URL` is a PostgreSQL URL. If `DATABASE_URL` is unset, it uses SQLite for local development and tests. Install PostgreSQL, create a database/user, then set the backend environment variables shown in `backend/.env.example`. The backend does not load `.env` files automatically; export the variables in your shell or use your deployment's secret/environment manager.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:DJANGO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(48))")
$env:DJANGO_DEBUG = "true"
$env:DATABASE_URL = "postgresql://queuefree:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/queuefree"
$env:DEMO_SEED_PASSWORD = "Choose-a-local-demo-password-2026!"
python backend\manage.py migrate
python backend\manage.py seed_demo
python backend\manage.py runserver 127.0.0.1:8000
```

In another terminal, run the frontend. For SQLite-only local tests, leave `DATABASE_URL` unset before invoking `manage.py test`.

### Demo accounts

Set `DEMO_SEED_PASSWORD` before running the seeder. The seeded staff usernames are:

- Reception: `reception.demo`
- Doctor: `doctor.demo`
- Demo password: the value you set in `DEMO_SEED_PASSWORD` (use a unique value outside local development)

Patients use the simulated ABHA-style ID/OTP dialog. The ID and one-time code are fake demo values; this is not ABDM authentication. Never use a real ABHA ID. Demo sign-in also requires a phone number in international format and explicit consent for WhatsApp queue notifications. The number and consent timestamp are stored on the demo patient profile; no WhatsApp messages are sent because no messaging service is configured.

## Nearby cities and hospitals

City suggestions and nearby hospital listings use the public Photon geocoding/search service and OpenStreetMap data. Type a city, choose a full city/state/country suggestion, and hospital results appear in the app. Hospital records may include address, phone, website, and opening hours; completeness and geographic coverage depend on OpenStreetMap contributions. The demo service can be rate limited and has no uptime guarantee. For a production deployment, use an appropriately hosted Photon service and a maintained hospital directory.

## Demo flows

- Patient booking and queue screens use the shared API; the API/database is the source of truth, not browser localStorage. Reception and doctor dashboards are available at `/reception` and `/doctor`; they poll the authenticated, hospital-scoped API every five seconds.
- The in-app Reception console also includes fictional, generated doctor profile metrics for browsing by department and doctor. Those demo values persist in this browser and are separate from shared API bookings and real availability.
- Seeded facilities demonstrate Type A (simulated hospital API adapter), Type B (demo website placeholder; no QueueFree confirmation), and Type C (QueueFree-managed token allocation). No seeded facility is a real hospital integration.
- Type C allocation is transactional, row-locked on PostgreSQL, and protected by database constraints and an idempotency key. Type A demo reservations are delegated to the adapter and are not represented as a real hospital booking. A Type B booking opens only the configured website URL and never creates a token.
- Required payments are explicitly simulated by the demo provider when `DEMO_PAYMENTS_ENABLED=true`; no real payment is collected. Refund percentages come from each hospital's policy. Configure a real payment adapter before claiming payments are live.
- Dashboards use polling rather than WebSockets/Channels. The server persists queue changes before the next poll; a production deployment needing lower latency can replace polling with authenticated Django Channels groups.
- ABHA is a simulated flow only: generate a fake `DEMO-ABHA-…` ID, then reveal and enter the one-time code in the dialog. The code expires after five minutes and allows three attempts. No actual ABHA ID should be entered, no SMS or WhatsApp is sent, and the app does not connect to ABDM. Production ABHA verification requires official ABDM integration and a secure backend; this demo is not real authentication.
- Patient sign-in validates an international-format phone number and requires consent before creating a demo session. The backend stores the phone and consent timestamp on the patient profile, but notification delivery is not implemented or configured.
- ABHA, the Type A hospital adapter, and payments are simulated. No live hospital booking API or payment provider credentials are configured. The backend does not contact ABDM or send SMS messages.

## Build

```sh
npm run build
npm run preview
```
## Project structure

```text
src/
  App.jsx                  App state, data loading, and page coordination
  components/
    Reveal.jsx             Reduced-motion-aware scroll reveal wrapper
    AppHeader.jsx          Header, theme, language, and sign-in controls
    AppNavigation.jsx      Footer and responsive bottom navigation
    AuthModal.jsx          Two-step demo ABHA verification dialog
    HospitalCard.jsx       Hospital listing and expandable details
    LocationPanel.jsx      Hospital pin, route, and location details
    maps/MapCanvas.jsx     Lazy Google Maps or Leaflet map adapter
    IconButton.jsx         Shared icon-only button
    pages/
      HomePage.jsx         Home and queue preview
      NearbyPage.jsx       City search and hospital results
      BookingPage.jsx      Shared API availability and booking flow
      QueuePage.jsx        Patient booking history and queue status
      PatientBookingsPage.jsx Patient cancellation/reschedule controls
    dashboards/
      HospitalDashboard.jsx Hospital-scoped reception/doctor portal
  lib/
    appData.js             Sample hospital data, queue helpers, and distance math
    queueApi.js            Versioned API client and in-memory JWT session
  styles.css               Tailwind import and shared responsive styles
  ui-refresh.css           Shared palette tokens and responsive premium UI styling
backend/
  queuefree_backend/       Django settings, URLs, ASGI/WSGI
  queue_api/               Models, permissions, serializers, API, seed command, and tests
```

The project uses Vite with React and Tailwind CSS. Add a page in `src/components/pages/`, then connect it from the tab switch in `src/App.jsx`.

## Visual design system

The shared palette is defined in `src/ui-refresh.css` as CSS custom properties: deep blue-gray `#2F4454`, dark burgundy `#2E151B`, dusty rose `#DA7B93`, muted teal `#376E6F`, and forest teal `#1C3334`. Patient, staff, authentication, booking, and queue surfaces reuse these tokens; success, pending, warning, and error states keep distinct semantic treatments. The location/map components and their provider behavior are unchanged.

## Hospital location maps

Every nearby and booking hospital card has a **View location** action. It opens a responsive location panel with the hospital pin, address/contact details when present in OpenStreetMap, queue count, directions, travel modes, and Google Maps / WhatsApp links. The Nearby screen shows results beside a clustered map on desktop and stacks them on narrow screens. Choosing a hospital from the panel continues into booking; opening and closing the panel keeps the current search and list in place.

- Without a Google key (the default), the map is lazy-loaded Leaflet with OpenStreetMap tiles, marker clustering, and OSRM route estimates for car, bike, and walking. Transit uses an approximate fallback estimate; select Google Maps to get provider transit directions.
- To use Google Maps, copy `.env.example` to `.env.local`, set `VITE_MAPS_PROVIDER=google` and `VITE_GOOGLE_MAPS_API_KEY`, then restrict the browser key to your deployed origins in Google Cloud. Enable Maps JavaScript API and Directions. Never put a server key in a `VITE_` variable.
- Hospital coordinates and optional contact/opening-hour fields are taken from the Photon/OpenStreetMap result. Some records lack coordinates or detailed business information; the panel keeps the address visible and explains when a map pin is unavailable.
- The Location and Browse Nearby screens remain on their existing Photon/OpenStreetMap flow. They are intentionally separate from the seeded demo hospital directory: selecting a real-world map listing does not imply QueueFree integration or booking support for that hospital.

## API overview

All REST endpoints are under `/api/v1/`. Public reads include `hospitals/`, `hospitals/{id}/departments/`, `doctors/`, and `availability/`. Simulated patient sign-in is `auth/patient/demo/`; staff sign-in is `auth/staff/login/`. JWT-protected patient endpoints provide bookings, cancellation, rescheduling, and demo payment confirmation. Staff endpoints provide hospital/doctor-scoped queue reads and queue actions. Integration configuration is restricted to hospital administrators.

The API uses consistent JSON error envelopes, DRF pagination, role checks, and hospital-level scoping. Do not deploy with the development `DJANGO_SECRET_KEY`, debug enabled, permissive CORS, or demo credentials.

## Tests

```powershell
npm test
npm run build
python backend\manage.py test queue_api
python backend\manage.py check
```

The last-slot concurrent booking test uses PostgreSQL row locks and is skipped when the test database is SQLite. Run it against PostgreSQL to verify production concurrency behavior.
