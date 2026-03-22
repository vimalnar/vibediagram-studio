let hasInitialized = false;

export const initializeTheatreStudio = async (): Promise<void> => {
  if (!import.meta.env.DEV) {
    return;
  }
  if (import.meta.env.VITE_ENABLE_THEATRE_STUDIO !== "1") {
    return;
  }
  if (hasInitialized) {
    return;
  }

  const studioModule = await import("@theatre/studio");
  const extensionModule = await import("@theatre/r3f/dist/extension");

  studioModule.default.initialize();
  studioModule.default.extend(extensionModule.default);
  hasInitialized = true;
};
