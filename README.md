# Ledger.Client

The frontend for **Ledger**, a personal finance tracker. Users sign up, log in, and track income/expense transactions with running totals — everything scoped to their own account. Built with Angular, styled with Tailwind CSS.

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
    login/, signup/             Auth forms, with inline field validation
    transaction-list/           Dashboard: summary cards, paginated table, edit/delete
    transaction-form/           Shared Add/Edit form (same component, driven by route param)
    shared/
      button/                   Reusable <app-button variant="primary|outline|icon|icon-danger|ghost">
      card/                     Reusable <app-card title="..."> (header + body)
      confirm-dialog/           Reusable confirmation modal (replaces browser confirm())
  guards/
    auth-guard.ts                CanActivateFn — redirects to /login if no token
  interceptors/
    auth-interceptor.ts          Attaches Authorization: Bearer <token> to every request
  services/
    auth.ts                       Login/register/logout, token storage, reactive auth state
    transaction.ts                Transaction CRUD + pagination + summary
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

1. `AuthService.login()` / `.register()` POST to the API and, on success, store the returned JWT in `localStorage` and push a value into a `BehaviorSubject` (`currentUser`) that the rest of the app reacts to.
2. `authInterceptor` (registered via `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`) reads that token on **every** outgoing HTTP request and attaches `Authorization: Bearer <token>` — no per-service-call boilerplate needed.
3. `authGuard` (`CanActivateFn`) blocks navigation to `/transactions`, `/add`, and `/edit/:id` unless `AuthService.isAuthenticated()` is true, redirecting to `/login` otherwise. This is a **UX/routing convenience only** — the real access control is the API's `[Authorize]` + per-user filtering. A user could bypass this guard with dev tools and would still get nothing back from the API, because the guard doesn't grant any access the server wouldn't have refused anyway.
4. `header.html` shows Add Transaction/Logout vs. Login by subscribing to `authService.currentUser | async` — reactive, no page reload needed when you log in or out.

## Zoneless change detection gotcha

This app has no Zone.js — Angular only re-renders a component when something it explicitly tracks changes (a signal write, a template-bound event, or `AsyncPipe` receiving a new value from an Observable). **Setting a plain class field inside an async callback — an HTTP `.subscribe()`, a `setTimeout`, anything not driven directly by a template binding — will silently fail to re-render the view**, even though the field's value did change. This bit us more than once while building this app.

Two safe patterns, both used throughout this codebase:
- **Signals** for state written inside async callbacks (see `TransactionList.transactions`, `Signup.errorMessage`) — `signal.set(...)` inside a `.subscribe()` callback works because Angular's signal implementation itself notifies the renderer.
- **`AsyncPipe`** for state that's naturally an Observable (see `header.html`'s `authService.currentUser | async`) — `AsyncPipe` calls `markForCheck()` internally on every emission, so it's zoneless-safe without you doing anything extra.

If you add a new component that fetches data or reacts to a service's async state, reach for one of these two — not a plain `field = value` assignment inside a `.subscribe()`.

## Reusable components

- **`<app-button>`** — `variant` (`primary` | `outline` | `icon` | `icon-danger` | `ghost`), `type`, `disabled`, `fullWidth`, `ariaLabel`; content-projects its label/icon via `<ng-content>`.
- **`<app-card title="...">`** — optional colored header + white body, used by every form page.
- **`<app-confirm-dialog>`** — `[open]`, `title`, `message`, `confirmText`/`cancelText`, `(confirmed)`/`(cancelled)` outputs. `TransactionList` drives it with a signal (`confirmDialogOpen`) rather than the browser's native, unstyleable `confirm()`.

## Pagination & summary

`TransactionService.getAll(page, pageSize)` returns one page of transactions (`{ items, totalCount, page, pageSize }`); `TransactionList` tracks `page` as a signal and re-fetches on Previous/Next. The three summary cards (Total Income/Expenses/Net Balance) are **not** computed from the currently-loaded page — they come from a separate `TransactionService.getSummary()` call that the API aggregates across the user's full dataset, so the numbers don't fluctuate as you page through the table.

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

Deploy the contents of `dist/Ledger.Client` to your static host (e.g. Azure Static Web Apps). Make sure the deployed URL is also added to the API's `AllowedOrigins` (see `Ledger.API/README.md`) — otherwise every request will fail CORS.
