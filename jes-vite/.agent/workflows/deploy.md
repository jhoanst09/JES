---
description: How to deploy the JES Store application to Vercel production
---
// turbo-all

# Deploy to Vercel Production

## Method 1: Vercel CLI (Recommended - bypasses Git issues)

```powershell
cd c:\Users\vango\OneDrive\Documents\probandoanti\jes-vite
npx vercel --prod --yes
```

This deploys directly to production without needing Git commits.

---

## Method 2: Git Push (when Git is working)

1. Stage and commit changes:
```powershell
git add -A
git commit -m "description of changes"
```

2. Push to master (production branch):
```powershell
git push origin master
```

## Notes
- Production branch is `master` (not main)
- If Git has lock issues, use Method 1 (Vercel CLI)
- Vercel dashboard: https://vercel.com/jhoansts-projects/jes-vite
