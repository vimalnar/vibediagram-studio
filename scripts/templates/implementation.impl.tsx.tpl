/* eslint-disable react-refresh/only-export-components */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { useEffect, useRef, useState } from "react";
import { Mesh, Vector3 } from "three";
import { ImplementationDefinition } from "../template/implementation";

type SceneConfig = {
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

type FlowNodeSpec = {
  label: string;
  color: string;
  y: number;
  z: number;
};

const FLOW_NODES: FlowNodeSpec[] = [
  { label: "A", color: "#5aa9ff", y: 1.65, z: -0.75 },
  { label: "B", color: "#2fd4a8", y: 0.55, z: -0.25 },
  { label: "C", color: "#ff9951", y: -0.55, z: 0.25 },
  { label: "D", color: "#b48cf5", y: -1.65, z: 0.75 },
];

const sceneConfig: SceneConfig = {
  metadata: {
    title: "__TITLE__",
    description: "Interactive educational diagram scene.",
    intro: [
      "Generated from the all-in-one implementation template.",
      "Replace this scene geometry + stage logic with your topic-specific animation.",
    ],
    tip: "Use Play/Pause to inspect stages, then Record for a clean one-pass export.",
    stages: [
      { panelLabel: "Inputs", sceneLabel: "Step 1: Present the starting state" },
      {
        panelLabel: "Transform setup",
        sceneLabel: "Step 2: Activate the transformation stage",
      },
      {
        panelLabel: "Flow dynamics",
        sceneLabel: "Step 3: Motion paths reveal intermediate behavior",
      },
      {
        panelLabel: "Output shaping",
        sceneLabel: "Step 4: Merge transformed state into outputs",
      },
      {
        panelLabel: "Final state",
        sceneLabel: "Step 5: Highlight the resulting pattern",
      },
    ],
  },
  camera: {
    azimuth: 1.57,
    elevation: 0.14,
    distance: 12.4,
    target: [0.2, -0.2, 0],
  },
  timelineDurationMs: 20_000,
};

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

function SceneLabel({
  text,
  position,
  size = 15,
  color = "#15243b",
}: {
  text: string;
  position: [number, number, number];
  size?: number;
  color?: string;
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
        pointerEvents: "none",
        textShadow:
          "0 0 1px rgba(255,255,255,0.76), 0 1px 1px rgba(255,255,255,0.56)",
        WebkitTextStroke: "0.1px rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Html>
  );
}

const __PASCAL__Scene: ImplementationDefinition["Scene"] = ({
  sheet,
  forcedPhase,
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
  const nodeRefs = useRef<Array<Mesh | null>>([]);
  const haloRef = useRef<Mesh>(null);
  const maxStageIndex = Math.max(0, sceneConfig.metadata.stages.length - 1);

  useEffect(() => {
    if (typeof forcedPhase === "number" && Number.isFinite(forcedPhase)) {
      phaseApi.stop();
      phase.pause();
      phase.set(Math.min(sceneConfig.metadata.stages.length, Math.max(0, forcedPhase)));
      return;
    }

    phaseApi.stop();
    phaseApi.start({
      from: { phase: 0 },
      to: { phase: sceneConfig.metadata.stages.length },
      config: { duration: sceneConfig.timelineDurationMs },
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
      const target = new Vector3(...sceneConfig.camera.target);
      const distance = sceneConfig.camera.distance / safeZoom;
      const azimuth = sceneConfig.camera.azimuth;
      const elevation = sceneConfig.camera.elevation;
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

    const toCore = smoothWindow(currentPhase, 0.8, 2.2);
    const toOutput = smoothWindow(currentPhase, 2.6, 4.6);
    const pathBend = smoothWindow(currentPhase, 2.1, 3.3);
    const settlePulse = smoothWindow(currentPhase, 4.1, 5);

    FLOW_NODES.forEach((node, index) => {
      const mesh = nodeRefs.current[index];
      if (!mesh) {
        return;
      }
      const baseX = lerp(-4.8, 0.2, toCore);
      const flowX = lerp(baseX, 4.8, toOutput);
      const wobble = Math.sin(elapsed * 1.8 + index * 0.9) * 0.24 * pathBend;
      const zLift = Math.cos(elapsed * 1.4 + index * 0.7) * 0.16 * pathBend;
      mesh.position.set(flowX, node.y + wobble, node.z + zLift);

      const pulse = 1 + settlePulse * 0.2 * Math.sin(elapsed * 5 + index);
      mesh.scale.setScalar(0.95 * pulse);
    });

    const halo = haloRef.current;
    if (halo) {
      halo.rotation.z += delta * 0.32;
      halo.scale.setScalar(1 + settlePulse * 0.22);
    }
  });

  const blockOpacity = phase.to(
    (value) => 0.18 + smoothWindow(value, 0.4, 2.2) * 0.28,
  );
  const nodeOpacity = phase.to((value) => 0.25 + smoothWindow(value, 0.2, 1.4) * 0.75);
  const connectorOpacity = phase.to(
    (value) => 0.1 + smoothWindow(value, 1.3, 3.8) * 0.45,
  );
  const outputGlowOpacity = phase.to(
    (value) => 0.08 + smoothWindow(value, 3.6, 5) * 0.66,
  );

  return (
    <group>
      <SceneLabel
        text={sceneConfig.metadata.stages[activeStage]?.sceneLabel ?? ""}
        position={[0, 4.55, 0]}
        size={17}
      />
      <SceneLabel text="Input" position={[-4.8, 2.85, 0]} size={14} color="#2f6fb3" />
      <SceneLabel text="Transform" position={[0.2, 2.85, 0]} size={14} color="#1f9c63" />
      <SceneLabel text="Output" position={[4.8, 2.85, 0]} size={14} color="#8b4f64" />

      <a.mesh position={[-4.8, 0, 0]}>
        <boxGeometry args={[1.8, 4.8, 2.4]} />
        <a.meshStandardMaterial color="#8bb7e5" transparent opacity={blockOpacity} />
      </a.mesh>
      <a.mesh position={[0.2, 0, 0]}>
        <boxGeometry args={[1.9, 4.8, 2.6]} />
        <a.meshStandardMaterial color="#8fd5b9" transparent opacity={blockOpacity} />
      </a.mesh>
      <a.mesh position={[4.8, 0, 0]}>
        <boxGeometry args={[1.8, 4.8, 2.4]} />
        <a.meshStandardMaterial
          color="#d5aac1"
          emissive="#d9a8c1"
          emissiveIntensity={outputGlowOpacity.to((value) => 0.08 + value * 0.4)}
          transparent
          opacity={blockOpacity}
        />
      </a.mesh>

      {FLOW_NODES.map((node, index) => (
        <a.mesh
          key={node.label}
          ref={(mesh) => {
            nodeRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.24, 24, 24]} />
          <a.meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.35}
            transparent
            opacity={nodeOpacity}
          />
        </a.mesh>
      ))}

      {FLOW_NODES.map((node) => (
        <a.mesh key={`path-${node.label}`} position={[0, node.y, node.z]}>
          <boxGeometry args={[9.1, 0.04, 0.04]} />
          <a.meshBasicMaterial color="#7a8798" transparent opacity={connectorOpacity} />
        </a.mesh>
      ))}

      <a.mesh ref={haloRef} position={[4.8, 0, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.55, 0.06, 20, 96]} />
        <a.meshBasicMaterial color="#c75f83" transparent opacity={outputGlowOpacity} />
      </a.mesh>
    </group>
  );
};

export const __CONST__: ImplementationDefinition = {
  metadata: {
    id: "__ID__",
    title: sceneConfig.metadata.title,
    description: sceneConfig.metadata.description,
    intro: sceneConfig.metadata.intro,
    tip: sceneConfig.metadata.tip,
    stages: sceneConfig.metadata.stages,
  },
  theatre: {
    projectId: "__PROJECT_ID__",
    sheetId: "Main",
  },
  defaultCamera: sceneConfig.camera,
  Scene: __PASCAL__Scene,
};
