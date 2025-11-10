const { ArduinoIoTCloud } = require("arduino-iot-js");
const { OpenAI } = require("openai");
const dotenv = require('dotenv');
dotenv.config();

// Ping codes for different message types
const PING_CODES = {
    PLANT_NAME: 1,           // PlantPrompt: Name
    WATER_REQUEST: 2,        // PlantPrompt: Water Request
    PLANT_DIAGNOSIS: 3       // PlantPrompt: Plant Diagnosis
};

// Variables to hold cloud property values
let moistureThreshold = 0; // cloud val
let lightingFrequency = 0; // local val
let lightingDuration = 0; // local val
let wateringFrequency = 0; // local val
let wateringDuration = 0; // local val

// Define brightness and switchstate with placeholder values
let brightness = "50"; // Example brightness value as string
let switchstate = "true"; // Example switch state as string

let dimmedLight = { // To be integrated later with an LDR
    bri: brightness,
    swi: switchstate
};

const from = Math.floor(new Date('2024-06-28T00:20:15Z').getTime() / 1000);
const until = 0; // No need for end time, yet.
const durationInSeconds = wateringDuration; // Watering duration in seconds

// Bitmask values for different watering frequencies
const bitmasks = {
    daily: 3288334337,
    hourly: 2214592513,
    oneDay: 134217729,
    twoDay: 134217734,
    threeDay: 134217742,
    fourDay: 134217758,
    fiveDay: 134217790,
    sixDay: 134217854
};

let WatercloudScheduler = { //cloud val
    frm: from,
    len: durationInSeconds,
    to: until,
    msk: bitmasks
};

/**
 * Parse incoming message to determine the ping code and extract the content
 * Format: "PING:X:message content"
 */
function parseMessage(message) {
    const pingPattern = /^PING:(\d):(.+)$/;
    const match = message.match(pingPattern);
    
    if (match) {
        return {
            pingCode: parseInt(match[1]),
            content: match[2].trim()
        };
    }
    
    // Default to plant name if no ping code provided (backward compatibility)
    return {
        pingCode: PING_CODES.PLANT_NAME,
        content: message.trim()
    };
}

/**
 * Format message with ping code
 * Format: "PING:X:message content"
 */
function formatMessageWithPing(pingCode, message) {
    return `PING:${pingCode}:${message}`;
}

// Connect to Arduino IoT Cloud
(async () => {
    try {
        const client = await ArduinoIoTCloud.connect({
            deviceId: process.env.ARDUINO_CLOUD_DEVICEID,
            secretKey: process.env.ARDUINO_CLOUD_SECRETKEY,
            onDisconnect: (message) => {
                console.error("Disconnected from Arduino IoT Cloud:", message);
                console.log("Attempting to reconnect...");
                // Note: The library should handle reconnection automatically
            },
        });

        console.log("Successfully connected to Arduino IoT Cloud");

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Initial message to be displayed in the messaging widget
        let value = formatMessageWithPing(
            PING_CODES.PLANT_NAME,
            "Enter the plant name to get care instructions, or request watering/diagnosis."
        );
        let cloudVar = "plantPrompt";

        client.sendProperty(cloudVar, value);
        console.log(cloudVar, ":", value);

        // Handle incoming messages from messaging widget
        client.onPropertyValue(cloudVar, async (message) => {
            console.log("Message received:", message);

            const { pingCode, content } = parseMessage(message);
            console.log(`Processing request - Ping Code: ${pingCode}, Content: ${content}`);

            try {
                switch (pingCode) {
                    case PING_CODES.PLANT_NAME:
                        await handlePlantNameRequest(client, openai, cloudVar, content);
                        break;
                    
                    case PING_CODES.WATER_REQUEST:
                        await handleWaterRequest(client, cloudVar, content);
                        break;
                    
                    case PING_CODES.PLANT_DIAGNOSIS:
                        await handlePlantDiagnosis(client, openai, cloudVar, content);
                        break;
                    
                    default:
                        console.warn(`Unknown ping code: ${pingCode}`);
                        const errorMsg = formatMessageWithPing(
                            pingCode,
                            "Unknown request type. Please try again."
                        );
                        client.sendProperty(cloudVar, errorMsg);
                }
            } catch (error) {
                console.error(`Error handling request (Ping Code ${pingCode}):`, error.message);
                const errorMsg = formatMessageWithPing(
                    pingCode,
                    `Error processing request: ${error.message}. Please try again.`
                );
                client.sendProperty(cloudVar, errorMsg);
            }
        });

        // Logging for debug purposes
        client.onPropertyValue("moistureThreshold", (value) => console.log("Moisture Threshold:", value));
        client.onPropertyValue("lightingFrequency", (value) => console.log("Lighting Frequency:", value));
        client.onPropertyValue("lightingDuration", (value) => console.log("Lighting Duration:", value));
        client.onPropertyValue("wateringFrequency", (value) => console.log("Watering Frequency:", value));
        client.onPropertyValue("wateringDuration", (value) => console.log("Watering Duration:", value));
        client.onPropertyValue("dimmedLight", (value) => console.log("Received Dimmed Light:", value));
        client.onPropertyValue("WatercloudScheduler", (value) => console.log("Received Water cloud Scheduler:", value));

    } catch (error) {
        console.error("Error connecting to Arduino IoT Cloud:", error.message);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
})();

/**
 * Handle plant name request and get care instructions from OpenAI
 */
async function handlePlantNameRequest(client, openai, cloudVar, plantName) {
    console.log("Processing plant name:", plantName);

    // Send plant name to OpenAI API to get care instructions
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: `You are a plant care assistant. Given a plant name, provide the following care instructions: 
                1. Ideal soil moisture threshold as a percentage (0-100).
                2. Lighting frequency in hours per day (0-24).
                3. Lighting duration in hours (0-24).
                4. Watering frequency in days (1-7).
                5. Watering duration in seconds (1-300). 
                Respond ONLY with valid JSON format with these exact keys: moistureThreshold, lightingFrequency, lightingDuration, wateringFrequency, wateringDuration. All values must be numbers.`,
            },
            {
                role: "user",
                content: plantName,
            },
        ],
    });

    const careInstructions = JSON.parse(chatCompletion.choices[0].message.content);

    // Validate the response format
    if (
        typeof careInstructions.moistureThreshold !== 'number' ||
        typeof careInstructions.lightingFrequency !== 'number' ||
        typeof careInstructions.lightingDuration !== 'number' ||
        typeof careInstructions.wateringFrequency !== 'number' ||
        typeof careInstructions.wateringDuration !== 'number'
    ) {
        throw new Error("Invalid response format from OpenAI");
    }

    // Parse the response from OpenAI
    moistureThreshold = parseInt(careInstructions.moistureThreshold);
    lightingFrequency = parseInt(careInstructions.lightingFrequency);
    lightingDuration = parseInt(careInstructions.lightingDuration);
    wateringFrequency = parseInt(careInstructions.wateringFrequency);
    wateringDuration = parseInt(careInstructions.wateringDuration);

    // Determine bitmask for cloudScheduler based on wateringFrequency
    let bitmask;
    switch (wateringFrequency) {
        case 1:
            bitmask = bitmasks.oneDay;
            break;
        case 2:
            bitmask = bitmasks.twoDay;
            break;
        case 3:
            bitmask = bitmasks.threeDay;
            break;
        case 4:
            bitmask = bitmasks.fourDay;
            break;
        case 5:
            bitmask = bitmasks.fiveDay;
            break;
        case 6:
            bitmask = bitmasks.sixDay;
            break;
        default:
            bitmask = bitmasks.daily; // Default to daily if no match
    }

    WatercloudScheduler = {
        frm: from,
        len: wateringDuration,
        to: until,
        msk: bitmask
    };

    // Send parsed values to Arduino IoT Cloud
    client.sendProperty("moistureThreshold", moistureThreshold);
    client.sendProperty("lightingDuration", lightingDuration);
    client.sendProperty("wateringFrequency", wateringFrequency);
    client.sendProperty("wateringDuration", wateringDuration);
    client.sendProperty("dimmedLight", dimmedLight);
    client.sendProperty("WatercloudScheduler", WatercloudScheduler);

    console.log("Care instructions updated:", careInstructions);

    // Format care instructions into a readable message
    const careInstructionsMessage = `
Plant: ${plantName}
- Ideal Soil Moisture Threshold: ${moistureThreshold}%
- Lighting Frequency: ${lightingFrequency} hours/day
- Lighting Duration: ${lightingDuration} hours
- Watering Frequency: Every ${wateringFrequency} days
- Watering Duration: ${wateringDuration} seconds

Care settings updated successfully!`;

    // Send the formatted message with ping code to the Messenger widget
    const responseMsg = formatMessageWithPing(
        PING_CODES.PLANT_NAME,
        careInstructionsMessage.trim()
    );
    client.sendProperty(cloudVar, responseMsg);
}

/**
 * Handle manual water request
 */
async function handleWaterRequest(client, cloudVar, requestDetails) {
    console.log("Processing water request:", requestDetails);

    // Trigger manual watering
    // This could involve setting a flag or directly controlling the water pump
    // For now, we'll send a confirmation message
    
    const responseMsg = formatMessageWithPing(
        PING_CODES.WATER_REQUEST,
        `Manual watering initiated. ${requestDetails || 'Watering now...'}`
    );
    
    client.sendProperty(cloudVar, responseMsg);
    
    // You can add logic here to trigger actual watering
    // For example: client.sendProperty("manualWater", true);
    console.log("Manual water request processed");
}

/**
 * Handle plant diagnosis request using OpenAI
 */
async function handlePlantDiagnosis(client, openai, cloudVar, symptoms) {
    console.log("Processing plant diagnosis:", symptoms);

    // Send symptoms to OpenAI API to get diagnosis
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: `You are a plant health expert. Given symptoms or issues with a plant, provide:
                1. Possible diagnosis of the problem
                2. Recommended solutions
                3. Preventive measures
                Keep your response concise and practical, limited to 200 words.`,
            },
            {
                role: "user",
                content: symptoms,
            },
        ],
    });

    const diagnosis = chatCompletion.choices[0].message.content;

    console.log("Diagnosis received:", diagnosis);

    // Format diagnosis message
    const diagnosisMessage = `
Plant Diagnosis:
${diagnosis}`;

    // Send the formatted message with ping code to the Messenger widget
    const responseMsg = formatMessageWithPing(
        PING_CODES.PLANT_DIAGNOSIS,
        diagnosisMessage.trim()
    );
    client.sendProperty(cloudVar, responseMsg);
}
