import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Real-time 3D traffic for the landing scene.
 *
 * Loaded lazily and only when the device can actually drive it — see
 * SpaceBackdrop, which falls back to the flat SVG ships otherwise.
 *
 * The look is deliberately hard rather than dreamy: one strong key light, a
 * cold rim light, almost no fill, filmic tone mapping, and metal that is rough
 * enough to catch a sharp specular instead of a soft sheen. Hull plating,
 * panel gaps and wear come from a canvas texture generated at runtime, so the
 * ships stay entirely our own work with no external art.
 */

/** Procedural hull plating: panel gaps, plate shading, streaks, rivets. */
function makeHullTextures(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const size = 512
  const albedo = document.createElement('canvas')
  albedo.width = albedo.height = size
  const a = albedo.getContext('2d')!

  a.fillStyle = '#7c848f'
  a.fillRect(0, 0, size, size)

  // Plates: subtly different tones so large surfaces never read as one slab.
  for (let i = 0; i < 90; i++) {
    const w = 24 + Math.random() * 120
    const h = 18 + Math.random() * 90
    const x = Math.random() * size
    const y = Math.random() * size
    const shade = 108 + Math.random() * 46
    a.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`
    a.fillRect(x, y, w, h)
    a.strokeStyle = 'rgba(12, 16, 24, 0.55)'
    a.lineWidth = 1.4
    a.strokeRect(x + 0.5, y + 0.5, w, h)
  }

  // Recessed panel gaps across the whole sheet.
  a.strokeStyle = 'rgba(8, 11, 18, 0.6)'
  a.lineWidth = 1.1
  for (let i = 0; i < 26; i++) {
    a.beginPath()
    const v = Math.random() < 0.5
    const p = Math.random() * size
    if (v) {
      a.moveTo(p, 0)
      a.lineTo(p, size)
    } else {
      a.moveTo(0, p)
      a.lineTo(size, p)
    }
    a.stroke()
  }

  // Wear streaks trailing aft, plus scorch near where thrusters sit.
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const len = 8 + Math.random() * 70
    a.strokeStyle = `rgba(20, 24, 32, ${0.05 + Math.random() * 0.16})`
    a.lineWidth = 0.6 + Math.random() * 1.8
    a.beginPath()
    a.moveTo(x, y)
    a.lineTo(x + len, y + (Math.random() - 0.5) * 3)
    a.stroke()
  }

  // Rivet lines along plate seams.
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * size
    const x0 = Math.random() * size
    const count = 6 + Math.floor(Math.random() * 14)
    for (let r = 0; r < count; r++) {
      a.fillStyle = 'rgba(30, 36, 46, 0.5)'
      a.beginPath()
      a.arc(x0 + r * 6, y, 0.9, 0, Math.PI * 2)
      a.fill()
    }
  }

  // A couple of hazard flashes so the hull has an accent that isn't grey.
  for (let i = 0; i < 4; i++) {
    a.fillStyle = i % 2 ? 'rgba(249, 115, 22, 0.5)' : 'rgba(34, 211, 238, 0.32)'
    a.fillRect(Math.random() * size, Math.random() * size, 30 + Math.random() * 40, 4)
  }

  // Roughness derived from the albedo: worn plates scatter, clean plates
  // stay sharp, which is what makes the specular break up believably.
  const rough = document.createElement('canvas')
  rough.width = rough.height = size
  const r = rough.getContext('2d')!
  r.drawImage(albedo, 0, 0)
  const img = r.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255
    const v = Math.max(0, Math.min(255, (0.32 + (1 - lum) * 0.5) * 255))
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  r.putImageData(img, 0, 0)

  const map = new THREE.CanvasTexture(albedo)
  const roughTex = new THREE.CanvasTexture(rough)
  for (const t of [map, roughTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 2)
    t.anisotropy = 4
  }
  map.colorSpace = THREE.SRGBColorSpace
  return { map, rough: roughTex }
}

/**
 * Metal is defined by what it reflects, so a metallic material with nothing to
 * reflect renders essentially black. This builds a small equirectangular
 * environment — dark space with a hot key patch and a cold rim patch — and
 * pre-filters it, which is what gives the hulls their sharp moving highlights.
 */
function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!

  const base = g.createLinearGradient(0, 0, 0, 128)
  base.addColorStop(0, '#243350')
  base.addColorStop(0.55, '#4a5a76')
  base.addColorStop(1, '#0a1020')
  g.fillStyle = base
  g.fillRect(0, 0, 256, 128)

  const keyPatch = g.createRadialGradient(72, 28, 1, 72, 28, 52)
  keyPatch.addColorStop(0, '#ffffff')
  keyPatch.addColorStop(0.45, 'rgba(255, 255, 255, 0.85)')
  keyPatch.addColorStop(1, 'rgba(226, 232, 240, 0)')
  g.fillStyle = keyPatch
  g.fillRect(0, 0, 256, 128)

  const rimPatch = g.createRadialGradient(196, 74, 1, 196, 74, 58)
  rimPatch.addColorStop(0, '#bae6fd')
  rimPatch.addColorStop(1, 'rgba(56, 189, 248, 0)')
  g.fillStyle = rimPatch
  g.fillRect(0, 0, 256, 128)

  const warmPatch = g.createRadialGradient(140, 112, 1, 140, 112, 40)
  warmPatch.addColorStop(0, 'rgba(249, 115, 22, 0.75)')
  warmPatch.addColorStop(1, 'rgba(249, 115, 22, 0)')
  g.fillStyle = warmPatch
  g.fillRect(0, 0, 256, 128)

  const equirect = new THREE.CanvasTexture(c)
  equirect.mapping = THREE.EquirectangularReflectionMapping
  equirect.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromEquirectangular(equirect).texture
  pmrem.dispose()
  equirect.dispose()
  return env
}

type Craft = {
  group: THREE.Group
  speed: number
  y: number
  z: number
  bank: number
  spin: number
  startX: number
  endX: number
}

function buildFighter(
  hull: THREE.MeshStandardMaterial,
  dark: THREE.MeshStandardMaterial,
  glass: THREE.MeshPhysicalMaterial,
  glow: THREE.Material,
  scale: number,
): THREE.Group {
  const g = new THREE.Group()

  // Chined fuselage: a top-down silhouette extruded and bevelled, so every
  // edge is a real chamfer that catches the key light as a hard highlight.
  const profile = new THREE.Shape()
  profile.moveTo(-1.75, 0)
  profile.lineTo(-1.35, 0.4)
  profile.lineTo(-0.2, 0.52)
  profile.lineTo(1.15, 0.34)
  profile.lineTo(2.05, 0.12)
  profile.lineTo(2.25, 0)
  profile.lineTo(2.05, -0.12)
  profile.lineTo(1.15, -0.34)
  profile.lineTo(-0.2, -0.52)
  profile.lineTo(-1.35, -0.4)
  profile.closePath()

  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 0.36,
    bevelEnabled: true,
    bevelSize: 0.085,
    bevelThickness: 0.085,
    bevelSegments: 2,
    curveSegments: 2,
  })
  body.rotateX(-Math.PI / 2)
  body.center()
  g.add(new THREE.Mesh(body, hull))

  // Dorsal spine, slightly proud of the hull.
  const spine = new THREE.BoxGeometry(1.9, 0.16, 0.42)
  spine.translate(-0.1, 0.26, 0)
  g.add(new THREE.Mesh(spine, hull))

  // Wings with dihedral, thin enough to read as plate.
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.lineTo(-0.75, 1.15)
  wingShape.lineTo(-0.1, 1.2)
  wingShape.lineTo(0.7, 0.1)
  wingShape.closePath()
  for (const side of [1, -1]) {
    const wing = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 1,
      curveSegments: 1,
    })
    wing.rotateX(-Math.PI / 2)
    const m = new THREE.Mesh(wing, hull)
    m.position.set(-0.35, 0.02, side * 0.42)
    m.rotation.x = side * 0.22
    m.scale.z = side
    g.add(m)
  }

  // Tail fins.
  for (const side of [1, -1]) {
    const fin = new THREE.BoxGeometry(0.7, 0.5, 0.07)
    const m = new THREE.Mesh(fin, dark)
    m.position.set(-1.3, 0.3, side * 0.3)
    m.rotation.z = 0.25
    m.rotation.y = side * 0.2
    g.add(m)
  }

  // Canopy: dark, near-mirror glass over the forward hull.
  const canopy = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  const canopyMesh = new THREE.Mesh(canopy, glass)
  canopyMesh.position.set(0.75, 0.17, 0)
  canopyMesh.scale.set(1.5, 0.62, 0.78)
  g.add(canopyMesh)

  // Engine nacelles and their emissive cores.
  for (const side of [1, -1]) {
    const nac = new THREE.CylinderGeometry(0.21, 0.25, 0.95, 14)
    nac.rotateZ(Math.PI / 2)
    const m = new THREE.Mesh(nac, dark)
    m.position.set(-1.5, 0.02, side * 0.3)
    g.add(m)

    const core = new THREE.Mesh(new THREE.CircleGeometry(0.17, 14), glow)
    core.position.set(-1.98, 0.02, side * 0.3)
    core.rotation.y = -Math.PI / 2
    g.add(core)
  }

  // Greebles: the small surface hardware that separates "spaceship" from
  // "smooth shape". One instanced mesh so the detail costs a single draw.
  const greebleCount = 34
  const greebles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    dark,
    greebleCount,
  )
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  for (let i = 0; i < greebleCount; i++) {
    pos.set(
      -1.5 + Math.random() * 3,
      (Math.random() < 0.5 ? 0.19 : -0.19) + (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.85,
    )
    scl.set(
      0.06 + Math.random() * 0.22,
      0.03 + Math.random() * 0.07,
      0.05 + Math.random() * 0.16,
    )
    q.setFromEuler(new THREE.Euler(0, Math.random() * 0.5, 0))
    m4.compose(pos, q, scl)
    greebles.setMatrixAt(i, m4)
  }
  greebles.instanceMatrix.needsUpdate = true
  g.add(greebles)

  g.scale.setScalar(scale)
  return g
}

export default function ShipScene3D() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.65
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      38,
      Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1),
      0.1,
      120,
    )
    camera.position.set(0, 0, 13)

    // Hard key, cold rim, almost no fill. The darkness is the point: it is
    // what keeps the highlights reading as sharp rather than washed.
    const key = new THREE.DirectionalLight(0xffffff, 5.2)
    key.position.set(5, 7, 6)
    scene.add(key)

    const rim = new THREE.DirectionalLight(0x7dd3fc, 3.6)
    rim.position.set(-7, 1.5, -5)
    scene.add(rim)

    const accent = new THREE.DirectionalLight(0xf97316, 0.7)
    accent.position.set(2, -4, -3)
    scene.add(accent)

    scene.add(new THREE.HemisphereLight(0x1e293b, 0x020617, 0.28))

    const envMap = makeEnvironment(renderer)
    scene.environment = envMap

    const { map, rough } = makeHullTextures()
    const hull = new THREE.MeshStandardMaterial({
      map,
      roughnessMap: rough,
      color: 0xc3ccd9,
      metalness: 0.82,
      roughness: 0.29,
      envMapIntensity: 2.3,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: 0x4a5462,
      metalness: 0.78,
      roughness: 0.4,
      envMapIntensity: 1.8,
    })
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0b1f2a,
      metalness: 0.5,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      reflectivity: 1,
    })
    const glowCyan = new THREE.MeshBasicMaterial({
      color: 0xd6f4ff,
      side: THREE.DoubleSide,
    })

    const compact = host.clientWidth < 700
    const specs: Array<{ scale: number; y: number; z: number; speed: number }> = compact
      ? [
          { scale: 0.85, y: 1.6, z: -2, speed: 1.5 },
          { scale: 0.5, y: -2.2, z: -6, speed: 0.95 },
        ]
      : [
          { scale: 1.15, y: 1.5, z: 0, speed: 1.75 },
          { scale: 0.62, y: -2.4, z: -7, speed: 1.05 },
          { scale: 0.4, y: 3.1, z: -12, speed: 0.7 },
        ]

    const craft: Craft[] = specs.map((s, i) => {
      const group = buildFighter(hull, dark, glass, glowCyan, s.scale)
      const startX = -16 - i * 7
      group.position.set(startX, s.y, s.z)
      scene.add(group)
      return {
        group,
        speed: s.speed,
        y: s.y,
        z: s.z,
        bank: 0,
        spin: 0.12 + Math.random() * 0.18,
        startX,
        endX: 17,
      }
    })

    let raf = 0
    let last = performance.now()

    function resize() {
      if (!host) return
      const w = Math.max(host.clientWidth, 1)
      const h = Math.max(host.clientHeight, 1)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) {
        last = now
        return
      }
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      for (const c of craft) {
        c.group.position.x += c.speed * dt * 3.4
        // Bank into the drift and pitch the nose slightly as it crosses.
        c.bank += dt * c.spin
        c.group.rotation.z = Math.sin(c.bank) * 0.34 - 0.16
        c.group.rotation.y = -0.22 + Math.sin(c.bank * 0.6) * 0.12
        c.group.rotation.x = Math.sin(c.bank * 0.45) * 0.08
        c.group.position.y = c.y + Math.sin(c.bank * 0.5) * 0.35
        if (c.group.position.x > c.endX) {
          c.group.position.x = c.startX
        }
      }
      renderer.render(scene, camera)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
      })
      for (const m of [hull, dark, glass, glowCyan]) m.dispose()
      map.dispose()
      rough.dispose()
      envMap.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />
}
