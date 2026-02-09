# 🚀 Deployment Guide

## Issue: Convex Types Not Generated

The recent features (alerts system, emails, crons) need Convex types to be regenerated.

## Quick Fix (5 minutes)

### Step 1: Set Up Convex Environment
```bash
cd frontend

# Add Convex credentials to .env.local
# Get these from your Convex dashboard: https://dashboard.convex.dev
cat >> .env.local <<EOF
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here
NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url_here
CONVEX_DEPLOYMENT=dev:your-project-name
EOF
```

### Step 2: Run Convex Dev (Regenerates Types)
```bash
npx convex dev
```

This will:
- Push schema changes (alerts, emails, crons)
- Generate TypeScript types
- Update `convex/_generated/api.d.ts`

### Step 3: Deploy to Vercel
```bash
# From frontend directory
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

---

## Alternative: Manual Type Fix (If You Can't Run Convex Dev)

If you don't have Convex credentials, temporarily comment out the alerts page:

### frontend/app/dashboard/layout.tsx
```typescript
// Temporarily comment out Alerts menu item
const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'KPI Entries', href: '/dashboard/kpi', icon: FileSpreadsheet },
  // { label: 'Alerts', href: '/dashboard/alerts', icon: Bell }, // COMMENTED OUT
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  //...
];
```

### Move alerts page temporarily
```bash
mv frontend/app/dashboard/alerts frontend/app/dashboard/alerts.disabled
```

Then deploy:
```bash
vercel --prod
```

Once you have Convex credentials, uncomment and redeploy.

---

## Environment Variables Needed for Full Deployment

### Convex (Required)
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site
CONVEX_DEPLOYMENT=dev:your-project-name
```

### WorkOS (Required for Auth)
```
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_01...
WORKOS_COOKIE_PASSWORD=random_32_char_string
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### Resend (For Email Alerts)
```
RESEND_API_KEY=re_3SQsR4xF_BtWQ82qeu3uyDPu5U3K1tcNQ
```

---

## Add Environment Variables to Vercel

```bash
# Set environment variables in Vercel
vercel env add NEXT_PUBLIC_CONVEX_URL
vercel env add WORKOS_API_KEY
vercel env add RESEND_API_KEY
# ... add all others
```

Or add them in the Vercel dashboard:
https://vercel.com/dgans-projects/frontend/settings/environment-variables

---

## Testing Locally Before Deploy

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run Convex dev (regenerates types)
npx convex dev

# 3. In another terminal, run Next.js
npm run dev

# 4. Open http://localhost:3000
# 5. Test all features:
#    - Dashboard with sparklines
#    - Alerts page
#    - Mobile responsiveness
#    - Admin panel
```

---

## Deployment Checklist

- [ ] Convex credentials in `.env.local`
- [ ] Run `npx convex dev` to generate types
- [ ] WorkOS auth configured
- [ ] Resend API key added
- [ ] Test locally (`npm run dev`)
- [ ] Deploy to Vercel (`vercel --prod`)
- [ ] Set environment variables in Vercel
- [ ] Test production deployment
- [ ] Verify alerts system works
- [ ] Test email notifications

---

## Current Deployment Status

✅ Code pushed to GitHub
❌ Vercel build failed (missing Convex types)
⏳ Waiting for Convex setup

Once you run `npx convex dev`, everything will work! 🚀
