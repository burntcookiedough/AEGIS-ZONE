MASTER PROJECT DOCUMENTATION: AEGIS-ZONE
Project Concept: A Zero-Trust Physical Workstation employing Continuous Biometric Key Generation and Spatial Wireless Intrusion Detection.
1. Executive Summary
Aegis-Zone is a physical cybersecurity terminal that enforces absolute zero-trust. Traditional systems authenticate a user once (point-in-time). Aegis-Zone requires continuous, live physical proof of the user’s identity via an analog Photoplethysmogram (PPG) heartbeat variance. Concurrently, it enforces a secure 3-meter spatial perimeter using two distributed ESP32 nodes performing differential Radio Frequency (RF) analysis. If the biological heartbeat disconnects, or if a rogue Access Point (Evil Twin) enters the physical airspace, the central Raspberry Pi immediately destroys the AES-256 encryption keys, cryptographically locking the terminal.
2. Hardware Architecture & Bill of Materials
The system relies on a central Gateway and three distinct peripheral nodes.
Central Brain / Secure Gateway: 1x Raspberry Pi (4B or 5).
Microcontrollers: 3x ESP32 Development Boards.
Biometric Sensor: 1x 3-Pin Analog Optical Heart Rate Sensor (Pins: S, +, -).
Peripheral Housing: 1x Gutted USB Computer Mouse (to house the biometric sensor).
Hardware Pinouts & Roles
Node 1: Left Airspace Sentinel (ESP32)
Role: Placed on the left side of the room/desk. Continuously sweeps the 2.4GHz Wi-Fi spectrum.
Action: Captures BSSID, SSID, and RSSI (Signal Strength) of all surrounding networks and transmits them to the Pi.
Node 2: Right Airspace Sentinel (ESP32)
Role: Placed on the right side of the room/desk.
Action: Performs the exact same Wi-Fi sweeping task as Node 1. The Pi uses the RSSI difference between Node 1 and Node 2 to calculate the physical trajectory/location of a hacker.
Node 3: Biometric Bio-Lock (ESP32 + Analog Sensor)
Role: Embedded inside the gutted computer mouse.
Wiring:
Sensor + Pin -> ESP32 3.3V
Sensor - Pin -> ESP32 GND
Sensor S Pin -> ESP32 GPIO 34 (Analog Input)
Action: Uses analogRead() in a high-frequency loop to capture the raw, fluctuating analog voltage of the user's heartbeat and streams it to the Pi.
3. Cryptographic Framework (Syllabus Application)
Continuous Key Derivation (Hash Functions): The raw analog noise from Node 3's heartbeat sensor is concatenated with a time-synchronized nonce. The Raspberry Pi passes this through a SHA-3 hash function to derive a 256-bit symmetric key.
Session Encryption (Symmetric Ciphers): The SHA-3 derived key is used for AES-256 in Counter (CTR) mode to encrypt/decrypt a live video feed or sensitive file on the Raspberry Pi display.
Cryptographic Grace Period: If the heartbeat signal drops, a 5-second buffer is initiated. If the signal does not return, the AES key is purged from memory (Key = NULL).
Wireless Intrusion Detection System (WIDS): Node 1 and Node 2 act as physical WIDS sensors to detect IEEE 802.11 attacks, specifically Rogue Access Points (Evil Twins).
4. Software Stack & Data Flow
The software is divided into three layers, utilizing highly responsive frameworks perfectly suited for this hardware.
Layer 1: Embedded Layer (C++ / Arduino IDE)
Nodes 1 & 2 (Wi-Fi Scanners): Use the <WiFi.h> library in Promiscuous Mode or standard scan mode to parse surrounding networks.
Node 3 (Bio-Lock): Uses standard analogRead(34).
Communication: All three ESP32s will transmit their data to the Raspberry Pi over a local WebSocket connection (or Serial over USB if wired directly to the Pi for lower latency).
Layer 2: Cryptographic Backend (Python / FastAPI)
Hosting: Hosted locally on the Raspberry Pi.
Endpoints: Ingests the continuous WebSocket/Serial data from the three ESP32s.
Crypto Engine: Uses Python's hashlib for SHA-3 and the cryptography library for AES-256-CTR video encryption.
Spatial Math Engine: Calculates the differential RSSI math. If Node1_RSSI for "Suspicious_Network" is -40dBm and Node2_RSSI is -70dBm, the threat is geometrically closer to the left. If signal strength crosses a "danger threshold" (e.g., > -50dBm, meaning the hacker is physically in the room), it triggers a system lockdown.
Layer 3: Presentation UI (Next.js Dashboard)
Hosting: Hosted locally on the Raspberry Pi and displayed on the presentation monitor.
Visuals:
A live, real-time line chart mapping the raw analog heartbeat wave from Node 3.
A "Threat Radar" UI that visualizes the airspace using the data from Node 1 and Node 2.
A decrypted live video feed container (which turns to static noise when the system locks down).
5. Development Roadmap (Phase-by-Phase Execution)
Phase 1: The Bio-Lock Pipeline
Flash Node 3 to read the analog sensor.
Write the FastAPI Python script to receive this analog data.
Implement the SHA-3 hashing and AES encryption loop in Python. Verify that removing your finger scrambles the data.
Phase 2: The Spatial WIDS Pipeline
Flash Node 1 and Node 2 to scan Wi-Fi and send RSSI data to the FastAPI server.
Write the Python logic to filter for target networks (e.g., looking for unexpected networks named "VIT_Secure" or tracking sudden spikes in unknown MAC addresses).
Link the Threat Detection flag to the AES Key destruction function.
Phase 3: The Presentation UI
Build the Next.js frontend.
Connect the Next.js frontend to the FastAPI backend to visualize the heartbeat and the radar.
Phase 4: Hardware Assembly
Solder the 3-pin sensor to longer wires.
Dremel/modify the USB mouse to expose the optical sensor where the thumb or palm rests.
Mount Node 1 and Node 2 in their physical presentation positions.
