import time
from typing import Dict, List

class WidsEngine:
    def __init__(self, crypto_engine, trigger_threshold_dbm=-50):
        # We need a reference to the crypto engine to destroy the key on lockdown
        self.crypto_engine = crypto_engine
        
        # If signal is stronger than this, it's considered physically inside the room
        self.trigger_threshold_dbm = trigger_threshold_dbm 

        # State storage for sweeps: {node_id: {bssid: {"ssid": str, "rssi": int, "timestamp": float}}}
        self.scanner_state = {
            "NODE_1": {},
            "NODE_2": {}
        }
        
        # Safe APs (whitelist)
        self.whitelist_ssids = ["VIT_Secure", "YourHomeNetwork"]
        
        self.current_threat_level = "SAFE"
        self.active_rogues = []

    def ingest_sweep(self, node_id: str, networks: List[Dict]):
        if node_id not in self.scanner_state:
            self.scanner_state[node_id] = {}
            
        current_time = time.time()
        for net in networks:
            bssid = net['bssid']
            self.scanner_state[node_id][bssid] = {
                "ssid": net['ssid'],
                "rssi": net['rssi'],
                "timestamp": current_time
            }
            
        self.evaluate_threats()

    def evaluate_threats(self):
        """
        Runs the differential RSSI math and flags threats.
        Lockdown condition: Unrecognized SSID has RSSI > trigger_threshold_dbm
        OR known BSSID is spoofing whitelist SSID
        """
        current_time = time.time()
        rogues_found = []
        is_critical = False

        # Gather all unique BSSIDs seen recently (last 10 seconds)
        all_bssids = set()
        for node in ["NODE_1", "NODE_2"]:
            for bssid, data in list(self.scanner_state[node].items()):
                if current_time - data["timestamp"] > 10.0:
                    # Clean up old data
                    del self.scanner_state[node][bssid]
                else:
                    all_bssids.add(bssid)

        for bssid in all_bssids:
            # Get strength from both nodes if available
            rssi_1 = self.scanner_state["NODE_1"].get(bssid, {}).get("rssi", -100)
            rssi_2 = self.scanner_state["NODE_2"].get(bssid, {}).get("rssi", -100)
            ssid = self.scanner_state["NODE_1"].get(bssid, {}).get("ssid", "") or \
                   self.scanner_state["NODE_2"].get(bssid, {}).get("ssid", "")
            
            # Differential proximity math (Simplified)
            # The higher the value (closer to 0), the closer it is.
            max_rssi = max(rssi_1, rssi_2)
            
            # Threat Logic: Unlisted network is physically close
            if ssid not in self.whitelist_ssids:
                if max_rssi > self.trigger_threshold_dbm:
                    is_critical = True
                    rogues_found.append({"bssid": bssid, "ssid": ssid, "proximity_rssi": max_rssi})
                    
        self.active_rogues = rogues_found
        
        if is_critical:
            self.current_threat_level = "CRITICAL_BREACH"
            print(f"🚨 WIDS LOCKDOWN TRIGGERED by physical spatial intrusion! Rogues: {rogues_found}")
            # Immediately destroy the AES session key
            self.crypto_engine.current_key = None
        elif len(rogues_found) > 0:
            self.current_threat_level = "WARNING_ROGUE_NEARBY"
        else:
            self.current_threat_level = "SAFE"

    def get_radar_state(self) -> dict:
        """
        Returns JSON representation for the Next.js visualizer.
        """
        # Collect merged network map for UI
        merged_networks = []
        all_bssids = set(self.scanner_state["NODE_1"].keys()) | set(self.scanner_state["NODE_2"].keys())
        
        for bssid in all_bssids:
            r1 = self.scanner_state["NODE_1"].get(bssid, {}).get("rssi", -100)
            r2 = self.scanner_state["NODE_2"].get(bssid, {}).get("rssi", -100)
            ssid = self.scanner_state["NODE_1"].get(bssid, {}).get("ssid", "") or \
                   self.scanner_state["NODE_2"].get(bssid, {}).get("ssid", "")
                   
            # We can calculate rough X position based on ratio of R1 to R2 for the UI
            # Note: Decibels are logarithmic, but for a cool UI radar, a simple differential works
            avg_rssi = (r1 + r2) / 2 if r1 != -100 and r2 != -100 else max(r1, r2)
            
            merged_networks.append({
                "bssid": bssid,
                "ssid": ssid,
                "node_1_rssi": r1,
                "node_2_rssi": r2,
                "avg_rssi": avg_rssi,
                "is_threat": any(r["bssid"] == bssid for r in self.active_rogues)
            })
            
        return {
            "threat_level": self.current_threat_level,
            "networks": merged_networks
        }
