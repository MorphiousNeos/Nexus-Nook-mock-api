import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Real-time 3D traffic for the landing scene.
 *
 * Loaded lazily and only when the device can drive it — see SpaceBackdrop,
 * which falls back to flat SVG ships otherwise.
 *
 * Three things carry the look:
 *  - Surface relief. Plating, panel gaps, rivets and stencils are generated to
 *    a height field at runtime and converted to a normal map, so panel lines
 *    are lit as real grooves rather than painted-on lines.
 *  - Hard lighting. Strong key, cold rim, almost no fill, filmic tone mapping
 *    and a pre-filtered environment for the metal to reflect. Without the
 *    environment a metallic material has nothing to reflect and renders black.
 *  - Additive engine glow and trails instead of a post-processing bloom pass,
 *    which keeps the canvas background transparent so the CSS starfield and
 *    nebulas behind it stay visible.
 *
 * Every static part of a ship is merged per material, so a hull with dozens of
 * greebles still costs a handful of draw calls.
 */

const TEX = 1024

type Surface = {
  map: THREE.CanvasTexture
  rough: THREE.CanvasTexture
  normal: THREE.CanvasTexture
}

/** Sobel the height field into a tangent-space normal map. */
function heightToNormal(height: ImageData, strength: number): ImageData {
  const { width: w, height: h, data: src } = height
  const out = new ImageData(w, h)
  const dst = out.data
  const lum = (x: number, y: number) => {
    const xi = (x + w) % w
    const yi = (y + h) % h
    return src[(yi * w + xi) * 4] / 255
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1) -
        (lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1))
      const dy =
        lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1) -
        (lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1))
      let nx = dx * strength
      let ny = dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      const i = (y * w + x) * 4
      dst[i] = (nx * 0.5 + 0.5) * 255
      dst[i + 1] = (ny * 0.5 + 0.5) * 255
      dst[i + 2] = (nz / len) * 255
      dst[i + 3] = 255
    }
  }
  return out
}

function makeSurface(): Surface {
  const albedo = document.createElement('canvas')
  albedo.width = albedo.height = TEX
  const a = albedo.getContext('2d')!

  // Height is drawn alongside albedo: mid grey is flush, dark is recessed,
  // light is proud. It becomes the normal map, so it decides where light
  // actually catches — the panel gaps, rivet heads and weld seams.
  const height = document.createElement('canvas')
  height.width = height.height = TEX
  const hh = height.getContext('2d')!
  hh.fillStyle = '#808080'
  hh.fillRect(0, 0, TEX, TEX)

  a.fillStyle = '#8a929d'
  a.fillRect(0, 0, TEX, TEX)

  // Plate layout: a coarse grid jittered into irregular panels.
  const plates: Array<[number, number, number, number]> = []
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const w = TEX / 8
      const x = gx * w + Math.random() * 8
      const y = gy * w + Math.random() * 8
      const pw = w - 6 - Math.random() * 14
      const ph = w - 6 - Math.random() * 14
      plates.push([x, y, pw, ph])
      const shade = 138 + Math.random() * 26
      a.fillStyle = `rgb(${shade}, ${shade + 5}, ${shade + 13})`
      a.fillRect(x, y, pw, ph)
      // Plate face sits slightly proud; the gap around it reads as a groove.
      hh.fillStyle = `rgb(${146 + Math.floor(Math.random() * 16)},${146},${146})`
      hh.fillRect(x, y, pw, ph)
    }
  }

  // Sub-panel divisions inside the larger plates.
  for (const [x, y, pw, ph] of plates) {
    const cuts = Math.floor(Math.random() * 3)
    for (let c = 0; c < cuts; c++) {
      const vertical = Math.random() < 0.5
      const t = 0.25 + Math.random() * 0.5
      a.strokeStyle = 'rgba(24, 30, 40, 0.42)'
      hh.strokeStyle = 'rgba(60, 60, 60, 1)'
      a.lineWidth = 1.6
      hh.lineWidth = 2.4
      a.beginPath()
      hh.beginPath()
      if (vertical) {
        a.moveTo(x + pw * t, y)
        a.lineTo(x + pw * t, y + ph)
        hh.moveTo(x + pw * t, y)
        hh.lineTo(x + pw * t, y + ph)
      } else {
        a.moveTo(x, y + ph * t)
        a.lineTo(x + pw, y + ph * t)
        hh.moveTo(x, y + ph * t)
        hh.lineTo(x + pw, y + ph * t)
      }
      a.stroke()
      hh.stroke()
    }
  }

  // Rivet runs along plate edges: small proud domes.
  for (const [x, y, pw] of plates) {
    if (Math.random() < 0.45) continue
    const count = Math.floor(pw / 14)
    for (let i = 0; i < count; i++) {
      const rx = x + 6 + i * 14
      const ry = y + 5
      a.fillStyle = 'rgba(46, 54, 66, 0.6)'
      a.beginPath()
      a.arc(rx, ry, 1.5, 0, Math.PI * 2)
      a.fill()
      hh.fillStyle = 'rgba(190, 190, 190, 1)'
      hh.beginPath()
      hh.arc(rx, ry, 1.8, 0, Math.PI * 2)
      hh.fill()
    }
  }

  // Weld seams: raised beads crossing plates.
  for (let i = 0; i < 14; i++) {
    const y = Math.random() * TEX
    hh.strokeStyle = 'rgba(178, 178, 178, 0.9)'
    hh.lineWidth = 2.6
    hh.beginPath()
    hh.moveTo(0, y)
    for (let x = 0; x <= TEX; x += 32) {
      hh.lineTo(x, y + (Math.random() - 0.5) * 3)
    }
    hh.stroke()
  }

  // Wear: scorch and streaking, albedo only — dirt does not change the shape.
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * TEX
    const y = Math.random() * TEX
    const len = 14 + Math.random() * 150
    a.strokeStyle = `rgba(18, 22, 30, ${0.04 + Math.random() * 0.14})`
    a.lineWidth = 0.6 + Math.random() * 2.6
    a.beginPath()
    a.moveTo(x, y)
    a.lineTo(x + len, y + (Math.random() - 0.5) * 5)
    a.stroke()
  }

  // Hull markings: hazard bars and block stencils.
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * TEX
    const y = Math.random() * TEX
    if (i % 3 === 0) {
      a.fillStyle = 'rgba(249, 115, 22, 0.75)'
      a.fillRect(x, y, 60 + Math.random() * 70, 7)
    } else if (i % 3 === 1) {
      a.fillStyle = 'rgba(34, 211, 238, 0.5)'
      a.fillRect(x, y, 34, 5)
    } else {
      a.fillStyle = 'rgba(226, 232, 240, 0.32)'
      for (let b = 0; b < 5; b++) a.fillRect(x + b * 9, y, 5, 12)
    }
  }

  // Roughness: worn, dirty areas scatter; clean plate stays sharp. This is
  // what makes the specular break up instead of sliding across as one sheet.
  const rough = document.createElement('canvas')
  rough.width = rough.height = TEX
  const r = rough.getContext('2d')!
  r.drawImage(albedo, 0, 0)
  const rImg = r.getImageData(0, 0, TEX, TEX)
  const rd = rImg.data
  for (let i = 0; i < rd.length; i += 4) {
    const l = (rd[i] * 0.3 + rd[i + 1] * 0.59 + rd[i + 2] * 0.11) / 255
    const v = Math.max(0, Math.min(255, (0.2 + (1 - l) * 0.62) * 255))
    rd[i] = rd[i + 1] = rd[i + 2] = v
    rd[i + 3] = 255
  }
  r.putImageData(rImg, 0, 0)

  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = normalCanvas.height = TEX
  const n = normalCanvas.getContext('2d')!
  n.putImageData(heightToNormal(hh.getImageData(0, 0, TEX, TEX), 2.6), 0, 0)

  const map = new THREE.CanvasTexture(albedo)
  const roughTex = new THREE.CanvasTexture(rough)
  const normalTex = new THREE.CanvasTexture(normalCanvas)
  for (const t of [map, roughTex, normalTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3.4, 3.4)
    t.anisotropy = 8
  }
  map.colorSpace = THREE.SRGBColorSpace
  return { map, rough: roughTex, normal: normalTex }
}

/** Soft radial sprite used for thruster glow and trails. */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.18, 'rgba(214,244,255,0.9)')
  grd.addColorStop(0.45, 'rgba(56,189,248,0.35)')
  grd.addColorStop(1, 'rgba(56,189,248,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

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

/** Collects geometry per material so each ship merges down to a few draws. */
class Parts {
  hull: THREE.BufferGeometry[] = []
  trim: THREE.BufferGeometry[] = []
  glass: THREE.BufferGeometry[] = []

  add(
    bucket: 'hull' | 'trim' | 'glass',
    geo: THREE.BufferGeometry,
    place?: (g: THREE.BufferGeometry) => void,
  ) {
    place?.(geo)
    this[bucket].push(geo)
  }
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d)
}

function cyl(rt: number, rb: number, h: number, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg)
  g.rotateZ(Math.PI / 2)
  return g
}

/** Scatter small hardware along a run, the detail that sells scale. */
function greebleRun(
  p: Parts,
  count: number,
  x0: number,
  x1: number,
  y: number,
  z: number,
  spread: number,
) {
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1)
    const gx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 0.06
    const gw = 0.05 + Math.random() * 0.16
    const gh = 0.02 + Math.random() * 0.06
    const gd = 0.04 + Math.random() * 0.12
    p.add('trim', box(gw, gh, gd), (g) =>
      g.translate(gx, y + gh / 2, z + (Math.random() - 0.5) * spread),
    )
  }
}

type Built = { group: THREE.Group; thrusters: THREE.Vector3[] }

function buildInterceptor(): Built {
  const p = new Parts()
  const thrusters: THREE.Vector3[] = []

  const profile = new THREE.Shape()
  profile.moveTo(-1.75, 0)
  profile.lineTo(-1.42, 0.42)
  profile.lineTo(-0.3, 0.54)
  profile.lineTo(1.1, 0.36)
  profile.lineTo(2.0, 0.14)
  profile.lineTo(2.3, 0)
  profile.lineTo(2.0, -0.14)
  profile.lineTo(1.1, -0.36)
  profile.lineTo(-0.3, -0.54)
  profile.lineTo(-1.42, -0.42)
  profile.closePath()

  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 0.4,
    bevelEnabled: true,
    bevelSize: 0.075,
    bevelThickness: 0.09,
    bevelSegments: 2,
    curveSegments: 2,
  })
  body.rotateX(-Math.PI / 2)
  body.translate(0, 0, -0.2)
  p.add('hull', body)

  // Upper deck plate and a stepped spine, so the top is not one flat face.
  p.add('hull', box(2.1, 0.14, 0.62), (g) => g.translate(-0.15, 0.28, 0))
  p.add('hull', box(1.15, 0.12, 0.4), (g) => g.translate(0.15, 0.4, 0))
  p.add('trim', box(0.5, 0.1, 0.28), (g) => g.translate(-0.85, 0.46, 0))

  // Chin sensor and nose hardware.
  p.add('trim', box(0.42, 0.16, 0.3), (g) => g.translate(1.5, -0.22, 0))
  p.add('hull', new THREE.SphereGeometry(0.12, 12, 8), (g) => g.translate(1.72, -0.2, 0))

  // Intakes: a dark recess with a lipped edge either side of the fuselage.
  for (const s of [1, -1]) {
    p.add('trim', box(0.62, 0.22, 0.16), (g) => g.translate(-0.35, 0.02, s * 0.46))
    p.add('hull', box(0.7, 0.06, 0.2), (g) => g.translate(-0.35, 0.15, s * 0.47))
    p.add('hull', box(0.7, 0.06, 0.2), (g) => g.translate(-0.35, -0.11, s * 0.47))
  }

  // Wings with dihedral, leading-edge bevel, pylons and pods.
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.lineTo(-0.85, 1.35)
  wingShape.lineTo(-0.05, 1.42)
  wingShape.lineTo(0.8, 0.12)
  wingShape.closePath()

  for (const s of [1, -1]) {
    const wing = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 1,
      curveSegments: 1,
    })
    wing.rotateX(-Math.PI / 2)
    wing.scale(1, 1, s)
    wing.rotateX(s * 0.2)
    wing.translate(-0.3, 0.02, s * 0.44)
    p.add('hull', wing)

    // Pylon plus a slung pod, and a canted wingtip fin.
    p.add('trim', box(0.5, 0.09, 0.13), (g) => g.translate(-0.42, -0.1, s * 1.05))
    p.add('trim', cyl(0.09, 0.11, 0.72, 10), (g) => g.translate(-0.42, -0.2, s * 1.05))
    p.add('hull', box(0.42, 0.34, 0.05), (g) => {
      g.rotateX(s * 0.35)
      g.translate(-0.75, 0.26, s * 1.42)
    })

    // Tail fins and RCS blocks.
    p.add('hull', box(0.62, 0.46, 0.06), (g) => {
      g.rotateZ(0.3)
      g.translate(-1.32, 0.34, s * 0.28)
    })
    p.add('trim', box(0.1, 0.1, 0.1), (g) => g.translate(1.15, 0.2, s * 0.3))
    p.add('trim', box(0.1, 0.1, 0.1), (g) => g.translate(-1.05, -0.24, s * 0.34))

    // Engine nacelle with intake lip and retaining rings.
    p.add('hull', cyl(0.23, 0.27, 1.0, 14), (g) => g.translate(-1.5, 0.0, s * 0.32))
    p.add('trim', cyl(0.28, 0.28, 0.08, 14), (g) => g.translate(-1.22, 0.0, s * 0.32))
    p.add('trim', cyl(0.29, 0.29, 0.07, 14), (g) => g.translate(-1.75, 0.0, s * 0.32))
    p.add('trim', cyl(0.19, 0.24, 0.16, 14), (g) => g.translate(-2.02, 0.0, s * 0.32))
    thrusters.push(new THREE.Vector3(-2.08, 0, s * 0.32))

    greebleRun(p, 7, -1.1, 0.9, 0.2, s * 0.22, 0.16)
    greebleRun(p, 5, -1.0, 0.4, -0.22, s * 0.26, 0.14)
  }

  // Canopy frame then glass, so the glass reads as set into a frame.
  p.add('trim', box(0.92, 0.1, 0.5), (g) => g.translate(0.72, 0.28, 0))
  const canopy = new THREE.SphereGeometry(0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  canopy.scale(1.6, 0.66, 0.8)
  canopy.translate(0.74, 0.3, 0)
  p.add('glass', canopy)

  // Antenna masts.
  p.add('trim', cyl(0.012, 0.02, 0.5, 6), (g) => {
    g.rotateZ(Math.PI / 2)
    g.translate(-0.5, 0.68, 0.12)
  })

  return { group: assemble(p), thrusters }
}

function buildHauler(): Built {
  const p = new Parts()
  const thrusters: THREE.Vector3[] = []

  // Keel spine with a stepped underside.
  p.add('hull', box(4.6, 0.5, 0.9), (g) => g.translate(0, 0, 0))
  p.add('trim', box(4.2, 0.16, 0.66), (g) => g.translate(-0.1, -0.3, 0))

  // Cargo racks: stacked containers with visible ribs.
  for (let i = 0; i < 4; i++) {
    const x = -1.35 + i * 0.9
    for (const y of [0.46, -0.46]) {
      p.add('hull', box(0.78, 0.42, 0.86), (g) => g.translate(x, y, 0))
      p.add('trim', box(0.06, 0.44, 0.88), (g) => g.translate(x - 0.3, y, 0))
      p.add('trim', box(0.06, 0.44, 0.88), (g) => g.translate(x + 0.3, y, 0))
    }
  }

  // Forward bridge module, stepped, with a wrap-around window band.
  p.add('hull', box(0.95, 0.62, 0.8), (g) => g.translate(2.05, 0.12, 0))
  p.add('hull', box(0.5, 0.3, 0.6), (g) => g.translate(2.5, 0.3, 0))
  const band = box(0.42, 0.16, 0.62)
  band.translate(2.52, 0.3, 0)
  p.add('glass', band)

  // Radiator fins along the dorsal line.
  for (let i = 0; i < 5; i++) {
    p.add('trim', box(0.28, 0.3, 0.04), (g) => g.translate(-1.2 + i * 0.55, 0.85, 0))
  }

  // Engine block with four nozzles.
  p.add('hull', box(0.7, 1.0, 1.0), (g) => g.translate(-2.4, 0, 0))
  for (const y of [0.28, -0.28]) {
    for (const z of [0.28, -0.28]) {
      p.add('trim', cyl(0.16, 0.21, 0.32, 12), (g) => g.translate(-2.78, y, z))
      thrusters.push(new THREE.Vector3(-2.9, y, z))
    }
  }

  greebleRun(p, 12, -2.0, 1.8, 0.26, 0.44, 0.2)
  greebleRun(p, 10, -1.8, 1.6, -0.28, -0.44, 0.2)

  return { group: assemble(p), thrusters }
}

function buildGunship(): Built {
  const p = new Parts()
  const thrusters: THREE.Vector3[] = []

  const profile = new THREE.Shape()
  profile.moveTo(-1.5, 0)
  profile.lineTo(-1.2, 0.5)
  profile.lineTo(0.4, 0.62)
  profile.lineTo(1.5, 0.42)
  profile.lineTo(1.95, 0)
  profile.lineTo(1.5, -0.42)
  profile.lineTo(0.4, -0.62)
  profile.lineTo(-1.2, -0.5)
  profile.closePath()

  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 0.56,
    bevelEnabled: true,
    bevelSize: 0.09,
    bevelThickness: 0.1,
    bevelSegments: 2,
    curveSegments: 2,
  })
  body.rotateX(-Math.PI / 2)
  body.translate(0, 0, -0.28)
  p.add('hull', body)

  // Armour slabs over the prow.
  p.add('hull', box(0.7, 0.3, 0.7), (g) => g.translate(1.25, 0.1, 0))
  p.add('trim', box(0.2, 0.34, 0.74), (g) => g.translate(1.55, 0.06, 0))

  // Dorsal turret: ring, housing, twin barrels.
  p.add('trim', cyl(0.3, 0.3, 0.12, 16), (g) => {
    g.rotateZ(Math.PI / 2)
    g.translate(0.15, 0.42, 0)
  })
  p.add('hull', box(0.44, 0.26, 0.44), (g) => g.translate(0.15, 0.56, 0))
  for (const z of [0.1, -0.1]) {
    p.add('trim', cyl(0.045, 0.05, 0.85, 8), (g) => g.translate(0.62, 0.56, z))
  }

  // Side weapon pods on stub pylons.
  for (const s of [1, -1]) {
    p.add('trim', box(0.24, 0.12, 0.3), (g) => g.translate(0.2, -0.18, s * 0.62))
    p.add('hull', box(0.9, 0.26, 0.26), (g) => g.translate(0.35, -0.3, s * 0.85))
    p.add('trim', cyl(0.04, 0.045, 0.5, 8), (g) => g.translate(0.95, -0.3, s * 0.85))

    p.add('hull', cyl(0.2, 0.24, 0.8, 12), (g) => g.translate(-1.35, 0.05, s * 0.34))
    p.add('trim', cyl(0.17, 0.21, 0.14, 12), (g) => g.translate(-1.78, 0.05, s * 0.34))
    thrusters.push(new THREE.Vector3(-1.85, 0.05, s * 0.34))

    greebleRun(p, 6, -0.9, 0.9, 0.28, s * 0.3, 0.18)
  }

  const canopy = box(0.62, 0.2, 0.5)
  canopy.translate(0.95, 0.34, 0)
  p.add('glass', canopy)

  return { group: assemble(p), thrusters }
}

/** Merge each bucket so a detailed ship is only a few draw calls. */
function assemble(p: Parts): THREE.Group {
  const g = new THREE.Group()
  g.userData.buckets = p
  return g
}

function materializeShip(
  built: Built,
  hull: THREE.Material,
  trim: THREE.Material,
  glass: THREE.Material,
  glowTex: THREE.Texture,
  scale: number,
): THREE.Group {
  const p = built.group.userData.buckets as Parts
  const group = new THREE.Group()

  const buckets: Array<[THREE.BufferGeometry[], THREE.Material]> = [
    [p.hull, hull],
    [p.trim, trim],
    [p.glass, glass],
  ]
  for (const [geos, mat] of buckets) {
    if (geos.length === 0) continue
    const merged = mergeGeometries(geos, false)
    if (merged) {
      merged.computeVertexNormals()
      const mesh = new THREE.Mesh(merged, mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    for (const geo of geos) geo.dispose()
  }

  // Additive thruster cores and trails. Kept as sprites/quads rather than a
  // bloom pass so the canvas stays transparent over the CSS starfield.
  for (const t of built.thrusters) {
    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xdff4ff,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    )
    core.position.copy(t)
    core.scale.setScalar(0.85)
    group.add(core)

    const trail = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x67d4ff,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.55,
      }),
    )
    trail.position.set(t.x - 1.15, t.y, t.z)
    trail.scale.set(2.8, 0.55, 1)
    group.add(trail)
  }

  group.scale.setScalar(scale)
  return group
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
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.95
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      38,
      Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1),
      0.1,
      160,
    )
    camera.position.set(0, 0, 13)

    const key = new THREE.DirectionalLight(0xffffff, 6.4)
    key.position.set(5, 7, 6)
    // Parts casting shadows onto each other is most of what separates a model
    // from a photograph. The frustum is sized to the whole traffic corridor —
    // anything tighter clips shadows off mid-pass.
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -22
    key.shadow.camera.right = 22
    key.shadow.camera.top = 10
    key.shadow.camera.bottom = -10
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 60
    key.shadow.bias = -0.0012
    key.shadow.normalBias = 0.02
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

    const surface = makeSurface()
    const glowTex = makeGlowTexture()

    const hullMat = new THREE.MeshStandardMaterial({
      map: surface.map,
      roughnessMap: surface.rough,
      normalMap: surface.normal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      // Painted, not chromed. Uniform metal everywhere was the biggest "toy"
      // tell — real craft are mostly painted panel, with bare metal reserved
      // for engines and heat surfaces.
      color: 0x8d99a8,
      metalness: 0.22,
      roughness: 0.52,
      envMapIntensity: 1.5,
    })
    const trimMat = new THREE.MeshStandardMaterial({
      map: surface.map,
      normalMap: surface.normal,
      normalScale: new THREE.Vector2(1.1, 1.1),
      color: 0x9fa9b6,
      metalness: 0.94,
      roughness: 0.31,
      envMapIntensity: 2.8,
    })
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1f2a,
      metalness: 0.4,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.6,
    })

    const compact = host.clientWidth < 700
    const specs = compact
      ? [
          { build: buildInterceptor, scale: 0.9, y: 1.5, z: -1, speed: 1.5 },
          { build: buildHauler, scale: 0.5, y: -2.3, z: -8, speed: 0.85 },
        ]
      : [
          { build: buildInterceptor, scale: 1.2, y: 1.4, z: 0.5, speed: 1.8 },
          { build: buildHauler, scale: 0.62, y: -2.5, z: -7, speed: 0.95 },
          { build: buildGunship, scale: 0.44, y: 3.0, z: -12, speed: 0.72 },
        ]

    const craft: Craft[] = specs.map((s, i) => {
      const group = materializeShip(
        s.build(),
        hullMat,
        trimMat,
        glassMat,
        glowTex,
        s.scale,
      )
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

    // Pointer drives the camera itself, so the parallax is genuine depth
    // rather than layers sliding over each other.
    let targetX = 0
    let targetY = 0
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    function onMove(e: PointerEvent) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 1.6
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.9
    }
    if (fine) window.addEventListener('pointermove', onMove, { passive: true })

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

      camera.position.x += (targetX - camera.position.x) * 0.045
      camera.position.y += (-targetY - camera.position.y) * 0.045
      camera.lookAt(0, 0, -2)

      for (const c of craft) {
        c.group.position.x += c.speed * dt * 3.4
        c.bank += dt * c.spin
        c.group.rotation.z = Math.sin(c.bank) * 0.34 - 0.16
        c.group.rotation.y = -0.22 + Math.sin(c.bank * 0.6) * 0.12
        c.group.rotation.x = Math.sin(c.bank * 0.45) * 0.08
        c.group.position.y = c.y + Math.sin(c.bank * 0.5) * 0.35
        if (c.group.position.x > c.endX) c.group.position.x = c.startX
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
      if (fine) window.removeEventListener('pointermove', onMove)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const sprite = o as THREE.Sprite
        if (sprite.isSprite) sprite.material.dispose()
      })
      for (const m of [hullMat, trimMat, glassMat]) m.dispose()
      surface.map.dispose()
      surface.rough.dispose()
      surface.normal.dispose()
      glowTex.dispose()
      envMap.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />
}
