const {
    prefix,
    token,
    gamedigConfig,
    channels
} = require("./botconfig.json");
const Discord = require("discord.js");
const Gamedig = require("gamedig");
const fs = require("fs");
const bot = new Discord.Client({ disableEveryone: true });

