/* eslint-disable react-refresh/only-export-components */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { useEffect, useRef, useState } from "react";
import { Group, Mesh, Vector3 } from "three";
import { ImplementationDefinition } from "../template/implementation";

type EntropyImplementationConfig = {
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

type ParticleSpec = {
  color: string;
  size: number;
  delay: number;
  ordered: [number, number, number];
  transit: [number, number, number];
  mixed: [number, number, number];
};

const PARTICLES: ParticleSpec[] = [
  {
    color: "#ee8b4f",
    size: 0.18,
    delay: 0.0,
    ordered: [-5.35, 1.75, -0.55],
    transit: [-1.8, 1.15, -0.45],
    mixed: [-5.15, 1.65, 0.65],
  },
  {
    color: "#f1a14f",
    size: 0.16,
    delay: 0.04,
    ordered: [-5.35, 0.62, -0.15],
    transit: [-1.15, 0.52, -0.18],
    mixed: [-4.25, 0.38, -0.74],
  },
  {
    color: "#f2ba63",
    size: 0.16,
    delay: 0.08,
    ordered: [-5.35, -0.52, 0.18],
    transit: [-0.38, -0.12, 0.12],
    mixed: [-3.2, -1.35, 0.42],
  },
  {
    color: "#e37856",
    size: 0.17,
    delay: 0.12,
    ordered: [-5.35, -1.66, 0.55],
    transit: [1.0, -0.96, 0.46],
    mixed: [-2.1, 1.1, -0.22],
  },
  {
    color: "#d86c49",
    size: 0.18,
    delay: 0.02,
    ordered: [-4.58, 1.75, 0.58],
    transit: [-1.48, 0.92, 0.42],
    mixed: [-0.92, -0.95, 0.62],
  },
  {
    color: "#e2914c",
    size: 0.17,
    delay: 0.06,
    ordered: [-4.58, 0.62, 0.18],
    transit: [-0.66, 0.22, 0.2],
    mixed: [0.92, 1.62, -0.48],
  },
  {
    color: "#f0b97a",
    size: 0.16,
    delay: 0.1,
    ordered: [-4.58, -0.52, -0.22],
    transit: [0.24, -0.28, -0.1],
    mixed: [2.08, -0.28, 0.72],
  },
  {
    color: "#df7d61",
    size: 0.17,
    delay: 0.14,
    ordered: [-4.58, -1.66, -0.62],
    transit: [1.34, -1.08, -0.44],
    mixed: [3.18, 1.02, 0.12],
  },
  {
    color: "#d96a4f",
    size: 0.18,
    delay: 0.05,
    ordered: [-3.82, 1.75, -0.28],
    transit: [-1.26, 0.72, -0.24],
    mixed: [4.12, -1.28, -0.62],
  },
  {
    color: "#eba05a",
    size: 0.16,
    delay: 0.09,
    ordered: [-3.82, 0.62, 0.42],
    transit: [-0.2, 0.08, 0.16],
    mixed: [5.1, 0.28, 0.5],
  },
  {
    color: "#f2c06e",
    size: 0.17,
    delay: 0.13,
    ordered: [-3.82, -0.52, -0.42],
    transit: [0.78, -0.46, -0.16],
    mixed: [4.58, 1.78, -0.22],
  },
  {
    color: "#e07c4f",
    size: 0.18,
    delay: 0.17,
    ordered: [-3.82, -1.66, 0.28],
    transit: [1.58, -0.86, 0.26],
    mixed: [2.82, -1.7, 0.18],
  },
];

const STAGE_NOTES: string[] = [
  "A concentration gradient is ordered: entropy is low, free energy is high, and the system can still do useful work.",
  "Opening the path lets the particles explore more arrangements, so entropy begins to rise as the gradient starts to relax.",
  "While the gradient still exists, particle flow spins the wheel. The drop in free energy is what makes work extraction possible.",
  "As the particles spread out, the number of accessible microstates grows. Entropy rises and the amount of work still available falls.",
  "At equilibrium the particles still move, but the gradient is gone. Entropy is high, free energy is low, and almost no useful work remains.",
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

const lerp = (start: number, end: number, alpha: number): number => {
  return start + (end - start) * alpha;
};

const entropyConfig: EntropyImplementationConfig = {
  metadata: {
    title: "Entropy, Free Energy, and Work",
    description:
      "A two-chamber entropy demo showing how an ordered gradient can do work until mixing drives the system toward equilibrium.",
    intro: [
      "The left chamber starts in a low-entropy state: particles are concentrated and the gradient stores free energy.",
      "Once the gate opens, the particles spread into many more microstates. That increase in entropy is paired with a drop in free energy, so the spinning wheel slowly loses the ability to extract useful work.",
    ],
    tip: "Pause on stage 3 or 4 to compare the wheel speed against the free-energy and entropy meters.",
    stages: [
      {
        panelLabel: "Ordered gradient",
        sceneLabel: "Step 1: Low entropy stores free energy in a concentration gradient",
      },
      {
        panelLabel: "Path opens",
        sceneLabel: "Step 2: Opening the path lets entropy begin to rise",
      },
      {
        panelLabel: "Work extraction",
        sceneLabel: "Step 3: The relaxing gradient spins the wheel and does work",
      },
      {
        panelLabel: "Mixing dominates",
        sceneLabel: "Step 4: Entropy rises as free energy falls during mixing",
      },
      {
        panelLabel: "Equilibrium",
        sceneLabel: "Step 5: High entropy leaves little free energy for work",
      },
    ],
  },
  camera: {
    azimuth: 1.57,
    elevation: 0.17,
    distance: 14.2,
    target: [0, -0.1, 0],
  },
  timelineDurationMs: 24_000,
};

function SceneLabel({
  text,
  position,
  size = 15,
  color = "#183049",
  width,
}: {
  text: string;
  position: [number, number, number];
  size?: number;
  color?: string;
  width?: number;
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
        width: width ? `${width}px` : undefined,
        whiteSpace: width ? "normal" : "nowrap",
        lineHeight: 1.25,
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        pointerEvents: "none",
        textShadow:
          "0 0 1px rgba(255,255,255,0.8), 0 1px 1px rgba(255,255,255,0.56)",
        WebkitTextStroke: "0.12px rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Html>
  );
}

function SceneNote({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  return (
    <Html
      transform
      center
      position={position}
      distanceFactor={10}
      style={{
        width: "360px",
        padding: "12px 16px",
        borderRadius: "14px",
        border: "1px solid rgba(132, 151, 172, 0.42)",
        background: "rgba(255, 255, 255, 0.78)",
        color: "#31455d",
        fontSize: "13px",
        fontWeight: 600,
        lineHeight: 1.32,
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        pointerEvents: "none",
        boxShadow: "0 10px 28px rgba(91, 110, 128, 0.12)",
        backdropFilter: "blur(6px)",
      }}
    >
      {text}
    </Html>
  );
}

const EntropyFreeEnergyScene: ImplementationDefinition["Scene"] = ({
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
  const particleRefs = useRef<Array<Mesh | null>>([]);
  const wheelGroupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const gateTopRef = useRef<Mesh>(null);
  const gateBottomRef = useRef<Mesh>(null);
  const pistonRef = useRef<Mesh>(null);
  const maxStageIndex = Math.max(0, entropyConfig.metadata.stages.length - 1);

  useEffect(() => {
    if (typeof forcedPhase === "number" && Number.isFinite(forcedPhase)) {
      phaseApi.stop();
      phase.pause();
      phase.set(
        Math.min(entropyConfig.metadata.stages.length, Math.max(0, forcedPhase)),
      );
      return;
    }

    phaseApi.stop();
    phaseApi.start({
      from: { phase: 0 },
      to: { phase: entropyConfig.metadata.stages.length },
      config: { duration: entropyConfig.timelineDurationMs },
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
      const target = new Vector3(...entropyConfig.camera.target);
      const distance = entropyConfig.camera.distance / safeZoom;
      const azimuth = entropyConfig.camera.azimuth;
      const elevation = entropyConfig.camera.elevation;

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

    const gateOpen = smoothWindow(currentPhase, 0.95, 1.9);
    const workBurst =
      smoothWindow(currentPhase, 1.35, 2.35) *
      (1 - smoothWindow(currentPhase, 3.3, 4.85));
    const mixAmount = smoothWindow(currentPhase, 2.1, 4.7);
    const settleAmount = smoothWindow(currentPhase, 4.0, 5.0);

    const wheelGroup = wheelGroupRef.current;
    if (wheelGroup) {
      wheelGroup.rotation.z += delta * (0.22 + workBurst * 4.8);
    }

    const glow = glowRef.current;
    if (glow) {
      glow.rotation.z -= delta * (0.18 + workBurst * 1.4);
      const glowScale = 1 + workBurst * 0.18;
      glow.scale.setScalar(glowScale);
    }

    const gateTop = gateTopRef.current;
    if (gateTop) {
      gateTop.position.y = 1.15 + gateOpen * 0.64;
    }

    const gateBottom = gateBottomRef.current;
    if (gateBottom) {
      gateBottom.position.y = -1.15 - gateOpen * 0.64;
    }

    const piston = pistonRef.current;
    if (piston) {
      piston.position.y =
        2.38 + workBurst * 0.52 + Math.sin(elapsed * 7.2) * 0.08 * workBurst;
    }

    // The same particles persist through every stage so the viewer can track
    // how ordered gradients become mixed states with less useful work available.
    PARTICLES.forEach((spec, index) => {
      const mesh = particleRefs.current[index];
      if (!mesh) {
        return;
      }

      const release = smoothWindow(
        currentPhase,
        0.95 + spec.delay,
        2.15 + spec.delay,
      );
      const mixing = smoothWindow(
        currentPhase,
        1.95 + spec.delay,
        4.45 + spec.delay,
      );

      const xToTransit = lerp(spec.ordered[0], spec.transit[0], release);
      const yToTransit = lerp(spec.ordered[1], spec.transit[1], release);
      const zToTransit = lerp(spec.ordered[2], spec.transit[2], release);

      const x = lerp(xToTransit, spec.mixed[0], mixing);
      const y =
        lerp(yToTransit, spec.mixed[1], mixing) +
        Math.sin(elapsed * 2.3 + index * 0.9) * (0.04 + mixAmount * 0.12);
      const z =
        lerp(zToTransit, spec.mixed[2], mixing) +
        Math.cos(elapsed * 1.8 + index * 0.7) * (0.03 + mixAmount * 0.08);

      mesh.position.set(x, y, z);

      const pulse =
        1 +
        Math.sin(elapsed * 5.1 + index) * (0.02 + workBurst * 0.05 + settleAmount * 0.03);
      mesh.scale.setScalar(spec.size * pulse);
    });
  });

  const particleOpacity = phase.to(
    (value) => 0.3 + smoothWindow(value, 0.1, 1.0) * 0.7,
  );
  const chamberOpacity = phase.to(
    (value) => 0.08 + smoothWindow(value, 0.2, 1.0) * 0.1,
  );
  const connectorOpacity = phase.to(
    (value) => 0.08 + smoothWindow(value, 0.9, 2.0) * 0.18,
  );
  const wheelOpacity = phase.to(
    (value) => 0.28 + smoothWindow(value, 1.0, 2.2) * 0.56,
  );
  const wheelGlowOpacity = phase.to((value) => {
    const workWindow =
      smoothWindow(value, 1.2, 2.3) * (1 - smoothWindow(value, 3.2, 4.9));
    return 0.08 + workWindow * 0.72;
  });
  const freeEnergyLevel = phase.to(
    (value) => 0.95 - smoothWindow(value, 1.05, 4.85) * 0.83,
  );
  const entropyLevel = phase.to(
    (value) => 0.17 + smoothWindow(value, 0.75, 4.7) * 0.79,
  );
  const workLevel = phase.to((value) => {
    const workWindow =
      smoothWindow(value, 1.2, 2.3) * (1 - smoothWindow(value, 3.25, 4.9));
    return 0.04 + workWindow * 0.92;
  });

  const freeEnergyY = freeEnergyLevel.to((value) => -1.2 + value * 1.2);
  const entropyY = entropyLevel.to((value) => -1.2 + value * 1.2);
  const workX = workLevel.to((value) => -1.45 + value * 1.45);

  return (
    <group>
      <SceneLabel
        text={entropyConfig.metadata.stages[activeStage]?.sceneLabel ?? ""}
        position={[0, 4.75, 0]}
        size={17}
        color="#132c47"
      />
      <SceneLabel
        text="Low-entropy gradient"
        position={[-4.55, 3.35, 0]}
        size={14}
        color="#9a5d2f"
      />
      <SceneLabel
        text="Work extraction"
        position={[0, 3.35, 0]}
        size={14}
        color="#7c6332"
      />
      <SceneLabel
        text="High-entropy mixture"
        position={[4.55, 3.35, 0]}
        size={14}
        color="#456f8e"
      />

      <SceneNote
        text={STAGE_NOTES[activeStage] ?? STAGE_NOTES[0]}
        position={[0, -5.0, 0]}
      />

      <mesh position={[0, -3.15, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[16.2, 7.4]} />
        <meshBasicMaterial color="#eef3f7" transparent opacity={0.92} />
      </mesh>

      <mesh position={[-4.55, 0, 0]}>
        <boxGeometry args={[4.8, 4.8, 2.7]} />
        <a.meshStandardMaterial
          color="#f6d6c2"
          transparent
          opacity={chamberOpacity}
        />
      </mesh>
      <mesh position={[4.55, 0, 0]}>
        <boxGeometry args={[4.8, 4.8, 2.7]} />
        <a.meshStandardMaterial
          color="#d7e6ef"
          transparent
          opacity={chamberOpacity}
        />
      </mesh>

      <mesh position={[-4.55, -2.45, 0]}>
        <boxGeometry args={[4.5, 0.08, 2.45]} />
        <meshBasicMaterial color="#d5af95" transparent opacity={0.42} />
      </mesh>
      <mesh position={[4.55, -2.45, 0]}>
        <boxGeometry args={[4.5, 0.08, 2.45]} />
        <meshBasicMaterial color="#a8c3d7" transparent opacity={0.42} />
      </mesh>

      <a.mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.55, 1.35, 1.6]} />
        <a.meshStandardMaterial
          color="#e9eff3"
          transparent
          opacity={connectorOpacity}
        />
      </a.mesh>

      <mesh ref={gateTopRef} position={[0, 1.15, 0]}>
        <boxGeometry args={[0.18, 1.7, 1.52]} />
        <meshStandardMaterial color="#9caebb" transparent opacity={0.66} />
      </mesh>
      <mesh ref={gateBottomRef} position={[0, -1.15, 0]}>
        <boxGeometry args={[0.18, 1.7, 1.52]} />
        <meshStandardMaterial color="#9caebb" transparent opacity={0.66} />
      </mesh>

      <group ref={wheelGroupRef} position={[0, 0, 0]}>
        <a.mesh ref={glowRef} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.22, 0.04, 12, 64]} />
          <a.meshBasicMaterial
            color="#f2bf65"
            transparent
            opacity={wheelGlowOpacity}
          />
        </a.mesh>
        <a.mesh>
          <torusGeometry args={[0.95, 0.08, 18, 72]} />
          <a.meshStandardMaterial
            color="#bd9250"
            emissive="#d7ab63"
            emissiveIntensity={wheelGlowOpacity.to((value) => 0.1 + value * 0.6)}
            transparent
            opacity={wheelOpacity}
          />
        </a.mesh>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 24]} />
          <meshStandardMaterial color="#8c6a3b" />
        </mesh>
        {[0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4].map((rotation) => (
          <mesh key={rotation} rotation-z={rotation}>
            <boxGeometry args={[1.62, 0.12, 0.12]} />
            <meshStandardMaterial color="#b08245" />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[0.12, 1.8, 0.12]} />
        <meshBasicMaterial color="#c99b55" transparent opacity={0.5} />
      </mesh>
      <mesh ref={pistonRef} position={[0, 2.38, 0]}>
        <boxGeometry args={[0.78, 0.28, 0.28]} />
        <meshStandardMaterial color="#e3bb71" transparent opacity={0.9} />
      </mesh>

      <SceneLabel
        text="Free energy"
        position={[-7.25, 2.4, 0]}
        size={13}
        color="#8d4e27"
      />
      <mesh position={[-7.25, 0, 0]}>
        <boxGeometry args={[0.72, 2.8, 0.22]} />
        <meshBasicMaterial color="#f3e8dd" transparent opacity={0.7} />
      </mesh>
      <a.mesh
        position-x={-7.25}
        position-y={freeEnergyY}
        position-z={0.12}
        scale-y={freeEnergyLevel}
      >
        <boxGeometry args={[0.48, 2.4, 0.16]} />
        <meshStandardMaterial color="#db844d" emissive="#db844d" emissiveIntensity={0.24} />
      </a.mesh>
      <SceneLabel
        text="high"
        position={[-7.25, 1.75, 0]}
        size={11}
        color="#b46c3d"
      />
      <SceneLabel
        text="low"
        position={[-7.25, -1.95, 0]}
        size={11}
        color="#b46c3d"
      />

      <SceneLabel
        text="Entropy"
        position={[7.25, 2.4, 0]}
        size={13}
        color="#3e6f91"
      />
      <mesh position={[7.25, 0, 0]}>
        <boxGeometry args={[0.72, 2.8, 0.22]} />
        <meshBasicMaterial color="#e4edf3" transparent opacity={0.7} />
      </mesh>
      <a.mesh
        position-x={7.25}
        position-y={entropyY}
        position-z={0.12}
        scale-y={entropyLevel}
      >
        <boxGeometry args={[0.48, 2.4, 0.16]} />
        <meshStandardMaterial color="#5a95bc" emissive="#5a95bc" emissiveIntensity={0.18} />
      </a.mesh>
      <SceneLabel
        text="low"
        position={[7.25, -1.95, 0]}
        size={11}
        color="#5f88a7"
      />
      <SceneLabel
        text="high"
        position={[7.25, 1.75, 0]}
        size={11}
        color="#5f88a7"
      />

      <SceneLabel
        text="Useful work"
        position={[0, -2.95, 0]}
        size={13}
        color="#7a6132"
      />
      <mesh position={[0, -3.55, 0]}>
        <boxGeometry args={[3.1, 0.34, 0.18]} />
        <meshBasicMaterial color="#efe6d7" transparent opacity={0.72} />
      </mesh>
      <a.mesh
        position-x={workX}
        position-y={-3.55}
        position-z={0.12}
        scale-x={workLevel}
      >
        <boxGeometry args={[2.9, 0.2, 0.12]} />
        <meshStandardMaterial color="#d2a45d" emissive="#d2a45d" emissiveIntensity={0.18} />
      </a.mesh>

      {PARTICLES.map((spec, index) => (
        <a.mesh
          key={`${spec.color}-${index}`}
          ref={(mesh) => {
            particleRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[1, 18, 18]} />
          <a.meshStandardMaterial
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={0.22}
            transparent
            opacity={particleOpacity}
          />
        </a.mesh>
      ))}

      <SceneLabel
        text="Ordered concentration means fewer likely arrangements"
        position={[-4.6, -3.8, 0]}
        size={12}
        color="#8b5b39"
        width={240}
      />
      <SceneLabel
        text="More accessible arrangements means higher entropy"
        position={[4.6, -3.8, 0]}
        size={12}
        color="#4c7290"
        width={240}
      />
    </group>
  );
};

export const entropyFreeEnergyImplementation: ImplementationDefinition = {
  metadata: {
    id: "entropy-free-energy",
    title: entropyConfig.metadata.title,
    description: entropyConfig.metadata.description,
    intro: entropyConfig.metadata.intro,
    tip: entropyConfig.metadata.tip,
    stages: entropyConfig.metadata.stages,
  },
  theatre: {
    projectId: "EntropyFreeEnergyExplainer",
    sheetId: "Main",
  },
  defaultCamera: entropyConfig.camera,
  Scene: EntropyFreeEnergyScene,
};
