export interface SimulationParams {
  initialHeight: number; // m
  initialVx: number; // m/s
  initialVy: number; // m/s
  initialOmega: number; // rad/s (spin)
  radius: number; // m
  mass: number; // kg
  ey: number; // Normal restitution (0 to 1)
  ex: number; // Tangential restitution (-1 to 1)
  k: number; // Moment of inertia factor (0.4 for solid sphere)
  airResistance: boolean;
  cd: number; // Drag coefficient
  rho: number; // Air density (1.225 kg/m^3)
  gravity: number; // m/s^2
}

export interface DataPoint {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vTotal: number;
  omega: number;
  cumulativeRotation: number; // Total radians rotated
  isRolling: boolean;
  bounceCount: number;
}
