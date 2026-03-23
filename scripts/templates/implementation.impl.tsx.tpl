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

type PlanetSpec = {
  label: string;
  color: string;
  orbitRadius: number;
  size: number;
  orbitalDays: number;
  startAngle: number;
  orbitColor: string;
};

const PLANETS: PlanetSpec[] = [
  {
    label: "Mercury",
    color: "#c9b6a5",
    orbitRadius: 1.45,
    size: 0.12,
    orbitalDays: 88,
    startAngle: 0.2,
    orbitColor: "#d9d4cf",
  },
  {
    label: "Venus",
    color: "#e6c27a",
    orbitRadius: 1.95,
    size: 0.18,
    orbitalDays: 225,
    startAngle: 1.15,
    orbitColor: "#e4dccf",
  },
  {
    label: "Earth",
    color: "#4c9dff",
    orbitRadius: 2.55,
    size: 0.2,
    orbitalDays: 365,
    startAngle: 2.2,
    orbitColor: "#9fc6eb",
  },
  {
    label: "Mars",
    color: "#d98663",
    orbitRadius: 3.15,
    size: 0.15,
    orbitalDays: 687,
    startAngle: 2.95,
    orbitColor: "#e8d4cc",
  },
  {
    label: "Jupiter",
    color: "#d9b487",
    orbitRadius: 4.25,
    size: 0.42,
    orbitalDays: 4333,
    startAngle: 0.55,
    orbitColor: "#e3ddd6",
  },
  {
    label: "Saturn",
    color: "#e2cf9f",
    orbitRadius: 5.2,
    size: 0.36,
    orbitalDays: 10759,
    startAngle: 1.45,
    orbitColor: "#e5e0d9",
  },
  {
    label: "Uranus",
    color: "#9fd7de",
    orbitRadius: 6.1,
    size: 0.28,
    orbitalDays: 30687,
    startAngle: 3.4,
    orbitColor: "#dde8ea",
  },
  {
    label: "Neptune",
    color: "#648dff",
    orbitRadius: 6.95,
    size: 0.27,
    orbitalDays: 60190,
    startAngle: 4.65,
    orbitColor: "#dbe0ea",
  },
];

const STAGE_NOTES: string[] = [
  "The Sun sits at the center while every planet follows its own orbit. Sizes and distances are compressed to fit the whole family into one clean view.",
  "The inner planets move fastest. Mercury races around the Sun, while the big outer planets only creep forward during the same year.",
  "Watch the small white marker on Earth: one full spin is one day, so the Earth-day timer cycles through 24 hours.",
  "Earth needs about 365 days to go once around the Sun. The year timer tracks that trip across the full loop.",
  "The Moon keeps circling Earth while Earth circles the Sun, showing that a day, a month, and a year all happen on different clocks.",
];

const sceneConfig: SceneConfig = {
  metadata: {
    title: "__TITLE__",
    description:
      "Kid-friendly solar system explainer showing the planets orbiting the Sun, the Moon orbiting Earth, and live Earth day and year timers.",
    intro: [
      "Generated from the all-in-one implementation template.",
      "Earth's spin shows a 24-hour day, Earth's orbit around the Sun shows a 365-day year, and the Moon circles Earth the whole way through.",
    ],
    tip: "Pause around Earth to compare the 24-hour day spinner with the 365-day trip around the Sun.",
    stages: [
      {
        panelLabel: "Sun and planets",
        sceneLabel: "Step 1: The Sun anchors the solar system at the center",
      },
      {
        panelLabel: "Inner planets",
        sceneLabel: "Step 2: The inner planets sweep around the Sun the fastest",
      },
      {
        panelLabel: "Earth day",
        sceneLabel: "Step 3: Earth spins once every 24 hours",
      },
      {
        panelLabel: "Earth year",
        sceneLabel: "Step 4: Earth needs about 365 days to orbit the Sun",
      },
      {
        panelLabel: "Moon motion",
        sceneLabel: "Step 5: The Moon keeps circling Earth during the whole year",
      },
    ],
  },
  camera: {
    azimuth: 1.57,
    elevation: 0.42,
    distance: 16.2,
    target: [0, 0.2, 0],
  },
  timelineDurationMs: 48_000,
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

function SceneLabel({
  text,
  position,
  size = 15,
  color = "#183049",
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
          "0 0 1px rgba(255,255,255,0.82), 0 1px 1px rgba(255,255,255,0.62)",
        WebkitTextStroke: "0.12px rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Html>
  );
}

function InfoCard({
  title,
  lines,
  position,
}: {
  title: string;
  lines: string[];
  position: [number, number, number];
}) {
  return (
    <Html
      transform
      center
      position={position}
      distanceFactor={10}
      style={{
        width: "220px",
        padding: "12px 14px",
        borderRadius: "14px",
        border: "1px solid rgba(162, 176, 193, 0.4)",
        background: "rgba(255, 255, 255, 0.86)",
        color: "#2f4358",
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: 1.35,
        textAlign: "left",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        pointerEvents: "none",
        boxShadow: "0 10px 24px rgba(98, 115, 131, 0.12)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "6px" }}>
        {title}
      </div>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </Html>
  );
}

const __PASCAL__Scene: ImplementationDefinition["Scene"] = ({
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
  const [earthDay, setEarthDay] = useState(1);
  const [earthHour, setEarthHour] = useState(0);
  const earthDayRef = useRef(1);
  const earthHourRef = useRef(0);
  const planetRefs = useRef<Array<Mesh | null>>([]);
  const sunRef = useRef<Mesh>(null);
  const sunHaloRef = useRef<Mesh>(null);
  const earthMarkerRef = useRef<Mesh>(null);
  const moonRef = useRef<Mesh>(null);
  const saturnRingRef = useRef<Mesh>(null);
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

    const stageCount = sceneConfig.metadata.stages.length;
    const progress = Math.min(1, Math.max(0, currentPhase / stageCount));
    const simulatedDays = progress * 365;
    const simulatedHours = simulatedDays * 24;
    const nextDay = Math.min(365, Math.floor(simulatedDays) + 1);
    const nextHour = Math.floor(simulatedHours % 24);

    if (earthDayRef.current !== nextDay) {
      earthDayRef.current = nextDay;
      setEarthDay(nextDay);
    }
    if (earthHourRef.current !== nextHour) {
      earthHourRef.current = nextHour;
      setEarthHour(nextHour);
    }

    const sun = sunRef.current;
    if (sun) {
      const pulse = 1 + Math.sin(elapsed * 1.3) * 0.04;
      sun.scale.setScalar(pulse);
    }

    const sunHalo = sunHaloRef.current;
    if (sunHalo) {
      sunHalo.rotation.z += delta * 0.1;
      const haloScale = 1 + smoothWindow(currentPhase, 0.5, 2.5) * 0.08;
      sunHalo.scale.setScalar(haloScale);
    }

    PLANETS.forEach((planet, index) => {
      const mesh = planetRefs.current[index];
      if (!mesh) {
        return;
      }

      const orbitAngle =
        planet.startAngle + (simulatedDays / planet.orbitalDays) * Math.PI * 2;
      const x = Math.cos(orbitAngle) * planet.orbitRadius;
      const z = Math.sin(orbitAngle) * planet.orbitRadius;
      mesh.position.set(x, 0.08, z);
      mesh.rotation.y += delta * (0.3 + 0.08 * index);

      if (planet.label === "Earth") {
        mesh.rotation.y = (simulatedHours / 24) * Math.PI * 2;
      }
    });

    const earth = planetRefs.current[2];
    const moon = moonRef.current;
    if (earth && moon) {
      const moonAngle = (simulatedDays / 27.3) * Math.PI * 2 + 0.9;
      moon.position.set(
        earth.position.x + Math.cos(moonAngle) * 0.52,
        0.08,
        earth.position.z + Math.sin(moonAngle) * 0.52,
      );
    }

    const earthMarker = earthMarkerRef.current;
    if (earthMarker) {
      earthMarker.rotation.x += delta * 2.8;
    }

    const saturnRing = saturnRingRef.current;
    if (saturnRing) {
      saturnRing.rotation.z += delta * 0.18;
    }
  });

  const orbitOpacity = phase.to(
    (value) => 0.16 + smoothWindow(value, 0.15, 1.2) * 0.2,
  );
  const outerOrbitOpacity = phase.to(
    (value) => 0.06 + smoothWindow(value, 0.9, 2.2) * 0.18,
  );
  const timerOpacity = phase.to(
    (value) => 0.18 + smoothWindow(value, 2.0, 3.2) * 0.76,
  );
  const moonOpacity = phase.to(
    (value) => 0.18 + smoothWindow(value, 3.5, 4.6) * 0.72,
  );
  const yearArcOpacity = phase.to(
    (value) => 0.1 + smoothWindow(value, 2.6, 4.1) * 0.3,
  );

  return (
    <group>
      <SceneLabel
        text={sceneConfig.metadata.stages[activeStage]?.sceneLabel ?? ""}
        position={[0, 5.25, 0]}
        size={17}
        color="#14304b"
      />

      <InfoCard
        title="Earth Rotation"
        lines={[
          `Hour ${earthHour.toString().padStart(2, "0")} of 24`,
          "One full spin = one Earth day",
        ]}
        position={[-8.1, 3.6, 0]}
      />
      <InfoCard
        title="Earth Orbit"
        lines={[`Day ${earthDay} of 365`, "One full trip = one Earth year"]}
        position={[8.1, 3.6, 0]}
      />
      <InfoCard
        title="Moon Orbit"
        lines={["About 27 days around Earth", "It loops many times during one year"]}
        position={[8.25, -3.15, 0]}
      />

      <Html
        transform
        center
        position={[0, -5.35, 0]}
        distanceFactor={10}
        style={{
          width: "500px",
          padding: "12px 16px",
          borderRadius: "14px",
          border: "1px solid rgba(162, 176, 193, 0.36)",
          background: "rgba(255, 255, 255, 0.88)",
          color: "#31455d",
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: 1.34,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          pointerEvents: "none",
          boxShadow: "0 10px 26px rgba(98, 115, 131, 0.12)",
          backdropFilter: "blur(6px)",
        }}
      >
        {STAGE_NOTES[activeStage] ?? STAGE_NOTES[0]}
      </Html>

      <mesh position={[0, -0.65, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[8.35, 64]} />
        <meshBasicMaterial color="#f4f7fa" transparent opacity={0.92} />
      </mesh>

      {PLANETS.map((planet, index) => (
        <a.mesh
          key={`orbit-${planet.label}`}
          position={[0, 0.02, 0]}
          rotation-x={Math.PI / 2}
        >
          <torusGeometry args={[planet.orbitRadius, 0.012, 8, 120]} />
          <a.meshBasicMaterial
            color={planet.orbitColor}
            transparent
            opacity={index >= 4 ? outerOrbitOpacity : orbitOpacity}
          />
        </a.mesh>
      ))}

      <a.mesh ref={sunHaloRef} position={[0, 0.08, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.95, 0.08, 16, 96]} />
        <a.meshBasicMaterial color="#ffd37b" transparent opacity={yearArcOpacity} />
      </a.mesh>

      <mesh ref={sunRef} position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.7, 42, 42]} />
        <meshStandardMaterial
          color="#f6bf4b"
          emissive="#ffce66"
          emissiveIntensity={0.55}
        />
        <SceneLabel text="Sun" position={[0, 1.0, 0]} size={13} color="#8c5a12" />
      </mesh>

      {PLANETS.map((planet, index) => (
        <mesh
          key={planet.label}
          ref={(mesh) => {
            planetRefs.current[index] = mesh;
          }}
          position={[planet.orbitRadius, 0.08, 0]}
        >
          <sphereGeometry args={[planet.size, 28, 28]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.color}
            emissiveIntensity={planet.label === "Earth" ? 0.18 : 0.08}
          />
          {planet.label === "Earth" ? (
            <mesh ref={earthMarkerRef} position={[planet.size * 1.15, 0.03, 0]}>
              <sphereGeometry args={[0.045, 14, 14]} />
              <meshStandardMaterial color="#f8fbff" emissive="#f8fbff" emissiveIntensity={0.2} />
            </mesh>
          ) : null}
          {planet.label === "Saturn" ? (
            <mesh ref={saturnRingRef} rotation-x={Math.PI / 2.6}>
              <torusGeometry args={[planet.size * 1.6, 0.025, 12, 48]} />
              <meshBasicMaterial color="#e0c994" transparent opacity={0.72} />
            </mesh>
          ) : null}
          <SceneLabel
            text={planet.label}
            position={[0, planet.size + 0.34, 0]}
            size={11}
            color={planet.label === "Earth" ? "#20578f" : "#51657c"}
          />
        </mesh>
      ))}

      <a.mesh ref={moonRef} position={[3.05, 0.08, 0.2]}>
        <sphereGeometry args={[0.075, 18, 18]} />
        <a.meshStandardMaterial
          color="#d8dde5"
          emissive="#d8dde5"
          emissiveIntensity={0.08}
          transparent
          opacity={moonOpacity}
        />
        <SceneLabel text="Moon" position={[0, 0.22, 0]} size={10} color="#68788b" />
      </a.mesh>

      <a.mesh position={[0, 0.01, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[2.55, 0.028, 12, 96]} />
        <a.meshBasicMaterial color="#6caee3" transparent opacity={timerOpacity} />
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
