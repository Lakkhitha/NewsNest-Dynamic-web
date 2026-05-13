# TODO - Bug fixes

## Step 1: Reproduce / locate build errors
- [x] Ran `npx tsc -p client/tsconfig.json --noEmit` to find TypeScript errors.
- [x] Identified TS errors in `client/src/api.ts` where fetch request body typing was incorrect.

## Step 2: Implement fixes
- [ ] Update `client/src/api.ts` request helper to correctly handle JSON vs FormData bodies for `fetch` (fix TS types).

## Step 3: Verify
- [ ] Re-run `npx tsc -p client/tsconfig.json --noEmit` and ensure no errors remain.
- [ ] Run server typecheck if applicable.

## Step 4: Finalize
- [ ] Summarize changes.

