# Discord Mute MQTT Led Controller

This program authenticates to the Discord RPC client and listens for `mute` voice events. Upon detecting that you've muted/unmuted your microphone it sends an MQTT message to a broker and topic of your choice.

I use it to turn on and off an LED strip based on my Discord mute state.

![demo](.github/demo.gif?raw=true)

## Development

Copy `.env.example` to `.env` update the Discord and MQTT variables.

```
npm install
npm start
```