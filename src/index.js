const discord = require("discord.js");
const telegram = require("telegram-bot-api");
const fetch = require("node-fetch");
const fs = require("fs");

const settingsData = fs.readFileSync("../conf/settings.json");
const settings = JSON.parse(settingsData);

/**
 * Variable definitions to connect the bot to Discord and the PostgreSQL database.
 */
const discordClient = new discord.Client();
discordClient.login(settings.discord.authToken);

const telegramClient = new telegram({ token: settings.telegram.authToken });
telegramClient.getMe().then(console.log).catch(console.err);

const botWasMentioned = (m) => {
  if (m.channel.type === "text" && m.mentions.members.first() !== undefined) {
    return m.mentions.members.first().id === settings.discord.clientId;
  } else {
    return false;
  }
};

const pad = (num) => {
  return ("0" + num).slice(-2);
};

const toDate = (date) => {
  if (date < 3600) {
    return `${pad(Math.floor(date / 60))}min ${pad(Math.floor(date % 60))}s`;
  } else {
    return `${Math.floor(date / 3600)}h ${pad(
      Math.floor((date % 3600) / 60)
    )}min ${pad(Math.floor(date % 60))}s`;
  }
};

const emoji = (service, status) => {
  if (service === "discord") {
    return status === "ON"
      ? settings.discord.onEmoji
      : settings.discord.offEmoji;
  } else if (service === "telegram") {
    return status === "ON"
      ? settings.telegram.onEmoji
      : settings.telegram.offEmoji;
  }
};

const get = (service, callback) => {
  fetch(settings.api.url, { method: "Get" })
    .then((res) => res.json())
    .then((json) => {
      let msg = "";

      json.items.forEach((item) => {
        if (service === "discord") {
          msg += settings.discord.message
            .replace("%i", parseInt(item.machineId) + 1)
            .replace("%e", emoji(service, item.state))
            .replace("%s", item.state)
            .replace("%t", toDate(Date.now() / 1000 - item.date));
        } else {
          msg += settings.telegram.message
            .replace("%i", parseInt(item.machineId) + 1)
            .replace("%e", emoji(service, item.state))
            .replace("%s", item.state)
            .replace("%t", toDate(Date.now() / 1000 - item.date));
        }
      });

      callback(msg);
    });
};

/**
 * The function that handles received messages.
 * The database is updated with every message, but a response is only sent when the bot is mentioned or the message is received via DM.
 */
discordClient.on("message", (message) => {
  if (!message.author.bot && !message.author.system) {
    let content = message.content.toLowerCase();

    if (botWasMentioned(message) || message.channel.type === "dm") {
      if (content.includes("!help")) {
        message.channel.send("TODO: Write Help");
      }

      if (content.includes("!status")) {
        message.channel.send("Loading...");
        get("discord", (msg) => message.channel.send(msg));
      }
    }
  }
});

telegramClient.on("update", (update) => {
  console.log(update);

  let content = update.message.text.toLowerCase();

  if (content.includes("/help")) {
    telegramClient.sendMessage({
      chat_id: update.message.chat.id,
      parse_mode: "markdown",
      text: "TODO: Write Help",
    });
  }

  if (content.includes("/start") || content.includes("/status")) {
    get("telegram", (message) =>
      telegramClient.sendMessage({
        chat_id: update.message.chat.id,
        parse_mode: "markdown",
        text: message,
      })
    );
  }
});

/**
 * The function that runs once the bot is connected with Discord, thereby up and running.
 * Think of this like you would of a "main"-function.
 */
discordClient.once("ready", () => {
  discordClient.user.setStatus("online");
});

const messageProvider = new telegram.GetUpdateMessageProvider();
telegramClient.setMessageProvider(messageProvider);
telegramClient.start().then(() => {
  console.log("API has started");
});
