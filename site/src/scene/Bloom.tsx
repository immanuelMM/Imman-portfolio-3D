import { EffectComposer, Bloom as BloomEffect, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

/**
 * Soft glow on the things that really emit light: the panel glyphs and rims, rack LEDs, console screens and the ceiling
 * strips (emissive values above 1; everything merely lit stays below the threshold). High tier only, loaded on demand
 * from CommandCenter so the phone and tablet tiers never download it.
 *
 * The composer turns the renderer's tone mapping off while it is mounted, so the same ACES curve is applied here.
 * MSAA moves into the composer's own render target (the canvas antialias flag no longer reaches it).
 */
export default function Bloom() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <BloomEffect mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.25} intensity={0.75} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
