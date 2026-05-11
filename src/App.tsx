/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Settings2, 
  BarChart3, 
  Wind, 
  CircleDot, 
  MoveHorizontal,
  Info,
  Database
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { SimulationParams, DataPoint } from './types';
import { runSimulation } from './PhysicsEngine';
import { cn } from './lib/utils';

const BALL_PRESETS: Record<string, Partial<SimulationParams>> = {
  golf: {
    radius: 0.0201,
    mass: 0.045,
    ey: 0.74,
    ex: 0.60,
    k: 0.4, // Solid
    cd: 0.4,
  },
  tennis: {
    radius: 0.033,
    mass: 0.057,
    ey: 0.75,
    ex: 0.20,
    k: 0.55, // Hollow
    cd: 0.55,
  },
  superball: {
    radius: 0.02,
    mass: 0.03,
    ey: 0.9,
    ex: 0.8,
    k: 0.4,
    cd: 0.4,
  }
};

const SURFACE_PRESETS: Record<string, { eyMult: number, exMult: number }> = {
  hard: { eyMult: 1.0, exMult: 1.0 },
  smooth: { eyMult: 0.9, exMult: 0.5 },
  grass: { eyMult: 0.6, exMult: 0.2 },
};

const DEFAULT_PARAMS: SimulationParams = {
  initialHeight: 0.5,
  initialVx: 0.5,
  initialVy: 0,
  initialOmega: 5,
  radius: 0.0201,
  mass: 0.045,
  ey: 0.74,
  ex: 0.60,
  k: 0.4,
  airResistance: false,
  cd: 0.4,
  rho: 1.225,
  gravity: 9.8,
};

export default function App() {
  const [params1, setParams1] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [params2, setParams2] = useState<SimulationParams>({ ...DEFAULT_PARAMS, initialVx: 0.8 });
  const [compareMode, setCompareMode] = useState(false);
  const [chartMode, setChartMode] = useState<'speed' | 'omega' | 'both'>('speed');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  const [selectedBall1, setSelectedBall1] = useState('golf');
  const [selectedSurface1, setSelectedSurface1] = useState('hard');
  const [selectedBall2, setSelectedBall2] = useState('tennis');
  const [selectedSurface2, setSelectedSurface2] = useState('hard');

  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const simulationData1 = useMemo(() => runSimulation(params1), [params1]);
  const simulationData2 = useMemo(() => runSimulation(params2), [params2]);

  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(800);

  const maxFrames = Math.max(simulationData1.length, simulationData2.length);

  useEffect(() => {
    if (containerRef.current) {
      setViewWidth(containerRef.current.clientWidth);
    }
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setViewWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = 16;
      timerRef.current = window.setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= maxFrames - 1) {
            setIsPlaying(false);
            return prev;
          }
          const increment = Math.max(1, Math.round(5 * playbackSpeed));
          const next = prev + increment;
          return next >= maxFrames ? maxFrames - 1 : next;
        });
      }, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxFrames, playbackSpeed]);

  const applyBallPreset = (ballIdx: 1 | 2, key: string) => {
    const preset = BALL_PRESETS[key];
    const surfaceKey = ballIdx === 1 ? selectedSurface1 : selectedSurface2;
    const surface = SURFACE_PRESETS[surfaceKey];
    
    const updateFn = ballIdx === 1 ? setParams1 : setParams2;
    if (ballIdx === 1) setSelectedBall1(key); else setSelectedBall2(key);

    updateFn(prev => ({
      ...prev,
      ...preset,
      ey: (preset.ey || 0.7) * surface.eyMult,
      ex: (preset.ex || 0.5) * surface.exMult,
    }));
    handleReset();
  };

  const applySurfacePreset = (ballIdx: 1 | 2, key: string) => {
    const ballKey = ballIdx === 1 ? selectedBall1 : selectedBall2;
    const ball = BALL_PRESETS[ballKey];
    const surface = SURFACE_PRESETS[key];
    
    const updateFn = ballIdx === 1 ? setParams1 : setParams2;
    if (ballIdx === 1) setSelectedSurface1(key); else setSelectedSurface2(key);

    updateFn(prev => ({
      ...prev,
      ey: (ball.ey || 0.7) * surface.eyMult,
      ex: (ball.ex || 0.5) * surface.exMult,
    }));
    handleReset();
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    setCameraOffset({ x: 0, y: 0 });
  };

  const handleStart = () => {
    if (currentFrame >= maxFrames - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(true);
  };

  const activePoint1 = simulationData1[Math.min(currentFrame, simulationData1.length - 1)];
  const activePoint2 = simulationData2[Math.min(currentFrame, simulationData2.length - 1)];

  // Visualization scaling
  const groundY = 350; // Reverted to previous logic height
  const pixelsPerMeter = 250; 
  
  // Camera Follow Logic
  const leadBallX = activePoint1?.x || 0;
  const ballXPixels = leadBallX * pixelsPerMeter;
  const autoCameraX = ballXPixels > viewWidth / 2 ? ballXPixels - viewWidth / 2 : 0;
  const finalCameraX = autoCameraX + cameraOffset.x;
  const finalCameraY = cameraOffset.y;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCameraOffset(prev => ({ x: prev.x - dx, y: prev.y - dy }));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <CircleDot size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1">Physics Lab</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Transition: Bounce to Roll</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCompareMode(!compareMode); handleReset(); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
              compareMode 
                ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-100" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {compareMode ? "Dual Mode On" : "Single Ball Mode"}
          </button>
          
          <div className="h-6 w-px bg-slate-200" />

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-xl transition-colors border",
              showSettings ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white border-slate-100 text-slate-400 hover:text-slate-600"
            )}
          >
            <Settings2 size={18} />
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Ball 1 */}
        {showSettings && (
          <SettingsPanel 
            title="Ball A (Primary)"
            color="emerald"
            params={params1}
            setParams={setParams1}
            selectedBall={selectedBall1}
            selectedSurface={selectedSurface1}
            onBallChange={(k) => applyBallPreset(1, k)}
            onSurfaceChange={(k) => applySurfacePreset(1, k)}
          />
        )}

        <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          {/* Simulation Visualizer */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={cn(
              "h-3/5 relative bg-white m-4 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur p-2 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40">
                <button
                  onClick={(e) => { e.stopPropagation(); isPlaying ? setIsPlaying(false) : handleStart(); }}
                  className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all active:scale-90"
                >
                  {isPlaying ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
                <div className="h-8 w-px bg-slate-200 mx-1" />
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl">
                  {[0.5, 1, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => { e.stopPropagation(); setPlaybackSpeed(speed); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                        playbackSpeed === speed 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Result Summary Overlay */}
              {!isPlaying && currentFrame > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-2xl flex flex-col gap-3 min-w-[200px]"
                >
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Final Report</h4>
                  <div className="space-y-4">
                    <SummaryStats title="Ball A" point={activePoint1} color="text-emerald-600" />
                    {compareMode && <SummaryStats title="Ball B" point={activePoint2} color="text-rose-600" />}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="absolute top-6 right-6 text-right z-10 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
              <div className="text-2xl font-mono font-bold leading-none tracking-tighter">
                {activePoint1?.time.toFixed(3)}s
              </div>
            </div>

            <svg className="w-full h-full select-none">
              <g transform={`translate(${-finalCameraX}, ${-finalCameraY})`}>
                <line x1={finalCameraX - 100} y1={groundY} x2={finalCameraX + viewWidth + 100} y2={groundY} stroke="#1e293b" strokeWidth="2" />
                <defs>
                  <pattern id="pattern-ground" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" />
                  </pattern>
                </defs>
                <rect x={finalCameraX - 100} y={groundY} width={viewWidth + 200} height="200" fill="url(#pattern-ground)" />
                {Array.from({ length: 100 }).map((_, i) => (
                  <g key={i} transform={`translate(${i * pixelsPerMeter}, ${groundY})`}>
                    <line y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
                    <text y="22" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="bold" className="font-mono">{i}m</text>
                  </g>
                ))}

                {/* Ball 1 */}
                <BallRender 
                  point={activePoint1} 
                  data={simulationData1.filter((_, i) => i <= currentFrame && i % 8 === 0)}
                  params={params1}
                  pixelsPerMeter={pixelsPerMeter}
                  groundY={groundY}
                  color="#10b981"
                  trailColor="rgba(16, 185, 129, 0.2)"
                />

                {/* Ball 2 */}
                {compareMode && (
                  <BallRender 
                    point={activePoint2} 
                    data={simulationData2.filter((_, i) => i <= currentFrame && i % 8 === 0)}
                    params={params2}
                    pixelsPerMeter={pixelsPerMeter}
                    groundY={groundY}
                    color="#f43f5e"
                    trailColor="rgba(244, 63, 94, 0.2)"
                  />
                )}
              </g>
            </svg>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              {activePoint1?.isRolling && (
                <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[9px] font-bold shadow-xl border border-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Ball A Rolling
                </div>
              )}
              {compareMode && activePoint2?.isRolling && (
                <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[9px] font-bold shadow-xl border border-rose-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Ball B Rolling
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="h-2/5 px-4 pb-4 flex gap-4 overflow-hidden">
            <div className="flex-1 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={14} /> Comparative Analysis
                </h3>
                
                <div className="flex items-center gap-4">
                  {/* Chart Tabs */}
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {(['speed', 'omega', 'both'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setChartMode(mode)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-bold transition-all capitalize",
                          chartMode === mode 
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Ball A</span>
                    </div>
                    {compareMode && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-rose-500 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ball B</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationData1.filter((_, i) => i % 25 === 0).map((p, idx) => ({
                    time: p.time,
                    vTotal1: p.vTotal,
                    vTotal2: compareMode && simulationData2[idx*25] ? simulationData2[idx*25].vTotal : null,
                    omega1: p.omega,
                    omega2: compareMode && simulationData2[idx*25] ? simulationData2[idx*25].omega : null,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical stroke="#f1f5f9" />
                    <XAxis dataKey="time" type="number" domain={[0, 'auto']} tick={{ fontSize: 9 }} tickFormatter={t => t.toFixed(1)} label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                    <YAxis label={{ value: chartMode === 'omega' ? 'rad/s' : 'm/s', angle: -90, position: 'insideLeft', fontSize: 10 }} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    
                    {(chartMode === 'speed' || chartMode === 'both') && (
                      <Line type="monotone" dataKey="vTotal1" name="A: Speed" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                    )}
                    {(chartMode === 'speed' || chartMode === 'both') && compareMode && (
                      <Line type="monotone" dataKey="vTotal2" name="B: Speed" stroke="#f43f5e" strokeWidth={3} dot={false} isAnimationActive={false} />
                    )}
                    
                    {(chartMode === 'omega' || chartMode === 'both') && (
                      <Line type="monotone" dataKey="omega1" name="A: Spin" stroke="#0ea5e9" strokeWidth={chartMode === 'both' ? 1.5 : 3} strokeDasharray={chartMode === 'both' ? "5 5" : ""} dot={false} isAnimationActive={false} />
                    )}
                    {(chartMode === 'omega' || chartMode === 'both') && compareMode && (
                      <Line type="monotone" dataKey="omega2" name="B: Spin" stroke="#d946ef" strokeWidth={chartMode === 'both' ? 1.5 : 3} strokeDasharray={chartMode === 'both' ? "5 5" : ""} dot={false} isAnimationActive={false} />
                    )}

                    {isPlaying && activePoint1 && <ReferenceLine x={activePoint1.time} stroke="#e11d48" strokeDasharray="3 3" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="w-1/4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Telemetry</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-emerald-600 uppercase border-b border-emerald-50 mb-1">Ball A</div>
                  <StatBox label="Pos X" value={activePoint1?.x.toFixed(2)} unit="m" />
                  <StatBox label="Speed" value={activePoint1?.vTotal.toFixed(2)} unit="m/s" color="text-emerald-600" />
                </div>
                {compareMode && (
                  <div className="space-y-2">
                    <div className="text-[8px] font-black text-rose-600 uppercase border-b border-rose-50 mb-1">Ball B</div>
                    <StatBox label="Pos X" value={activePoint2?.x.toFixed(2)} unit="m" />
                    <StatBox label="Speed" value={activePoint2?.vTotal.toFixed(2)} unit="m/s" color="text-rose-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Ball 2 */}
        {showSettings && compareMode && (
          <SettingsPanel 
            title="Ball B (Secondary)"
            color="rose"
            params={params2}
            setParams={setParams2}
            selectedBall={selectedBall2}
            selectedSurface={selectedSurface2}
            onBallChange={(k) => applyBallPreset(2, k)}
            onSurfaceChange={(k) => applySurfacePreset(2, k)}
          />
        )}
      </main>
    </div>
  );
}

function SettingsPanel({ 
  title, 
  color, 
  params, 
  setParams, 
  selectedBall, 
  selectedSurface,
  onBallChange,
  onSurfaceChange
}: any) {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="bg-white border-x border-slate-200 overflow-y-auto custom-scrollbar p-6"
    >
      <div className="space-y-6">
        <h2 className={cn("text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2", color === 'emerald' ? 'text-emerald-600' : 'text-rose-600')}>
          <div className={cn("w-2 h-2 rounded-full", color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500')} /> {title}
        </h2>

        <div className="grid gap-6">
          <section>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Material Presets</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {Object.keys(BALL_PRESETS).map(k => (
                <button key={k} onClick={() => onBallChange(k)} className={cn("px-2 py-2 rounded-lg text-[9px] font-bold border transition-all", selectedBall === k ? "bg-slate-900 border-slate-900 text-white" : "border-slate-100 hover:border-slate-300 text-slate-500")}>
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(SURFACE_PRESETS).map(k => (
                <button key={k} onClick={() => onSurfaceChange(k)} className={cn("px-2 py-2 rounded-lg text-[9px] font-bold border transition-all", selectedSurface === k ? "bg-slate-900 border-slate-900 text-white" : "border-slate-100 hover:border-slate-300 text-slate-500")}>
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <ParameterInput label="Start Height" value={params.initialHeight} min={0.1} max={2} step={0.1} onChange={v => setParams({ ...params, initialHeight: v })} />
            <ParameterInput label="Initial Velocity" value={params.initialVx} min={0} max={5} step={0.1} onChange={v => setParams({ ...params, initialVx: v })} />
            <ParameterInput label="Initial Spin" value={params.initialOmega} min={-50} max={50} step={1} onChange={v => setParams({ ...params, initialOmega: v })} />
            <ParameterInput label="Ball Size (m)" value={params.radius} min={0.01} max={0.1} step={0.001} onChange={v => setParams({ ...params, radius: v })} />
            <ParameterInput label="Ball Mass (kg)" value={params.mass} min={0.01} max={1} step={0.01} onChange={v => setParams({ ...params, mass: v })} />
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Air Drag</span>
               <button onClick={() => setParams({ ...params, airResistance: !params.airResistance })} className={cn("w-10 h-5 rounded-full transition-all relative flex items-center px-1 shadow-inner", params.airResistance ? "bg-emerald-500" : "bg-slate-300")}>
                 <div className={cn("w-3 h-3 bg-white rounded-full transition-transform shadow-sm", params.airResistance ? "translate-x-5" : "translate-x-0")} />
               </button>
            </div>
          </section>
        </div>
      </div>
    </motion.aside>
  );
}

function BallRender({ point, data, params, pixelsPerMeter, groundY, color, trailColor }: any) {
  if (!point) return null;
  const radius = params.radius * pixelsPerMeter;
  return (
    <g>
      <polyline points={data.map((p: any) => `${p.x * pixelsPerMeter}, ${groundY - p.y * pixelsPerMeter}`).join(' ')} fill="none" stroke={trailColor} strokeWidth="3" strokeDasharray="6 3" strokeLinecap="round" />
      <g transform={`translate(${point.x * pixelsPerMeter}, ${groundY - point.y * pixelsPerMeter})`}>
        <circle r={radius} fill="white" stroke={color} strokeWidth="2.5" className="shadow-lg" />
        <g transform={`rotate(${point.x * (360 / (2 * Math.PI * params.radius))})`}>
          <line x2={radius} stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle r="3" fill={color} />
        </g>
      </g>
    </g>
  );
}

function ParameterInput({ label, value, min, max, step, onChange }: any) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1.5 appearance-none bg-slate-200 rounded-full accent-emerald-500 cursor-pointer" />
    </div>
  );
}

function StatBox({ label, value, unit, color = "text-slate-900" }: any) {
  return (
    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col items-center text-center">
      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{label}</div>
      <div className={cn("text-base font-mono font-bold truncate max-w-full px-1", color)}>
        {value}<span className="text-[8px] ml-0.5 opacity-40 lowercase font-sans">{unit}</span>
      </div>
    </div>
  );
}

function SummaryStats({ title, point, color }: any) {
  if (!point) return null;
  const rotCount = point.cumulativeRotation / (2 * Math.PI);
  return (
    <div className="space-y-2">
      <div className={cn("text-[8px] font-black uppercase tracking-widest border-l-2 pl-2", color)}>{title} Results</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 font-bold uppercase">Distance</span>
          <span className="text-sm font-mono font-bold">{point.x.toFixed(2)}m</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] text-slate-400 font-bold uppercase">Bounces</span>
          <span className="text-sm font-mono font-bold">{point.bounceCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-400 font-bold uppercase">Total Rotation</span>
          <span className="text-sm font-mono font-bold">{rotCount.toFixed(1)} <span className="text-[10px] font-normal opacity-50">revs</span></span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[8px] text-slate-400 font-bold uppercase">Final V</span>
          <span className="text-sm font-mono font-bold">{point.vTotal.toFixed(2)} <span className="text-[10px] font-normal opacity-50">m/s</span></span>
        </div>
      </div>
    </div>
  );
}


