# **Midori: Intelligent Plant System Prototype**

Midori is a developer-led **smart plant system** that combines **embedded control**, **IoT integration**, and **adaptive automation** to maintain optimal plant health.
Originally started in 2023 as a proof of concept under a small development team, the project explores scalable methods for connecting low-power embedded firmware with cloud-based intelligence for autonomous plant care.

---

## **Overview**

Midori prototypes a **closed-loop plant maintenance system** integrating sensors, actuators, and cloud logic to automate soil moisture, lighting, and irrigation.
The architecture uses **Arduino IoT Cloud** as the synchronization layer and a **Node.js controller** for high-level coordination, focusing on modularity and reproducibility rather than commercialization.

The project currently maintains multiple working prototypes, each testing different aspects of the design:

* **Kōjō** – Core control system and cloud interface.
* **Midori Watering Module** – Compact automated watering unit with feedback control.
* **Midori 1** – Primary prototype combining moisture sensing, adaptive lighting, and automated irrigation.
* **Midori Pro (in progress)** – Multi-planter interconnect design for distributed coordination experiments.
* **Soilpod** – Experimental hydroponic substrate engineered for moisture regulation and capillary diffusion.

This repository documents the **Midori 1** prototype.

---

## **System Architecture**

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
│   ├── moistdetect – soil moisture sensing
│   ├── Luminator – adaptive lighting control (PWM + feedback)
│   ├── directconnect – modular interface for power/water/data
│   └── Modularity system – inter-planter communication bus
        ↓
Hardware Layer
    ├── Pumps / valves – water regulation
    ├── LEDs / drivers – lighting control
    ├── Sensors – moisture, light, temperature
    └── Reservoir or tap-based supply
```

---

## **Core Technologies**

* **Firmware:** Arduino C++ (ESP32 / Uno compatible)
* **Cloud Integration:** Arduino IoT Cloud SDK (`CloudDimmedLight`, `CloudSchedule`)
* **Controller:** Node.js with [`arduino-iot-js`](https://www.npmjs.com/package/arduino-iot-js)
* **Sensors:** Moisture, ambient light, temperature
* **Actuators:** LED driver, micro-pump, solenoid valve
* **Connectivity:** Wi-Fi (MQTT over TLS)
* **Power:** Battery or direct DC input

---

## **Cloud Variable Mapping**

| Variable         | Function                       | Firmware Type      | Example JSON                                                    |
| ---------------- | ------------------------------ | ------------------ | --------------------------------------------------------------- |
| `dimmedLight`    | Lighting brightness and on/off | `CloudDimmedLight` | `{"bri":"19","swi":"true"}`                                     |
| `cloudScheduler` | Watering and lighting schedule | `CloudSchedule`    | `{"frm":1719533715,"len":300,"to":1719601200,"msk":3288334337}` |

---

## **System Workflow**

1. **Cloud Synchronization**
   The Node.js controller publishes updated lighting and watering parameters to Arduino IoT Cloud.

2. **Firmware Reaction**
   The ESP32 firmware receives MQTT updates and executes callbacks:

   ```cpp
   void onDimmedLightChange() {
       analogWrite(LED_PIN, map(dimmedLight.bri, 0, 100, 0, 255));
       digitalWrite(LED_SWITCH_PIN, dimmedLight.swi ? HIGH : LOW);
   }

   void onScheduleUpdate() {
       // Trigger pump according to schedule parameters
   }
   ```

3. **Hardware Response**
   Moisture and light readings drive real-time adaptation of lighting and irrigation cycles.

4. **Feedback Loop**
   The Arduino IoT Cloud dashboard provides remote telemetry and manual override.

---

## **Node.js Control Example**

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

## **Current Objectives**

* Validate **firmware–cloud synchronization** and closed-loop reliability.
* Test **multi-planter coordination** via modular interconnects.
* Refine **adaptive lighting control** using sensor feedback.
* Optimize **power and communication efficiency** across prototypes.

---

## **Next Steps**

* Extend **DirectConnect** for multi-node data/power sharing.
* Prototype **Midori Pro** bus network for distributed control.
* Explore **AI-driven irrigation prediction** using environmental data.
* Experiment with **nutrient control modules** and hydroponic feedback.

---

## **License**

MIT License © 2025 Muneeb Hassan
