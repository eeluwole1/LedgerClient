# Ledger.Client

The frontend for **Ledger**, a personal finance tracker. Users sign up, log in, and track income/expense transactions with running totals — everything scoped to their own account. Built with Angular, styled with Tailwind CSS.

**Live demo:** https://gentle-grass-0df38ee10.3.azurestaticapps.net (talks to the deployed API — see `Ledger.API/README.md`)

## User Story

> **As a user, I want to log in and see my own income and expenses in one place — with running totals I can trust — so that I can understand my spending at a glance instead of digging through a spreadsheet.**

**The 30-second interview version:** This is the Angular frontend for a personal finance tracker. A user registers, logs in, and lands on a dashboard showing three summary cards (Total Income, Total Expenses, Net Balance) plus a paginated table of every transaction, scoped entirely to their own account via a JWT issued by the API. They can add, edit, or delete a transaction, and the summary numbers stay accurate independent of which page of the table they're viewing, because they come from a separate aggregate endpoint rather than being computed client-side from whatever page happens to be loaded.

The part worth highlighting: I found and fixed a bug where a logged-in-looking session wasn't actually a valid one. `AuthService.isAuthenticated()` only checked whether a JWT *existed* in `localStorage`, never whether it had expired — and "Remember me" defaults to checked at login, so a token from any past session persisted indefinitely. The route guard let the user straight past `/login` on every visit, but the token was actually dead, so every API call the dashboard made came back `401` and silently rendered as an empty, zeroed-out state — which looked like "the app is broken" rather than "you're not logged in." The fix decodes the JWT's `exp` claim client-side and treats an expired token as logged-out, clearing it automatically so the user lands back on a real login screen instead of a dead session that only looks alive.

## Tech stack

- **Angular 21**, standalone components (no `NgModule`s)
- **Zoneless change detection** (`provideZonelessChangeDetection()`) — see the [Zoneless gotcha](#zoneless-change-detection-gotcha) section below, it matters for how you write new components
- **Signals** for local component state; **RxJS** (`BehaviorSubject`) for the cross-component auth state in `AuthService`
- **Reactive Forms** for every form (login, signup, add/edit transaction)
- **Tailwind CSS v4** for styling — no component-level `.css` files are used; everything is utility classes in the templates
- **Bootstrap Icons** (CDN, icon glyphs only — no Bootstrap CSS/JS) for icons like the pencil/trash buttons

## Project structure

```
app/
  components/
    header/, footer/            Layout
    login/, signup/             Auth forms — validation, password strength meter, remember me
    transaction-list/           Dashboard: summary cards, paginated table, edit/delete, empty state
    transaction-form/           Shared Add/Edit form (same component, driven by route param)
    shared/
      button/                   Reusable <app-button variant="primary|outline|icon|icon-danger|ghost" [loading]>
      card/                     Reusable <app-card title="..."> (header + body)
      confirm-dialog/           Reusable confirmation modal (replaces browser confirm())
      toast-container/          Global toast notifications, mounted once in app.html
  guards/
    auth-guard.ts                CanActivateFn — redirects to /login if no token
  interceptors/
    auth-interceptor.ts          Attaches Authorization: Bearer <token> to every request
  services/
    auth.ts                       Login/register/logout, token storage, reactive auth state
    transaction.ts                Transaction CRUD + pagination + summary
    toast.ts                      Global toast notification service (success/error/info)
  models/                        TypeScript interfaces matching the API's DTOs
environments/
  environment.ts                 Dev config (apiUrl → localhost API)
  environment.prod.ts            Prod config — update apiUrl before deploying (see below)
```

## Running locally

```
npm install
ng serve
```

Serves on `http://localhost:4200`. Requires the API running locally (see `Ledger.API/README.md`) — the URL it calls comes from `environments/environment.ts`.

## Authentication, end to end

1. `AuthService.login()` / `.register()` POST to the API and, on success, store the returned JWT and push a value into a `BehaviorSubject` (`currentUser`) that the rest of the app reacts to.
2. **Remember me**: the login form's checkbox controls *where* that token is stored — checked (the default) writes it to `localStorage` so the session survives closing the browser; unchecked writes it to `sessionStorage` instead, so it's gone once the browser closes. `AuthService.getToken()` checks both locations, so the rest of the app doesn't need to know which one is in use.
3. `authInterceptor` (registered via `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`) reads that token on **every** outgoing HTTP request and attaches `Authorization: Bearer <token>` — no per-service-call boilerplate needed.
4. `authGuard` (`CanActivateFn`) blocks navigation to `/transactions`, `/add`, and `/edit/:id` unless `AuthService.isAuthenticated()` is true, redirecting to `/login` otherwise. `isAuthenticated()` decodes the stored JWT's `exp` claim and returns `false` (clearing the stale token) if it's expired — a token merely *existing* in storage isn't enough, since with "Remember me" defaulting to checked, a token from any past visit would otherwise sit in `localStorage` forever and keep satisfying the guard long after it stopped being valid server-side. This guard is still a **UX/routing convenience only** — the real access control is the API's `[Authorize]` + per-user filtering. A user could bypass this guard with dev tools and would still get nothing back from the API, because the guard doesn't grant any access the server wouldn't have refused anyway.
5. `header.html` shows Add Transaction/Logout vs. Login by subscribing to `authService.currentUser | async` — reactive, no page reload needed when you log in or out.

"Forgot password?" is present on the login page but is UI-only for now (shows an informational toast) — there's no email/reset-token flow wired up yet.

## Zoneless change detection gotcha

This app has no Zone.js — Angular only re-renders a component when something it explicitly tracks changes (a signal write, a template-bound event, or `AsyncPipe` receiving a new value from an Observable). **Setting a plain class field inside an async callback — an HTTP `.subscribe()`, a `setTimeout`, anything not driven directly by a template binding — will silently fail to re-render the view**, even though the field's value did change. This bit us more than once while building this app.

Two safe patterns, both used throughout this codebase:
- **Signals** for state written inside async callbacks (see `TransactionList.transactions`, `Signup.passwordStrength`) — `signal.set(...)` inside a `.subscribe()` callback works because Angular's signal implementation itself notifies the renderer.
- **`AsyncPipe`** for state that's naturally an Observable (see `header.html`'s `authService.currentUser | async`) — `AsyncPipe` calls `markForCheck()` internally on every emission, so it's zoneless-safe without you doing anything extra.

If you add a new component that fetches data or reacts to a service's async state, reach for one of these two — not a plain `field = value` assignment inside a `.subscribe()`.

## Reusable components

- **`<app-button>`** — `variant` (`primary` | `outline` | `icon` | `icon-danger` | `ghost`), `type`, `disabled`, `loading`, `fullWidth`, `ariaLabel`; content-projects its label/icon via `<ng-content>`. When `loading` is true the button disables itself and swaps its label for a spinning icon — used on every submit action (login, signup, add/edit transaction) so there's visible feedback while a request is in flight.
- **`<app-card title="...">`** — optional gradient header + white body, used by every form page.
- **`<app-confirm-dialog>`** — `[open]`, `title`, `message`, `confirmText`/`cancelText`, `(confirmed)`/`(cancelled)` outputs. `TransactionList` drives it with a signal (`confirmDialogOpen`) rather than the browser's native, unstyleable `confirm()`.
- **`<app-toast-container>`** — mounted once at the root (`app.html`), reads `ToastService.toasts()` and renders a stacked, auto-dismissing notification in the corner. Any component injects `ToastService` and calls `.success()` / `.error()` / `.info()` — this is what login, signup, and transaction save/delete use instead of inline error banners, and it survives route navigation since it lives at the root.

## UX details worth knowing about

- **Password strength meter** (signup only): a live bar under the password field scored on length (≥8), mixed case, digits, and special characters — weak/medium/strong, recomputed on every keystroke via a `valueChanges` subscription feeding a signal.
- **Show/hide password toggle** on every password field (login, signup, confirm password) — an eye icon that flips the input's `type` between `password` and `text`.
- **Empty state**: the transactions table shows an icon, a short message, and an "Add your first transaction" button instead of a bare "No transactions yet." string when the account has no data yet.

## Pagination & summary

`TransactionService.getAll(page, pageSize)` returns one page of transactions (`{ items, totalCount, page, pageSize }`); `TransactionList` tracks `page` as a signal and re-fetches on Previous/Next. The three summary cards (Total Income/Expenses/Net Balance) are **not** computed from the currently-loaded page — they come from a separate `TransactionService.getSummary()` call that the API aggregates across the user's full dataset, so the numbers don't fluctuate as you page through the table.

## Branch workflow

`dev` is where new features get built and manually verified (`ng build` + a browser check) before anything ships. `master` is the branch Azure actually deploys — the GitHub Actions workflow (`.github/workflows/azure-static-web-apps-*.yml`) only triggers on pushes to `master`, so `dev` can be pushed and iterated on freely without touching the live site. Once a change on `dev` looks right, it's fast-forward merged into `master`.

## Deploying (Azure)

Before building for production, update `src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://<your-actual-api-app-name>.azurewebsites.net/api',
};
```

Then build with the production configuration (this is what wires `fileReplacements` in `angular.json` to swap `environment.ts` → `environment.prod.ts`):

```
ng build --configuration production
```

Deploy the contents of `dist/Ledger.Client/browser` to your static host (e.g. Azure Static Web Apps — this project's GitHub Actions workflow does this automatically on every push to `master`). Make sure the deployed URL is also added to the API's `AllowedOrigins` (see `Ledger.API/README.md`) — otherwise every request will fail CORS.
