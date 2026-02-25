import asyncio
import serial
import serial.tools.list_ports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from threading import Thread
import time
from collections import deque
import json

from crypto_engine import CryptoEngine
from wids_engine import WidsEngine

app = FastAPI(title="AEGIS-ZONE Secure Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

crypto = CryptoEngine()
wids = WidsEngine(crypto)

# State
bio_lock_serial_port = None # E.g., 'COM3'
serial_connection: serial.Serial = None
heartbeat_window = deque(maxlen=20) # Rolling window for analog noise
latest_heartbeat_val = 0

# Connected UI clients
connected_clients: list[WebSocket] = []

def find_arduino_port():
    """Helps find the connected ESP32 based on description"""
    import platform
    ports = serial.tools.list_ports.comports()
    for port, desc, hwid in sorted(ports):
        # When unpacked, 'port' is a string like '/dev/ttyUSB0' or 'COM3'
        if "CP210" in desc or "CH340" in desc or "Serial" in desc or "ttyUSB" in port or "ttyACM" in port:
            return port
    
    # Fallback platform-specific
    if platform.system() == "Windows":
        return "COM3"
    return "/dev/ttyUSB0"

def bio_lock_reader_thread():
    """
    Background thread to aggressively read from the Serial port.
    """
    global latest_heartbeat_val
    port = find_arduino_port()
    print(f"Attempting to connect to Bio-Lock Node on {port}...")
    
    try:
        ser = serial.Serial(port, 115200, timeout=1)
        print(f"Successfully connected to Bio-Lock Node on {port}")
        
        while True:
            try:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                # Parse the new MAX30105 format: IR=52000 BPM=85 Avg BPM=84
                if line.startswith("IR="):
                    # If finger is removed, don't update the heartbeat window so grace period expires
                    if "No finger?" in line:
                        pass
                    else:
                        try:
                            # Extract the raw IR value for high-entropy continuous variance
                            ir_str = line.split(" ")[0].split("=")[1]
                            val = int(ir_str)
                            latest_heartbeat_val = val
                            heartbeat_window.append(val)
                            
                            # Once we have enough entropy (values), update the crypto engine
                            if len(heartbeat_window) >= 10:
                                crypto.update_heartbeat(list(heartbeat_window))
                                
                        except (IndexError, ValueError):
                            pass
            except serial.SerialException:
                print("Lost connection to Bio-Lock node. Retrying in 2s...")
                ser.close()
                time.sleep(2)
                # Attempt reconnect logic here in a robust implementation
                
    except Exception as e:
        print(f"Failed to open Bio-Lock Serial: {e}")
        print("Running in Simulation Mode for Bio-Lock until it connects...")

@app.on_event("startup")
def startup_event():
    # Start the serial reader thread
    t = Thread(target=bio_lock_reader_thread, daemon=True)
    t.start()

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    Feeds real-time data to the Next.js React dashboard.
    """
    await websocket.accept()
    connected_clients.append(websocket)
    print("Dashboard UI connected.")
    try:
        while True:
            # 1. Check Crypto state
            crypto.check_grace_period()
            
            # 2. Get Secure Stream Frame
            stream_data = crypto.get_secure_stream_frame()
            
            # 3. Create Payload
            payload = {
                "type": "SYSTEM_STATE",
                "heartbeat_val": latest_heartbeat_val,
                "encryption": stream_data,
                "wids": wids.get_radar_state()
            }
            
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.05) # 20Hz UI update rate
            
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print("Dashboard UI disconnected.")
    except Exception as e:
        print(f"WS error: {e}")
        if websocket in connected_clients:
            connected_clients.remove(websocket)

@app.websocket("/ws/wids-ingest")
async def websocket_wids_ingest(websocket: WebSocket):
    """
    Ingests sweep data from the ESP32 WIDS Scanner Nodes.
    """
    await websocket.accept()
    print("WIDS Node Connected.")
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                payload = json.loads(data_str)
                node_id = payload.get("node_id")
                networks = payload.get("networks", [])
                
                if node_id:
                    wids.ingest_sweep(node_id, networks)
            except json.JSONDecodeError:
                print("Invalid WIDS payload received.")
                
    except WebSocketDisconnect:
        print("WIDS Node Disconnected.")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
