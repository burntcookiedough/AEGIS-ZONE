const int HEARTBEAT_PIN = 34; // Analog pin for Bio-Lock
const int BAUD_RATE = 115200;

void setup() {
  Serial.begin(BAUD_RATE);
  // Optional: Add a delay to let the serial monitor connect
  delay(1000);
  Serial.println("AEGIS-ZONE Bio-Lock Node Initialized");
}

void loop() {
  // Read the raw analog voltage from the heartbeat sensor
  int rawValue = analogRead(HEARTBEAT_PIN);
  
  // Format the output specifically so the Python backend can parse it cleanly
  Serial.print("BIO:");
  Serial.println(rawValue);
  
  // High-frequency loop but with a small delay to avoid flooding serial buffer entirely
  delay(20); // ~50Hz sampling rate
}
