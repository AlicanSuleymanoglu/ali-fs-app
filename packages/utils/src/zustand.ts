export function createHookToSelectStateByKey<Store extends {}>(useStore: {
  <T>(selector: (state: Store) => T, equalityFn?: (a: T, b: T) => boolean): T;
  getState: () => Store;
}) {
  return function useStoreByKey<K extends keyof Store>(key: K): Store[K] {
    return useStore((store) => store[key]);
  };
}
