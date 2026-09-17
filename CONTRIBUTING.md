# Contributing to Spine

Thanks for taking a look. This project is early (v0.1) and the fastest way to
help is by using it on a real idea and reporting where it breaks or misleads
you.

## Ground rules

- **`main` is protected.** All changes land through a pull request, at least
  one review, and a green CI run. No direct pushes, no force-pushes.
- **`packages/core`/`src/core` never calls a model or touches the network.**
  This is enforced by an architecture test — don't try to work around it.
- Structural claims (a `fact` node) require evidence. Don't loosen that to
  make a PR pass.

## Local setup

```bash
npm install
npm run build
npm test
```

77 tests should pass with zero failures before you open a PR.

## Working on the landing page

The marketing site lives in `site/` (Vite + React) and builds into `docs/`,
which GitHub Pages serves directly. `docs/` is generated — never hand-edit it,
and never put anything else in it (see the `design/` folder for the actual
design documentation, which used to live there before it collided with the
build output).

```bash
cd site
npm install
npm run dev     # local dev server
npm run build   # emits into ../docs
```

## Making a change

1. Fork and branch from `main`.
2. Keep the change scoped — a bug fix doesn't need a refactor riding along.
3. Add or update a test/fixture for anything in `src/core` or `spec/rules`.
4. Run `npm test` and, if you touched the landing, `npm run build` inside
   `site/`.
5. Open a PR describing *why*, not just *what* — the same principle this
   tool enforces on product nodes applies to its own code review.

## Reporting issues

Open a GitHub issue. If you found a case where an agent contract's
enforcement is weaker than its prompt claims (see `product agents show
<name>`), that's exactly the kind of gap this project wants surfaced —
please include the command output.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
