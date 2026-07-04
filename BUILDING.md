# Building @kitwork/kitjs

`dist/` is **generated — never edited by hand**. The single source of truth is the
Kitwork engine's kernel at `engine/jit/hydrate/runtime.js` (the exact bytes the engine
serves at `/jithydrate`), so the npm package can never drift from what the engine ships.

## Regenerate dist

From the engine repository:

```
go run ./cmd/kitjs-dist <version> <path-to>/packages/kitjs/dist
```

Example:

```
go run ./cmd/kitjs-dist 1.0.0 ../packages/kitjs/dist
```

This writes:

- `dist/kitjs.js` — the readable build (kernel source + banner)
- `dist/kitjs.min.js` — minified via the engine's own minifier (tdewolff)

The command refuses to write if minification fails. Keep `<version>` in lockstep with
`package.json`.

## Release checklist

1. Engine tests green: `go test ./jit/hydrate/ ./jit/js/ ./work/`
2. Regenerate dist with the release version (command above)
3. `node --check dist/kitjs.js && node --check dist/kitjs.min.js`
4. Bump `version` in `package.json` (same number)
5. `npm publish --access public`
