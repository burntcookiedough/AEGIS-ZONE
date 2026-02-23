"use client";

interface Network {
    bssid: string;
    ssid: string;
    node_1_rssi: number;
    node_2_rssi: number;
    avg_rssi: number;
    is_threat: boolean;
}

interface ThreatRadarProps {
    networks: Network[];
    threatLevel: string;
}

export default function ThreatRadar({ networks, threatLevel }: ThreatRadarProps) {
    const isCritical = threatLevel === "CRITICAL_BREACH";

    return (
        <div className={`p-4 rounded-xl border relative overflow-hidden min-h-[300px] ${isCritical ? 'border-red-500/50 bg-red-950/20' : 'border-cyan-500/30 bg-cyan-950/20'} transition-colors duration-500`}>

            {/* Radar Sweep Animation (CSS only representation) */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="w-full h-full rounded-full border border-teal-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150"></div>
                <div className="w-full h-full rounded-full border border-teal-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2.5]"></div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-mono font-semibold text-gray-200">
                        SPATIAL WIDS: <span className={isCritical ? 'text-red-500 animate-pulse' : 'text-cyan-400'}>{threatLevel}</span>
                    </h2>
                    <span className="font-mono text-xs text-gray-400">NODES: 2 ONLINE</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {networks.length === 0 ? (
                        <div className="text-gray-500 text-sm font-mono text-center mt-10">Scanning physical airspace...</div>
                    ) : (
                        networks.sort((a, b) => b.avg_rssi - a.avg_rssi).map((net) => (
                            <div
                                key={net.bssid}
                                className={`flex justify-between items-center p-2 rounded ${net.is_threat ? 'bg-red-900/40 border border-red-500/30' : 'bg-gray-800/40'} font-mono text-sm`}
                            >
                                <div className="flex flex-col">
                                    <span className={net.is_threat ? 'text-red-400 font-bold' : 'text-gray-300'}>{net.ssid || '<hidden>'}</span>
                                    <span className="text-[10px] text-gray-500">{net.bssid}</span>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xs ${net.is_threat ? 'text-red-400' : 'text-cyan-400'}`}>
                                        {net.avg_rssi.toFixed(1)} dBm
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        N1:{net.node_1_rssi != -100 ? net.node_1_rssi : '--'} | N2:{net.node_2_rssi != -100 ? net.node_2_rssi : '--'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
