#include <WiFi.h>
#include <ArduinoWebsockets.h> // Library: ArduinoWebsockets by Gil Maimon

// Configuration
#define NODE_ID "NODE_1" // Change to "NODE_2" when flashing the second board!
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websockets_server = "ws://192.168.1.X:8000/ws/wids-ingest"; // Update with Pi's IP

using namespace websockets;
WebsocketsClient client;

void setup() {
  Serial.begin(115200);
  
  // Set WiFi to station mode and disconnect from an AP if it was previously connected
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.println("AEGIS-ZONE WIDS Scanner Initialized: " NODE_ID);
  
  // Connect to the actual network to send data
  Serial.print("Connecting to WiFi ");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Connect to the WebSocket server
  Serial.print("Connecting to Backend WS: ");
  Serial.println(websockets_server);
  bool connected = client.connect(websockets_server);
  if (connected) {
    Serial.println("Connected!");
  } else {
    Serial.println("WS Connection Failed!");
  }
}

void loop() {
  if (client.available()) {
    client.poll();
  }

  // If disconnected, try to reconnect
  if(WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected! Reconnecting...");
      WiFi.begin(ssid, password);
      delay(3000);
      return;
  }
  
  Serial.println("Starting Wi-Fi Sweep...");
  int n = WiFi.scanNetworks();
  
  if (n == 0) {
    Serial.println("No networks found.");
  } else {
    // Construct a JSON payload
    String payload = "{\"node_id\":\"" NODE_ID "\",\"networks\":[";
    for (int i = 0; i < n; ++i) {
      payload += "{";
      payload += "\"bssid\":\"" + WiFi.BSSIDstr(i) + "\",";
      payload += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
      payload += "\"rssi\":" + String(WiFi.RSSI(i));
      payload += "}";
      if (i < n - 1) payload += ",";
    }
    payload += "]}";

    // Send the sweep data to the backend
    if (client.available()) {
        client.send(payload);
        Serial.println("Sweep Data Transmitted to Backend.");
    } else {
        Serial.println("WS Disconnected. Attempting reconnect...");
        client.connect(websockets_server);
    }
  }

  // Clear memory and wait before next scan (aggressive scanning can cause heat/instability)
  WiFi.scanDelete();
  delay(1000); // 1 second between sweeps
}
