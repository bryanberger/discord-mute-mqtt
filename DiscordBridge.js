const fs = require("fs");
const EventEmitter = require("events");
const discord = require("discord-rpc");

const events = require("./events");

const connectRetry = 10000;
const tokenFile = "./tmp/.token";
const redirectUri = "https://localhost:8080/authorize";

const CONNECT_FAILURE = {
  NOT_RUNNING: 1,
  UNKNOWN: 2,
};

class DiscordBridge extends EventEmitter {
  constructor(clientId, clientSecret) {
    super();

    this.accessToken = null;
    this.client = null;
    this.clientSecret = clientSecret;
    this.clientId = clientId;
    this.scopes = ["rpc"];
    this.userState = {
      inChannel: false,
      isMuted: false,
      // isTalking: false,
    };
  }

  withAccessToken(accessToken) {
    this.accessToken = accessToken;
    return this;
  }

  connect() {
    new Promise((resolve, reject) => {
      this.tryConnect(resolve, reject).catch((error) => {
        if (error !== CONNECT_FAILURE.NOT_RUNNING) {
          reject(error);
          return;
        }

        const intervalTimeout = setInterval(() => {
          this.tryConnect(resolve, reject, intervalTimeout);
        }, connectRetry);
      });
    }).then(() => {
      return this.login();
    });
  }

  async tryConnect(resolve, reject, intervalTimeout = null) {
    this.client = new discord.Client({ transport: "ipc" });
    this.client.on("ready", this.onReady); // when connect'd

    return this.client
      .connect(this.clientId)
      .then(() => {
        if (intervalTimeout !== null) {
          clearInterval(intervalTimeout);
        }

        this.emit(events.CONNECTED, this.client);
        this.client.on("disconnected", this.onDisconnect);
        resolve();
      })
      .catch((e) => {
        if (e.message === "Could not connect") {
          // avoid an extra param by using this as a flag indicating that we're doing a start-up connect attempt
          if (intervalTimeout === null) {
            // not a `reject()` because then the `connect` `Promise` will fail
            throw CONNECT_FAILURE.NOT_RUNNING;
          }

          return;
        }

        console.error(e);
        reject(CONNECT_FAILURE.UNKNOWN);
      });
  }

  login() {
    if (this.accessToken) {
      return this.client.authenticate(this.accessToken);
    }

    const { accessToken } = this.client.login({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      scopes: this.scopes,
      redirectUri: redirectUri,
    });

    this.accessToken = accessToken;

    // store access token for later, for now, to a local file
    fs.writeFileSync(tokenFile, this.accessToken, { encoding: "utf8" });

    return this.client.authenticate(this.accessToken);
  }

  emiteMuteChange() {
    if (this.userState.isMuted) {
      // if (this.userState.inChannel && this.userState.isMuted) {
      this.emit(events.MUTE_CHANGE, true);
    } else {
      this.emit(events.MUTE_CHANGE, false);
    }
  }

  onDisconnect = () => {
    this.client.destroy();
    this.emit(events.DISCONNECT);
    this.connect();
  };

  onReady = () => {
    console.debug("Logged in as", this.client.application.name);
    console.debug("Authed for user", this.client.user.username);

    this.client.subscribe("VOICE_SETTINGS_UPDATE");
    this.client.subscribe("VOICE_CHANNEL_SELECT");

    this.client.on("VOICE_CHANNEL_SELECT", ({ channel_id }) => {
      this.userState.inChannel = channel_id !== null;
      // this.emiteMuteChange();
    });

    this.client.on("VOICE_SETTINGS_UPDATE", ({ mute, deaf }) => {
      this.userState.isMuted = mute || deaf;
      this.emiteMuteChange();
    });
  };
}

module.exports = DiscordBridge;
