import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated v8 coverage report.
    "coverage/**",
  ]),
  // Playwright fixtures call `use(value)` to hand a fixture to the test. The
  // React Hooks rule sees the bare `use` identifier and mistakes it for
  // React's `use()`, which isn't a thing outside components.
  {
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  /* Supabase talks to exactly one layer.
     `lib/services/**` owns every .from()/.rpc() call: it is the only place a
     query can be paired with the auth and ownership checks that RLS backstops
     rather than replaces. Components and hooks reach it through the thin
     Server Actions in `lib/actions/**`.
     The exemptions below are the call sites that stay on a direct client by
     design; everything else now goes through a service. */
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/supabase/client",
                "@/lib/supabase/server",
                "@/lib/supabase/public",
              ],
              message:
                "Supabase clients belong to lib/services/**. Add a service function and call it from a Server Action in lib/actions/**.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      // The service layer itself, and the factories it is built from.
      "lib/services/**/*.ts",
      "lib/supabase/**/*.ts",
      // Auth stays on the browser client: @supabase/ssr's cookie bridge is
      // what keeps the SSR session alive, and onAuthStateChange has no
      // server-side equivalent.
      "hooks/auth/**/*.ts",
      "components/providers.tsx",
      // verifyOtp writes the session cookie, which only a Route Handler can do.
      "app/auth/confirm/route.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
