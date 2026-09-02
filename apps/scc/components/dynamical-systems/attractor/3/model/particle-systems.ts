export type ParticleSystemId =
  | "thomas"
  | "lorenz"
  | "aizawa"
  | "dadras"
  | "halvorsen";

export type ParticleSystem = Readonly<{
  id: ParticleSystemId;
  label: string;
  seedCenter: readonly [number, number, number];
  seedRadius: number;
  viewCenter: readonly [number, number, number];
  viewScale: number;
  step: number;
  substeps: number;
  derivativeWgsl: string;
}>;

export const PARTICLE_SYSTEMS = [
  {
    id: "thomas",
    label: "thomas",
    seedCenter: [0, 0, 0],
    seedRadius: 2,
    viewCenter: [0, 0, 0],
    viewScale: 1,
    step: 0.015,
    substeps: 1,
    derivativeWgsl: `
      fn attractorDerivative(pos: vec3f) -> vec3f {
        let b = 0.19;
        return vec3f(
          -b * pos.x + sin(pos.y),
          -b * pos.y + sin(pos.z),
          -b * pos.z + sin(pos.x)
        );
      }
    `,
  },
  {
    id: "lorenz",
    label: "lorenz",
    seedCenter: [0, 0, 25],
    seedRadius: 8,
    viewCenter: [0, 0, 25],
    viewScale: 5,
    step: 0.005,
    substeps: 2,
    derivativeWgsl: `
      fn attractorDerivative(pos: vec3f) -> vec3f {
        let sigma = 10.0;
        let rho = 28.0;
        let beta = 2.66666666667;
        return vec3f(
          sigma * (pos.y - pos.x),
          pos.x * (rho - pos.z) - pos.y,
          pos.x * pos.y - beta * pos.z
        );
      }
    `,
  },
  {
    id: "aizawa",
    label: "aizawa",
    seedCenter: [0, 0, 0.7],
    seedRadius: 1,
    viewCenter: [0, 0, 0.7],
    viewScale: 0.3,
    step: 0.003,
    substeps: 2,
    derivativeWgsl: `
      fn attractorDerivative(pos: vec3f) -> vec3f {
        let x = pos.x;
        let y = pos.y;
        let z = pos.z;
        return vec3f(
          (z - 0.7) * x - 3.5 * y,
          3.5 * x + (z - 0.7) * y,
          0.6 + 0.95 * z - z * z * z / 3.0
            - (x * x + y * y) * (1.0 + 0.25 * z)
            + 0.1 * z * x * x * x
        );
      }
    `,
  },
  {
    id: "dadras",
    label: "dadras",
    seedCenter: [1, 1, 1],
    seedRadius: 0.4,
    viewCenter: [-1.5, -2, 0],
    viewScale: 2.5,
    step: 0.003,
    substeps: 4,
    derivativeWgsl: `
      fn attractorDerivative(pos: vec3f) -> vec3f {
        let x = pos.x;
        let y = pos.y;
        let z = pos.z;
        return vec3f(
          y - 3.0 * x + 2.7 * y * z,
          1.7 * y - x * z + z,
          2.0 * x * y - 9.0 * z
        );
      }
    `,
  },
  {
    id: "halvorsen",
    label: "halvorsen",
    seedCenter: [0, 0, 0],
    seedRadius: 2,
    viewCenter: [-4, -4, -4],
    viewScale: 3.6,
    step: 0.004,
    substeps: 3,
    derivativeWgsl: `
      fn attractorDerivative(pos: vec3f) -> vec3f {
        let a = 1.4;
        let x = pos.x;
        let y = pos.y;
        let z = pos.z;
        return vec3f(
          -a * x - 4.0 * y - 4.0 * z - y * y,
          -a * y - 4.0 * z - 4.0 * x - z * z,
          -a * z - 4.0 * x - 4.0 * y - x * x
        );
      }
    `,
  },
] as const satisfies readonly ParticleSystem[];

export function isParticleSystemId(value: string): value is ParticleSystemId {
  return PARTICLE_SYSTEMS.some((system) => system.id === value);
}
