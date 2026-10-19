# Arul Motors CRM (frontend)

The showroom CRM for **Arul Motors Yamaha, Nazareth**: customers, bikes, service
bookings, call outcomes, and the **AI voice agent** built in, so staff can start a
follow-up call for any customer from inside the CRM.

- **Stack:** Next.js 16 (App Router, static export) · React 19 · TypeScript ·
  Tailwind CSS v4 · [shadcn/ui](https://ui.shadcn.com) (Radix, Nova preset) ·
  TanStack Query + Table · Recharts · Pipecat JS client (WebRTC)
- **Backend:** `../Arul-Motors/api.py` (FastAPI, staff logins) + `bot.py` (voice agent)
- **Hosting:** static files on GoDaddy. All data comes from the API at runtime.

## Screens

| Route | What it does |
|---|---|
| `/login` | Staff sign-in (accounts come from the API; no hard-coded users) |
| `/dashboard` | KPIs, bookings in the next 14 days, call outcomes (30 days), calls per day, today's workshop list, due follow-ups, recent calls |
| `/follow-ups` | The agent's call queue: bikes due in 7/14/30 days and not booked. **Call** with the agent, **Book** manually, or log a call |
| `/customers` | Searchable, sortable customer table; add customers (optionally with their first bike) |
| `/customers/view/?id=N` | Customer profile: bikes with service progress, service history (reschedule / mark serviced / cancel), call timeline, Call with agent |
| `/bikes` | Every bike sold, with next-service status; record a new bike sale |
| `/appointments` | Bookings by state (Upcoming, Today, Missed, Completed, Cancelled) with actions |
| `/calls` | Call log with outcome filter and summary cards |
| `/service-types` | The services the workshop offers: add / edit / reorder / activate. Free or paid, due after N days or km (scheduled) or on demand, optional price (staff only). Used by every form; marking a bike serviced suggests the next scheduled type and its due date |
| `/settings` | Profile and password, team management (admins), voice-agent status, system info |

Everywhere: **⌘K / Ctrl+K** search (customers and pages), **New** menu
(customer, bike sale, booking), light/dark theme.

## Live updates (WebSocket)

After sign-in the CRM opens a WebSocket to the API
(`wss://backend.arulmotors.com/api/ws`, from `NEXT_PUBLIC_API_URL`); see
`components/live-provider.tsx`. GoDaddy only serves the static files; the live
connection goes straight from the browser to the GCP backend.

- **Live data:** when the agent books a date or logs an outcome, or another
  staff member edits something, the affected screens (dashboard, follow-ups,
  customers, bikes, appointments, call log) refresh instantly.
- **Live calls:** a green "N live calls" pill in the header and a dashboard
  banner show every call the agent is on, with timers, whoever started it.
  When a call ends, a toast shows its outcome.
- **Notifications:** the bell shows the agent's bookings, reschedules,
  cancellations, call-back requests, not-interested and no-answer calls, and
  missed bookings. New ones also pop up as toasts. The read state is kept per
  browser.
- **Status and reconnects:** the header shows **Live** while connected. It
  reconnects automatically (with back-off, and right away when the tab or the
  network comes back). Pages still refresh periodically if the connection is
  down.

## Performance

Initial JavaScript per page, before → after (gzip):

| Page | Before | After |
|---|---|---|
| Dashboard | 554 KB | 284 KB |
| Customers | 460 KB | 307 KB |
| Customer profile | 450 KB | 287 KB |

- **Lazy-loaded heavy code:**
  - The Pipecat WebRTC client (~0.5 MB) loads only when a call starts,
    preloaded on hover over **Call with agent**
    (`components/call/call-provider.tsx`).
  - The dashboard charts (recharts) load after the numbers
    (`components/dashboard/charts.tsx`).
  - The ⌘K search window loads on first use.
- **Dialogs on demand:** every form dialog is code-split
  (`components/forms/lazy.ts`) and mounted only while open, so a table row no
  longer carries 3–4 hidden dialogs.
- **Prefetch:** hovering a customer row prefetches their profile.
- **Live instead of polling:** while the WebSocket is connected, data
  refreshes from events and the dashboard stops polling. Polling is only the
  fallback.
- **Free revalidation:** the API sends ETags, so refetches of unchanged data
  are empty `304`s handled by the browser.
- **Responsive search:** table search filters with `useDeferredValue`.
- **Bounded call log:** the newest 1,000 calls, with the true total shown.

## Calling a customer with the voice agent

**Call with agent** opens a floating call panel:
- It shows live audio meters, a transcript (when the agent sends one), mute and end.
- The browser's WebRTC offer goes to `POST /api/voice/offer` with the staff
  login and `customer_id`. The API checks both and relays the offer to the bot
  on the server. The voice page's own password isn't needed.
- Audio then flows directly between the browser and the bot (UDP).
- When the call ends, the CRM refreshes, so the outcome and any booking the
  agent made appear immediately.
- A microphone is required. Real phone calls replace this once telephony
  (Plivo) is enabled on the backend.

## Develop

```bash
# 1. API (in ../Arul-Motors, conda env "deeplearning")
CRM_ADMIN_PASSWORD=choose-one python api.py      # creates user "admin" on first run; port 8001
# optional, for calls: python bot.py              # port 7860

# 2. CRM
npm install
npm run dev                                      # http://localhost:3000
```

`.env.development` points the CRM at `http://localhost:8001`. Checks:
`npm run typecheck`, `npm run build`.

## Build and deploy to GoDaddy

```bash
npm run build          # uses .env.production → https://backend.arulmotors.com
```

1. Upload the **contents** of `out/` to the site's folder in cPanel → File
   Manager. For `crm.arulmotors.com`, create the subdomain in cPanel first.
   Its document root is usually `public_html/crm.arulmotors.com`.
   - Every page is a folder with an `index.html` (`trailingSlash`), so no
     server rewrite rules are needed.
2. In Cloudflare DNS, point `crm` at the GoDaddy hosting, like the other
   GoDaddy records (the IP `118.139.182.126`). Enable HTTPS in cPanel → SSL/TLS
   Status (AutoSSL).
3. On the VM, allow the CRM's address to call the API: in
   `/opt/arul-motors/.env` set `CORS_ORIGINS=https://crm.arulmotors.com`,
   then `sudo systemctl restart arul-api`.
4. Create the first login on the VM:
   `cd /opt/arul-motors && sudo -u arul .venv/bin/python api.py create-user admin --role admin --name "Your Name"`.
   Add the rest of the team from **Settings → Team**.

The API URL is baked in at build time. To change it, edit `.env.production`
and rebuild.

## Structure

```
app/
  login/                 sign-in page
  (crm)/layout.tsx       signed-in shell: sidebar, header, call panel, auth guard
  (crm)/dashboard … settings/
components/
  ui/                    shadcn/ui components (generated; update with `npx shadcn add`)
  layout/                sidebar, header, ⌘K command menu, navigation
  call/                  voice-agent call provider + floating call panel
  forms/                 customer, bike, booking, mark-serviced, log-call dialogs
  data-table.tsx         sortable/searchable/paginated table
  actions.tsx            Call with agent button + row action menus
lib/
  api.ts                 fetch wrapper (Bearer token, errors, 401 → sign-in)
  queries.ts             TanStack Query hooks and mutations
  types.ts · format.ts · session.ts
```
