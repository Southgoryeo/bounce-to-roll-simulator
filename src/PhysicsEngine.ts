import { SimulationParams, DataPoint } from './types';

export function runSimulation(params: SimulationParams): DataPoint[] {
  const dt = 0.002; // Time step
  const maxTime = 20; // Increased duration
  const data: DataPoint[] = [];

  let t = 0;
  let x = 0;
  let y = params.initialHeight;
  let vx = params.initialVx;
  let vy = params.initialVy;
  let omega = params.initialOmega;
  let bounceCount = 0;
  let isRolling = false;
  let cumulativeRotation = 0;

  const R = params.radius;
  const k = params.k;
  const g = params.gravity;
  const ey = params.ey;
  const ex = params.ex;

  // For air resistance
  const area = Math.PI * R * R;
  const airDragConst = 0.5 * params.rho * area * params.cd;

  while (t < maxTime) {
    data.push({
      time: t,
      x,
      y,
      vx,
      vy,
      vTotal: Math.sqrt(vx * vx + vy * vy),
      omega,
      cumulativeRotation,
      isRolling,
      bounceCount
    });

    cumulativeRotation += Math.abs(omega) * dt;

    // Check if the ball has effectively stopped
    if (t > 0.5 && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01 && y < 0.001) break;

    if (!isRolling) {
      // Flight Phase
      let ax = 0;
      let ay = -g;

      if (params.airResistance) {
        const v = Math.sqrt(vx * vx + vy * vy);
        if (v > 0) {
          ax -= (airDragConst * v * vx) / params.mass;
          ay -= (airDragConst * v * vy) / params.mass;
        }
      }

      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;

      // Bounce Detection
      if (y <= R && vy < 0) {
        y = R; 
        bounceCount++;

        // Equations from the paper: Transition from bouncing to rolling
        // Equation (4) for vx2/vx1 and Equation (5) for omega2/omega1
        
        const vx1 = vx;
        const omega1 = omega;
        const S1 = vx1 !== 0 ? (R * omega1) / vx1 : 0;

        // vy2 = ey * |vy1|
        vy = ey * Math.abs(vy);

        // Equation (4): vx2 = vx1 * [(1 - k*ex)/(1+k) + k*(1+ex)*S1/(1+k)]
        const vx2 = vx1 * ((1 - k * ex) / (1 + k) + (k * (1 + ex) * S1) / (1 + k));
        
        // Equation (5): omega2 = omega1 * [(k - ex)/(1+k) + (1+ex)/((1+k)*S1)]
        // Careful if S1 is 0. If S1 is 0, we use specific cases or the identity
        let omega2;
        if (Math.abs(vx1) < 1e-6) {
           // If vx1 is 0, we look at the impulse relation: delta_omega = R * delta_momentum_x / I
           // This is simpler: omega2 depends on friction. 
           // In the paper's model, if vx1=0, S1 is undefined. 
           // Let's assume some small horizontal component or handle separately.
           // For simplicity, if vx=0, spin doesn't change much horizontal unless there's friction.
           omega2 = omega1; 
        } else {
           omega2 = omega1 * ((k - ex) / (1 + k) + (1 + ex) / ((1 + k) * S1));
        }

        vx = vx2;
        omega = omega2;

        // Check for transition to rolling
        // Based on Section II: ball stops bouncing when normal reaction becomes comparable to weight
        // In simulation, we check if dy is small and vy is small.
        if (vy < 0.1 && bounceCount > 3) {
          // Check if Rx = Vx (rolling condition)
          if (Math.abs(R * omega - vx) < 0.1) {
            isRolling = true;
            y = R;
            vy = 0;
          }
        }
      }
    } else {
      // Rolling Phase
      // In rolling, v = omega * R
      // Rolling friction (negligible in this simple model, but we can add small decay)
      const rollingFrictionCoeff = 0.01;
      const ax = -rollingFrictionCoeff * g;
      
      vx += ax * dt;
      if (vx < 0) vx = 0;
      
      omega = vx / R;
      x += vx * dt;
      y = R;
      vy = 0;
      
      if (vx < 0.0001) break;
    }

    t += dt;
  }

  return data;
}
