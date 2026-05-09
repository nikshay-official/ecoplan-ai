'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEcoStore } from '@/app/store/useEcoStore'

// ============================================================
// FLOW FIELD LINES — Windy.com style magical flowing waves
// ============================================================
function FlowField() {
  const meshRef = useRef<THREE.Points>(null!)
  const linesRef = useRef<THREE.LineSegments>(null!)
  const grid = useEcoStore(s => s.pollutionGrid)
  const objects = useEcoStore(s => s.placedObjects)
  const timeRef = useRef(0)

  const COLS = 60
  const ROWS = 40
  const MAP_W = 100
  const MAP_H = 67

  // ── Generate flow field particles ──────────────────────────
  const { positions, velocities, ages, maxAge, colors } = useMemo(() => {
    const COUNT = 3000
    const positions = new Float32Array(COUNT * 3)
    const velocities = new Float32Array(COUNT * 2) // vx, vz
    const ages = new Float32Array(COUNT)
    const maxAge = new Float32Array(COUNT)
    const colors = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT; i++) {
      // Random start position across the map
      positions[i * 3 + 0] = (Math.random() - 0.5) * MAP_W
      positions[i * 3 + 1] = 0.3 + Math.random() * 1.5  // float above map
      positions[i * 3 + 2] = (Math.random() - 0.5) * MAP_H

      velocities[i * 2 + 0] = 0
      velocities[i * 2 + 1] = 0

      ages[i] = Math.random() * 200  // stagger start times
      maxAge[i] = 150 + Math.random() * 200

      colors[i * 3] = 0.5
      colors[i * 3 + 1] = 0.8
      colors[i * 3 + 2] = 1.0
    }

    return { positions, velocities, ages, maxAge, colors }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [positions, colors])

  // ── Trail lines geometry ───────────────────────────────────
  const TRAIL_LENGTH = 12
  const COUNT = 3000
  const trailPositions = useMemo(
    () => new Float32Array(COUNT * TRAIL_LENGTH * 3),
    []
  )
  const trailColors = useMemo(
    () => new Float32Array(COUNT * TRAIL_LENGTH * 3),
    []
  )
  const prevPositions = useMemo(() => {
    const arr: Array<Array<[number, number, number]>> = []
    for (let i = 0; i < COUNT; i++) {
      arr.push([[positions[i*3], positions[i*3+1], positions[i*3+2]]])
    }
    return arr
  }, [])

  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
    return geo
  }, [])

  // ── Helper: sample pollution at world XZ position ──────────
  const samplePollution = (wx: number, wz: number): number => {
    const cx = Math.floor(((wx + MAP_W / 2) / MAP_W) * COLS)
    const cz = Math.floor(((wz + MAP_H / 2) / MAP_H) * ROWS)
    const col = Math.max(0, Math.min(COLS - 1, cx))
    const row = Math.max(0, Math.min(ROWS - 1, cz))
    return (grid[row * COLS + col] || 0) / 100
  }

  // ── Helper: pollution → magical colour ────────────────────
  // High pollution = deep purple/red (danger)
  // Medium = orange/amber
  // Low = cyan/teal/green (safe, magical)
  const pollutionToColor = (p: number, alpha: number): [number, number, number] => {
    if (p > 0.75) {
      // Deep crimson-magenta — DANGER
      return [
        0.9 + Math.sin(alpha * 3) * 0.1,
        0.1 + alpha * 0.2,
        0.3 + alpha * 0.3
      ]
    } else if (p > 0.5) {
      // Amber-orange — WARNING
      return [
        0.95,
        0.4 + p * 0.3,
        0.05 + alpha * 0.1
      ]
    } else if (p > 0.25) {
      // Cyan-teal — IMPROVING
      return [
        0.0 + alpha * 0.3,
        0.7 + alpha * 0.2,
        0.8 + alpha * 0.1
      ]
    } else {
      // Electric green-cyan — CLEAN (magical aurora)
      return [
        0.1 + Math.sin(alpha * 5) * 0.2,
        0.9 + Math.sin(alpha * 3) * 0.1,
        0.6 + Math.cos(alpha * 4) * 0.2
      ]
    }
  }

  useFrame((state, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute

    for (let i = 0; i < COUNT; i++) {
      let x = posAttr.getX(i)
      let y = posAttr.getY(i)
      let z = posAttr.getZ(i)

      // Age particle
      ages[i] += 1
      const lifeRatio = ages[i] / maxAge[i] // 0→1 over lifetime

      // Respawn dead particles
      if (ages[i] > maxAge[i]) {
        x = (Math.random() - 0.5) * MAP_W
        z = (Math.random() - 0.5) * MAP_H
        y = 0.3 + Math.random() * 0.8
        ages[i] = 0
        maxAge[i] = 150 + Math.random() * 200

        // Clear trail
        prevPositions[i] = [[x, y, z]]
      }

      const pollution = samplePollution(x, z)

      // ── Flow field vector field ──────────────────────────────
      // Perlin-like noise using sine waves at different frequencies
      // This creates the beautiful curling Windy effect
      const nx = x / MAP_W
      const nz = z / MAP_H

      // Base wind direction (east + slight south)
      let vx = 0.04 + Math.sin(t * 0.3 + nz * 4.0) * 0.025
      let vz = 0.01 + Math.cos(t * 0.2 + nx * 3.5) * 0.015

      // Add curl noise for magical swirling
      const curl1 = Math.sin(t * 0.5 + nx * 6 + nz * 4) * 0.02
      const curl2 = Math.cos(t * 0.4 + nz * 5 + nx * 3) * 0.02
      vx += curl2
      vz += curl1

      // High pollution = more turbulent chaotic movement
      if (pollution > 0.6) {
        vx += Math.sin(t * 2 + x * 0.3 + z * 0.2) * 0.015 * pollution
        vz += Math.cos(t * 1.7 + z * 0.4) * 0.015 * pollution
      }

      // Gentle vertical wave
      y = 0.3 + Math.sin(t * 0.8 + nx * 5 + lifeRatio * Math.PI) * 0.4
          + pollution * 0.3

      x += vx
      z += vz

      // Wrap at edges
      if (x > MAP_W / 2) x = -MAP_W / 2
      if (x < -MAP_W / 2) x = MAP_W / 2
      if (z > MAP_H / 2) z = -MAP_H / 2
      if (z < -MAP_H / 2) z = MAP_H / 2

      // Update trail history
      const trail = prevPositions[i]
      trail.push([x, y, z])
      if (trail.length > TRAIL_LENGTH) trail.shift()

      posAttr.setXYZ(i, x, y, z)

      // Fade in / fade out at birth and death
      const alpha = lifeRatio < 0.1
        ? lifeRatio / 0.1
        : lifeRatio > 0.8
        ? (1 - lifeRatio) / 0.2
        : 1.0

      const [r, g, b] = pollutionToColor(pollution, alpha)
      colAttr.setXYZ(i, r * alpha, g * alpha, b * alpha)

      // ── Write trail geometry ─────────────────────────────────
      for (let t2 = 0; t2 < TRAIL_LENGTH; t2++) {
        const base = (i * TRAIL_LENGTH + t2) * 3
        const tRatio = t2 / TRAIL_LENGTH
        const trailAlpha = alpha * tRatio  // fade toward tail

        if (t2 < trail.length) {
          trailPositions[base + 0] = trail[t2][0]
          trailPositions[base + 1] = trail[t2][1]
          trailPositions[base + 2] = trail[t2][2]
        } else {
          trailPositions[base + 0] = x
          trailPositions[base + 1] = y
          trailPositions[base + 2] = z
        }

        const [tr, tg, tb] = pollutionToColor(pollution, tRatio)
        trailColors[base + 0] = tr * trailAlpha
        trailColors[base + 1] = tg * trailAlpha
        trailColors[base + 2] = tb * trailAlpha
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    const trailPosAttr = trailGeo.attributes.position as THREE.BufferAttribute
    const trailColAttr = trailGeo.attributes.color as THREE.BufferAttribute

    trailPosAttr.array.set(trailPositions)
    trailColAttr.array.set(trailColors)
    trailPosAttr.needsUpdate = true
    trailColAttr.needsUpdate = true
  })

  return (
    <group>
      {/* ── Glowing head dots ── */}
      <points ref={meshRef} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.35}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── Flowing trails — the MAGIC ── */}
      <lineSegments ref={linesRef} geometry={trailGeo} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          linewidth={1}
        />
      </lineSegments>
    </group>
  )
}

// ============================================================
// AURORA SHEETS — Translucent waves that ripple like northern lights
// ============================================================
function AuroraSheets() {
  const sheetsRef = useRef<THREE.Mesh[]>([])
  const grid = useEcoStore(s => s.pollutionGrid)
  const timeRef = useRef(0)

  const LAYERS = 5

  const sheets = useMemo(() => {
    return Array.from({ length: LAYERS }, (_, i) => ({
      y: 0.2 + i * 0.3,
      speed: 0.08 + i * 0.03,
      phase: (i * Math.PI * 2) / LAYERS,
      scale: 1.0 - i * 0.05,
    }))
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    sheetsRef.current.forEach((mesh, i) => {
      if (!mesh) return
      const sheet = sheets[i]

      // Drift sheets in wind direction
      mesh.position.x = Math.sin(t * sheet.speed + sheet.phase) * 5
      mesh.position.z += sheet.speed * delta * 15

      if (mesh.position.z > 35) mesh.position.z = -35

      // Ripple the sheet — access geometry vertices
      const geo = mesh.geometry as THREE.PlaneGeometry
      const pos = geo.attributes.position
      for (let v = 0; v < pos.count; v++) {
        const vx = pos.getX(v)
        const vz = pos.getZ(v)
        const wave =
          Math.sin(vx * 0.3 + t * 1.2 + sheet.phase) * 0.4 +
          Math.sin(vz * 0.25 + t * 0.9 + sheet.phase * 1.3) * 0.3
        pos.setY(v, wave)
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()

      // Pulse opacity
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.04 + Math.sin(t * 0.7 + sheet.phase) * 0.02
    })
  })

  return (
    <group>
      {sheets.map((sheet, i) => (
        <mesh
          key={i}
          ref={el => { if (el) sheetsRef.current[i] = el }}
          position={[0, sheet.y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[100, 67, 40, 30]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#ff3366' : '#00ffcc'}
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            wireframe={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================
// PLACED OBJECT MARKERS — Clean, minimal, glowing
// ============================================================
function ObjectMarkers() {
  const objects = useEcoStore(s => s.placedObjects)
  const timeRef = useRef(0)
  const ringsRef = useRef<THREE.Mesh[]>([])

  useFrame((_, delta) => {
    timeRef.current += delta
    ringsRef.current.forEach((ring, i) => {
      if (!ring) return
      const mat = ring.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + Math.sin(timeRef.current * 2 + i) * 0.15
      ring.scale.setScalar(1 + Math.sin(timeRef.current * 1.5 + i * 0.7) * 0.08)
    })
  })

  return (
    <group>
      {objects.map((obj, i) => (
        <group key={i} position={[obj.x, 0, obj.z]}>
          {/* Soft ground glow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[2.5, 32]} />
            <meshBasicMaterial
              color="#00ff88"
              transparent
              opacity={0.06}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Pulsing ring */}
          <mesh
            ref={el => { if (el) ringsRef.current[i] = el }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, 0]}
          >
            <ringGeometry args={[2.3, 2.6, 32]} />
            <meshBasicMaterial
              color="#00ffaa"
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Rising clean air column */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.3, 1.2, 3, 16, 1, true]} />
            <meshBasicMaterial
              color="#00ff88"
              transparent
              opacity={0.06}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          <pointLight color="#00ee77" intensity={1.5} distance={8} />
        </group>
      ))}
    </group>
  )
}

// ============================================================
// MAIN SCENE
// ============================================================
function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <FlowField />
      <AuroraSheets />
      <ObjectMarkers />
    </>
  )
}

// ============================================================
// EXPORT — Drop-in replacement
// ============================================================
export default function PollutionScene() {
  return (
    <Canvas
      camera={{ position: [0, 45, 55], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      <Scene />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  )
}