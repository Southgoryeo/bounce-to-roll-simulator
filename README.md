# Bounce to Roll Physics Simulator

This project is a web-based physics simulation based on the research paper **"Transition from bouncing to rolling on a horizontal surface"** by Rod Cross (American Journal of Physics, 2024).

## Features
- **Real-time Simulation**: Visualize the ball's trajectory as it bounces and transitions to rolling.
- **Physics-based Logic**: Implements Equations (4) and (5) from the paper for tangential and normal velocity transformations.
- **Adjustable Parameters**:
  - Initial Height & Velocity
  - Spin (Angular Velocity)
  - Radius & Mass
  - Coefficient of Restitution (Normal $e_y$ and Tangential $e_x$)
  - Air Resistance
- **Live Data Visuals**: Track velocity (x, y, total) and spin rotation over time with interactive graphs.

## How to Run
1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Open the provided local URL in your browser.

## Technologies Used
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts (Data Visualization)
- Motion (Animations)

## Physics Model
The simulation tracks the center of mass $(x, y)$ and the angular velocity $\omega$. Upon collision with the surface, the vertical velocity is reversed and scaled by $e_y$, while the horizontal velocity and spin are updated based on the tangential restitution $e_x$ and the moment of inertia factor $k$.

Transition to rolling is detected when the vertical momentum dissipates and the "rolling condition" $V_x = R\omega$ is met.
