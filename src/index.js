const discord = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");

const settingsData = fs.readFileSync("../conf/settings.json");
const settings = JSON.parse(settingsData);

/**
 * Variable definitions to connect the bot to Discord and the PostgreSQL database.
 */
const discordClient = new discord.Client();
discordClient.login(settings.discord.authToken);

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

const emoji = (status) => {
  return status === "ON" ? settings.bot.onEmoji : settings.bot.offEmoji;
};

const get = (message) => {
  fetch(settings.api.url, { method: "Get" })
    .then((res) => res.json())
    .then((json) => {
      let msg = "";

      json.items.forEach((item) => {
        msg += settings.bot.message
          .replace("%i", parseInt(item.machineId) + 1)
          .replace("%e", emoji(item.state))
          .replace("%s", item.state)
          .replace("%t", toDate(Date.now() / 1000 - item.date));
      });

      message.channel.send(msg);
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
        get(message);
      }
    }
  }
});

/**
 * The function that runs once the bot is connected with Discord, thereby up and running.
 * Think of this like you would of a "main"-function.
 */
discordClient.once("ready", () => {
  discordClient.user.setStatus("online");
});
