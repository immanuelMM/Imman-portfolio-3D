import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, ConeGeometry, DoubleSide, InstancedMesh, Matrix4, ShaderMaterial } from 'three'
import { ROOM } from './layout'

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColour;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // strongest near the lamp (uv.y = 1 at the cone apex), fading to nothing at the floor; soft at the silhouette
    float along = pow(vUv.y, 1.6);
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float a = along * pow(facing, 1.5) * uStrength;
    gl_FragColor = vec4(uColour * a, 1.0);
    #include <colorspace_fragment>
  }
`

const SHAFTS: Array<[number, number]> = [
  [-1.35, -3.2],
  [1.35, -3.2],
  [-1.35, 0.2],
  [1.35, 0.2],
]

/**
 * Cool light shafts under the ceiling strips: open cones with an additive gradient (no volumetric pass). With the room's
 * exponential fog they give the haze its shape. Depth-tested, so racks and panels cut them correctly.
 */
export default function Haze() {
  const { geometry, material, mesh } = useMemo(() => {
    const geometry = new ConeGeometry(1.7, ROOM.height - 0.05, 32, 1, true)
    geometry.translate(0, -(ROOM.height - 0.05) / 2, 0)
    const material = new ShaderMaterial({
      uniforms: { uColour: { value: new Color(0.35, 0.62, 0.8) }, uStrength: { value: 0.075 } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      fog: false,
    })
    const mesh = new InstancedMesh(geometry, material, SHAFTS.length)
    SHAFTS.forEach(([x, z], i) => mesh.setMatrixAt(i, new Matrix4().makeTranslation(x, ROOM.height - 0.03, z)))
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    mesh.renderOrder = 6
    return { geometry, material, mesh }
  }, [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      mesh.dispose()
    },
    [geometry, material, mesh],
  )
  return <primitive object={mesh} />
}
