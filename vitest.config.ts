import { defineConfig } from 'vitest/config';

// Root `npm test` covers only the DB layer (tests/ against db/migrate.ts).
// frontend/ and api/ are independent workspaces with their own
// vitest.config.ts and are run via `npm test -w frontend` / `-w api` (see
// CLAUDE.md: "ルート（DB層）: npm run migrate / npm test" vs "フロント: cd
// frontend && ... npm test"). Without this, vitest's default repo-wide glob
// would also pick up frontend's jsdom-dependent tests here, in a plain node
// environment where `localStorage` etc. don't exist.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
