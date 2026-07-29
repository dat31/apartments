# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into this Next.js (App Router) apartments rental platform. Client-side tracking uses `posthog-js` initialized in `instrumentation-client.ts`, with a reverse proxy configured in `next.config.ts` to route events through `/ingest`. Server-side tracking uses `posthog-node` via a shared `getPostHogClient()` helper. Users are identified by their Supabase auth UUID on sign-in and sign-up, and `posthog.reset()` is called on sign-out. Error capture (`captureException`) is added around critical mutation paths.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `user_signed_up` | A new user completes email/password registration. | `app/[lang]/(auth)/signup/page.tsx` |
| `user_signed_in` | An existing user successfully signs in with email and password. | `app/[lang]/(auth)/signin/page.tsx` |
| `user_signed_out` | The authenticated user signs out from the site header menu. | `hooks/auth/use-sign-out.ts` |
| `listing_viewed` | A renter views an apartment listing detail page. | `app/[lang]/(app)/apartments/[id]/components/record-recently-viewed.tsx` |
| `tour_booked` | A renter successfully books a tour for a listing. | `app/[lang]/(app)/apartments/[id]/components/book-tour-dialog.tsx` |
| `listing_saved` | A renter saves or unsaves a listing to their shortlist. | `app/[lang]/(app)/apartments/[id]/components/save-home-button.tsx` |
| `search_saved` | A renter saves a search filter set with email alert preferences. | `app/[lang]/(app)/apartments/components/save-search-dialog.tsx` |
| `listing_created` | An owner creates a new apartment listing (active or draft). | `app/[lang]/(app)/apartments/components/listing-form.tsx` |
| `listing_status_toggled` | An owner pauses or re-publishes an existing listing from the dashboard. | `app/[lang]/(app)/owner/dashboard/components/listing-row.tsx` |
| `owner_review_submitted` | A renter submits a star-rating review for an owner's profile. | `app/[lang]/(app)/owner/[id]/components/review-modal.tsx` |
| `calendar_export_clicked` | A renter exports a confirmed tour to Google, Outlook, or Apple Calendar. | `app/[lang]/(app)/tour/components/add-to-calendar.tsx` |
| `tour_accepted` | An owner confirms a pending tour request from a renter. | `app/[lang]/(app)/owner/dashboard/components/owner-tours.tsx` |
| `tour_declined` | An owner declines a pending tour request from a renter. | `app/[lang]/(app)/owner/dashboard/components/owner-tours.tsx` |
| `tour_time_proposed` | An owner proposes an alternative date and time for a renter's tour. | `app/[lang]/(app)/owner/dashboard/components/owner-tours.tsx` |
| `chat_token_minted` | **Server-side**: Stream Chat token successfully minted for an authenticated user. | `app/api/stream/token/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/528662/dashboard/1906298)
- **Insight**: [User signups and sign-ins (wizard)](https://us.posthog.com/project/528662/insights/Mzrrch8M)
- **Insight**: [Listing-to-tour booking funnel (wizard)](https://us.posthog.com/project/528662/insights/nBZQNh4D)
- **Insight**: [Listings created by status (wizard)](https://us.posthog.com/project/528662/insights/QThBDHKq)
- **Insight**: [Owner tour actions (wizard)](https://us.posthog.com/project/528662/insights/DN46FANw)
- **Insight**: [Renter engagement: saves and searches (wizard)](https://us.posthog.com/project/528662/insights/8n1GtjaA)

## Verify before merging

- [x] Run `pnpm install` to install the `posthog-js` and `posthog-node` packages added to `package.json`.
- [x] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code.
- [x] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [x] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any deployment/CI environment configuration so collaborators know what to set.
- [x] Wire source-map upload (`posthog-cli sourcemap` or equivalent) into CI so production stack traces de-minify in PostHog Error Tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is called in `use-sign-in.ts` and `use-sign-up.ts`, but a user who is already logged in and refreshes the page will not be re-identified until they sign in again. Add an `identify` call on page load using the session from Supabase (e.g. in a root layout or auth hook) to cover returning sessions.
- [ ] This project uses Supabase as a data source. Run `npx @posthog/wizard warehouse` to connect Supabase to PostHog's data warehouse and unlock cross-source analytics.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
