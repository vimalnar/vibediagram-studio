/* eslint-disable react-refresh/only-export-components */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { ISheet, types } from "@theatre/core";
import { editable as e } from "@theatre/r3f";
import { InlineMath } from "react-katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColorRepresentation, Vector3 } from "three";
import { ImplementationDefinition } from "../template/implementation";

type TransformerToken = {
  label: string;
  color: ColorRepresentation;
};

type TransformerTimelineWindows = {
  embedding: [number, number];
  qkv: [number, number];
  attention: [number, number];
  post: [number, number];
  outputPulse: [number, number];
  embToProjFlow: [number, number];
  qkvToAttentionFlow: [number, number];
  attentionToPostFlow: [number, number];
  postInternalFlow: [number, number];
  postToOutputFlow: [number, number];
};

type TransformerSceneLayout = {
  tokenYBase: number;
  tokenYGap: number;
  embeddingX: number;
  embeddingTitle: [number, number, number];
  qX: number;
  kX: number;
  vX: number;
  projectionTitle: [number, number, number];
  attentionTitle: [number, number, number];
  attentionNodeX: number;
  attentionNodeYBase: number;
  attentionNodeYGap: number;
  attentionNodeZStart: number;
  attentionNodeZGap: number;
  attentionAggX: number;
  attentionAggLabelX: number;
  postBaseY: number;
  postRowGap: number;
  postAddX: number;
  postMlpX: number;
  postOutX: number;
  postCaption: [number, number, number];
  equationLabel: [number, number, number];
  stageLabel: [number, number, number];
};

type TransformerFlowColors = {
  q: string;
  k: string;
  v: string;
  attention: string;
  residual: string;
  output: string;
};

type TransformerSceneTextLabels = {
  embeddingsTitle?: string;
  projectionsTitle?: string;
  attentionTitle?: string;
  equation?: string;
  equationLatex?: string;
  postCaption?: string;
  addBlock?: string;
  mlpBlock?: string;
};

type TransformerImplementationConfig = {
  metadata: {
    title: string;
    description: string;
    intro?: string[];
    tip: string;
    stages: Array<{
      panelLabel: string;
      sceneLabel: string;
    }>;
  };
  tokens: TransformerToken[];
  weights: number[][];
  camera: {
    azimuth: number;
    elevation: number;
    distance: number;
    target: [number, number, number];
  };
  timelineDurationMs: number;
  timeline: TransformerTimelineWindows;
  layout: TransformerSceneLayout;
  flowColors: TransformerFlowColors;
  labels?: TransformerSceneTextLabels;
};

type TransformerExperienceProps = {
  sheet: ISheet;
  config: TransformerImplementationConfig;
  forcedPhase?: number | null;
  isPlaying?: boolean;
  manualCamera?: boolean;
  zoomLevel?: number;
  loop?: boolean;
  resetToken?: number;
  onPlaybackComplete?: () => void;
  onStageChange?: (stage: number) => void;
};

const DEFAULT_SCENE_LABELS: Required<TransformerSceneTextLabels> = {
  embeddingsTitle: "Input embeddings",
  projectionsTitle: "Learned linear projections",
  attentionTitle: "Scaled dot-product attention",
  equation: "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V",
  equationLatex:
    "\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
  postCaption: "Residual + MLP refine each token",
  addBlock: "Add",
  mlpBlock: "MLP",
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

const lerp = (aValue: number, bValue: number, t: number): number => {
  return aValue + (bValue - aValue) * t;
};

type PhaseSpring = ReturnType<typeof useSpring>[0]["phase"];

const stagePulse = (phase: number, start: number, end: number): number => {
  if (phase <= start || phase >= end) {
    return 0;
  }
  const enter = smoothWindow(phase, start, start + 0.18);
  const exit = 1 - smoothWindow(phase, end - 0.2, end);
  return enter * exit;
};

function SceneLabel({
  position,
  text,
  color = "#1f2937",
  size = 14,
  align = "center",
}: {
  position: [number, number, number];
  text: string;
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
        whiteSpace: "nowrap",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        fontWeight: 700,
        textAlign: align,
        pointerEvents: "none",
        textShadow:
          "0 0 1px rgba(255,255,255,0.72), 0 1px 1px rgba(255,255,255,0.45)",
        WebkitTextStroke: "0.15px rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Html>
  );
}

function MathLabel({
  position,
  latex,
  color = "#334155",
  size = 12,
  align = "left",
}: {
  position: [number, number, number];
  latex: string;
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
        whiteSpace: "nowrap",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        fontWeight: 700,
        textAlign: align,
        pointerEvents: "none",
        textShadow:
          "0 0 1px rgba(255,255,255,0.72), 0 1px 1px rgba(255,255,255,0.45)",
        WebkitTextStroke: "0.15px rgba(255,255,255,0.5)",
      }}
    >
      <span className="math-label">
        <InlineMath
          math={latex}
          renderError={(error: Error) => <>{error.message}</>}
        />
      </span>
    </Html>
  );
}

function FlowTrail({
  start,
  end,
  color,
  phase,
  startPhase,
  endPhase,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  phase: PhaseSpring;
  startPhase: number;
  endPhase: number;
}) {
  const lineOpacity = phase.to(
    (p: number) => stagePulse(p, startPhase, endPhase) * 0.95,
  );
  const dotOpacity = phase.to((p: number) =>
    stagePulse(p, startPhase, endPhase),
  );
  const dotPosition = phase.to((p: number) => {
    if (p <= startPhase) {
      return start;
    }
    if (p >= endPhase) {
      return end;
    }
    const windowProgress = (p - startPhase) / (endPhase - startPhase);
    const t = (windowProgress * 3.2) % 1;
    return [
      lerp(start[0], end[0], t),
      lerp(start[1], end[1], t),
      lerp(start[2], end[2], t),
    ] as [number, number, number];
  });

  return (
    <>
      <a.line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([...start, ...end]), 3]}
          />
        </bufferGeometry>
        <a.lineBasicMaterial
          color={color}
          transparent
          opacity={lineOpacity}
          linewidth={1}
        />
      </a.line>
      <a.mesh position={dotPosition}>
        <sphereGeometry args={[0.08, 14, 14]} />
        <a.meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={dotOpacity}
        />
      </a.mesh>
    </>
  );
}

function TokenColumn({
  tokens,
  layout,
  baseX,
  labelPrefix,
  color,
  opacity,
}: {
  tokens: TransformerToken[];
  layout: TransformerSceneLayout;
  baseX: number;
  labelPrefix: string;
  color: ColorRepresentation;
  opacity: PhaseSpring;
}) {
  return (
    <>
      {tokens.map((token, index) => (
        <a.group key={`${labelPrefix}-${token.label}`} position-x={baseX}>
          <a.mesh
            position={[0, layout.tokenYBase - index * layout.tokenYGap, 0]}
          >
            <boxGeometry args={[0.9, 0.5, 0.5]} />
            <a.meshStandardMaterial
              color={color}
              transparent
              opacity={opacity}
              roughness={0.35}
              metalness={0.1}
            />
          </a.mesh>
          <SceneLabel
            position={[0, layout.tokenYBase - index * layout.tokenYGap, 0.35]}
            text={`${labelPrefix}${index + 1}`}
            size={12}
            color="#111827"
          />
        </a.group>
      ))}
    </>
  );
}

function Embeddings({
  tokens,
  opacity,
  layout,
  labels,
}: {
  tokens: TransformerToken[];
  opacity: PhaseSpring;
  layout: TransformerSceneLayout;
  labels: Required<TransformerSceneTextLabels>;
}) {
  return (
    <>
      {tokens.map((token, index) => (
        <a.group key={token.label} position-x={layout.embeddingX}>
          <a.mesh
            position={[0, layout.tokenYBase - index * layout.tokenYGap, 0]}
          >
            <boxGeometry args={[0.65, 0.65, 0.65]} />
            <a.meshStandardMaterial
              color={token.color}
              transparent
              opacity={opacity}
              roughness={0.3}
              metalness={0.12}
            />
          </a.mesh>
          <SceneLabel
            position={[-0.95, layout.tokenYBase - index * layout.tokenYGap, 0]}
            text={token.label}
            size={14}
            align="right"
          />
        </a.group>
      ))}
      <SceneLabel
        position={layout.embeddingTitle}
        text={labels.embeddingsTitle}
        size={15}
        color="#2f6fb3"
      />
    </>
  );
}

function AttentionField({
  tokens,
  weights,
  opacity,
  layout,
  labels,
}: {
  tokens: TransformerToken[];
  weights: number[][];
  opacity: PhaseSpring;
  layout: TransformerSceneLayout;
  labels: Required<TransformerSceneTextLabels>;
}) {
  return (
    <>
      {weights.flatMap((row, rowIndex) =>
        row.map((weight, colIndex) => (
          <a.mesh
            key={`w-${rowIndex}-${colIndex}`}
            position={[
              layout.attentionNodeX,
              layout.attentionNodeYBase - rowIndex * layout.attentionNodeYGap,
              layout.attentionNodeZStart - colIndex * layout.attentionNodeZGap,
            ]}
          >
            <sphereGeometry args={[0.12 + weight * 0.18, 16, 16]} />
            <a.meshStandardMaterial
              color="#f7d05d"
              transparent
              opacity={opacity}
              roughness={0.35}
              metalness={0.05}
            />
          </a.mesh>
        )),
      )}

      {tokens.map((token, index) => (
        <a.group key={`agg-${token.label}`}>
          <a.mesh
            position={[
              layout.attentionAggX,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              0,
            ]}
          >
            <boxGeometry args={[0.58, 0.58, 0.58]} />
            <a.meshStandardMaterial
              color={token.color}
              transparent
              opacity={opacity}
              roughness={0.32}
              metalness={0.08}
            />
          </a.mesh>
          <SceneLabel
            position={[
              layout.attentionAggLabelX,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              0,
            ]}
            text={`a${index + 1} * V`}
            size={12}
            align="left"
          />
        </a.group>
      ))}

      <SceneLabel
        position={layout.attentionTitle}
        text={labels.attentionTitle}
        size={14}
        color="#9b7a00"
        align="left"
      />
    </>
  );
}

function PostAttention({
  tokens,
  opacity,
  outputPulse,
  layout,
  labels,
}: {
  tokens: TransformerToken[];
  opacity: PhaseSpring;
  outputPulse: PhaseSpring;
  layout: TransformerSceneLayout;
  labels: Required<TransformerSceneTextLabels>;
}) {
  return (
    <>
      {tokens.map((token, index) => (
        <a.group key={`post-${token.label}`}>
          <a.mesh
            position={[
              layout.postAddX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
          >
            <boxGeometry args={[0.86, 0.46, 0.42]} />
            <a.meshStandardMaterial
              color="#953f58"
              transparent
              opacity={opacity}
            />
          </a.mesh>
          <SceneLabel
            position={[
              layout.postAddX,
              layout.postBaseY - index * layout.postRowGap,
              0.27,
            ]}
            text={labels.addBlock}
            size={11}
            color="#111827"
          />

          <a.mesh
            position={[
              layout.postMlpX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
          >
            <boxGeometry args={[1.05, 0.46, 0.42]} />
            <a.meshStandardMaterial
              color="#23a48f"
              transparent
              opacity={opacity}
            />
          </a.mesh>
          <SceneLabel
            position={[
              layout.postMlpX,
              layout.postBaseY - index * layout.postRowGap,
              0.27,
            ]}
            text={labels.mlpBlock}
            size={11}
            color="#111827"
          />

          <a.mesh
            position={[
              layout.postOutX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            scale={outputPulse.to((pulse: number) => 1 + pulse * 0.14)}
          >
            <boxGeometry args={[0.62, 0.62, 0.62]} />
            <a.meshStandardMaterial
              color={token.color}
              transparent
              opacity={opacity.to((v: number) => Math.min(1, v + 0.15))}
            />
          </a.mesh>
          <SceneLabel
            position={[
              layout.postOutX,
              layout.postBaseY - index * layout.postRowGap,
              0.38,
            ]}
            text={`h${index + 1}`}
            size={11}
            color="#111827"
          />
        </a.group>
      ))}

      <SceneLabel
        position={layout.postCaption}
        text={labels.postCaption}
        size={12}
        color="#8b4f64"
        align="left"
      />
    </>
  );
}

function AxisGrid() {
  return null;
}

function TransformerExperience({
  sheet,
  config,
  forcedPhase = null,
  isPlaying = true,
  manualCamera = false,
  zoomLevel = 1,
  loop = true,
  resetToken = 0,
  onPlaybackComplete,
  onStageChange,
}: TransformerExperienceProps) {
  const layout = config.layout;
  const windows = config.timeline;
  const flowColors = config.flowColors;
  const tokens = config.tokens;
  const weights = config.weights;
  const labels: Required<TransformerSceneTextLabels> = {
    ...DEFAULT_SCENE_LABELS,
    ...config.labels,
  };

  const cameraObject = useMemo(
    () =>
      sheet.object("CameraRig", {
        azimuth: types.number(config.camera.azimuth, { range: [-3.14, 3.14] }),
        elevation: types.number(config.camera.elevation, {
          range: [0.02, 1.5],
        }),
        distance: types.number(config.camera.distance, { range: [6, 26] }),
      }),
    [
      sheet,
      config.camera.azimuth,
      config.camera.elevation,
      config.camera.distance,
    ],
  );

  const [{ phase }, phaseApi] = useSpring(() => ({ phase: 0 }));

  useEffect(() => {
    if (typeof forcedPhase === "number" && Number.isFinite(forcedPhase)) {
      phaseApi.stop();
      phase.pause();
      phase.set(
        Math.min(config.metadata.stages.length, Math.max(0, forcedPhase)),
      );
      return;
    }

    phaseApi.stop();
    phaseApi.start({
      from: { phase: 0 },
      to: { phase: config.metadata.stages.length },
      config: { duration: config.timelineDurationMs },
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
  }, [
    phaseApi,
    phase,
    forcedPhase,
    loop,
    resetToken,
    onPlaybackComplete,
    config.metadata.stages.length,
    config.timelineDurationMs,
  ]);

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

  const [activeStage, setActiveStage] = useState(0);
  const activeStageRef = useRef(0);
  const maxStageIndex = Math.max(0, config.metadata.stages.length - 1);

  useFrame((state) => {
    const p = phase.get();
    if (!manualCamera) {
      const values = cameraObject.value;
      const baseAzimuth =
        typeof values.azimuth === "number" && Number.isFinite(values.azimuth)
          ? values.azimuth
          : config.camera.azimuth;
      const baseElevation =
        typeof values.elevation === "number" && Number.isFinite(values.elevation)
          ? values.elevation
          : config.camera.elevation;
      const baseDistance =
        typeof values.distance === "number" && Number.isFinite(values.distance)
          ? values.distance
          : config.camera.distance;

      const azimuth = baseAzimuth;
      const elevation = baseElevation;
      const safeZoom =
        typeof zoomLevel === "number" && Number.isFinite(zoomLevel)
          ? Math.max(0.5, zoomLevel)
          : 1;
      const distance = baseDistance / safeZoom;

      const target = new Vector3(...config.camera.target);
      state.camera.position.set(
        Math.cos(azimuth) * Math.cos(elevation) * distance,
        Math.sin(elevation) * distance,
        Math.sin(azimuth) * Math.cos(elevation) * distance,
      );
      state.camera.lookAt(target);
    }

    const stage = Math.min(maxStageIndex, Math.max(0, Math.floor(p)));
    if (stage !== activeStageRef.current) {
      activeStageRef.current = stage;
      setActiveStage(stage);
      onStageChange?.(stage);
    }
  });

  const embeddingOpacity = phase.to((p) =>
    smoothWindow(p, ...windows.embedding),
  );
  const qkvOpacity = phase.to((p) => smoothWindow(p, ...windows.qkv));
  const attentionOpacity = phase.to((p) =>
    smoothWindow(p, ...windows.attention),
  );
  const postOpacity = phase.to((p) => smoothWindow(p, ...windows.post));
  const outputPulse = phase.to((p) => {
    const [start, end] = windows.outputPulse;
    if (p < start || p > end) {
      return 0;
    }
    return 0.5 + 0.5 * Math.sin((p - start) * Math.PI * 8);
  });

  return (
    <e.group theatreKey="TransformerRoot">
      <AxisGrid />

      <Embeddings
        tokens={tokens}
        opacity={embeddingOpacity}
        layout={layout}
        labels={labels}
      />

      <a.group>
        <TokenColumn
          tokens={tokens}
          layout={layout}
          baseX={layout.qX}
          labelPrefix="Q"
          color={flowColors.q}
          opacity={qkvOpacity}
        />
        <TokenColumn
          tokens={tokens}
          layout={layout}
          baseX={layout.kX}
          labelPrefix="K"
          color={flowColors.k}
          opacity={qkvOpacity}
        />
        <TokenColumn
          tokens={tokens}
          layout={layout}
          baseX={layout.vX}
          labelPrefix="V"
          color={flowColors.v}
          opacity={qkvOpacity}
        />
      </a.group>
      <SceneLabel
        position={layout.projectionTitle}
        text={labels.projectionsTitle}
        size={14}
        color={flowColors.q}
        align="right"
      />

      <AttentionField
        tokens={tokens}
        weights={weights}
        opacity={attentionOpacity}
        layout={layout}
        labels={labels}
      />
      <PostAttention
        tokens={tokens}
        opacity={postOpacity}
        outputPulse={outputPulse}
        layout={layout}
        labels={labels}
      />

      {labels.equationLatex ? (
        <MathLabel
          position={layout.equationLabel}
          latex={labels.equationLatex}
          size={12}
          color="#334155"
          align="left"
        />
      ) : (
        <SceneLabel
          position={layout.equationLabel}
          text={labels.equation}
          size={12}
          color="#334155"
          align="left"
        />
      )}
      <SceneLabel
        position={layout.stageLabel}
        text={config.metadata.stages[activeStage]?.sceneLabel ?? ""}
        size={17}
        color="#0f172a"
      />

      {tokens.map((_token, index) => {
        const y = layout.tokenYBase - index * layout.tokenYGap;
        return (
          <group key={`emb-proj-${index}`}>
            <FlowTrail
              start={[layout.embeddingX + 0.4, y, 0]}
              end={[layout.qX, y, 0]}
              color={flowColors.q}
              phase={phase}
              startPhase={windows.embToProjFlow[0]}
              endPhase={windows.embToProjFlow[1]}
            />
            <FlowTrail
              start={[layout.embeddingX + 0.4, y, 0]}
              end={[layout.kX, y, 0]}
              color={flowColors.k}
              phase={phase}
              startPhase={windows.embToProjFlow[0]}
              endPhase={windows.embToProjFlow[1]}
            />
            <FlowTrail
              start={[layout.embeddingX + 0.4, y, 0]}
              end={[layout.vX, y, 0]}
              color={flowColors.v}
              phase={phase}
              startPhase={windows.embToProjFlow[0]}
              endPhase={windows.embToProjFlow[1]}
            />
          </group>
        );
      })}

      {tokens.map((_token, index) => (
        <group key={`attn-flow-${index}`}>
          <FlowTrail
            start={[layout.qX, layout.tokenYBase - index * layout.tokenYGap, 0]}
            end={[
              layout.attentionNodeX - 0.2,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              0.2,
            ]}
            color={flowColors.q}
            phase={phase}
            startPhase={windows.qkvToAttentionFlow[0]}
            endPhase={windows.qkvToAttentionFlow[1]}
          />
          <FlowTrail
            start={[layout.kX, layout.tokenYBase - index * layout.tokenYGap, 0]}
            end={[
              layout.attentionNodeX - 0.2,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              -0.2,
            ]}
            color={flowColors.k}
            phase={phase}
            startPhase={windows.qkvToAttentionFlow[0]}
            endPhase={windows.qkvToAttentionFlow[1]}
          />
          <FlowTrail
            start={[layout.vX, layout.tokenYBase - index * layout.tokenYGap, 0]}
            end={[
              layout.attentionAggX,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              0,
            ]}
            color={flowColors.v}
            phase={phase}
            startPhase={windows.qkvToAttentionFlow[0]}
            endPhase={windows.qkvToAttentionFlow[1]}
          />
        </group>
      ))}

      {tokens.map((_token, index) => (
        <group key={`post-flow-${index}`}>
          <FlowTrail
            start={[
              layout.attentionAggX,
              layout.attentionNodeYBase - index * layout.attentionNodeYGap,
              0,
            ]}
            end={[
              layout.postAddX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            color={flowColors.attention}
            phase={phase}
            startPhase={windows.attentionToPostFlow[0]}
            endPhase={windows.attentionToPostFlow[1]}
          />
          <FlowTrail
            start={[
              layout.postAddX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            end={[
              layout.postMlpX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            color={flowColors.residual}
            phase={phase}
            startPhase={windows.postInternalFlow[0]}
            endPhase={windows.postInternalFlow[1]}
          />
          <FlowTrail
            start={[
              layout.postMlpX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            end={[
              layout.postOutX,
              layout.postBaseY - index * layout.postRowGap,
              0,
            ]}
            color={flowColors.output}
            phase={phase}
            startPhase={windows.postToOutputFlow[0]}
            endPhase={windows.postToOutputFlow[1]}
          />
        </group>
      ))}
    </e.group>
  );
}

const transformerConfig: TransformerImplementationConfig = {
  metadata: {
    title: "Transformer in 3D",
    description: "Interactive walkthrough of a single transformer block.",
    intro: [
      "This diagram shows how each token vector is transformed from a plain embedding into a context-aware representation using self-attention and feed-forward refinement.",
      "It visualizes the core data flow: build Q/K/V, compute attention weights from Q·K, mix values (V) by those weights, then apply residual add plus MLP to produce the final token states.",
    ],
    tip: "Use Play/Pause to inspect each stage, or Record to export a clean one-pass clip.",
    stages: [
      {
        panelLabel: "Input embeddings",
        sceneLabel: "Step 1: Tokens -> embeddings",
      },
      {
        panelLabel: "Q, K, V projections",
        sceneLabel: "Step 2: Linear projections -> Q, K, V",
      },
      {
        panelLabel: "Scaled dot-product attention",
        sceneLabel: "Step 3: Attention scores mix token context",
      },
      {
        panelLabel: "Residual add + feed-forward",
        sceneLabel: "Step 4: Residual + MLP refinement",
      },
      {
        panelLabel: "Context-aware output states",
        sceneLabel: "Step 5: Final contextual token states",
      },
    ],
  },
  tokens: [
    { label: "The", color: "#5aa9ff" },
    { label: "cat", color: "#2fd4a8" },
    { label: "sat", color: "#ff9951" },
    { label: "there", color: "#b48cf5" },
  ],
  weights: [
    [0.55, 0.25, 0.12, 0.08],
    [0.18, 0.48, 0.24, 0.1],
    [0.12, 0.21, 0.5, 0.17],
    [0.16, 0.19, 0.22, 0.43],
  ],
  camera: {
    azimuth: 1.57,
    elevation: 0.1,
    distance: 12.6,
    target: [0.4, -0.1, 0],
  },
  timelineDurationMs: 24000,
  timeline: {
    embedding: [0, 0.7],
    qkv: [0.8, 1.7],
    attention: [1.8, 2.9],
    post: [3.0, 4.2],
    outputPulse: [4, 5],
    embToProjFlow: [1, 2],
    qkvToAttentionFlow: [2, 3],
    attentionToPostFlow: [3, 4],
    postInternalFlow: [3, 4],
    postToOutputFlow: [4, 5],
  },
  layout: {
    tokenYBase: 1.6,
    tokenYGap: 1.05,
    embeddingX: -5.1,
    embeddingTitle: [-5.1, 2.85, 0],
    qX: -1.8,
    kX: 0,
    vX: 1.8,
    projectionTitle: [-0.25, 2.85, 0],
    attentionTitle: [5.95, 2.85, 0],
    attentionNodeX: 4.2,
    attentionNodeYBase: 1.55,
    attentionNodeYGap: 0.85,
    attentionNodeZStart: 0.9,
    attentionNodeZGap: 0.6,
    attentionAggX: 5.9,
    attentionAggLabelX: 6.65,
    postBaseY: -2.35,
    postRowGap: 0.52,
    postAddX: 0.2,
    postMlpX: 2.1,
    postOutX: 4.2,
    postCaption: [2.75, -4.75, 0],
    equationLabel: [-4.9, -3.6, 0],
    stageLabel: [0, 3.45, 0],
  },
  flowColors: {
    q: "#1f9c63",
    k: "#a67c00",
    v: "#b74242",
    attention: "#9b7a00",
    residual: "#8b4f64",
    output: "#2f6fb3",
  },
  labels: {
    embeddingsTitle: "Input embeddings",
    projectionsTitle: "Learned linear projections",
    attentionTitle: "Scaled dot-product attention",
    equation: "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V",
    equationLatex:
      "\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
    postCaption: "Residual + MLP refine each token",
    addBlock: "Add",
    mlpBlock: "MLP",
  },
};

const TransformerScene: ImplementationDefinition["Scene"] = ({
  sheet,
  forcedPhase,
  isPlaying,
  manualCamera,
  zoomLevel,
  loop,
  resetToken,
  onPlaybackComplete,
  onStageChange,
}) => {
  return (
    <TransformerExperience
      sheet={sheet}
      config={transformerConfig}
      forcedPhase={forcedPhase}
      isPlaying={isPlaying}
      manualCamera={manualCamera}
      zoomLevel={zoomLevel}
      loop={loop}
      resetToken={resetToken}
      onPlaybackComplete={onPlaybackComplete}
      onStageChange={onStageChange}
    />
  );
};

export const transformerImplementation: ImplementationDefinition = {
  metadata: {
    id: "transformer",
    title: transformerConfig.metadata.title,
    description: transformerConfig.metadata.description,
    intro: transformerConfig.metadata.intro,
    tip: transformerConfig.metadata.tip,
    stages: transformerConfig.metadata.stages,
  },
  theatre: {
    projectId: "TransformerExplainer",
    sheetId: "Main",
  },
  defaultCamera: transformerConfig.camera,
  Scene: TransformerScene,
};
