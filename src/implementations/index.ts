import { ImplementationDefinition } from "../template/implementation";
import { blackholeImplementation } from "./blackhole-gravity.impl";
import { starterImplementation } from "./starter.impl";
import { transformerImplementation } from "./transformer.impl";
import { entropyFreeEnergyImplementation } from "./entropy-free-energy.impl";

const implementations: Record<string, ImplementationDefinition> = {
  transformer: transformerImplementation,
  "blackhole-gravity": blackholeImplementation,
  starter: starterImplementation,
  "entropy-free-energy": entropyFreeEnergyImplementation,
};

export const listImplementations = (): Array<{
  id: string;
  title: string;
}> => {
  return Object.entries(implementations).map(([id, implementation]) => ({
    id,
    title: implementation.metadata.title,
  }));
};

export const resolveImplementation = (
  implementationId?: string | null,
): ImplementationDefinition => {
  const normalized = (implementationId ?? "transformer").toLowerCase();
  return implementations[normalized] ?? transformerImplementation;
};

const selectedImplementationId =
  import.meta.env.VITE_IMPLEMENTATION ?? import.meta.env.VITE_PROJECT;

export const activeImplementation = resolveImplementation(
  selectedImplementationId,
);
