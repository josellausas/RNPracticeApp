# React Native Cheatsheet
---

Given "fetch this API and show a list", type these in this order.

1. **Type the response.** `interface PersonDTO { name: string; url: string }`
2. **Boundary function.** `fetchJson<PersonDTO[]>(url, signal)` — `ok` check + one cast.
3. **Hook it up.** `useAsyncData((s) => fetchJson<PersonDTO[]>(URL, s), [])`
4. **Render the union.** `<AsyncBoundary state={state} onRetry={retry}>`
5. **`keyExtractor` uses an ID**, never the array index, never a display name.

---

## FlatList

| Prop | Why |
|---|---|
| `keyExtractor` | Stable unique ID. Index keys destroy state on reorder and kill the diff. |
| `getItemLayout` | **Biggest single win** when rows are fixed-height. Skips measurement entirely, enables instant `scrollToIndex`. |
| `initialNumToRender` | Default 10. Lower it to shorten time-to-first-paint. |
| `maxToRenderPerBatch` | Default 10. Lower = smoother scroll, more blank space. |
| `windowSize` | Default 21 (viewport heights). Lower = less memory, more blanking. |
| `onEndReachedThreshold` | Fraction of a screen, **not pixels**. `0.5` = half a screen from the end. |
| `removeClippedSubviews` | Tempting, historically buggy, platform-dependent. Measure before enabling. |

Other things to note:

- **`renderItem` must not be an inline arrow that closes over new objects** if you're memoizing rows. Hoist it or `useCallback` it.
- **Memoize the row**, not the list: `const Row = memo(({ item }) => ...)`.
- `ListEmptyComponent`, `ListHeaderComponent`, `ItemSeparatorComponent` exist — using them reads as familiarity.
- `SectionList` for grouped data. `FlashList` (`@shopify/flash-list`) is the drop-in when FlatList isn't enough — naming it shows you've hit the ceiling before.
- **`ScrollView` renders every child immediately.** That's the answer to "why not just use a ScrollView?"

---

## memo / useCallback / useMemo

The rule, in order:

1. **Don't.** Default to nothing. Premature memoization is the more common bug.
2. `useCallback` / `useMemo` do nothing useful unless the consumer is `memo`'d, or the value is a **dependency of an effect**.
3. That second case is the one that actually matters — an unstable function in a deps array is an infinite loop, not a slow render.

```tsx
// pointless — Child isn't memo'd, re-renders anyway
const onPress = useCallback(() => {}, []);
<Child onPress={onPress} />

// load-bearing — fetcher is an effect dependency
const load = useCallback((s) => fetchJson(url, s), [url]);
```

`memo` compares props **shallowly**. One inline `style={{ flex: 1 }}` or
`data={items.filter(...)}` and it never hits. That's why memoization "doesn't work".

**React 19 note:** the React Compiler automates most of this. 

---

## useEffect

- **Cleanup runs before the next effect**, not only on unmount. That's what kills the stale-response race.
- Deps are compared with `Object.is`. Objects and arrays are new every render — depend on primitives (`character.url`) over objects (`character`) when you can.
- **StrictMode double-invokes effects in dev.** Two fetches on mount is expected, not a bug. Say so before they ask.
- **You probably don't need an effect** for: deriving state from props (compute it during render), or responding to a user event (do it in the handler).
- `useLayoutEffect` fires before paint — for measurement, rare in RN.

Empty deps `[]` = run once. No deps array = run every render. Missing a dep = stale closure.

---

## Async traps

```ts
// ❌ index passed as the second argument
urls.map(fetchJson)
// ✅
urls.map((url) => fetchJson(url))
```

Same family as `['1','2','3'].map(parseInt)` → `[1, NaN, NaN]`.

- **`Promise.all` is all-or-nothing.** One rejection discards every success, and the siblings keep running. `Promise.allSettled` when partial results beat none.
- **Aborting makes `fetch` reject** with `AbortError`. Filter it or every unmount flashes an error.
- `fetch` **only rejects on network failure**. HTTP 500 resolves. Always check `response.ok`.
- The bug worth fixing isn't setState-after-unmount (React 18 dropped that warning) — it's **out-of-order responses**: tap A, tap B, A lands last and wins.

---

## TypeScript

```ts
// Discriminated union — makes illegal states unrepresentable.
type State<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };
// Inside `status === 'ready'`, `data` exists and is non-null. Outside, it
// isn't a property at all. Beats three loose booleans.
```

| Gotcha | Fix |
|---|---|
| `useState(null)` infers `null`, poisoning the setter | `useState<Film[] \| null>(null)` |
| `[string]` is a **tuple of one**, not an array | `string[]` |
| `response.json()` returns `any`, leaking everywhere | cast once at the boundary |
| `catch (e)` — `e` is `unknown` | `e instanceof Error ? e.message : '…'` |
| Generic arrow in a `.tsx` file parses as JSX | `<T,>(x: T) => x` (trailing comma) |

- **Type predicates** narrow inside `.filter`: `(r): r is Fulfilled<T> => r.status === 'fulfilled'`
- **`satisfies`** validates without widening: `const routes = {...} satisfies Record<string, Route>`
- **`as const`** for literal types: `return [value, setValue] as const` → a tuple, not `(T | Setter)[]`
- Prefer `unknown` to `any`. `any` is a hole; `unknown` is a prompt to narrow.

---

## React Native specifics

| Do | Not |
|---|---|
| `useWindowDimensions()` | `Dimensions.get('window')` — doesn't update on rotate |
| `SafeAreaView` from `react-native-safe-area-context` | RN's built-in — iOS-only, deprecated |
| `Pressable` | `TouchableOpacity` — legacy, less flexible |
| `FlatList` | `ScrollView` + `.map()` for long lists |

- **`KeyboardAvoidingView`**: `behavior="padding"` on iOS, `"height"` on Android — one of the few genuine `Platform.select` cases.
- **Hermes** is the default engine. **New Architecture** (Fabric + TurboModules, bridgeless) is default since RN 0.76 — worth naming if asked about the bridge.
- **`flexDirection` defaults to `column`** in RN, `row` on the web. Classic trick question.
- No `z-index` cascade like CSS; later siblings paint on top. `elevation` on Android, `shadow*` on iOS.
- Styles are numbers (`StyleSheet.create` returns IDs), so inline objects are the thing that breaks `memo`, not a rendering cost per se.
- **React 19:** `ref` is a plain prop — `forwardRef` is no longer needed.

---

## Navigation (React Navigation 7)

```ts
export type RootStackParamList = {
  Menu: undefined;
  characterDetail: { characterId: string };   // primitives only
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

- **Never pass whole objects as params.** Params get serialized for deep linking and state persistence; you'll get a non-serializable warning. Pass the ID, look it up.
- Screen props: `NativeStackScreenProps<RootStackParamList, 'characterDetail'>`
- Elsewhere: `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`
- `navigate` reuses an existing screen; `push` always adds a new one.
- Declaration merging above is what makes `useNavigation()` typed globally.

---

## Questions they actually ask

**"Why not use the array index as a key?"**
Reordering or deleting makes the index point at different data, so React reuses the wrong component instance — component state (text inputs, animations) sticks to the wrong row.

**"useState vs useRef?"**
State triggers a re-render and is read at render time. A ref doesn't and is mutable synchronously — which is exactly why guards (`inFlight`) must be refs: several events can fire before React re-renders.

**"How do you debug a slow list?"**
Measure first. Check re-render counts, then `getItemLayout`, then memoize rows, then lower `windowSize`/`maxToRenderPerBatch`, then FlashList. Naming the order matters more than the fixes.

**"How do you handle errors in render?"**
An error boundary — still a class component, since there's no hook equivalent of `componentDidCatch`. It doesn't catch event handlers or async code.

**"How would you test this?"**
The hooks are pure functions of injected dependencies (`Fetcher`, `KeyValueStore`), so they test without a device — inject a fake, assert the state transitions. `@testing-library/react-native` for components.

**"What would you do differently in production?"**
`@tanstack/react-query` instead of the hand-rolled hook (caching, dedup, background refetch), and Zod at the boundary instead of `as T`.
