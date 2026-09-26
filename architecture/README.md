# architecture/

Decisions made **before** implementation, so the build is assembly rather than
invention. Read in this order.

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The system: layers, directory structure, data-flow diagrams, where each React API earns its place. |
| [DECISIONS.md](DECISIONS.md) | Twelve ADRs. Each names the alternative it beat and what we gave up. |
| [RERENDERS.md](RERENDERS.md) | The performance contract — eight rules, each tied to a specific failure this app would otherwise hit. |
| [ROADMAP.md](ROADMAP.md) | Build order, with a verifiable checkpoint at the end of every phase. |
| [geopin-architecture.html](geopin-architecture.html) | Source for the published single-page version of this pack. Diagrams render in the artifact viewer, not in a plain local browser. |

## The short version

**State has three kinds, and mixing them is where the mess comes from.** Server state
(pins, notes) lives in a normalized external store. Client state (view toggle, draft
form, map region) is local to a screen. Navigation state belongs to React Navigation
and is never mirrored.

**Context and `useSyncExternalStore` are not competitors — they do different jobs.**
Context injects the stores and repositories, which are built once and never change, so
it costs zero re-renders. `useSyncExternalStore` carries the data, so a marker
subscribes to its own pin and nothing else. *Context is for wiring; the store is for
data.*

**Suspense earns its place for `lazy`, not for data — yet.** `use(promise)` needs a
referentially stable promise, which in React Native means a Suspense-enabled cache we'd
have to build. The explicit `AsyncState` union is simpler today and gives us retry.
[ADR-011](DECISIONS.md#adr-011-hand-rolled-store-now-tanstack-query-at-a-named-trigger)
names the trigger that flips both decisions at once.

**Everything talks to repository interfaces, not to `fetch`.** That single seam is
what makes the app testable in Node, and it's where offline support arrives later
without the store noticing.

## The three rules that matter most

1. **Screens subscribe to IDs. Leaves subscribe to entities.** `PinsScreen` reads
   `ids`; each `PinMarker` reads its own pin. Editing one pin re-renders one marker.
2. **Route params are primitives**, and every detail screen fetches on miss — or deep
   linking is broken from day one.
3. **The map region lives in a ref.** `onRegionChange` fires every frame; in state
   that's a re-render of the screen and every marker, continuously, while panning.

## Using this

The ADRs are the contract. When implementation disagrees with a decision, that's a
finding — either the code is wrong or the ADR is, and one of them gets updated with a
note saying why. A design doc nobody amends is a design doc nobody read.
