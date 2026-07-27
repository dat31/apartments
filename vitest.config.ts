import { defineConfig } from "vitest/config";

/* Unit tests for the pure logic layer — no server, no network, no database.
   The file extension is the boundary between the two suites: Playwright owns
   `*.spec.ts` under e2e/, Vitest owns `*.test.ts` everywhere else.

   Layout: a spec lives in a `__tests__` folder beside the module it covers —
   lib/stream/channel.ts is tested by lib/stream/__tests__/channel.test.ts,
   tour/lib/calendar.ts by tour/lib/__tests__/calendar.test.ts. Shared
   fixtures live in tests/factories.ts, imported as @/tests/factories. */
export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively (Vite 8+), so no
    // vite-tsconfig-paths plugin is needed.
    tsconfigPaths: true,
    alias: [
      // next-intl's ESM build imports the extensionless "next/navigation",
      // which Next's own bundler resolves but plain Node resolution does not.
      // Only lib/seo.ts reaches it (via @/i18n/navigation).
      { find: /^next\/navigation$/, replacement: "next/navigation.js" },
    ],
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // next-intl must go through Vite's transform for the alias above to apply;
    // externalized, Node resolves its bare specifiers itself and fails.
    server: { deps: { inline: ["next-intl"] } },
    // Two specs need a DOM (localStorage / sessionStorage); they opt in with a
    // `// @vitest-environment jsdom` docblock rather than slowing every file.
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Scoped to the modules under test, so the percentage reflects the pure
      // logic layer instead of being diluted by untested React components.
      include: ["lib/**/*.ts", "schemas/**/*.ts", "app/**/lib/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "lib/database.types.ts",
        // Out of scope by design: I/O-bound modules whose tests would mostly
        // assert a mock. See the plan's scope note.
        "lib/actions/**",
        "lib/supabase/**",
        "lib/services/**",
        "lib/stream/server.ts",
        "lib/stream/i18n.ts",
        "lib/posthog-server.ts",
        "lib/geocode.ts",
        "lib/og.tsx",
      ],
      // Set just below the suite's actual numbers: high enough that dropping
      // a module's tests fails CI, loose enough not to fail on one new branch.
      thresholds: { lines: 95, functions: 95, branches: 92, statements: 95 },
    },
  },
});
