import type { Object3D } from 'three'

/**
 * Three.js layer for things that need no reflection in the mirror floor. The main camera draws layers 0 and 1; the mirror
 * pass of drei's `MeshReflectorMaterial` uses its own camera that sees layer 0 only, so a prop on this layer is drawn once
 * per frame instead of twice (small wall props, ceiling steel, light shafts: invisible in a blurred floor reflection).
 */
export const NO_REFLECTION_LAYER = 1

/** Puts an object and all its descendants on the no-reflection layer. */
export function excludeFromReflection<T extends Object3D>(object: T): T {
  object.traverse((node) => node.layers.set(NO_REFLECTION_LAYER))
  return object
}
