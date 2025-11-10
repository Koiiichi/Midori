# **Midori: Autonomous Plant System**

Midori began in **2023** as a small proof-of-concept exploring how low-power microcontrollers could collaborate with cloud-based intelligence to automate plant care.
The idea was simple: build a plant system that **senses, adapts, and responds** — without human intervention. What started as an experiment in embedded programming evolved into a working prototype connecting firmware, IoT cloud control, and adaptive automation.

---

## **Overview**

Midori implements a **closed-loop control system** that monitors soil moisture, light, and temperature, and reacts automatically through lighting and irrigation.
It uses **Arduino IoT Cloud** for synchronization and a **Node.js controller** for high-level logic and data publishing.
The project focuses on **firmware reliability, modularity, and feedback-driven automation**, not on product commercialization.

The system currently exists across several experimental builds, each exploring a specific subsystem:

* **Kōjō** – Cloud control and firmware interface.
* **Midori Watering Module** – Automated irrigation unit with moisture feedback.
* **Midori 1** – Combined sensing, lighting, and watering prototype.
* **Midori Pro (in progress)** – Multi-planter coordination over shared communication lines.
* **Soilpod** – Custom hydroponic medium engineered for stable moisture and nutrient flow.

This repository documents **Midori 1**, the main working prototype.

---

## **System Architecture**

Built for modular experimentation.

```
Cloud Layer
│
├── Node.js Controller
│   └── Publishes and updates Arduino IoT Cloud variables (CloudDimmedLight, CloudSchedule)
│
└── Arduino IoT Cloud
    └── Synchronizes over MQTT with device firmware
        ↓
Firmware Layer (ESP32 / Arduino)
│   ├── moistdetect – soil moisture sensing module
│   ├── Luminator – adaptive lighting driver using PWM and light feedback
│   ├── directconnect – modular bus for power, water, and data between planters
│   └── Modularity system – communication interface for connected modules
        ↓
Hardware Layer
    ├── Pumps / valves – water regulation
    ├── LEDs / drivers – lighting system managed by Luminator
    ├── Sensors – moisture, ambient light, temperature
    └── Reservoir or tap-based water source
```

---

## **Core Technologies**

Built on open, accessible hardware and cloud APIs.

* **Firmware:** Arduino C++ (ESP32 / Uno)
* **Cloud Integration:** Arduino IoT Cloud SDK (`CloudDimmedLight`, `CloudSchedule`)
* **Controller:** Node.js + [`arduino-iot-js`](https://www.npmjs.com/package/arduino-iot-js)
* **Sensors:** Moisture, ambient light, temperature
* **Actuators:** LED driver, micro-pump, solenoid valve
* **Connectivity:** Wi-Fi (MQTT over TLS)
* **Power:** Battery / DC input

---

## **Cloud Variables**

Midori synchronizes its state through structured cloud properties.

| Variable         | Function                       | Type               | Example JSON                                                    |
| ---------------- | ------------------------------ | ------------------ | --------------------------------------------------------------- |
| `dimmedLight`    | Lighting brightness and on/off | `CloudDimmedLight` | `{"bri":"19","swi":"true"}`                                     |
| `cloudScheduler` | Watering and lighting schedule | `CloudSchedule`    | `{"frm":1719533715,"len":300,"to":1719601200,"msk":3288334337}` |

---

## **Workflow**

A focus on **feedback and synchronization**.

1. **Cloud Synchronization**
   The Node.js controller publishes new lighting and watering parameters to the Arduino IoT Cloud.

2. **Firmware Reaction**
   The ESP32 firmware receives MQTT updates and applies them via firmware callbacks:

   ```cpp
   void onDimmedLightChange() {
       analogWrite(LED_PIN, map(dimmedLight.bri, 0, 100, 0, 255));
       digitalWrite(LED_SWITCH_PIN, dimmedLight.swi ? HIGH : LOW);
   }

   void onScheduleUpdate() {
       // Activate pump based on schedule parameters
   }
   ```

3. **Hardware Response**
   Sensors continuously provide feedback on environment variables, which the firmware uses to fine-tune lighting and watering.

4. **Feedback Loop**
   The cloud dashboard displays telemetry and allows manual overrides for testing and calibration.

---

## **Node.js Controller Example**

```javascript
import { ArduinoIoTCloud } from "arduino-iot-js";
import dotenv from "dotenv";
dotenv.config();

const dimmedLight = { bri: "19", swi: "true" };
const cloudScheduler = { frm: 1719533715, len: 300, to: 1719601200, msk: 3288334337 };

(async () => {
  const client = await ArduinoIoTCloud.connect({
    deviceId: process.env.ARDUINO_CLOUD_DEVICEID,
    secretKey: process.env.ARDUINO_CLOUD_SECRETKEY,
  });

  await client.sendProperty("dimmedLight", dimmedLight);
  await client.sendProperty("cloudScheduler", cloudScheduler);

  console.log("Midori 1 cloud variables updated.");
})();
```

---

## **Current Goals**

Building toward reliability and scalability.

* Validate **firmware–cloud synchronization** under real conditions.
* Test **multi-planter communication** via DirectConnect.
* Refine **adaptive lighting control** using the Luminator module.
* Optimize **power and communication efficiency** across modules.

---

## **Next Steps**

Where Midori experiments next.

* Extend **DirectConnect** for shared data and power buses.
* Prototype **Midori Pro** for distributed coordination.
* Add **AI-assisted irrigation** using sensor-derived datasets.
* Explore **nutrient control feedback** for hydroponic variants.

---

## **License**

MIT License © 2025 Muneeb Hassan
