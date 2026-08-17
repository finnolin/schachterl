import { getContext } from 'svelte';
import { Spaces } from '../repositories/Spaces';

type SpaceWithTypes = Awaited<ReturnType<Spaces['getSpaceById']>>;

// use-space.ts
export function useSpace(): () => Promise<SpaceWithTypes> {
  return getContext<() => Promise<SpaceWithTypes>>('space');
}
