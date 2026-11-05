import { AdditiveBlending, Color, ShaderMaterial, type Texture } from 'three'

export interface HoloOptions {
  tint?: Color
  /** output multiplier; above 1 the glyph strokes pass the bloom threshold */
  intensity?: number
  /** a per-vertex `aGlow` attribute (0..1) lights part of the geometry (the project-screen atlas: one cell per quad) */
  vertexGlow?: boolean
  /** strength of the glowing rim at the texture's edge, 0..1 (default 1; 0 for an atlas, whose edges are not the panel's) */
  rim?: number
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying float vGlow;
  #ifdef VERTEX_GLOW
    attribute float aGlow;
  #endif
  void main() {
    vUv = uv;
    #ifdef VERTEX_GLOW
      vGlow = aGlow;
    #else
      vGlow = 0.0;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uTime;
  uniform float uActive;
  uniform float uFlicker;
  uniform float uIntensity;
  uniform float uRim;
  varying vec2 vUv;
  varying float vGlow;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    // fine scanlines that creep upward, and a slow bright band sweeping the panel
    float scan = 0.86 + 0.14 * sin(vUv.y * 560.0 - uTime * 3.0);
    float sweep = pow(max(0.0, sin((vUv.y * 1.2 - uTime * 0.18) * 6.2831)), 14.0) * 0.35;
    // glowing rim: strongest on the outer few percent of the glass (stands in for a fresnel edge on a flat plane)
    vec2 e = min(vUv, 1.0 - vUv);
    float rim = smoothstep(0.035, 0.0, min(e.x * 0.55, e.y * 0.3)) * uRim;
    float lum = max(tex.r, max(tex.g, tex.b));
    float glow = lum * (0.45 + 0.85 * uActive + 0.5 * vGlow) + sweep * tex.a * 0.5;
    vec3 col = tex.rgb * glow * scan * uTint * uIntensity;
    col += uTint * rim * (0.35 + 0.6 * uActive) * uIntensity * 0.9;
    // a lit cell (vGlow, per vertex) also gets a faint cyan wash behind its art so it reads as switched on
    col += uTint * vGlow * 0.012 * uIntensity;
    float alpha = clamp(tex.a * (0.55 + 0.45 * uActive) + rim * 0.5 + vGlow * 0.1, 0.0, 1.0) * uFlicker;
    gl_FragColor = vec4(col * uFlicker, alpha);
    #include <colorspace_fragment>
  }
`

/**
 * The glass-hologram look of an agent panel: the drawn face (a canvas texture) with scanlines, a sweeping band, a bright rim,
 * a slow flicker and an `uActive` 0..1 level for how lit the panel is. Additive, no depth write, not tone-mapped, so values
 * above 1 bloom on the high tier. Uniforms: `uTime`, `uActive`, `uFlicker`.
 */
export function createHoloMaterial(map: Texture, opts: HoloOptions = {}): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTint: { value: opts.tint ?? new Color(1, 1, 1) },
      uTime: { value: 0 },
      uActive: { value: 0.6 },
      uFlicker: { value: 1 },
      uIntensity: { value: opts.intensity ?? 1.6 },
      uRim: { value: opts.rim ?? 1 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: opts.vertexGlow ? { VERTEX_GLOW: '' } : {},
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
}
