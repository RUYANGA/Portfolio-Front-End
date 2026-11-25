# Frontend – Next.js site and admin dashboard

The public portfolio and the `/admin` dashboard, in one Next.js 14 app (App Router, TypeScript).

## Local development

```bash
npm install
cp .env.example .env.local     # points at the backend on http://localhost:8000
npm run dev                    # http://localhost:3000, dashboard at /admin
npx tsc --noEmit               # type-check
```

## Deploy to Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
   The framework (Next.js) is detected automatically.
2. Add these **Environment Variables** (Production, and Preview if you use previews):

   | Name | Value |
   |---|---|
   | `API_URL` | `https://api.ruyanga.tech` |
   | `NEXT_PUBLIC_API_URL` | `https://api.ruyanga.tech` |
   | `NEXT_PUBLIC_SITE_URL` | `https://ruyanga.tech` |

3. Deploy, then add your domain under **Settings → Domains**.
4. On the backend, set `CORS_ALLOWED_ORIGINS` to the same site domain(s).

`NEXT_PUBLIC_*` values are built into the browser code, so redeploy after changing them.

Notes:
- Pages re-render at most once a minute and instantly after a dashboard save.
- Uploads from the dashboard pass through Vercel, which limits requests to 4.5 MB. Large photos
  are resized in the browser before upload; files over 4 MB are refused with a clear message.
- The dashboard sign-in cookie is HTTPS-only in production (Vercel is always HTTPS).

## Structure

```
src/
├── app/
│   ├── (site)/            public pages: home, /projects/[slug]
│   ├── admin/             dashboard: login, overview, profile, resources, messages, account
│   ├── admin-api/         server proxy to Django /api/admin (adds the session token)
│   ├── layout.tsx  not-found.tsx  robots.ts  sitemap.ts  icon.svg
├── components/
│   ├── site/              Header, Footer, LiveApi, ProjectVisual, CertificateGallery, ResumeButton…
│   ├── admin/             AdminShell, ResourceList, ResourceForm, Fields, Inbox, Feedback…
│   └── ui/                Modal, Icons, TechIcon, ThemeToggle
├── lib/
│   ├── api/               getPortfolio, types, fallback.json
│   └── admin/             client (fetch + uploads), resources (what's editable), session
├── styles/                globals.css (site + shared), admin.css
└── middleware.ts          sends signed-out visitors from /admin to the sign-in page
```

To make a new field editable in the dashboard, expose it in the backend admin serializer and add
it to the matching resource in `src/lib/admin/resources.ts`.
