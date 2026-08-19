# BantayAyuda

Relief goods and distribution tracking web app for Manolo Fortich's 22 barangays.

**Stack:** React (Vite) + Tailwind CSS · Supabase (Auth, Postgres, Storage) · Vercel

## 1. Open in VS Code

```bash
cd bantayayuda
npm install
```

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (Singapore region recommended).
2. Open **SQL Editor** in your Supabase dashboard, paste the contents of
   `supabase/schema.sql`, and run it. This creates all tables, RLS policies,
   and the `signatures` storage bucket.
3. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
4. Copy `.env.example` to `.env` and fill in those two values:

```bash
cp .env.example .env
```

## 3. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, **Import Project** from that repo (framework preset: Vite).
3. Add the same two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) under **Project Settings → Environment Variables**.
4. Deploy.

## Project structure

```
src/
├── pages/
│   ├── LandingPage.jsx          # role selection + public donation feed
│   ├── donor/                   # login, dashboard, distribution status
│   ├── admin/                   # login, dashboard, donations/registry/distribution tabs
│   └── beneficiary/             # register, dashboard, aid history
├── components/
│   ├── ui/                      # Button, Card, Badge
│   └── ESignatureCanvas.jsx     # HTML5 canvas signature capture (mouse + touch)
├── lib/supabase.js              # Supabase client
└── App.jsx                      # routes
supabase/schema.sql              # full DB schema + RLS policies
```

## Notes

- Colors, roles, and layout follow the approved prototype (Donor = green,
  Administrator = red, Beneficiary = blue), defined in `tailwind.config.js`.
- Donations are logged by donors but only become `confirmed` once an admin
  records them (`DonationsTab.jsx`) — matches the capstone's duplicate-aid
  prevention design, where the backend registry is the source of truth.
- The barangay aid map (`AdminDashboard.jsx`) is a placeholder — plug in your
  SVG/GeoJSON map of the 22 barangays where indicated.
- Admin accounts should be created directly in Supabase (Auth → Users) with
  `role: admin` set in `profiles`, not through public self-registration.
