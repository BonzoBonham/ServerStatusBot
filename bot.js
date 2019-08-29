const Discord = require("discord.js");
const gamedig = require("gamedig");
//const fs = require("fs");
const mongoose = require("mongoose")
const Guild = require("./schemas.js")

//Create bot instance
const bot = new Discord.Client({ disableEveryone: true });

//connect to status bot DB, handle connection errors
mongoose.connect('mongodb://localhost/statusbot', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("I'M IN!")
    Guild.find({ name: "SSS" }).exec((err, data) => { console.log(JSON.stringify(data)) }) //test query
});

//List of supported commands
const COMMANDS = {
    HELP: "help",
    INVITE: "invite",
    ADD_SERVER: "addserver",
    REMOVE_SERVER: "removeserver",
    CREDITS: "credits"
}

// Handle potential uncaught errors resulting from dependencies. (thanks, john!)
process.on("unhandledRejection", function (err, promise) {
    // ignore improperly-chained promise rejections from Sequential.js
    if (err.stack.includes("Sequential.js:79:15")) {
        return;
    }
    console.error(
        "Unhandled rejection (promise: ",
        promise,
        ", reason: ",
        err,
        ")."
    );
});



