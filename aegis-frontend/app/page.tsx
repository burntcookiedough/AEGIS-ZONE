"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import BioLockChart from "@/components/BioLockChart";
import ThreatRadar from "@/components/ThreatRadar";

export default function Dashboard() {
  const [heartbeatVal, setHeartbeatVal] = useState(0);
  const [encryptionState, setEncryptionState] = useState({ status: "LOCKED", frame: null as string | null, key_derived: false });
  const [widsState, setWidsState] = useState({ threat_level: "SAFE", networks: [] });
  const [wsConnected, setWsConnected] = useState(false);

  // Webcam refs and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    // Automatically use the host IP if not localhost, otherwise use Pi's static IP for testing
    const wsHost = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? window.location.hostname
      : '192.168.137.2';

    const ws = new WebSocket(`ws://${wsHost}:8000/ws/dashboard`);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "SYSTEM_STATE") {
          setHeartbeatVal(data.heartbeat_val);
          setEncryptionState(data.encryption);
          setWidsState(data.wids);
        }
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const isSecure = encryptionState.status === "SECURE" && widsState.threat_level !== "CRITICAL_BREACH";

  // ── Webcam Initialization ──
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Webcam not available:", err);
      }
    }
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  // ── Animated Static Noise (CRT TV effect) when locked ──
  useEffect(() => {
    if (isSecure) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawNoise() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buf = imageData.data;
      for (let i = 0; i < buf.length; i += 4) {
        const v = Math.random() * 255;
        buf[i] = v;
        buf[i + 1] = v;
        buf[i + 2] = v;
        buf[i + 3] = 180;
      }
      ctx.putImageData(imageData, 0, 0);
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, y, canvas.width, 2);
      }
      animFrameRef.current = requestAnimationFrame(drawNoise);
    }
    drawNoise();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSecure]);

  return (
    <main className="min-h-screen bg-[#050505] text-gray-200 p-8 font-mono selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex justify-between items-end border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">AEGIS<span className="text-teal-500">-ZONE</span></h1>
            <p className="text-sm text-gray-500 mt-1">ZERO-TRUST PHYSICAL ENCLAVE</p>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-gray-500">GATEWAY UPLINK:</span>
            <span className={`flex items-center space-x-2 ${wsConnected ? 'text-teal-400' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-teal-400 animate-pulse' : 'bg-red-500'}`}></span>
              <span>{wsConnected ? 'ESTABLISHED' : 'OFFLINE'}</span>
            </span>
          </div>
        </header>

        {/* Top Panels: Bio-Lock and WIDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BioLockChart heartbeatValue={heartbeatVal} isSecure={encryptionState.key_derived} />
          <ThreatRadar networks={widsState.networks} threatLevel={widsState.threat_level} />
        </div>

        {/* Main Content Area: The Secured View */}
        <div className={`mt-8 p-1 rounded-2xl bg-gradient-to-r ${isSecure ? 'from-teal-500/20 via-emerald-500/10 to-teal-500/20' : 'from-red-600/30 via-red-900/10 to-red-600/30'} relative`}>
          <div className="bg-[#0a0a0a] rounded-xl p-6 min-h-[400px] flex flex-col relative overflow-hidden">

            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-400 tracking-widest">SECURE WORKSPACE FEED</h3>
              {isSecure ? (
                <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded text-xs font-bold tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  AES-256-CTR DECRYPTED
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded text-xs font-bold tracking-widest flex items-center gap-2 animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  CRYPTOGRAPHIC LOCKDOWN
                </span>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center border border-gray-800 rounded bg-black/50 relative overflow-hidden z-20" style={{ minHeight: '360px' }}>
              {/* Live Webcam Feed — always running in the background */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${isSecure ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Secure overlay label */}
              {isSecure && (
                <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded border border-teal-500/30">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span className="text-teal-400 text-xs font-mono font-bold tracking-wider">LIVE — AES-256 DECRYPTED</span>
                </div>
              )}

              {/* Static noise overlay when LOCKED */}
              {!isSecure && (
                <div className="absolute inset-0 z-20">
                  <canvas
                    ref={staticCanvasRef}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-30">
                    <div className="text-6xl text-red-500/80 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">⚠️</div>
                    <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-md">FEED ENCRYPTED</h2>
                    <p className="text-red-400 font-bold mt-2 uppercase tracking-wide">Analog Keys Destroyed</p>
                    <p className="text-gray-400 text-sm mt-4 max-w-sm">
                      Restore Biometric Pulse or remove Rogue Access Points to re-derive session keys.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
