/* eslint-disable react-refresh/only-export-components */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  Mesh,
  Points,
  Vector3,
} from "three";
import { ImplementationDefinition } from "../template/implementation";

type BlackHoleImplementationConfig = {
  metadata: {
    title: string;
    description: string;
    intro: string[];
    tip: string;
    stages: Array<{
      panelLabel: string;
      sceneLabel: string;
    }>;
  };
  camera: {
    azimuth: number;
    elevation: number;
    distance: number;
    target: [number, number, number];
  };
  timelineDurationMs: number;
};

type BackgroundDotField = {
  positions: Float32Array;
  basePositions: Float32Array;
  colors: Float32Array;
  seeds: Float32Array;
};

type AccretionDotField = {
  positions: Float32Array;
  colors: Float32Array;
  angles: Float32Array;
  radii: Float32Array;
  speeds: Float32Array;
  offsets: Float32Array;
};

type HorizonDotField = {
  positions: Float32Array;
  colors: Float32Array;
  angles: Float32Array;
  speeds: Float32Array;
  offsets: Float32Array;
};

const TAU = Math.PI * 2;
const BACKGROUND_DOT_COUNT = 5200;
const MIDPLANE_DOT_COUNT = 18000;
const UPPER_LENS_DOT_COUNT = 14000;
const LOWER_LENS_DOT_COUNT = 8000;
const HORIZON_DOT_COUNT = 520;
const HOLE_X = 0.55;
const HOLE_Y = -0.02;
const HORIZON_RADIUS = 1.56;

const smoothWindow = (value: number, start: number, end: number): number => {
  if (value <= start) {
    return 0;
  }
  if (value >= end) {
    return 1;
  }
  const t = (value - start) / (end - start);
  return t * t * (3 - 2 * t);
};

const fract = (value: number): number => value - Math.floor(value);

const hash = (seed: number): number =>
  fract(Math.sin(seed * 12.9898) * 43758.5453123);

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function SceneLabel({
  text,
  position,
  color = "#faf1d6",
  size = 16,
  align = "center",
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  align?: "left" | "center" | "right";
}) {
  return (
    <Html
      transform
      center
      position={position}
      distanceFactor={10}
      style={{
        color,
        fontSize: `${size}px`,
        fontWeight: 700,
        whiteSpace: "nowrap",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        textAlign: align,
        pointerEvents: "none",
        textShadow:
          "0 0 1px rgba(11,11,11,0.86), 0 1px 2px rgba(11,11,11,0.72)",
      }}
    >
      {text}
    </Html>
  );
}

const blackHoleConfig: BlackHoleImplementationConfig = {
  metadata: {
    title: "Black Hole Accretion and Horizon",
    description:
      "Particle-based black hole scene showing a dark shadow, lensed accretion bands, and moving dots tracing the horizon boundary.",
    intro: [
      "This version is shaped more like the familiar black-hole visual: a dark central shadow, a bright equatorial accretion band, and a lensed upper and lower image of that same disk.",
      "Dots still carry the motion. The accretion bands flow around the hole, and a thinner dotted rim marks the horizon boundary so you can see where the no-return region sits relative to the glowing disk.",
    ],
    tip: "The dark shadow should cut through the center while the upper and lower arcs taper back into the disk at the sides.",
    stages: [
      {
        panelLabel: "Shadow appears",
        sceneLabel: "Step 1: A dark black-hole shadow forms in the star field",
      },
      {
        panelLabel: "Disk forms",
        sceneLabel: "Step 2: A thin accretion disk brightens across the middle",
      },
      {
        panelLabel: "Upper lens image",
        sceneLabel: "Step 3: The far side of the disk is lensed into an upper arc",
      },
      {
        panelLabel: "Lower lens image",
        sceneLabel: "Step 4: A smaller lower arc appears beneath the shadow",
      },
      {
        panelLabel: "Horizon motion",
        sceneLabel: "Step 5: Dots skim the horizon while the disk keeps orbiting",
      },
    ],
  },
  camera: {
    azimuth: 1.22,
    elevation: 0.16,
    distance: 12.4,
    target: [0.55, 0.12, 0],
  },
  timelineDurationMs: 24000,
};

const createBackgroundField = (): BackgroundDotField => {
  const positions = new Float32Array(BACKGROUND_DOT_COUNT * 3);
  const basePositions = new Float32Array(BACKGROUND_DOT_COUNT * 3);
  const colors = new Float32Array(BACKGROUND_DOT_COUNT * 3);
  const seeds = new Float32Array(BACKGROUND_DOT_COUNT);
  const color = new Color();

  for (let index = 0; index < BACKGROUND_DOT_COUNT; index += 1) {
    const x = mix(-16.5, 16.5, hash(index + 1));
    const y = mix(-9.2, 9.4, hash(index + 17));
    const z = mix(-2.2, 2.2, hash(index + 29));
    const brightness = 0.09 + hash(index + 41) * 0.16;

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    basePositions[index * 3] = x;
    basePositions[index * 3 + 1] = y;
    basePositions[index * 3 + 2] = z;
    seeds[index] = hash(index + 59);

    color.setRGB(
      brightness * 1.03,
      brightness,
      Math.max(0.12, brightness * 0.84),
    );
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  return { positions, basePositions, colors, seeds };
};

const createAccretionField = (
  count: number,
  radiusRange: [number, number],
  speedRange: [number, number],
  colorStops: {
    r: [number, number];
    g: [number, number];
    b: [number, number];
  },
): AccretionDotField => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const speeds = new Float32Array(count);
  const offsets = new Float32Array(count);
  const color = new Color();

  for (let index = 0; index < count; index += 1) {
    const colorMix = hash(index + 127);
    angles[index] = hash(index + 71) * TAU;
    radii[index] = mix(radiusRange[0], radiusRange[1], hash(index + 83));
    speeds[index] = mix(speedRange[0], speedRange[1], hash(index + 97));
    offsets[index] = hash(index + 111);

    color.setRGB(
      mix(colorStops.r[0], colorStops.r[1], colorMix),
      mix(colorStops.g[0], colorStops.g[1], colorMix),
      mix(colorStops.b[0], colorStops.b[1], colorMix),
    );
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  return { positions, colors, angles, radii, speeds, offsets };
};

const createHorizonField = (): HorizonDotField => {
  const positions = new Float32Array(HORIZON_DOT_COUNT * 3);
  const colors = new Float32Array(HORIZON_DOT_COUNT * 3);
  const angles = new Float32Array(HORIZON_DOT_COUNT);
  const speeds = new Float32Array(HORIZON_DOT_COUNT);
  const offsets = new Float32Array(HORIZON_DOT_COUNT);
  const color = new Color();

  for (let index = 0; index < HORIZON_DOT_COUNT; index += 1) {
    const arcMix = index / HORIZON_DOT_COUNT;
    angles[index] = mix(0, TAU, arcMix);
    speeds[index] = 0.36 + hash(index + 149) * 0.34;
    offsets[index] = hash(index + 163);

    const brightness = 0.78 + hash(index + 179) * 0.16;
    color.setRGB(brightness, brightness * 0.72, brightness * 0.34);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  return { positions, colors, angles, speeds, offsets };
};

const BlackHoleScene: ImplementationDefinition["Scene"] = ({
  sheet,
  forcedPhase = null,
  isPlaying = true,
  manualCamera = false,
  zoomLevel = 1,
  loop = true,
  resetToken = 0,
  onPlaybackComplete,
  onStageChange,
}) => {
  void sheet;
  const [{ phase }, phaseApi] = useSpring(() => ({ phase: 0 }));
  const activeStageRef = useRef(0);
  const backgroundPointsRef = useRef<Points>(null);
  const midplaneBackPointsRef = useRef<Points>(null);
  const midplaneFrontPointsRef = useRef<Points>(null);
  const upperLensPointsRef = useRef<Points>(null);
  const lowerLensPointsRef = useRef<Points>(null);
  const horizonPointsRef = useRef<Points>(null);
  const haloRingRef = useRef<Mesh>(null);
  const backgroundField = useMemo(createBackgroundField, []);
  const midplaneField = useMemo(
    () =>
      createAccretionField(
        MIDPLANE_DOT_COUNT,
        [2.05, 7.6],
        [0.44, 0.74],
        {
          r: [0.9, 1],
          g: [0.78, 0.98],
          b: [0.86, 1],
        },
      ),
    [],
  );
  const upperLensField = useMemo(
    () =>
      createAccretionField(
        UPPER_LENS_DOT_COUNT,
        [2.2, 5.9],
        [0.18, 0.34],
        {
          r: [0.92, 1],
          g: [0.84, 0.98],
          b: [0.9, 1],
        },
      ),
    [],
  );
  const lowerLensField = useMemo(
    () =>
      createAccretionField(
        LOWER_LENS_DOT_COUNT,
        [1.95, 4.7],
        [0.14, 0.28],
        {
          r: [0.84, 0.98],
          g: [0.72, 0.92],
          b: [0.8, 0.96],
        },
      ),
    [],
  );
  const horizonField = useMemo(createHorizonField, []);
  const midplaneBackPositions = useMemo(
    () => new Float32Array(MIDPLANE_DOT_COUNT * 3),
    [],
  );
  const midplaneFrontPositions = useMemo(
    () => new Float32Array(MIDPLANE_DOT_COUNT * 3),
    [],
  );
  const maxStageIndex = Math.max(0, blackHoleConfig.metadata.stages.length - 1);

  useEffect(() => {
    if (typeof forcedPhase === "number" && Number.isFinite(forcedPhase)) {
      phaseApi.stop();
      phase.pause();
      phase.set(
        Math.min(blackHoleConfig.metadata.stages.length, Math.max(0, forcedPhase)),
      );
      return;
    }

    phaseApi.stop();
    phaseApi.start({
      from: { phase: 0 },
      to: { phase: blackHoleConfig.metadata.stages.length },
      config: { duration: blackHoleConfig.timelineDurationMs },
      loop,
      onRest: (result) => {
        if (result.finished && !loop) {
          onPlaybackComplete?.();
        }
      },
    });

    return () => {
      phaseApi.stop();
    };
  }, [forcedPhase, loop, onPlaybackComplete, phase, phaseApi, resetToken]);

  useEffect(() => {
    if (typeof forcedPhase === "number" && Number.isFinite(forcedPhase)) {
      return;
    }
    if (isPlaying) {
      phase.resume();
    } else {
      phase.pause();
    }
  }, [forcedPhase, isPlaying, phase]);

  useFrame((state, delta) => {
    const currentPhase = phase.get();
    const elapsed = state.clock.elapsedTime;
    const safeZoom =
      typeof zoomLevel === "number" && Number.isFinite(zoomLevel)
        ? Math.max(0.5, zoomLevel)
        : 1;

    if (!manualCamera) {
      const target = new Vector3(...blackHoleConfig.camera.target);
      const distance = blackHoleConfig.camera.distance / safeZoom;
      const azimuth = blackHoleConfig.camera.azimuth;
      const elevation = blackHoleConfig.camera.elevation;
      state.camera.position.set(
        Math.cos(azimuth) * Math.cos(elevation) * distance,
        Math.sin(elevation) * distance,
        Math.sin(azimuth) * Math.cos(elevation) * distance,
      );
      state.camera.lookAt(target);
    }

    const stage = Math.min(maxStageIndex, Math.max(0, Math.floor(currentPhase)));
    if (stage !== activeStageRef.current) {
      activeStageRef.current = stage;
      onStageChange?.(stage);
    }

    const shadowMix = smoothWindow(currentPhase, 0.2, 1.2);
    const midplaneMix = smoothWindow(currentPhase, 1, 2.2);
    const upperLensMix = smoothWindow(currentPhase, 2.1, 3.4);
    const lowerLensMix = smoothWindow(currentPhase, 3, 4.1);
    const horizonMix = smoothWindow(currentPhase, 3.8, 5);

    const backgroundPosition = backgroundPointsRef.current?.geometry.getAttribute(
      "position",
    );
    if (backgroundPosition instanceof BufferAttribute) {
      for (let index = 0; index < BACKGROUND_DOT_COUNT; index += 1) {
        const offset = index * 3;
        const baseX = backgroundField.basePositions[offset];
        const baseY = backgroundField.basePositions[offset + 1];
        const baseZ = backgroundField.basePositions[offset + 2];
        const seed = backgroundField.seeds[index];
        const dx = baseX - HOLE_X;
        const dy = baseY - HOLE_Y;
        const radius = Math.sqrt(dx * dx + dy * dy) + 0.22;
        const angle = Math.atan2(dy, dx);
        const lens =
          shadowMix * Math.exp(-Math.pow((radius - 2.95) * 0.45, 2)) * 0.58 +
          horizonMix * Math.exp(-Math.pow((radius - 1.9) * 1.18, 2)) * 0.28;
        const warpedAngle =
          angle + lens * (0.2 + Math.sin(elapsed * 0.4 + seed * 7) * 0.08);
        const warpedRadius = Math.max(HORIZON_RADIUS + 0.1, radius - lens * 0.06);
        const twinkleX = Math.sin(elapsed * 0.42 + seed * 14) * 0.02;
        const twinkleY = Math.cos(elapsed * 0.33 + seed * 10) * 0.02;

        backgroundPosition.setXYZ(
          index,
          Math.cos(warpedAngle) * warpedRadius + HOLE_X + twinkleX,
          Math.sin(warpedAngle) * warpedRadius + HOLE_Y + twinkleY,
          baseZ + lens * 0.12,
        );
      }
      backgroundPosition.needsUpdate = true;
    }

    const midplaneBackPosition = midplaneBackPointsRef.current?.geometry.getAttribute(
      "position",
    );
    const midplaneFrontPosition = midplaneFrontPointsRef.current?.geometry.getAttribute(
      "position",
    );
    if (
      midplaneBackPosition instanceof BufferAttribute &&
      midplaneFrontPosition instanceof BufferAttribute
    ) {
      for (let index = 0; index < MIDPLANE_DOT_COUNT; index += 1) {
        const angle =
          midplaneField.angles[index] - elapsed * midplaneField.speeds[index];
        const radius = midplaneField.radii[index];
        const offset = midplaneField.offsets[index] - 0.5;
        const radialBias = 1 - Math.exp(-Math.pow((radius - 2.8) * 0.34, 2));
        const xScale = 1.82 - Math.exp(-Math.pow((radius - 2.25) * 1.3, 2)) * 0.4;
        const diskThickness = 0.025 + radialBias * 0.085;
        const x = HOLE_X + Math.cos(angle) * radius * xScale;
        const y =
          HOLE_Y +
          offset * diskThickness +
          Math.sin(angle * 2.4 + offset * 6) * 0.012 * midplaneMix;
        const z = Math.sin(angle) * radius * 0.78 + offset * 0.42;
        const isFront = z >= 0;

        if (isFront) {
          midplaneFrontPosition.setXYZ(index, x, y, z);
          midplaneBackPosition.setXYZ(index, x, y, -400);
        } else {
          midplaneBackPosition.setXYZ(index, x, y, z);
          midplaneFrontPosition.setXYZ(index, x, y, -400);
        }
      }
      midplaneBackPosition.needsUpdate = true;
      midplaneFrontPosition.needsUpdate = true;
    }

    const upperLensPosition = upperLensPointsRef.current?.geometry.getAttribute(
      "position",
    );
    if (upperLensPosition instanceof BufferAttribute) {
      for (let index = 0; index < UPPER_LENS_DOT_COUNT; index += 1) {
        const angle =
          upperLensField.angles[index] - elapsed * upperLensField.speeds[index];
        const radius = upperLensField.radii[index];
        const offset = upperLensField.offsets[index] - 0.5;
        const arch = Math.pow(Math.abs(Math.sin(angle)), 0.66);
        const lift =
          0.04 +
          upperLensMix * (0.16 + arch * (1.54 + (radius - 2.2) * 0.26));
        upperLensPosition.setXYZ(
          index,
          HOLE_X + Math.cos(angle) * radius * (1.08 + upperLensMix * 0.16),
          HOLE_Y + lift + offset * (0.05 + arch * 0.06),
          -0.18 + Math.sin(angle) * radius * 0.34 + offset * 0.14,
        );
      }
      upperLensPosition.needsUpdate = true;
    }

    const lowerLensPosition = lowerLensPointsRef.current?.geometry.getAttribute(
      "position",
    );
    if (lowerLensPosition instanceof BufferAttribute) {
      for (let index = 0; index < LOWER_LENS_DOT_COUNT; index += 1) {
        const angle =
          lowerLensField.angles[index] - elapsed * lowerLensField.speeds[index];
        const radius = lowerLensField.radii[index];
        const offset = lowerLensField.offsets[index] - 0.5;
        const arch = Math.pow(Math.abs(Math.sin(angle)), 0.72);
        const drop =
          0.02 +
          lowerLensMix * (0.08 + arch * (0.86 + (radius - 1.95) * 0.18));
        lowerLensPosition.setXYZ(
          index,
          HOLE_X + Math.cos(angle) * radius * (0.96 + lowerLensMix * 0.08),
          HOLE_Y - drop + offset * (0.03 + arch * 0.04),
          -0.28 + Math.sin(angle) * radius * 0.22 + offset * 0.12,
        );
      }
      lowerLensPosition.needsUpdate = true;
    }

    const horizonPosition = horizonPointsRef.current?.geometry.getAttribute("position");
    if (horizonPosition instanceof BufferAttribute) {
      for (let index = 0; index < HORIZON_DOT_COUNT; index += 1) {
        const angleBase = horizonField.angles[index];
        const speed = horizonField.speeds[index];
        const offset = horizonField.offsets[index];
        const orbitAngle = angleBase + elapsed * speed * (0.22 + horizonMix * 0.44);
        const radius =
          HORIZON_RADIUS +
          Math.sin(elapsed * 1.2 + offset * TAU) * (0.006 + horizonMix * 0.014);
        const ellipseYScale = 0.99;
        const frontBias = 0.018 + Math.sin(orbitAngle * 2 + offset * 8) * 0.008;

        horizonPosition.setXYZ(
          index,
          HOLE_X + Math.cos(orbitAngle) * radius,
          HOLE_Y + Math.sin(orbitAngle) * radius * ellipseYScale,
          0.19 + Math.sin(orbitAngle) * frontBias,
        );
      }
      horizonPosition.needsUpdate = true;
    }

    const haloRing = haloRingRef.current;
    if (haloRing) {
      haloRing.rotation.z += delta * (0.06 + horizonMix * 0.08);
      haloRing.scale.setScalar(
        1 + horizonMix * 0.02 + Math.sin(elapsed * 1.15) * 0.004,
      );
    }
  });

  const backgroundOpacity = phase.to(
    (value) => 0.14 + smoothWindow(value, 0.1, 1.4) * 0.6,
  );
  const midplaneOpacity = phase.to(
    (value) => 0.02 + smoothWindow(value, 0.9, 2.2) * 0.98,
  );
  const upperLensOpacity = phase.to(
    (value) => 0.01 + smoothWindow(value, 2, 3.4) * 0.94,
  );
  const lowerLensOpacity = phase.to(
    (value) => 0.01 + smoothWindow(value, 3, 4.2) * 0.72,
  );
  const horizonOpacity = phase.to(
    (value) => 0.01 + smoothWindow(value, 3.6, 4.8) * 0.78,
  );
  const haloOpacity = phase.to(
    (value) => 0.02 + smoothWindow(value, 1.1, 4.2) * 0.28,
  );

  return (
    <group>
      <SceneLabel
        position={[-6.1, -3.9, 0]}
        text="Bright bands are the accretion disk; the tight dotted rim marks the horizon"
        size={12}
        color="#d8c8a0"
        align="left"
      />

      <mesh position={[0, 0, -1.2]}>
        <planeGeometry args={[24, 13]} />
        <meshBasicMaterial color="#030204" />
      </mesh>

      <a.mesh
        ref={haloRingRef}
        position={[HOLE_X, HOLE_Y, -0.06]}
        renderOrder={2}
      >
        <ringGeometry args={[HORIZON_RADIUS * 1.12, HORIZON_RADIUS * 1.45, 96]} />
        <a.meshBasicMaterial
          color="#f6d4df"
          transparent
          opacity={haloOpacity.to((value) => value * 0.42)}
        />
      </a.mesh>

      <points ref={backgroundPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[backgroundField.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[backgroundField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.038}
          sizeAttenuation
          transparent
          depthWrite={false}
          vertexColors
          opacity={backgroundOpacity}
        />
      </points>

      <points ref={upperLensPointsRef} frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[upperLensField.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[upperLensField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.08}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexColors
          opacity={upperLensOpacity}
        />
      </points>

      <points ref={midplaneBackPointsRef} frustumCulled={false} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[midplaneBackPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[midplaneField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.074}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexColors
          opacity={midplaneOpacity}
        />
      </points>

      <points ref={lowerLensPointsRef} frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[lowerLensField.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lowerLensField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.066}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexColors
          opacity={lowerLensOpacity}
        />
      </points>

      <a.mesh position={[HOLE_X, HOLE_Y, 0.04]} renderOrder={4}>
        <circleGeometry args={[HORIZON_RADIUS * 1.01, 96]} />
        <a.meshBasicMaterial
          color="#050403"
          transparent
          opacity={0.995}
          depthWrite={false}
          depthTest={false}
        />
      </a.mesh>

      <points ref={midplaneFrontPointsRef} frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[midplaneFrontPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[midplaneField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.074}
          sizeAttenuation
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          vertexColors
          opacity={midplaneOpacity}
        />
      </points>

      <points ref={horizonPointsRef} frustumCulled={false} renderOrder={6}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[horizonField.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[horizonField.colors, 3]}
          />
        </bufferGeometry>
        <a.pointsMaterial
          size={0.068}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexColors
          opacity={horizonOpacity}
        />
      </points>
    </group>
  );
};

export const blackholeImplementation: ImplementationDefinition = {
  metadata: {
    id: "blackhole-gravity",
    title: blackHoleConfig.metadata.title,
    description: blackHoleConfig.metadata.description,
    intro: blackHoleConfig.metadata.intro,
    tip: blackHoleConfig.metadata.tip,
    stages: blackHoleConfig.metadata.stages,
  },
  theatre: {
    projectId: "BlackHoleExplainer",
    sheetId: "Main",
  },
  defaultCamera: blackHoleConfig.camera,
  Scene: BlackHoleScene,
};
