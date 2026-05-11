# trash/

Files moved here on 2026-05-11 during a project root cleanup. Nothing in
`client/`, `server/`, `shared/`, `public/`, or `package.json` references
any of these files. They were all manually-run one-off utilities or stray
artifacts from earlier development.

If a file turns out to still be needed, `git mv trash/<file> ..` puts it back
with full history preserved.

## What's in here

### One-off scripts (manually invoked, never wired into package.json)
- Data imports: `direct-import.cjs`, `import-cja-terms.{cjs,js}`,
  `import-glossary.js`, `fetch-additional-terms.cjs`
- DB setup / migrations: `init-db.ts`, `manual-migrate.ts`, `migrate-db.ts`,
  `add-slugs-migration.ts`, `populate-db.ts`, `populate.sh`
- Image migration: `migrate-images-to-firebase.{js,ts}`,
  `delete-missing-images.ts`, `mark-missing-images.ts`
- Category restores: `restore-batch{2,3,-final}.ts`, `restore-categories.ts`,
  `restore-term-categories{,-small}.ts`
- Scrapers: `scrape-adobe-glossary.js`, `scrape-cja-glossary.{cjs,js}`,
  `scrape-glossary.cjs`

### Stray data / test artifacts
- `cja-glossary-terms.json` — old seed data
- `term.json`, `dropzone.json` — empty zero-byte files
- `sample-import.csv` — duplicate of `public/sample-import.csv`
- `test-glossary.pdf`, `test-term.pdf`, `test-term-pdf.pdf` — old test PDFs;
  the running test endpoint serves `public/test-glossary.pdf` instead
- `generated-icon.png` — 285 KB icon not referenced anywhere

### `attached_assets/`
160 files (~19 MB) of screenshots, ChatGPT image exports, pasted text logs,
and PDFs from earlier Replit-era development. `vite.config.ts` still declares
an `@assets` alias pointing here, but no source file uses that alias.

## Removing trash entirely

When you're confident none of this is needed:

```
git rm -r trash/
git commit -m "chore: remove trash/"
```
