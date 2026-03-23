import { Canvas } from "@react-three/fiber";
import {
  AdaptiveDpr,
  AdaptiveEvents,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { ISheet, getProject } from "@theatre/core";
import { SheetProvider } from "@theatre/r3f";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Camera, Spherical, Vector3 } from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { listImplementations, resolveImplementation } from "./implementations";
import { parseRuntimeParams } from "./runtime/params";
import { initializeTheatreStudio } from "./theatreStudio";

const RECORD_FPS = 60;
const RECORD_WIDTH = 1920;
const RECORD_HEIGHT = 1080;
const RECORD_VIDEO_BITRATE = 12_000_000;
const CAMERA_MIN_POLAR = 0.06;
const CAMERA_MAX_POLAR = Math.PI - 0.06;
const PITCH_STEP = 0.08;
const ZOOM_DOLLY_FACTOR = 1.15;

type BrowserTabCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
};

const pickMp4RecordingMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidates = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4",
  ];
  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
};

const downloadRecording = (blob: Blob, implementationId: string): void => {
  const extension = blob.type.includes("mp4") ? "mp4" : "webm";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${implementationId}-${Date.now()}.${extension}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

function App() {
  const runtimeParams = useMemo(
    () => parseRuntimeParams(window.location.search),
    [],
  );
  const initialImplementationId = useMemo(
    () =>
      resolveImplementation(
        runtimeParams.implementationOverride ??
          import.meta.env.VITE_IMPLEMENTATION ??
          import.meta.env.VITE_PROJECT ??
          "transformer",
      ).metadata.id,
    [runtimeParams.implementationOverride],
  );
  const implementationOptions = useMemo(() => listImplementations(), []);
  const [selectedImplementationId, setSelectedImplementationId] = useState(
    initialImplementationId,
  );
  const implementation = useMemo(
    () => resolveImplementation(selectedImplementationId),
    [selectedImplementationId],
  );
  const [activeStage, setActiveStage] = useState(0);
  const [forcedPhase, setForcedPhase] = useState<number | null>(
    runtimeParams.forcedPhase,
  );
  const [isPlaying, setIsPlaying] = useState(
    runtimeParams.forcedPhase === null,
  );
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [isLowPerf, setIsLowPerf] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isPitchLocked, setIsPitchLocked] = useState(false);
  const [lockedPolarAngle, setLockedPolarAngle] = useState<number | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
  const isRecordingRef = useRef(false);
  const recordingRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: BlobPart[];
    mimeType: string;
  } | null>(null);

  const sheet: ISheet = useMemo(() => {
    const projectConfig = implementation.theatre.state
      ? { state: implementation.theatre.state }
      : undefined;
    const project = getProject(implementation.theatre.projectId, projectConfig);
    return project.sheet(implementation.theatre.sheetId);
  }, [
    implementation.theatre.projectId,
    implementation.theatre.sheetId,
    implementation.theatre.state,
  ]);

  useEffect(() => {
    void initializeTheatreStudio();
  }, []);

  useEffect(() => {
    window.__EXPLAINER_SET_PHASE = (nextPhase: number | null) => {
      if (nextPhase === null) {
        setForcedPhase(null);
        return;
      }
      setIsPlaying(false);
      setForcedPhase(nextPhase);
    };

    return () => {
      delete window.__EXPLAINER_SET_PHASE;
    };
  }, []);

  useEffect(() => {
    window.__EXPLAINER_STAGE_COUNT = implementation.metadata.stages.length;

    return () => {
      delete window.__EXPLAINER_STAGE_COUNT;
    };
  }, [implementation.metadata.stages.length]);

  useEffect(() => {
    document.title = implementation.metadata.title;
  }, [implementation.metadata.title]);

  useEffect(() => {
    return () => {
      const currentRecording = recordingRef.current;
      if (!currentRecording) {
        return;
      }
      currentRecording.stream.getTracks().forEach((track) => track.stop());
      recordingRef.current = null;
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const applyViewPreset = useCallback(
    (preset: {
      azimuth: number;
      elevation: number;
      distance: number;
      target: [number, number, number];
    }) => {
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;
      if (!camera || !controls) {
        return;
      }

      const target = new Vector3(...preset.target);
      const distance = preset.distance;
      camera.position.set(
        Math.cos(preset.azimuth) * Math.cos(preset.elevation) * distance,
        Math.sin(preset.elevation) * distance,
        Math.sin(preset.azimuth) * Math.cos(preset.elevation) * distance,
      );
      controls.target.copy(target);
      camera.lookAt(target);
      controls.update();
    },
    [],
  );

  const togglePlayback = useCallback(() => {
    setRecordingError(null);
    setForcedPhase(null);
    setLoopPlayback(true);
    setIsPlaying((current) => !current);
  }, []);

  const stopRecordingSession = useCallback(() => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) {
      return;
    }
    if (currentRecording.recorder.state !== "inactive") {
      currentRecording.recorder.stop();
      return;
    }
    currentRecording.stream.getTracks().forEach((track) => track.stop());
    recordingRef.current = null;
    setIsPreparingRecording(false);
    setIsRecording(false);
    setRecordingMode(false);
    setLoopPlayback(true);
    setIsPlaying(false);
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    if (!isRecordingRef.current) {
      return;
    }
    stopRecordingSession();
  }, [stopRecordingSession]);

  const startRecording = useCallback(async () => {
    if (isPreparingRecording || isRecording) {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setRecordingError("This browser does not support MediaRecorder.");
      return;
    }
    const mp4MimeType = pickMp4RecordingMimeType();
    if (!mp4MimeType) {
      setRecordingError("MP4 recording is not supported in this browser.");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setRecordingError(
        "Browser tab capture is not available in this browser.",
      );
      return;
    }

    setRecordingError(null);
    setIsPreparingRecording(true);
    setRecordingMode(true);
    setLoopPlayback(false);
    setForcedPhase(null);
    setIsPlaying(false);
    setResetToken((current) => current + 1);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    try {
      const displayMediaOptions: BrowserTabCaptureOptions = {
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
        video: {
          frameRate: RECORD_FPS,
          width: { ideal: RECORD_WIDTH },
          height: { ideal: RECORD_HEIGHT },
        },
        audio: false,
      };
      const stream =
        await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      const recorder = new MediaRecorder(stream, {
        mimeType: mp4MimeType,
        videoBitsPerSecond: RECORD_VIDEO_BITRATE,
      });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError("Recording failed.");
      };

      recorder.onstop = () => {
        const currentRecording = recordingRef.current;
        if (!currentRecording) {
          return;
        }

        const blob = new Blob(currentRecording.chunks, {
          type: currentRecording.mimeType || "video/mp4",
        });
        downloadRecording(blob, implementation.metadata.id);
        currentRecording.stream.getTracks().forEach((track) => track.stop());
        recordingRef.current = null;

        setIsPreparingRecording(false);
        setIsRecording(false);
        setRecordingMode(false);
        setLoopPlayback(true);
        setResetToken((current) => current + 1);
        setIsPlaying(false);
      };

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          stopRecordingSession();
        });
      }

      recordingRef.current = {
        recorder,
        stream,
        chunks,
        mimeType: mp4MimeType || recorder.mimeType || "video/mp4",
      };

      setIsRecording(true);
      setIsPreparingRecording(false);
      recorder.start(100);
      setIsPlaying(true);
    } catch (error) {
      setIsPreparingRecording(false);
      setIsRecording(false);
      setRecordingMode(false);
      setLoopPlayback(true);
      setIsPlaying(false);
      if (error instanceof Error) {
        setRecordingError(error.message);
      } else {
        setRecordingError("Recording could not be started.");
      }
    }
  }, [
    implementation.metadata.id,
    isPreparingRecording,
    isRecording,
    stopRecordingSession,
  ]);

  const resetView = useCallback(() => {
    setIsPitchLocked(false);
    setLockedPolarAngle(null);
    applyViewPreset(implementation.defaultCamera);
  }, [applyViewPreset, implementation.defaultCamera]);

  const zoomIn = useCallback(() => {
    const controls = orbitControlsRef.current;
    if (!controls) {
      return;
    }
    controls.dollyIn(ZOOM_DOLLY_FACTOR);
    controls.update();
  }, []);

  const zoomOut = useCallback(() => {
    const controls = orbitControlsRef.current;
    if (!controls) {
      return;
    }
    controls.dollyOut(ZOOM_DOLLY_FACTOR);
    controls.update();
  }, []);

  const togglePitchLock = useCallback(() => {
    const controls = orbitControlsRef.current;
    if (!controls) {
      return;
    }
    if (isPitchLocked) {
      setIsPitchLocked(false);
      setLockedPolarAngle(null);
      return;
    }
    const currentPolar = controls.getPolarAngle();
    setLockedPolarAngle(currentPolar);
    setIsPitchLocked(true);
  }, [isPitchLocked]);

  const adjustPitch = useCallback((direction: -1 | 1) => {
    const controls = orbitControlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) {
      return;
    }

    const currentPolar = lockedPolarAngle ?? controls.getPolarAngle();
    const nextPolar = Math.min(
      CAMERA_MAX_POLAR,
      Math.max(CAMERA_MIN_POLAR, currentPolar + direction * PITCH_STEP),
    );
    const target = controls.target.clone();
    const offset = camera.position.clone().sub(target);
    const spherical = new Spherical().setFromVector3(offset);
    spherical.phi = nextPolar;
    offset.setFromSpherical(spherical);
    camera.position.copy(target.add(offset));
    camera.lookAt(controls.target);
    controls.update();
    setIsPitchLocked(true);
    setLockedPolarAngle(nextPolar);
  }, [lockedPolarAngle]);

  const switchImplementation = useCallback(
    (nextImplementationId: string) => {
      setSelectedImplementationId(nextImplementationId);
      setRecordingError(null);
      setForcedPhase(null);
      setLoopPlayback(true);
      setIsPlaying(true);
      setResetToken((current) => current + 1);
      setActiveStage(0);
      setIsPitchLocked(false);
      setLockedPolarAngle(null);

      const params = new URLSearchParams(window.location.search);
      params.set("implementation", nextImplementationId);
      params.delete("project");
      const query = params.toString();
      const nextUrl = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
      window.history.replaceState(null, "", nextUrl);
    },
    [],
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      applyViewPreset(implementation.defaultCamera);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [applyViewPreset, implementation.defaultCamera]);

  const showPanel = !runtimeParams.hidePanel && !recordingMode;
  const showToolbar =
    !runtimeParams.captureMode &&
    !isRecording &&
    !isPreparingRecording &&
    !recordingMode;
  const canvasBackgroundColor =
    implementation.metadata.id === "blackhole-gravity" ? "#000000" : "#ffffff";
  const introParagraphs =
    implementation.metadata.intro &&
    implementation.metadata.intro.length > 0
      ? implementation.metadata.intro
      : [implementation.metadata.description];
  const ActiveScene = implementation.Scene;

  return (
    <div className={`app${showPanel ? "" : " app--panel-hidden"}`}>
      <div className="canvas-wrap">
        <Canvas
          dpr={isLowPerf ? 1 : [1, 2]}
          performance={{ min: 0.5 }}
          onCreated={({ gl, camera }) => {
            void gl;
            cameraRef.current = camera;
          }}
        >
          <color attach="background" args={[canvasBackgroundColor]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[8, 8, 4]} intensity={1.2} />
          <directionalLight position={[-6, 3, -4]} intensity={0.45} />
          <PerformanceMonitor
            onDecline={() => setIsLowPerf(true)}
            onIncline={() => setIsLowPerf(false)}
          />
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          <Suspense fallback={null}>
            <SheetProvider sheet={sheet}>
              <ActiveScene
                sheet={sheet}
                forcedPhase={forcedPhase}
                isPlaying={isPlaying}
                manualCamera
                zoomLevel={1}
                loop={loopPlayback}
                resetToken={resetToken}
                onPlaybackComplete={handlePlaybackComplete}
                onStageChange={setActiveStage}
              />
            </SheetProvider>
          </Suspense>
          <OrbitControls
            ref={orbitControlsRef}
            enabled={
              !runtimeParams.captureMode &&
              !isRecording &&
              !isPreparingRecording
            }
            enablePan
            enableRotate
            enableZoom
            minPolarAngle={
              isPitchLocked && lockedPolarAngle !== null
                ? lockedPolarAngle
                : CAMERA_MIN_POLAR
            }
            maxPolarAngle={
              isPitchLocked && lockedPolarAngle !== null
                ? lockedPolarAngle
                : CAMERA_MAX_POLAR
            }
            maxDistance={22}
            minDistance={8}
            autoRotate={false}
          />
        </Canvas>

        {showToolbar ? (
          <div className="transport-toolbar">
            <label className="transport-scene">
              <span className="transport-scene-label">Scene</span>
              <select
                className="transport-select"
                value={selectedImplementationId}
                onChange={(event) => switchImplementation(event.target.value)}
                disabled={isPreparingRecording}
              >
                {implementationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="transport-btn"
              onClick={togglePlayback}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="transport-btn transport-btn--record"
              onClick={startRecording}
              disabled={isPreparingRecording}
            >
              {isPreparingRecording ? "Preparing..." : "Record"}
            </button>
            <div className="transport-zoom">
              <button
                type="button"
                className="transport-btn transport-btn--zoom"
                onClick={zoomOut}
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="transport-zoom-value">Zoom</span>
              <button
                type="button"
                className="transport-btn transport-btn--zoom"
                onClick={zoomIn}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="transport-btn"
              onClick={togglePitchLock}
            >
              {isPitchLocked ? "Unlock Pitch" : "Lock Pitch"}
            </button>
            <div className="transport-zoom">
              <button
                type="button"
                className="transport-btn transport-btn--zoom"
                onClick={() => adjustPitch(1)}
                disabled={!isPitchLocked}
                aria-label="Pitch down"
              >
                Pitch-
              </button>
              <button
                type="button"
                className="transport-btn transport-btn--zoom"
                onClick={() => adjustPitch(-1)}
                disabled={!isPitchLocked}
                aria-label="Pitch up"
              >
                Pitch+
              </button>
            </div>
            <button type="button" className="transport-btn" onClick={resetView}>
              Reset View
            </button>
          </div>
        ) : null}

        {recordingError ? (
          <div className="transport-error">{recordingError}</div>
        ) : null}
      </div>

      {showPanel ? (
        <aside className="panel">
          <h1>{implementation.metadata.title}</h1>
          {introParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="panel-section-label">Animation steps</p>
          <ol>
            {implementation.metadata.stages.map((stage, index) => (
              <li
                key={stage.panelLabel}
                className={index === activeStage ? "active" : ""}
              >
                {stage.panelLabel}
              </li>
            ))}
          </ol>
          <p className="hint">{implementation.metadata.tip}</p>
        </aside>
      ) : null}
    </div>
  );
}

export default App;
