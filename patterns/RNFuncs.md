# React Native Functions and hooks

Verified against what's installed here: **React 19.2.3, React Native 0.86.2,
React Navigation 7, safe-area-context 5.7**.

If you're rusty, the honest truth is that **seven of these cover ~95% of real
work**: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`,
`useContext`, `useReducer`. Learn when *not* to reach for the other twenty.

---

## Start here — the decision guide

**"I need to remember something."**
Does changing it need to repaint the screen?
→ yes: [`useState`](https://react.dev/reference/react/useState)
→ no: [`useRef`](https://react.dev/reference/react/useRef)

That's the whole distinction. A ref is for values you read and write *between*
renders — timers, subscriptions, re-entry guards, the previous value. State is
for anything the user can see.

**"My next state depends on several fields at once."**
→ [`useReducer`](https://react.dev/reference/react/useReducer). Rule of thumb: three or more `useState` calls that always change together is a reducer wearing a disguise.

**"I need to sync with something outside React."**
→ [`useEffect`](https://react.dev/reference/react/useEffect). Network, subscriptions, timers, native modules. **Not** for deriving values from props — compute those during render.

**"This recalculates on every render and it's expensive."**
→ [`useMemo`](https://react.dev/reference/react/useMemo). But measure first; it's usually not the bottleneck.

**"This function is a dependency of an effect, or a prop to a `memo`'d child."**
→ [`useCallback`](https://react.dev/reference/react/useCallback). Outside those two cases it does nothing.

**"Many screens need this and prop-drilling is painful."**
→ [`createContext`](https://react.dev/reference/react/createContext) + [`useContext`](https://react.dev/reference/react/useContext).

**"Context re-renders too much."**
→ [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) with selectors.

---

## State

| API | What it's for | Docs |
|---|---|---|
| `useState` | One piece of render-visible state. Use the functional form `setX(prev => ...)` when the next value depends on the old one — it's what makes updates safe inside async callbacks. | [↗](https://react.dev/reference/react/useState) |
| `useReducer` | Several fields that change together, or transitions with rules. Makes state changes testable as a pure function, separate from the component. | [↗](https://react.dev/reference/react/useReducer) |

## Context

| API | What it's for | Docs |
|---|---|---|
| `createContext` | Creates the channel. Not a hook — call it at module scope, once. Default value is only used when there's no Provider above. | [↗](https://react.dev/reference/react/createContext) |
| `useContext` | Reads the nearest Provider's value. **Re-renders on any change to that value** — no selector granularity. Split state and actions into two contexts so write-only consumers stay still. | [↗](https://react.dev/reference/react/useContext) |

## Refs & escape hatches

| API | What it's for | Docs |
|---|---|---|
| `useRef` | A mutable box that survives renders and **never triggers one**. Two jobs: (1) DOM/native component handles, (2) instance variables — timers, "is this still mounted", re-entry guards. Updates are synchronous, which is exactly why guards must be refs and not state. | [↗](https://react.dev/reference/react/useRef) |
| `useImperativeHandle` | Expose a handful of methods on a component's ref (`focus()`, `scrollToTop()`). Rare, and a smell if it's doing more than a couple of things. | [↗](https://react.dev/reference/react/useImperativeHandle) |

> **React 19:** `ref` is now a plain prop on function components. `forwardRef` is no longer needed for new code.

## Effects

| API | What it's for | Docs |
|---|---|---|
| `useEffect` | Synchronize with something outside React. Cleanup runs **before the next effect**, not only on unmount — that's what kills the stale-response race. StrictMode double-invokes it in dev on purpose. | [↗](https://react.dev/reference/react/useEffect) |
| `useLayoutEffect` | Same, but fires **before the browser/screen paints**. For measuring layout and adjusting before the user sees a flicker. Blocks paint, so use sparingly. | [↗](https://react.dev/reference/react/useLayoutEffect) |
| `useInsertionEffect` | For CSS-in-JS libraries injecting styles. **Web only — you will never need this in React Native.** | [↗](https://react.dev/reference/react/useInsertionEffect) |
| `useEffectEvent` | *New in 19.2.* Extracts non-reactive logic from an effect — read the latest value without adding it to the deps array. The sanctioned replacement for the "latest value in a ref" workaround. | [↗](https://react.dev/reference/react/useEffectEvent) |

**You probably don't need an effect** for: deriving state from props (compute during render), or responding to a user action (do it in the handler).

## Performance & concurrency

| API | What it's for | Docs |
|---|---|---|
| `useMemo` | Cache an expensive computation, or stabilize an object/array that feeds a dependency array or a `memo`'d child. | [↗](https://react.dev/reference/react/useMemo) |
| `useCallback` | Same thing for functions. `useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)`. | [↗](https://react.dev/reference/react/useCallback) |
| `useTransition` | Mark an update as non-urgent so typing/tapping stays responsive while it renders. Gives you an `isPending` flag. | [↗](https://react.dev/reference/react/useTransition) |
| `useDeferredValue` | Let one value lag behind so the rest of the UI stays snappy — a built-in cousin of debouncing for render work (not for network calls). | [↗](https://react.dev/reference/react/useDeferredValue) |

> The **React Compiler** automates most `useMemo`/`useCallback`/`memo` work. "I'd reach for the compiler before hand-memoizing" is a current, informed answer.

## React 19 additions

| API | What it's for | Docs |
|---|---|---|
| `use` | Read a promise or a context **conditionally** — it can be called inside `if` blocks and loops, unlike every other hook. Pairs with Suspense. | [↗](https://react.dev/reference/react/use) |
| `useOptimistic` | Show the result immediately while the request is in flight, roll back automatically if it fails. The "instant like button" hook. | [↗](https://react.dev/reference/react/useOptimistic) |
| `useActionState` | State + pending + error for an async action in one hook. Form-shaped; less common in RN, but worth recognizing. | [↗](https://react.dev/reference/react/useActionState) |

## Utility

| API | What it's for | Docs |
|---|---|---|
| `useSyncExternalStore` | Subscribe to state living **outside** React with per-selector granularity. This is how Zustand works internally. Trap: the snapshot must be referentially stable or React throws "getSnapshot should be cached". | [↗](https://react.dev/reference/react/useSyncExternalStore) |
| `useId` | Generate a stable unique ID matched across server and client. For accessibility linking — **not** for list keys. | [↗](https://react.dev/reference/react/useId) |
| `useDebugValue` | Label a custom hook in React DevTools. Cosmetic. | [↗](https://react.dev/reference/react/useDebugValue) |

## Non-hook React APIs

| API | What it's for | Docs |
|---|---|---|
| `memo` | Skip re-rendering when props are **shallowly** equal. One inline `style={{...}}` or `data={xs.filter(...)}` defeats it — that's why memoization "doesn't work". | [↗](https://react.dev/reference/react/memo) |
| `lazy` | Code-split a component, loaded on first render. Pair with `Suspense`. | [↗](https://react.dev/reference/react/lazy) |
| `Suspense` | Declare a loading fallback for children that aren't ready. | [↗](https://react.dev/reference/react/Suspense) |
| `startTransition` | `useTransition` without the pending flag — usable outside components. | [↗](https://react.dev/reference/react/startTransition) |
| `forwardRef` | **Legacy in React 19** — `ref` is a normal prop now. Recognize it in old code; don't write it. | [↗](https://react.dev/reference/react/forwardRef) |

---

## React Native's own hooks

These ship in the `react-native` package itself.

| API | What it's for | Docs |
|---|---|---|
| `useWindowDimensions` | Current width/height, **updates on rotation**. Always prefer this to `Dimensions.get('window')`, which snapshots once and goes stale. | [↗](https://reactnative.dev/docs/usewindowdimensions) |
| `useColorScheme` | `'light' \| 'dark' \| null`, follows the OS setting live. | [↗](https://reactnative.dev/docs/usecolorscheme) |
| `useAnimatedValue` | An `Animated.Value` that persists across renders — sugar for `useRef(new Animated.Value(0)).current`. Also `useAnimatedValueXY`, `useAnimatedColor`. | [↗](https://reactnative.dev/docs/animated) |

## Ecosystem hooks in this project

| API | Package | What it's for | Docs |
|---|---|---|---|
| `useNavigation` | `@react-navigation/native` | Navigate from a component that isn't a screen. Type it: `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`. | [↗](https://reactnavigation.org/docs/use-navigation) |
| `useRoute` | `@react-navigation/native` | Read the current route's params without prop-drilling `route`. | [↗](https://reactnavigation.org/docs/use-route) |
| `useFocusEffect` | `@react-navigation/native` | `useEffect` that runs on **screen focus**, not mount. Screens stay mounted in the stack — this is the one people miss. | [↗](https://reactnavigation.org/docs/use-focus-effect) |
| `useIsFocused` | `@react-navigation/native` | Boolean version, for pausing video/polling on a backgrounded screen. | [↗](https://reactnavigation.org/docs/use-is-focused) |
| `useNavigationState` | `@react-navigation/native` | Read the whole navigation state. Rare; useful for "can I go back?" logic. | [↗](https://reactnavigation.org/docs/use-navigation-state) |
| `usePreventRemove` | `@react-navigation/native` | Intercept a back gesture — "discard unsaved changes?". | [↗](https://reactnavigation.org/docs/preventing-going-back) |
| `useSafeAreaInsets` | `react-native-safe-area-context` | Notch/home-indicator insets as numbers, when `SafeAreaView` is too blunt. Also `useSafeAreaFrame`. | [↗](https://github.com/AppAndFlow/react-native-safe-area-context) |

---

## The rules that apply to all of them

1. **Top level only.** No hooks inside conditions, loops, or nested functions. React tracks them by call order, so a conditional hook shifts every subsequent one.
2. **Components and custom hooks only.** A custom hook is just a function whose name starts with `use` and which calls other hooks.
3. **Deps are compared with `Object.is`.** Objects and arrays are new every render — depend on primitives (`character.url`) over objects (`character`) where you can.
4. **Missing a dep = stale closure.** The value is frozen at the render the effect last ran.
5. **Effect cleanup runs before the next effect**, not only on unmount.
