import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

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

type Bucket = 'hull' | 'accent' | 'trim' | 'glass'

/** Collects geometry per material so each ship merges down to a few draws. */
class Parts {
  hull: THREE.BufferGeometry[] = []
  accent: THREE.BufferGeometry[] = []
  trim: THREE.BufferGeometry[] = []
  glass: THREE.BufferGeometry[] = []

  add(
    bucket: Bucket,
    geo: THREE.BufferGeometry,
    place?: (g: THREE.BufferGeometry) => void,
  ) {
    place?.(geo)
    // Merging refuses to mix indexed and non-indexed geometry and returns null
    // rather than throwing, which silently drops an entire bucket — the lofted
    // hulls are indexed while the block primitives are not. Normalising here
    // keeps every bucket mergeable no matter what it was built from.
    this[bucket].push(geo.index ? geo.toNonIndexed() : geo)
  }
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d)
}

/**
 * Chamfered block. Every volume on a ship is built from these so the whole
 * hull shares one edge language, and each chamfer becomes a hard highlight
 * under the key light. The radius stays small — these are machined edges, not
 * rounded corners.
 */
function slab(w: number, h: number, d: number, r = 0.05) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2.05))
}

function cyl(rt: number, rb: number, h: number, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg)
  g.rotateZ(Math.PI / 2)
  return g
}

/**
 * One cross-section of a lofted hull.
 *
 * `power` shapes the section between a circle and a rectangle: 2 is a true
 * ellipse, 4 reads as a chined "squircle", 8+ is nearly a rounded box. Varying
 * it down the length is what gives a fuselage a round nose that flattens into
 * chined flanks and a boxy engine deck — the thing a stack of blocks can never
 * do.
 */
type Station = {
  x: number
  /** Half-width (span) and half-height at this station. */
  hw: number
  hh: number
  /** Vertical offset of the section centre, for a cambered spine. */
  y?: number
  power?: number
}

/** Catmull-Rom through scalar keyframes, clamped at the ends. */
function splineAt(values: number[], t: number): number {
  const n = values.length - 1
  const f = Math.max(0, Math.min(1, t)) * n
  const i = Math.min(Math.floor(f), n - 1)
  const s = f - i
  const p0 = values[Math.max(i - 1, 0)]
  const p1 = values[i]
  const p2 = values[i + 1]
  const p3 = values[Math.min(i + 2, n)]
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * s +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s +
      (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s)
  )
}

/**
 * Loft a smooth hull through the given stations. Sections are resampled along
 * a spline so the surface flows rather than stepping, and normals are averaged
 * across the seam so no crease shows down the side of the ship.
 */
function loftHull(stations: Station[], radial = 28, rings = 46): THREE.BufferGeometry {
  const xs = stations.map((s) => s.x)
  const hws = stations.map((s) => s.hw)
  const hhs = stations.map((s) => s.hh)
  const ys = stations.map((s) => s.y ?? 0)
  const ps = stations.map((s) => s.power ?? 3)

  const cols = radial + 1 // duplicate the seam column so UVs wrap cleanly
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []

  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1)
    const x = splineAt(xs, t)
    const hw = Math.max(splineAt(hws, t), 0.0001)
    const hh = Math.max(splineAt(hhs, t), 0.0001)
    const yc = splineAt(ys, t)
    const power = Math.max(splineAt(ps, t), 2)
    const e = 2 / power

    for (let j = 0; j < cols; j++) {
      const a = (j / radial) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      // Superellipse: sign-preserving power keeps the section symmetric.
      const z = hw * Math.sign(ca) * Math.pow(Math.abs(ca), e)
      const y = hh * Math.sign(sa) * Math.pow(Math.abs(sa), e)
      pos.push(x, yc + y, z)
      uv.push(j / radial, t)
    }
  }

  // Stations are authored nose-to-tail, so X decreases as the ring index
  // rises. This winding is the one that leaves normals pointing outward for
  // that direction; the opposite order culls every visible face.
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * cols + j
      const b = a + cols
      idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }

  // Flat caps at each end so the hull is closed where it is cut off.
  for (const end of [0, rings - 1]) {
    const centre = pos.length / 3
    const t = end / (rings - 1)
    pos.push(splineAt(xs, t), splineAt(ys, t), 0)
    uv.push(0.5, t)
    for (let j = 0; j < radial; j++) {
      const a = end * cols + j
      const b = end * cols + j + 1
      if (end === 0) idx.push(centre, a, b)
      else idx.push(centre, b, a)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  // Whether the winding lands outward depends on whether the stations were
  // authored nose-to-tail or the reverse. Rather than depend on the caller
  // getting that right — an inside-out hull is invisible, since every facing
  // triangle is culled — test one normal against the outward direction from
  // its own section centre and flip the whole surface if it came out inverted.
  {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const nrmAttr = geo.getAttribute('normal') as THREE.BufferAttribute
    const mid = Math.floor(rings / 2)
    const v = mid * cols // j = 0 sits on the +Z flank
    const t = mid / (rings - 1)
    const outY = posAttr.getY(v) - splineAt(ys, t)
    const outZ = posAttr.getZ(v)
    const dot = nrmAttr.getY(v) * outY + nrmAttr.getZ(v) * outZ
    if (dot < 0) {
      for (let i = 0; i < idx.length; i += 3) {
        const swap = idx[i + 1]
        idx[i + 1] = idx[i + 2]
        idx[i + 2] = swap
      }
      geo.setIndex(idx)
      geo.computeVertexNormals()
    }
  }

  // The seam column holds duplicate vertices; averaging their normals removes
  // the visible crease that would otherwise run the length of the hull.
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < rings; i++) {
    const a = i * cols
    const b = a + radial
    const nx = (nrm.getX(a) + nrm.getX(b)) / 2
    const ny = (nrm.getY(a) + nrm.getY(b)) / 2
    const nz = (nrm.getZ(a) + nrm.getZ(b)) / 2
    const l = Math.hypot(nx, ny, nz) || 1
    nrm.setXYZ(a, nx / l, ny / l, nz / l)
    nrm.setXYZ(b, nx / l, ny / l, nz / l)
  }
  nrm.needsUpdate = true
  return geo
}

/** Swept aerofoil with curved leading and trailing edges. */
function curvedWing(span: number, rootChord: number, sweep: number, thick: number) {
  const s = new THREE.Shape()
  s.moveTo(rootChord / 2, 0)
  // Leading edge sweeps back on a curve rather than a straight taper.
  s.quadraticCurveTo(rootChord * 0.15 - sweep * 0.3, span * 0.55, -sweep, span)
  s.lineTo(-sweep - rootChord * 0.16, span)
  // Trailing edge curves back in toward the root.
  s.quadraticCurveTo(-rootChord * 0.55, span * 0.42, -rootChord / 2, 0)
  s.closePath()

  const g = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: true,
    bevelSize: thick * 0.42,
    bevelThickness: thick * 0.42,
    bevelSegments: 3,
    curveSegments: 14,
  })
  g.translate(0, 0, -thick / 2)
  g.rotateX(-Math.PI / 2)
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

  // A single lofted fuselage: a fine point at the nose that swells into a
  // chined body and squares off into the engine deck. The section power is
  // what does the work — round at the front, hard-edged aft.
  p.add('hull', loftHull([
    { x: 2.95, hw: 0.02, hh: 0.02, power: 2 },
    { x: 2.45, hw: 0.2, hh: 0.16, y: -0.03, power: 2.2 },
    { x: 1.7, hw: 0.42, hh: 0.3, y: -0.02, power: 2.6 },
    { x: 0.8, hw: 0.62, hh: 0.42, power: 3.2 },
    { x: -0.2, hw: 0.7, hh: 0.46, power: 3.8 },
    { x: -1.3, hw: 0.62, hh: 0.44, power: 4.6 },
    { x: -2.2, hw: 0.5, hh: 0.4, power: 6 },
    { x: -2.5, hw: 0.46, hh: 0.37, power: 6 },
  ]))

  // Cambered dorsal spine, lofted so it blends into the back rather than
  // sitting on it as a separate lump.
  p.add('accent', loftHull([
    { x: 1.5, hw: 0.02, hh: 0.02, y: 0.3, power: 2 },
    { x: 0.7, hw: 0.26, hh: 0.14, y: 0.42, power: 3 },
    { x: -0.6, hw: 0.3, hh: 0.17, y: 0.46, power: 3.4 },
    { x: -1.9, hw: 0.22, hh: 0.12, y: 0.4, power: 4 },
    { x: -2.4, hw: 0.02, hh: 0.02, y: 0.34, power: 4 },
  ], 20, 26))

  // Ventral fairing.
  p.add('trim', loftHull([
    { x: 1.6, hw: 0.02, hh: 0.02, y: -0.3, power: 2 },
    { x: 0.4, hw: 0.34, hh: 0.14, y: -0.44, power: 3 },
    { x: -1.2, hw: 0.36, hh: 0.15, y: -0.46, power: 3.4 },
    { x: -2.3, hw: 0.02, hh: 0.02, y: -0.38, power: 3 },
  ], 20, 26))

  for (const s of [1, -1]) {
    // Curved swept wing, rooted inside the fuselage.
    p.add('hull', curvedWing(1.7, 1.5, 0.85, 0.13), (g) => {
      g.rotateX(s * 0.14)
      g.scale(1, 1, s)
      g.translate(-0.35, -0.06, s * 0.5)
    })
    p.add('accent', curvedWing(0.85, 0.8, 0.4, 0.14), (g) => {
      g.rotateX(s * 0.14)
      g.scale(1, 1, s)
      g.translate(-0.5, -0.04, s * 0.72)
    })
    // Wingtip fin, swept and thin.
    p.add('trim', curvedWing(0.55, 0.6, 0.3, 0.07), (g) => {
      g.rotateX(Math.PI / 2)
      g.rotateZ(0.2)
      g.translate(-1.0, 0.22, s * 1.98)
    })

    // Lofted nacelle: an intake lip that fairs smoothly into the exhaust bell.
    p.add('hull', loftHull([
      { x: 0.35, hw: 0.02, hh: 0.02, power: 2 },
      { x: 0.1, hw: 0.24, hh: 0.24, power: 2 },
      { x: -0.7, hw: 0.3, hh: 0.3, power: 2.4 },
      { x: -1.5, hw: 0.28, hh: 0.28, power: 2.6 },
      { x: -1.85, hw: 0.32, hh: 0.32, power: 2.4 },
      { x: -2.0, hw: 0.26, hh: 0.26, power: 2.2 },
    ], 22, 30), (g) => g.translate(-0.6, -0.02, s * 0.74))

    p.add('trim', cyl(0.2, 0.24, 0.14, 20), (g) => g.translate(-2.68, -0.02, s * 0.74))
    thrusters.push(new THREE.Vector3(-2.78, -0.02, s * 0.74))

    // Intake shoulder blended into the flank.
    p.add('accent', loftHull([
      { x: 0.9, hw: 0.02, hh: 0.02, power: 2 },
      { x: 0.55, hw: 0.16, hh: 0.2, power: 2.6 },
      { x: -0.3, hw: 0.18, hh: 0.22, power: 3 },
      { x: -0.7, hw: 0.02, hh: 0.02, power: 3 },
    ], 18, 22), (g) => g.translate(0.2, 0.02, s * 0.66))

    p.add('trim', cyl(0.07, 0.08, 0.9, 12), (g) => g.translate(0.35, -0.4, s * 0.95))
    greebleRun(p, 8, -1.6, 1.2, 0.42, s * 0.3, 0.26)
  }

  // Canopy blister faired into the spine.
  const canopy = new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  canopy.scale(1.9, 0.62, 0.9)
  canopy.translate(1.3, 0.3, 0)
  p.add('glass', canopy)

  return { group: assemble(p), thrusters }
}

function buildHauler(): Built {
  const p = new Parts()
  const thrusters: THREE.Vector3[] = []

  // Industrial hulls stay boxy on purpose — that is the language of a working
  // freighter — but the primary volume is lofted so the flanks curve and the
  // bow tapers instead of ending in a flat face.
  p.add('hull', loftHull([
    { x: 3.6, hw: 0.5, hh: 0.42, power: 4 },
    { x: 2.9, hw: 0.95, hh: 0.72, power: 4.5 },
    { x: 1.6, hw: 1.2, hh: 0.85, power: 6 },
    { x: -0.6, hw: 1.25, hh: 0.9, power: 8 },
    { x: -2.4, hw: 1.15, hh: 0.88, power: 8 },
    { x: -3.3, hw: 1.0, hh: 0.8, power: 7 },
  ], 30, 40))

  p.add('trim', slab(5.4, 0.55, 1.9, 0.1), (g) => g.translate(-0.2, -0.85, 0))
  p.add('accent', slab(5.0, 0.28, 2.46, 0.07), (g) => g.translate(-0.1, 0.16, 0))

  p.add('hull', slab(4.2, 0.8, 1.9, 0.1), (g) => g.translate(-0.4, 0.92, 0))
  for (let i = 0; i < 4; i++) {
    const x = -1.95 + i * 1.02
    p.add('accent', slab(0.86, 0.66, 1.62, 0.06), (g) => g.translate(x, 1.24, 0))
    p.add('trim', slab(0.1, 0.7, 1.66, 0.03), (g) => g.translate(x - 0.42, 1.24, 0))
    p.add('trim', slab(0.1, 0.7, 1.66, 0.03), (g) => g.translate(x + 0.42, 1.24, 0))
  }

  p.add('hull', slab(1.4, 1.1, 1.7, 0.12), (g) => g.translate(2.45, 0.3, 0))
  p.add('trim', slab(1.1, 0.5, 1.5, 0.06), (g) => g.translate(2.7, 0.88, 0))
  const band = slab(0.75, 0.3, 1.2, 0.05)
  band.translate(3.0, 0.86, 0)
  p.add('glass', band)

  for (const s of [1, -1]) {
    // Sponsons lofted so they fair into the flank.
    p.add('hull', loftHull([
      { x: 1.9, hw: 0.02, hh: 0.02, power: 2 },
      { x: 1.2, hw: 0.32, hh: 0.42, power: 3 },
      { x: -0.6, hw: 0.38, hh: 0.46, power: 3.6 },
      { x: -2.0, hw: 0.3, hh: 0.4, power: 4 },
      { x: -2.5, hw: 0.02, hh: 0.02, power: 3 },
    ], 22, 28), (g) => g.translate(-0.2, -0.2, s * 1.3))

    p.add('accent', slab(0.7, 0.5, 0.6, 0.05), (g) => g.translate(-1.5, -0.2, s * 1.55))
    for (let i = 0; i < 4; i++) {
      p.add('trim', slab(0.4, 0.5, 0.07, 0.03), (g) =>
        g.translate(-1.9 + i * 0.42, 0.6, s * 1.2),
      )
    }
    greebleRun(p, 14, -2.4, 2.2, 1.66, s * 0.6, 0.5)
    greebleRun(p, 10, -2.0, 1.6, -1.12, s * 0.7, 0.4)
  }

  p.add('hull', slab(1.5, 1.9, 2.5, 0.14), (g) => g.translate(-3.1, 0.0, 0))
  p.add('accent', slab(0.4, 1.7, 2.3, 0.08), (g) => g.translate(-3.7, 0.0, 0))
  for (const y of [0.5, -0.5]) {
    for (const z of [0.62, -0.62]) {
      p.add('trim', cyl(0.3, 0.34, 0.36, 18), (g) => g.translate(-3.95, y, z))
      thrusters.push(new THREE.Vector3(-4.2, y, z))
    }
  }

  return { group: assemble(p), thrusters }
}

function buildGunship(): Built {
  const p = new Parts()
  const thrusters: THREE.Vector3[] = []

  // Broad and squat: a wide lofted body with a blunt, armoured bow.
  p.add('hull', loftHull([
    { x: 2.5, hw: 0.35, hh: 0.28, power: 3 },
    { x: 1.9, hw: 0.85, hh: 0.5, power: 3.4 },
    { x: 0.7, hw: 1.05, hh: 0.6, power: 4 },
    { x: -0.6, hw: 1.0, hh: 0.6, power: 5 },
    { x: -1.7, hw: 0.8, hh: 0.52, power: 6 },
    { x: -2.1, hw: 0.7, hh: 0.46, power: 6 },
  ], 28, 38))

  p.add('accent', slab(2.4, 0.3, 1.9, 0.07), (g) => g.translate(-0.1, 0.5, 0))
  p.add('hull', slab(1.1, 0.75, 1.4, 0.12), (g) => g.translate(2.05, -0.02, 0))
  p.add('trim', slab(0.24, 0.7, 1.2, 0.05), (g) => g.translate(2.45, -0.02, 0))

  p.add('trim', cyl(0.4, 0.4, 0.16, 20), (g) => {
    g.rotateZ(Math.PI / 2)
    g.translate(0.2, 0.62, 0)
  })
  p.add('hull', slab(0.68, 0.4, 0.68, 0.08), (g) => g.translate(0.2, 0.8, 0))
  for (const z of [0.16, -0.16]) {
    p.add('trim', cyl(0.055, 0.065, 1.0, 12), (g) => g.translate(0.85, 0.8, z))
  }

  for (const s of [1, -1]) {
    p.add('hull', curvedWing(1.0, 1.3, 0.5, 0.16), (g) => {
      g.rotateX(s * 0.1)
      g.scale(1, 1, s)
      g.translate(0.1, -0.24, s * 0.85)
    })
    p.add('trim', cyl(0.065, 0.075, 1.1, 12), (g) => g.translate(1.35, -0.3, s * 1.25))

    p.add('hull', loftHull([
      { x: 0.3, hw: 0.02, hh: 0.02, power: 2 },
      { x: 0.0, hw: 0.3, hh: 0.3, power: 2.2 },
      { x: -0.9, hw: 0.32, hh: 0.32, power: 2.6 },
      { x: -1.3, hw: 0.27, hh: 0.27, power: 2.4 },
    ], 20, 26), (g) => g.translate(-1.4, 0.04, s * 0.62))

    p.add('trim', cyl(0.22, 0.25, 0.16, 18), (g) => g.translate(-2.78, 0.04, s * 0.62))
    thrusters.push(new THREE.Vector3(-2.88, 0.04, s * 0.62))

    greebleRun(p, 8, -1.4, 1.4, 0.66, s * 0.5, 0.35)
  }

  const canopy = new THREE.SphereGeometry(0.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2)
  canopy.scale(1.7, 0.6, 1.1)
  canopy.translate(1.45, 0.34, 0)
  p.add('glass', canopy)

  return { group: assemble(p), thrusters }
}


/** Hand the collected buckets on for merging at materialize time. */
function assemble(p: Parts): THREE.Group {
  const g = new THREE.Group()
  g.userData.buckets = p
  return g
}

function materializeShip(
  built: Built,
  hull: THREE.Material,
  accent: THREE.Material,
  trim: THREE.Material,
  glass: THREE.Material,
  glowTex: THREE.Texture,
  scale: number,
): THREE.Group {
  const p = built.group.userData.buckets as Parts
  const group = new THREE.Group()

  const buckets: Array<[THREE.BufferGeometry[], THREE.Material]> = [
    [p.hull, hull],
    [p.accent, accent],
    [p.trim, trim],
    [p.glass, glass],
  ]
  for (const [geos, mat] of buckets) {
    if (geos.length === 0) continue
    const merged = mergeGeometries(geos, false)
    if (merged) {
      // Deliberately not recomputing normals: every source geometry already
      // carries its own, and recomputing here would flatten the lofted hulls'
      // smoothing and undo their seam averaging.
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
      color: 0x6d7887,
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
    const accentMat = new THREE.MeshStandardMaterial({
      map: surface.map,
      roughnessMap: surface.rough,
      normalMap: surface.normal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      color: 0xb4561f,
      metalness: 0.2,
      roughness: 0.58,
      envMapIntensity: 1.3,
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
        accentMat,
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
      for (const m of [hullMat, accentMat, trimMat, glassMat]) m.dispose()
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
