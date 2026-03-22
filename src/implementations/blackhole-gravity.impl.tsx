/* eslint-disable react-refresh/only-export-components */
import { Html, Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { useEffect, useRef, useState } from "react";
import { BufferAttribute, Mesh, Vector3 } from "three";
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

type OrbiterSpec = {
  color: string;
  radius: number;
  speed: number;
  offset: number;
  infallBias: number;
};

type CurvatureBandSpec = {
  radius: number;
  tube: number;
  color: string;
  baseY: number;
};

const ORBITER_SPECS: OrbiterSpec[] = [
  { color: "#3478b4", radius: 5.3, speed: 0.85, offset: 0.1, infallBias: 0.05 },
  { color: "#3aa593", radius: 4.7, speed: 1.02, offset: 1.2, infallBias: 0.11 },
  { color: "#b78654", radius: 4.1, speed: 1.23, offset: 2.1, infallBias: 0.18 },
  { color: "#7f6bb1", radius: 3.6, speed: 1.42, offset: 2.9, infallBias: 0.24 },
  { color: "#c04e4e", radius: 3.1, speed: 1.64, offset: 3.6, infallBias: 0.32 },
];

const CURVATURE_BANDS: CurvatureBandSpec[] = [
  { radius: 4.9, tube: 0.026, color: "#8ab4d8", baseY: -0.23 },
  { radius: 4.0, tube: 0.029, color: "#6aa3cd", baseY: -0.3 },
  { radius: 3.2, tube: 0.032, color: "#4f8ebd", baseY: -0.4 },
  { radius: 2.45, tube: 0.036, color: "#3d78a8", baseY: -0.56 },
  { radius: 1.88, tube: 0.04, color: "#2d5f8d", baseY: -0.74 },
];

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

function SceneLabel({
  text,
  position,
  color = "#142033",
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
          "0 0 1px rgba(255,255,255,0.72), 0 1px 1px rgba(255,255,255,0.45)",
        WebkitTextStroke: "0.1px rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Html>
  );
}

const blackHoleConfig: BlackHoleImplementationConfig = {
  metadata: {
    title: "Black Hole Gravity in 3D",
    description:
      "Interactive scene showing how spacetime curvature changes motion around a black hole.",
    intro: [
      "This implementation builds an intuitive gravity-well model: the grid bends as curvature increases, contour bands visualize stronger spacetime curvature toward the center, and orbiting tracers show stable vs unstable paths.",
      "The animation is intentionally simplified for education: it focuses on visual intuition over full general-relativistic equations, while still preserving the core ideas of curvature, orbit stability, and infall.",
    ],
    tip: "Use the scene switcher to jump between examples, and use zoom before recording if you want a tighter shot.",
    stages: [
      {
        panelLabel: "Flat spacetime reference",
        sceneLabel: "Step 1: Start from an unwarped spacetime grid",
      },
      {
        panelLabel: "Mass curves spacetime",
        sceneLabel: "Step 2: Gravity well deepens near the black hole",
      },
      {
        panelLabel: "Stable outer orbits",
        sceneLabel: "Step 3: Particles orbit safely farther away",
      },
      {
        panelLabel: "Near-horizon effects",
        sceneLabel: "Step 4: Event horizon region shows steep curvature",
      },
      {
        panelLabel: "Infall dominates",
        sceneLabel: "Step 5: Strong curvature drives inward capture",
      },
    ],
  },
  camera: {
    azimuth: 1.57,
    elevation: 0.36,
    distance: 12.8,
    target: [0, -0.35, 0],
  },
  timelineDurationMs: 22000,
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
  const [activeStage, setActiveStage] = useState(0);
  const activeStageRef = useRef(0);
  const gridRef = useRef<Mesh>(null);
  const diskRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const horizonRingRef = useRef<Mesh>(null);
  const curvatureBandRefs = useRef<Array<Mesh | null>>([]);
  const particleRefs = useRef<Array<Mesh | null>>([]);
  const baseGridPositionsRef = useRef<Float32Array | null>(null);
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
      setActiveStage(stage);
      onStageChange?.(stage);
    }

    const diskMesh = diskRef.current;
    if (diskMesh) {
      diskMesh.rotation.z +=
        delta * (0.34 + smoothWindow(currentPhase, 2, 5) * 0.22);
    }

    const ringMesh = ringRef.current;
    if (ringMesh) {
      ringMesh.rotation.z -= delta * 0.14;
    }

    const horizonRingMesh = horizonRingRef.current;
    if (horizonRingMesh) {
      horizonRingMesh.rotation.z += delta * 0.48;
    }

    const gridMesh = gridRef.current;
    if (gridMesh) {
      const position = gridMesh.geometry.getAttribute("position");
      if (position instanceof BufferAttribute) {
        if (!baseGridPositionsRef.current) {
          baseGridPositionsRef.current = Float32Array.from(
            position.array as ArrayLike<number>,
          );
        }

        const base = baseGridPositionsRef.current;
        const warpStrength =
          0.18 +
          smoothWindow(currentPhase, 1, 2.3) * 1.45 +
          smoothWindow(currentPhase, 3.6, 5) * 0.72;
        const rippleAmplitude =
          0.012 + smoothWindow(currentPhase, 2.1, 5) * 0.05;
        const infallMix = smoothWindow(currentPhase, 4, 5);
        const horizonRadius = 1.35;

        for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
          const offset = vertexIndex * 3;
          const baseX = base[offset];
          const baseY = base[offset + 1];
          const radius = Math.sqrt(baseX * baseX + baseY * baseY) + 0.45;
          const angle = Math.atan2(baseY, baseX);
          const horizonProximity = Math.exp(
            -Math.pow((radius - horizonRadius) * 1.65, 2),
          );

          const wellDepth = -Math.min(
            3.45,
            (warpStrength / radius) * 0.78 +
              horizonProximity * (0.22 + infallMix * 0.4),
          );
          const ripple =
            (Math.sin(radius * 2.3 - elapsed * 2) * rippleAmplitude) /
            (1 + radius * 0.75);
          const swirl =
            Math.sin((angle + elapsed * 0.5) * 3) *
            (0.03 + horizonProximity * 0.04) *
            infallMix;

          position.setZ(vertexIndex, wellDepth + ripple + swirl);
        }

        position.needsUpdate = true;
      }
    }

    const curvatureMix =
      smoothWindow(currentPhase, 1, 2.5) + smoothWindow(currentPhase, 3.8, 5) * 0.55;
    CURVATURE_BANDS.forEach((spec, index) => {
      const mesh = curvatureBandRefs.current[index];
      if (!mesh) {
        return;
      }
      const depthBias = (CURVATURE_BANDS.length - index) * 0.03;
      mesh.position.y = spec.baseY - curvatureMix * (0.2 + depthBias);
      mesh.scale.setScalar(1 - curvatureMix * 0.035);
    });

    const infallMix = smoothWindow(currentPhase, 4.1, 5);
    ORBITER_SPECS.forEach((spec, index) => {
      const particle = particleRefs.current[index];
      if (!particle) {
        return;
      }
      const theta = elapsed * spec.speed + spec.offset;
      const inwardPull = infallMix * (elapsed * 0.085 + spec.infallBias);
      const radius = Math.max(1.45, spec.radius - inwardPull);
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius * 0.72;
      const y = -0.16 + Math.sin(theta * 2 + spec.offset) * 0.14;
      particle.position.set(x, y, z);
      particle.scale.setScalar(0.85 + infallMix * 0.35);
    });
  });

  const gridOpacity = phase.to(
    (value) => 0.25 + smoothWindow(value, 0.6, 2.1) * 0.38,
  );
  const diskOpacity = phase.to(
    (value) => 0.15 + smoothWindow(value, 1.5, 3.3) * 0.72,
  );
  const particleOpacity = phase.to((value) => smoothWindow(value, 2.2, 5));
  const glowOpacity = phase.to(
    (value) => 0.2 + smoothWindow(value, 3.2, 5) * 0.7,
  );
  const horizonOpacity = phase.to(
    (value) => 0.12 + smoothWindow(value, 1.8, 4.8) * 0.66,
  );
  const curvatureBandOpacity = phase.to(
    (value) => 0.12 + smoothWindow(value, 1, 3.5) * 0.45,
  );

  return (
    <group>
      <SceneLabel
        position={[0, 4.7, 0]}
        text={blackHoleConfig.metadata.stages[activeStage]?.sceneLabel ?? ""}
        size={17}
      />
      <SceneLabel
        position={[-6.5, 2.6, 0]}
        text="Warped spacetime grid"
        size={13}
        color="#2f6fb3"
        align="left"
      />
      <SceneLabel
        position={[5.5, 2, 0]}
        text="Orbiting matter tracers"
        size={13}
        color="#8a6610"
        align="left"
      />
      <SceneLabel
        position={[5.8, 1.35, 0]}
        text="Trails show path bending and infall"
        size={12}
        color="#7f6f3d"
        align="left"
      />
      <SceneLabel
        position={[2.65, 1.15, 0]}
        text="Event horizon boundary"
        size={13}
        color="#b55a28"
      />
      <SceneLabel
        position={[-6.7, -0.1, 0]}
        text="Curvature contours steepen toward horizon"
        size={12}
        color="#2b5f93"
        align="left"
      />
      <SceneLabel
        position={[0, -4.9, 0]}
        text="Gravity well depth increases as radius decreases"
        size={13}
        color="#7a4f62"
      />

      <mesh ref={gridRef} rotation-x={-Math.PI / 2} position={[0, -1.15, 0]}>
        <planeGeometry args={[18, 18, 60, 60]} />
        <a.meshStandardMaterial
          color="#d6e4f8"
          wireframe
          transparent
          opacity={gridOpacity}
        />
      </mesh>

      <a.mesh ref={diskRef} rotation-x={Math.PI / 2} position={[0, -0.18, 0]}>
        <torusGeometry args={[3.25, 0.52, 26, 120]} />
        <a.meshStandardMaterial
          color="#ea9b5f"
          emissive="#f2a46b"
          emissiveIntensity={diskOpacity.to((value) => 0.25 + value * 0.8)}
          transparent
          opacity={diskOpacity}
          roughness={0.4}
          metalness={0.06}
        />
      </a.mesh>

      <a.mesh rotation-x={Math.PI / 2} position={[0, -0.16, 0]}>
        <torusGeometry args={[2.2, 0.24, 20, 90]} />
        <a.meshStandardMaterial
          color="#f6c189"
          transparent
          opacity={diskOpacity.to((value) => Math.min(0.92, value * 0.82))}
          roughness={0.45}
          metalness={0.04}
        />
      </a.mesh>

      {CURVATURE_BANDS.map((spec, index) => (
        <a.mesh
          key={`curvature-band-${index}`}
          ref={(mesh) => {
            curvatureBandRefs.current[index] = mesh;
          }}
          rotation-x={Math.PI / 2}
          position={[0, spec.baseY, 0]}
        >
          <torusGeometry args={[spec.radius, spec.tube, 18, 128]} />
          <a.meshBasicMaterial
            color={spec.color}
            transparent
            opacity={curvatureBandOpacity}
          />
        </a.mesh>
      ))}

      <a.mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.05, 48, 48]} />
        <a.meshStandardMaterial
          color="#06090f"
          emissive="#121b28"
          emissiveIntensity={glowOpacity.to((value) => 0.1 + value * 0.42)}
          roughness={0.25}
          metalness={0.28}
        />
      </a.mesh>

      <a.mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.34, 40, 40]} />
        <a.meshStandardMaterial
          color="#d66b37"
          emissive="#f39355"
          emissiveIntensity={horizonOpacity.to((value) => 0.15 + value * 0.7)}
          transparent
          opacity={horizonOpacity}
          roughness={0.33}
          metalness={0.05}
        />
      </a.mesh>

      <a.mesh ref={ringRef} rotation-x={Math.PI / 2} position={[0, 0, 0]}>
        <torusGeometry args={[1.33, 0.06, 18, 96]} />
        <a.meshBasicMaterial
          color="#2c394e"
          transparent
          opacity={glowOpacity.to((value) => 0.18 + value * 0.58)}
        />
      </a.mesh>

      <a.mesh ref={horizonRingRef} rotation-x={Math.PI / 2} position={[0, 0, 0]}>
        <torusGeometry args={[1.68, 0.045, 16, 120]} />
        <a.meshBasicMaterial
          color="#f39d5d"
          transparent
          opacity={horizonOpacity.to((value) => 0.15 + value * 0.7)}
        />
      </a.mesh>

      {ORBITER_SPECS.map((spec, index) => (
        <Trail
          key={`orbiter-trail-${index}`}
          width={0.18}
          length={7.2}
          decay={1.35}
          interval={1}
          color={spec.color}
          attenuation={(width) => width * width}
        >
          <a.mesh
            ref={(mesh) => {
              particleRefs.current[index] = mesh;
            }}
          >
            <sphereGeometry args={[0.14, 16, 16]} />
            <a.meshStandardMaterial
              color={spec.color}
              emissive={spec.color}
              emissiveIntensity={0.28}
              transparent
              opacity={particleOpacity.to((value) => 0.24 + value * 0.74)}
            />
          </a.mesh>
        </Trail>
      ))}
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
