import { describe, expect, it } from 'vitest'
import { Group, Layers, Mesh, PerspectiveCamera } from 'three'
import { excludeFromReflection, NO_REFLECTION_LAYER } from './layers'

describe('excludeFromReflection', () => {
  it('moves an object and its children to the no-reflection layer only', () => {
    const group = new Group()
    const child = new Mesh()
    group.add(child)
    excludeFromReflection(group)
    for (const node of [group, child]) {
      expect(node.layers.isEnabled(NO_REFLECTION_LAYER)).toBe(true)
      expect(node.layers.isEnabled(0)).toBe(false)
    }
  })

  it('is seen by a camera that enables the layer and hidden from a default (mirror) camera', () => {
    const prop = excludeFromReflection(new Mesh())
    const main = new PerspectiveCamera()
    main.layers.enable(NO_REFLECTION_LAYER)
    const mirror = new PerspectiveCamera()
    expect(prop.layers.test(main.layers)).toBe(true)
    expect(prop.layers.test(mirror.layers)).toBe(false)
    expect(new Layers().mask).toBe(1)
  })
})
