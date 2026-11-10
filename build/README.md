# The **BUILD** Directory

Since we've agreed as a team to use **Vercel** to deploy the **Next.js** app, we can keep both the **frontend** and **backend** in one folder, **"the build directory"**.

## Where to Operate

### Frontend (UI)

All UI work happens inside the **`app`** folder (the **App Router**):

- **Pages**: `page.tsx` files, e.g. `app/page.tsx` is the home page, and `app/dashboard/page.tsx` is the `/dashboard` page.
- **Layouts**: `layout.tsx` files that wrap pages.
- **Components**: reusable UI pieces (e.g. a `components` folder at the same level as `app`).
- **Styles and assets**: global styles in `app`, static files (images, icons) in `public`.

> **Frontend team:** do **not** put UI code in `app/api` or `lib`.

### Backend

The backend lives in the following places:

- **`app/api`**: place your **Route Handlers** here. Each handler file must be named exactly **`route.ts`** or **`route.js`** and sit inside its own folder, e.g. `app/api/users/route.ts` serves **`/api/users`**.
- **`lib`** (at the same level as the `app` folder): all other backend files and subfolders that support the APIs, such as **database schema**, **auth support**, **AI configurations**, etc.

> **Backend team:** do **not** put backend logic inside page or component files. Keep it in **`app/api`** and **`lib`**.

## Getting Started

First, run the **development server**:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

You can start editing the page by modifying **`app/page.tsx`**. The page **auto-updates** as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [**Geist**](https://vercel.com/font), a new font family for Vercel.
