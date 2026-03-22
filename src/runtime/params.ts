export type RuntimeParams = {
  captureMode: boolean;
  hidePanel: boolean;
  forcedPhase: number | null;
  implementationOverride: string | null;
};

const parseNumber = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

export const parseRuntimeParams = (search: string): RuntimeParams => {
  const params = new URLSearchParams(search);
  const phase = parseNumber(params.get("phase"));
  const implementation = params.get("implementation") ?? params.get("project");

  return {
    captureMode: params.get("capture") === "1",
    hidePanel: params.get("panel") === "0",
    forcedPhase: phase,
    implementationOverride:
      implementation && implementation.length > 0 ? implementation : null,
  };
};
