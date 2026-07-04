# kitjs · by [Kitwork](https://kitwork.io)

**This is not a framework.**

It is proof that you don't need one: a ~27KB kernel — an IR walker, bytecode-style
expressions, delegated events — and your plain HTML behaves like it has a framework.
No build step. No node_modules. No virtual DOM. **No `eval`, ever.**

```html
<script src="https://cdn.jsdelivr.net/npm/@kitwork/kitjs@1"></script>

<section data-kit-app="runtime@v1.0.0">
  <button data-kit-click="n = n + 1">+1</button>
  <b data-kit-text="n * qty">0</b>
  <input type="number" data-kit-model="qty" value="2">
  <span data-kit-show="n > 3">unlocked</span>
</section>
```

That's the whole program. View source on any page using kitjs and you can read
everything it will do — behavior lives in attributes, not in a bundle.

**Try it live:** [kitwork.io/playground](https://kitwork.io/playground) — type `data-kit-*`
markup, watch it run in an isolated frame, and inspect the compiled IR for every expression.

## What you get, standalone (any backend, or no backend)

| Capability | Write | What happens |
|---|---|---|
| Expressions | `data-kit-text="n * qty"` | parsed by the kernel's tiny compiler → walked, no eval |
| Events | `data-kit-click="n = n + 1"` | one delegated listener on `document` |
| Two-way input | `data-kit-model="qty"` | scope ⇄ input, typed (`number` inputs coerce) |
| Validation UX | `data-kit-validate="password.length >= 6 && confirm == password"` | element gets `data-state="valid|invalid"` for CSS; invalid forms don't submit |
| Live / realtime | `data-kit-live="/any/sse/endpoint"` | SSE JSON patches merge into scope → re-render. One connection per URL no matter how many regions subscribe; auto-closed when the last subscriber leaves the DOM |
| SPA navigation | a `[data-kit-app]` region (or `<main>`) | same-origin links & GET forms are fetched and **morphed** in place — focus, cursor, scroll and input state survive. History, scroll restore, hover prefetch included |
| Verbs | `kitwork.behavior("copy", (el, e) => …)` + `data-kitwork-action="copy"` | your own registered behaviors ride the same kernel |

Leak-free by architecture: nodes carry **no listeners and no closures** (everything is
delegated), per-element state hides behind a `Symbol` and dies with its node, SSE
streams are reference-counted against the DOM. Removing markup cleans up after itself
— there is nothing to unbind.

Works in every evergreen browser. `~27KB` minified, `~7KB` gzipped, one file you can
read end to end.

## The other half — Kitwork

kitjs is the piece you can hold in your hand. The system it was carved from is
**jitjs**, inside the [Kitwork engine](https://kitwork.io) — a Go host that owns a
JavaScript compiler, a bytecode VM, and the HTTP server itself. On Kitwork, this same
kernel is **JIT-delivered**:

- the server **compiles and verifies every expression at render time** — a typo in
  `data-kit-text` is caught on the server, like a linter you didn't install;
- pages ship **only the behaviors they use**;
- `data-kit-validate` becomes **one rule, two ends**: the client walks it as you type,
  the server evaluates the *same* compiled rule on submit (`ctx.validate`) — the two
  can never drift;
- `data-kit-live` rides the engine's built-in multi-tenant SSE broker;
- CSS, icons and fonts are generated the same way (jitcss / jiticons / jitfonts) —
  a frontend with **no toolchain at all**.

No V8, no Node. A deliberately small JavaScript subset, compiled to bytecode, executed
by a hand-written VM. kitjs is what that philosophy looks like when it fits in a
`<script>` tag.

## Attribute reference

Every attribute has two spellings that behave identically: the short `data-kit-*` and
the canonical `data-kitwork-*`.

| Attribute | Value |
|---|---|
| `data-kit-app` | region app initialization (`"[mode]@[version]"`). Enables SPA navigation unless `="false"` on child links/forms |
| `data-kit-text` | expression → `textContent` |
| `data-kit-show` | expression → element hidden when falsy |
| `data-kit-click` | expression, run on click |
| `data-kit-model` | scope key, two-way bound to the input |
| `data-kit-validate` | expression → `data-state="valid\|invalid"` + submit gate |
| `data-kit-live` | SSE URL pushing JSON scope patches (into the page scope) |
| `data-kit-scope` | names a component boundary — state inside is local |
| `data-kit-remember` | space-separated scope keys saved to/loaded from `localStorage` |
| `data-kit-indexed` | `"true"` to enable IndexedDB persistence/caching for lazy-loaded CDN components |
| `data-kit-api` | JSON endpoint URL to load boundary scope data dynamically on mount (with `data-state="loading\|ready\|error"`) |
| `data-kit-trigger` | `"visible"` to fire registered action when element is visible in viewport |
| `data-kit-component` | name of a registered component template to hydrate |
| `data-kit-key` | stable identifier key used to speed up and stabilize morph matching (equivalent to `data-key`) |
| `data-kit-action` | name of a registered behavior (verb) |


### Scopes

State is page-global until you draw a boundary. `data-kit-scope` gives a subtree its own
scope with closure-like resolution — reads fall through to ancestor scopes, writes stay
with the scope that owns the key, and `$.` addresses the page scope explicitly (the same
`$` Kitwork's server templates use for their root data):

```html
<div data-kit-scope="counter">
  <button data-kit-click="n = n + 1">+</button> <b data-kit-text="n">0</b>
</div>
<div data-kit-scope="counter">
  <button data-kit-click="n = n + 1">+</button> <b data-kit-text="n">0</b>
</div>
<!-- two independent counters — same markup, own state -->

<button data-kit-click="$.total = $.total + 1">page-level count</button>
```

Scope objects live behind a `Symbol` on the boundary node — remove the node and its
state is gone with it.

### The imperative escape hatch: `$el` / `$root`

Most of the time you change state and let bindings update the DOM. For the genuinely
imperative moments — focus an input, scroll, toggle an attribute on a child, hand an
element to a third-party widget — two variables resolve to real elements inside any
expression:

- `$el` — the element the directive is on
- `$root` — its component boundary (nearest `data-kit-scope`, else `<html>`)

```html
<div data-kit-scope="editor">
  <button data-kit-click="$root.querySelector('input').focus()">focus</button>
  <button data-kit-click="$root.querySelector('button.save').setAttribute('disabled', '')">lock</button>
</div>
```

They are **not** prototype methods — no `Element.prototype` is touched. It's the native
API (`querySelector`, `focus`, `classList`, `setAttribute`, …), reached through a scoped
variable, so the expression executes exactly as it reads. **Reads and method calls
only:** to *set* a value, bind it (`data-kit-model`) rather than poking `.value =` — the
grammar has no member assignment on purpose. Use this hatch sparingly; it steps outside
the declarative model by design.

The expression grammar: numbers, strings (`'single-quoted'`), booleans, `null`,
variables, `+ - * / %`, comparisons, `&& || !`, ternary `? :`, assignment `=` (to a
variable, or to the page scope via `$.key = …`), member access, method calls
(`price.toFixed(2)`, `email.includes('@')`), array literals `[1, 2]`, object literals `{ x: 1 }`, arrow function lambdas `(item) => item.id`, and statement sequences separated by semicolons `expr1; expr2`.
That's all of it — **the grammar is closed**. Precompiled pages may instead carry
`data-kitwork-*-ir` attributes (the compiled form); the kernel reads both.


## Contributing

- **Grammar closed, registry open.** Pull requests adding syntax to the expression
  language will be declined by policy — new capability belongs in a registered
  behavior (`kitwork.behavior(...)`), not in the grammar. This is what keeps the
  kernel small and every kitjs page readable forever.
- `dist/` is **generated** from the Kitwork engine (the single source of truth) —
  see [BUILDING.md](BUILDING.md). Don't edit dist files by hand.

## License

[MIT](LICENSE) © Huỳnh Nhân Quốc — Kitwork

