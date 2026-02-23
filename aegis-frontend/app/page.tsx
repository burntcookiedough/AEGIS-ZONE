"use client";

import { useEffect, useState } from "react";
import BioLockChart from "@/components/BioLockChart";
import ThreatRadar from "@/components/ThreatRadar";

export default function Dashboard() {
  const [heartbeatVal, setHeartbeatVal] = useState(0);
  const [encryptionState, setEncryptionState] = useState({ status: "LOCKED", frame: null as string | null, key_derived: false });
  const [widsState, setWidsState] = useState({ threat_level: "SAFE", networks: [] });
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Connect to FastAPI WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws/dashboard");

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

            <div className="flex-1 flex items-center justify-center border border-gray-800 rounded bg-black/50 relative object-cover z-20">
              {isSecure ? (
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">🛡️</div>
                  <h2 className="text-2xl font-bold text-gray-100 uppercase tracking-widest">Access Granted</h2>
                  <p className="text-teal-400 font-mono mt-4 text-sm max-w-md mx-auto">
                    Biometric signature validated and physical airspace secured.
                  </p>
                  <div className="mt-8 p-4 border border-gray-800 bg-black text-left text-xs text-gray-500 max-h-32 overflow-hidden break-words">
                    {/* Simulated decrypted stream hex */}
                    {encryptionState.frame ? encryptionState.frame.substring(0, 500) + '...' : 'Streaming...'}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0">
                  {/* Static Noise Overlay */}
                  <div className="w-full h-full opacity-30 mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 backdrop-blur-[2px]">
                    <div className="text-6xl text-red-500/80 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">⚠️</div>
                    <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-md">SYSTEM PURGED</h2>
                    <p className="text-red-400 font-bold mt-2 uppercase tracking-wide">Analog Keys Destroyed</p>
                    <p className="text-gray-400 text-sm mt-4 max-w-sm">
                      Please restore Biometric Pulse OR remove Rogue Access Points from physical premises to re-derive session keys.
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
