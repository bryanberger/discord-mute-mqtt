require("dotenv").config();
const fs = require("fs");

const DiscordBridge = require("./DiscordBridge");
const MqttClient = require("./MqttClient");
const events = require("./events");

(async () => {
  const mqtt = new MqttClient(
    process.env.MQTT_USERNAME,
    process.env.MQTT_PASSWORD,
    process.env.MQTT_BROKER_URL
  );
  mqtt.on(events.CONNECTED, () => console.log("mqtt connected"));

  const token = fs.readFileSync("./tmp/.token", { encoding: "utf8", flag: "r" });
  const bridge = new DiscordBridge(
    process.env.DISCORD_BOT_CLIENT_ID,
    process.env.DISCORD_BOT_CLIENT_SECRET
  );
  bridge.withAccessToken(token || null);
  bridge.connect();
  bridge.on(events.CONNECTED, (client) => console.log("discord connected"));
  bridge.on(events.DISCONNECT, () => console.log("discord disconnected"));
  bridge.on(events.MUTE_CHANGE, (muted) =>
    muted ? mqtt.turnOn() : mqtt.turnOff()
  );
})().catch((err) => {
  console.error(err);
});
