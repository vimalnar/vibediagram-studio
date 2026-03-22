import { ISheet } from "@theatre/core";
import { ComponentType } from "react";

export type StageDescriptor = {
  panelLabel: string;
  sceneLabel: string;
};

export type CameraPreset = {
  azimuth: number;
  elevation: number;
  distance: number;
  target: [number, number, number];
};

export type ImplementationSceneProps = {
  sheet: ISheet;
  forcedPhase?: number | null;
  isPlaying?: boolean;
  manualCamera?: boolean;
  zoomLevel?: number;
  loop?: boolean;
  resetToken?: number;
  onPlaybackComplete?: () => void;
  onStageChange?: (stage: number) => void;
};

export type ImplementationTheatreConfig = {
  projectId: string;
  sheetId: string;
  state?: Record<string, unknown>;
};

export type ImplementationMetadata = {
  id: string;
  title: string;
  description: string;
  intro?: string[];
  tip: string;
  stages: StageDescriptor[];
};

export type ImplementationDefinition = {
  metadata: ImplementationMetadata;
  theatre: ImplementationTheatreConfig;
  defaultCamera: CameraPreset;
  Scene: ComponentType<ImplementationSceneProps>;
};
