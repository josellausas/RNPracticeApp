# patterns

## Reach for this when…

| File | When |
|---|---|
| [CHEATSHEET.md](CHEATSHEET.md) | **Read this one first.** The things you forget, not the things you type. |
| [RNFuncs.md](RNFuncs.md) | Every hook + API with a one-line "when to reach for it", and doc links. For revision, not copy-paste. |
| [fetchJson.ts](fetchJson.ts) | Any network call. `ok` check, abort signal, one cast. Start here. |
| [useAsyncData.ts](useAsyncData.ts) | "Fetch this and show it." Loading/error/retry/timeout/cancel. |
| [AsyncBoundary.tsx](AsyncBoundary.tsx) | Rendering the above — including the empty state nobody handles. |
| [useDebouncedValue.ts](useDebouncedValue.ts) | Search-as-you-type, filter inputs, save-as-you-type. |
| [usePaginatedList.ts](usePaginatedList.ts) | "Now make it infinite scroll." Also pull-to-refresh. |
| [useStoredState.ts](useStoredState.ts) | "Remember this between launches." Storage is injected, so it's testable. |
| [useLocation.ts](useLocation.ts) | Anything maps or permissions. Encodes the subscription-cleanup trap. |
| [microHooks.ts](microHooks.ts) | `usePrevious`, `useInterval`, `useIsMounted`, `useRenderCount`. |
| [ErrorBoundary.tsx](ErrorBoundary.tsx) | "How do you handle render errors?" Still a class, and that's the point. |

## The two-line combo

Most data tasks are these two files and nothing else:

```tsx
const { state, retry } = useAsyncData(
  (signal) => fetchJson<Character[]>(URL, signal),
  []
);

return (
  <AsyncBoundary state={state} onRetry={retry}>
    {(characters) => (
      <FlatList
        data={characters}
        keyExtractor={(c) => c.url}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    )}
  </AsyncBoundary>
);
```

## Note on `hooks/useAsyncData.ts`

[../hooks/useAsyncData.ts](../hooks/useAsyncData.ts) is now a **copy of the one
here** — both take a deps array rather than treating the fetcher as an effect
dependency, so callers can pass an inline arrow without `useCallback`.

Two copies means they can drift. If you change one, change the other, or
collapse `hooks/` into a re-export of this file.
