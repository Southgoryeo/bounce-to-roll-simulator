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
        
        // vy2 = ey * |vy1|
        vy = ey * Math.abs(vy);

        // Equations from the paper: Transition from bouncing to rolling
        // Equation (4): vx2 = vx1 * [(1 - k*ex)/(1+k) + k*(1+ex)*S1/(1+k)]
        // Substituting S1 = R*omega1/vx1 gives:
        // vx2 = [vx1 * (1 - k*ex) + k * R * omega1 * (1 + ex)] / (1 + k)
        const vx2 = (vx1 * (1 - k * ex) + k * R * omega1 * (1 + ex)) / (1 + k);
        
        // Equation (5): omega2 = omega1 * [(k - ex)/(1+k) + (1+ex)/((1+k)*S1)]
        // Substituting S1 = R*omega1/vx1 gives:
        // omega2 = [omega1 * (k - ex) + (1 + ex) * (vx1 / R)] / (1 + k)
        const omega2 = (omega1 * (k - ex) + (1 + ex) * (vx1 / R)) / (1 + k);

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
