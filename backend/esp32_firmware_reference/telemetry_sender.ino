/**
 * AquaFilter — ESP32 NodeMCU Telemetry Sender Reference
 *
 * Demonstrates how to:
 *  1. Read pH, turbidity, and TDS sensors
 *  2. Serialize the payload as JSON
 *  3. Sign the payload with HMAC-SHA256
 *  4. POST to the backend API with the device signature header
 *
 * Libraries required:
 *   - ArduinoJson     (bblanchon/ArduinoJson)
 *   - mbedTLS HMAC    (included in ESP32 Arduino core)
 *   - HTTPClient      (included in ESP32 Arduino core)
 *   - WiFi            (included in ESP32 Arduino core)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/md.h"

// --- Configuration ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL       = "http://YOUR_SERVER_IP:5000/api/telemetry";
const char* DEVICE_ID     = "DEVICE_001";
const char* HMAC_SECRET   = "your_esp32_shared_hmac_secret_key"; // Must match backend .env

// Telemetry interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 5000;

// --- Analog pin assignments (adjust for your wiring) ---
const int PH_SENSOR_PIN        = 34;
const int TURBIDITY_SENSOR_PIN = 35;
const int TDS_SENSOR_PIN       = 32;

// Calibration offsets (tune via bench calibration)
const float PH_OFFSET        = 0.0;
const float TURBIDITY_OFFSET = 0.0;
const float TDS_FACTOR       = 0.5; // Conversion: raw ADC → ppm

unsigned long lastTelemetrySentAt = 0;

// -------------------------------------------------------------------
// HMAC-SHA256
// -------------------------------------------------------------------

String computeHmacSha256(const String& message, const char* secret) {
  byte hmacResult[32];
  const mbedtls_md_info_t* mdInfo = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_hmac(
    mdInfo,
    (const unsigned char*)secret, strlen(secret),
    (const unsigned char*)message.c_str(), message.length(),
    hmacResult
  );

  String hexResult = "";
  for (int i = 0; i < 32; i++) {
    if (hmacResult[i] < 0x10) hexResult += "0";
    hexResult += String(hmacResult[i], HEX);
  }
  return hexResult;
}

// -------------------------------------------------------------------
// SENSOR READS (replace with actual calibration code)
// -------------------------------------------------------------------

float readPh() {
  int raw = analogRead(PH_SENSOR_PIN);
  // Linear mapping example — replace with your probe's calibration curve
  float voltage = raw * (3.3 / 4095.0);
  return (3.5 * voltage) + PH_OFFSET;
}

float readTurbidity() {
  int raw = analogRead(TURBIDITY_SENSOR_PIN);
  float voltage = raw * (3.3 / 4095.0);
  // Turbidity sensor output is inversely proportional to voltage (SEN0189-style)
  float ntu = -1120.4 * voltage * voltage + 5742.3 * voltage - 4352.9;
  return max(0.0f, ntu + TURBIDITY_OFFSET);
}

float readTds() {
  int raw = analogRead(TDS_SENSOR_PIN);
  float voltage = raw * (3.3 / 4095.0);
  // Gravity TDS sensor formula
  float tds = (133.42 * voltage * voltage * voltage
               - 255.86 * voltage * voltage
               + 857.39 * voltage) * TDS_FACTOR;
  return max(0.0f, tds);
}

// -------------------------------------------------------------------
// TELEMETRY SENDER
// -------------------------------------------------------------------

void sendTelemetry(const char* samplePoint) {
  float ph        = readPh();
  float turbidity = readTurbidity();
  float tds       = readTds();

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["ph"]          = round(ph * 100.0) / 100.0;
  doc["turbidity"]   = round(turbidity * 10.0) / 10.0;
  doc["tds"]         = round(tds);
  doc["samplePoint"] = samplePoint;
  doc["timestamp"]   = ""; // Backend uses server time if empty

  String payload;
  serializeJson(doc, payload);

  // Compute HMAC signature
  String signature = computeHmacSha256(payload, HMAC_SECRET);

  // POST to backend
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Signature", signature);

  int httpCode = http.POST(payload);

  if (httpCode == 201) {
    Serial.printf("[Telemetry] Sent OK — pH:%.2f Turb:%.1f TDS:%.0f\n", ph, turbidity, tds);
  } else {
    Serial.printf("[Telemetry] Send failed — HTTP %d\n", httpCode);
  }

  http.end();
}

// -------------------------------------------------------------------
// SETUP & LOOP
// -------------------------------------------------------------------

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nConnected — IP: %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (millis() - lastTelemetrySentAt >= TELEMETRY_INTERVAL_MS) {
    if (WiFi.status() == WL_CONNECTED) {
      // Alternate sample points or use your relay/valve state to determine
      sendTelemetry("post-filter");
    } else {
      Serial.println("[WiFi] Disconnected — skipping telemetry");
    }
    lastTelemetrySentAt = millis();
  }
}
