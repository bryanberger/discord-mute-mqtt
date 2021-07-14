const EventEmitter = require("events");
const mqtt = require("mqtt");
const events = require("./events");

class MqttClient extends EventEmitter {
  constructor(username, password, broker_url) {
    super();

    this.username = username;
    this.password = password;
    this.broker_url = broker_url;

    this.client = mqtt.connect(this.broker_url, {
      username: this.username,
      password: this.password,
    });

    this.client.on("connect", (e) => this.emit(events.CONNECTED));
  }

  turnOn = () => {
    if (this.client.connected)
      this.client.publish(process.env.MQTT_TOPIC, process.env.MQTT_MESSAGE_ON);
  };

  turnOff = () => {
    if (this.client.connected)
      this.client.publish(process.env.MQTT_TOPIC, process.env.MQTT_MESSAGE_OFF);
  };
}

module.exports = MqttClient;
