import { describe, expect, it } from "vitest";
import { resolveImplementation } from "./index";

describe("resolveImplementation", () => {
  it("falls back to transformer when id is missing", () => {
    const implementation = resolveImplementation(null);
    expect(implementation.metadata.id).toBe("transformer");
  });

  it("returns starter implementation when requested", () => {
    const implementation = resolveImplementation("starter");
    expect(implementation.metadata.id).toBe("starter");
  });

  it("returns black hole implementation when requested", () => {
    const implementation = resolveImplementation("blackhole-gravity");
    expect(implementation.metadata.id).toBe("blackhole-gravity");
  });

  it("falls back to transformer when id is unknown", () => {
    const implementation = resolveImplementation("unknown-impl");
    expect(implementation.metadata.id).toBe("transformer");
  });
});
