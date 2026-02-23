"use client";

import { useEffect, useRef } from "react";

interface BioLockChartProps {
  heartbeatValue: number;
  isSecure: boolean;
}

export default function BioLockChart({ heartbeatValue, isSecure }: BioLockChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(new Array(100).fill(0));

  useEffect(() => {
    // Add new value and keep array size constant
    dataRef.current.push(heartbeatValue);
    if (dataRef.current.length > 100) {
      dataRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Styling based on security state
    ctx.strokeStyle = isSecure ? "#10b981" : "#ef4444"; // Emerald if secure, Red if locked
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();
    
    // Auto-scale mapping (simplified for demo)
    const minVal = Math.min(...dataRef.current.filter(v => v > 0), 1000);
    const maxVal = Math.max(...dataRef.current, 3000);
    const range = Math.max(maxVal - minVal, 100) * 1.5;

    dataRef.current.forEach((val, i) => {
      const x = (i / 99) * canvas.width;
      // Map value to canvas height
      let normalized = (val - minVal) / range;
      if(val === 0) normalized = 0.5; // default flat line if no data
      const y = canvas.height - (normalized * canvas.height);
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [heartbeatValue, isSecure]);

  return (
    <div className={`p-4 rounded-xl border ${isSecure ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/50 bg-red-950/40'} transition-colors duration-500`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-mono font-semibold text-gray-200">
          BIO-LOCK: <span className={isSecure ? 'text-emerald-400' : 'text-red-500'}>{isSecure ? 'SECURE' : 'LOCKED'}</span>
        </h2>
        <span className="font-mono text-xs text-gray-400">ANALOG_VAR_SIG {heartbeatValue > 0 ? 'ACTIVE' : 'IDLE'}</span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={120} 
        className="w-full h-[120px]"
      />
    </div>
  );
}
