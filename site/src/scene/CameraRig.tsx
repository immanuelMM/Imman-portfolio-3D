import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { heroPoseFor } from './layout'

/**
 * Places the camera at the hero pose for the current viewport (S1: no chapter motion yet). The subject is moved off-centre
 * with `setViewOffset`, not by moving the camera, so the perspective stays that of a centred shot.
 */
export default function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const { width, height } = size
    const pose = heroPoseFor(width / height)
    camera.fov = pose.fov
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    if (pose.offsetX === 0 && pose.offsetY === 0) camera.clearViewOffset()
    else camera.setViewOffset(width, height, -pose.offsetX * height, pose.offsetY * height, width, height)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])
  return null
}
