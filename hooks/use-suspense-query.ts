"use client";

import { useQuery, useConvex } from "convex/react";
import {
  type FunctionReference,
  type FunctionReturnType,
  type OptionalRestArgs,
  getFunctionName,
} from "convex/server";

/**
 * Module-level cache that stores query results independently of React state.
 *
 * When a component suspends, React never commits the render, so
 * `useSyncExternalStore` (used internally by Convex's `useQuery`) never
 * activates its subscription — meaning `useQuery` returns `undefined` on
 * every retry. This cache bridges that gap: our `watchQuery.onUpdate`
 * subscription populates it, and we read from it when `useQuery` can't
 * provide data yet.
 */
const dataCache = new Map<string, unknown>();

type Subscription = {
  promise: Promise<void>;
  unsub: () => void;
};

const subscriptions = new Map<string, Subscription>();

function getCacheKey(
  queryName: string,
  args: Record<string, unknown> | undefined,
): string {
  return queryName + ":" + JSON.stringify(args ?? {});
}

/**
 * Suspense-compatible wrapper around Convex's `useQuery`.
 *
 * Throws a promise while the query is loading so a parent `<Suspense>`
 * boundary can show a fallback. Returns the resolved value once available
 * (which may be `null` for queries that legitimately return nothing).
 *
 * Does NOT accept `"skip"` — restructure components so the inner component
 * always receives the arguments it needs via props.
 *
 * When Convex ships native `useSuspenseQuery`, replace calls to this hook
 * with the official version.
 */
export function useSuspenseQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): FunctionReturnType<Query> {
  const convex = useConvex();
  const reactResult = useQuery(query, ...args);

  const queryName = getFunctionName(query);
  const key = getCacheKey(queryName, args[0] as Record<string, unknown>);

  // 1. Prefer useQuery's reactive result — it's always the most current.
  //    Once useQuery is working (component committed), clean up our bridge.
  if (reactResult !== undefined) {
    dataCache.delete(key);
    const sub = subscriptions.get(key);
    if (sub) {
      sub.unsub();
      subscriptions.delete(key);
    }
    return reactResult as FunctionReturnType<Query>;
  }

  // 2. useQuery returned undefined (subscription not committed yet).
  //    Check our module-level cache populated by watchQuery.
  if (dataCache.has(key)) {
    return dataCache.get(key) as FunctionReturnType<Query>;
  }

  // 3. No data anywhere — set up an external subscription and suspend.
  if (!subscriptions.has(key)) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });

    const watch = convex.watchQuery(
      query,
      ...(args as OptionalRestArgs<Query>),
    );

    const unsub = watch.onUpdate(() => {
      const result = watch.localQueryResult();
      if (result !== undefined) {
        dataCache.set(key, result);
        resolve();
      }
    });

    // Race: data may already be in the client cache
    const immediate = watch.localQueryResult();
    if (immediate !== undefined) {
      dataCache.set(key, immediate);
      resolve();
    }

    subscriptions.set(key, { promise, unsub });
  }

  throw subscriptions.get(key)!.promise;
}
