const Discord = require("discord.js");
const Gamedig = require("gamedig");
const mongoose = require("mongoose");
const Guild = require("./schemas.js");
const { token } = require("./temp.json");

//Create bot instance
const bot = new Discord.Client({ disableEveryone: true });

//fix mongoose warnings
mongoose.set('useFindAndModify', false);
//mongoose.set('debug', true);

//connect to status bot DB, handle connection errors
mongoose.connect('mongodb://localhost/statusbot', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Connected to MongoDB!")
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

//Important constants
const STARTUP_MESSAGE_PLAYERS_KEY = "**ONLINE PLAYERS**";
const STARTUP_MESSAGE = "-------------------------"

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

//function that takes a server object (type, host) and returns the server's info
//MUST BE CALLED AFTER QUERY
const handleGamedigQuery = function (server) {
    new Promise(resolve => {
        return Gamedig.query(server)
            .then(resolve)
            .catch(error => {
                console.log("Server is offline!");
            });
    });
}

//function takes a server object, and returns a list of active players in separate lines
//MUST BE CALLED AFTER QUERY
const getActivePlayers = (delimiter = ", \n", server) =>
    handleGamedigQuery(server)
        .then(state => {
            return Promise.resolve(
                state.players.length
                    ? state.players.map(ply => ply.name).join(delimiter)
                    : ""
            );
        })
        .catch(console.error);


//function that takes a discord channel id and a server object, and updates its name with server info
//MUST BE CALLED AFTER QUERY
const vChannelUpdate = function (channelid, server) {
    handleGamedigQuery(server)
        .then(state => {
            var status = state.players.length + " in " + state.map;
            let statuschannel = bot.channels.get(channelid);
            statuschannel.setName(status);
            console.log("Server status updated!");
            Promise.resolve();
        })
        .catch(console.error);
}

const pushServer = function (server) {

}

//function that takes STARTUP_MESSAGE, a channel ID and a server object, and edits the 
//MUST BE CALLED AFTER QUERY
const tChannelUpdate = (message, channelid, server) =>
    getActivePlayers(server)
        .then(players => {
            let channel = bot.channels.get(channelid)
            return channel.fetchMessages().then(messages => {
                players = players.length
                    ? players
                    : "----***There are no players online right now, be the first to join!***----";

                // Ensure we obtain the first message sent with the startup-message
                let sortedMessages = [...messages]
                    .sort((fm, sm) => fm[0] - sm[0])
                    .map(msg => msg[1])
                    .filter(
                        ({ author, content }) =>
                            content.includes(STARTUP_MESSAGE_PLAYERS_KEY) && author.bot
                    );

                let lastMessage = sortedMessages[sortedMessages.length - 1];

                // If the startup message is not in the list, send the message. Otherwise edit it.
                return !lastMessage
                    ? channel.send(message + "\n" + players)
                    : lastMessage.edit(STARTUP_MESSAGE + "\n" + players);
            });
        })
        .catch(console.error);

//function that returns the prefix of a guild
const getPrefix = function () {
    return "!" //just for testing purposes
}

//function that creates and returns a server object
const createServerObject = function () {

}

//function that queries the DB and returns the current guild's info as a JSON
const guildQuery = function () {

}

//message handler for commands
const handleMessage = async message => {
    if (
        message === undefined || // Message must exist
        message.author.bot || // Message must not be from the bot
        message.channel.type === "dm" || // message must not be a dm
        message.content[0] !== getPrefix() // Message must contain the assumed prefix
    )
        return;

    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let args = messageArray.slice(1);

    // Allow l/u-case commands. Return an error if the command is invalid
    if (
        !Object.values(COMMANDS)
            .map(code => getPrefix() + code.toLowerCase())
            .find(code => code === cmd.toLowerCase())
    ) {
        console.log("Unrecognized command entered. I will ignore it 8)");
        //message.channel.send("Sorry! We didn't recognize that command.");
    }

    //command that displays the credits for the bot
    if (cmd === `${getPrefix()}${COMMANDS.CREDITS}`) {
        message.channel.send(
            //Credits: Bonzo hehe
            "I was made by <@164216955367063552>"
        );
    }

    //command that DM's the help for the bot to the user
    if (cmd === `${getPrefix()}${COMMANDS.HELP}`) {
        message.channel.send(
            "I was made by Bonzo"
        );
    }

    //
    if (cmd === `${getPrefix()}${COMMANDS.ADD_SERVER}`) {
        //MESSAGE PROTOTYPE: !addserver dmgttt garrysmod 1.1.1.1

        //3 arguments must be provided
        if (args.length != 3) { message.channel.send("Error: Invalid number of parameters"); return; }
        message.channel.send("Initializing server tracking...");

        //extract info from arguments
        let serverName = args[0];
        let gameType = args[1];
        let serverIP = args[2];

        //create text and voice channels
        let tChannelName = serverName + "-player-list";
        let tChannelID;
        let vChannelID;
        let currentGuild = message.guild;
        let currentGuildID = currentGuild.id;

        //create text channel
        await currentGuild.createChannel(tChannelName, { type: "text" })
            .then(textchan => {
                tChannelID = textchan.id;
            })
            .catch(() => console.log('Failed to create text channel'))

        //create voice channel
        await currentGuild.createChannel("Initializing", { type: "voice" })
            .then(voicechan => {
                vChannelID = voicechan.id;
            })
            .catch(() => console.log('Failed to create voice channel'))

        //create server object to be pushed to server array
        var newServer = { name: serverName, type: gameType, host: serverIP, vchannelid: vChannelID, tchannelid: tChannelID }

        //add server to database array
        console.log("Updating servers info...");
        Guild.findOneAndUpdate({ discordid: currentGuildID }, { $push: { servers: newServer } })
            .then(console.log("Info updated and uploaded!"))
            .catch(console.error)

    }

    if (cmd === `${getPrefix()}${COMMANDS.REMOVE_SERVER}`) {
        //MESSAGE PROTOTYPE: !removeserver dmgttt

        //1 argument must be provided
        if (args.length != 1) { message.channel.send("Error: Invalid number of parameters"); return; }
        message.channel.send("Deleting server...");

        //extract info from arguments
        let serverName = args[0];

        let currentGuild = message.guild;
        let currentGuildID = currentGuild.id;

        //looks for server with given name in arguments
        await Guild.findOne({ discordid: currentGuildID, "servers.name": serverName }, function (err, result) {
            if (err) { console.error }
            if (!result) { //if not found, sends error message
                message.channel.send("Error: There is no server with that name. Try again.");
                return;
            } else { //if found:
                //sends discord message warning that the server has been deleted.
                message.channel.send("The server has been deleted from the database!");

                //deletes text channel
                let del = currentGuild.channels.find(e => e.name === serverName + "-player-list");
                del.delete();

                //deletes voice channel
                var voiceChannelID;
                Guild.findOne({ discordid: currentGuildID, "servers.name": serverName }).exec((err, data) => {
                    let serverArray = data.servers;
                    for (var i = 0; i < serverArray.length; i++) {
                        if (serverArray[i].name == serverName) {
                            voiceChannelID = serverArray[i].vchannelid
                        }
                    }
                    currentGuild.channels.get(voiceChannelID).delete()
                })

                //updates database deleting the server in question
                Guild.updateOne({ discordid: currentGuildID }, { $pull: { servers: { name: serverName } } })
                    .then(console.log("Database updated"))
                    .catch(console.error)

            }
        });
    }
}



//Sets the "game" being played by the bot every 30 seconds
bot.on("ready", () => {
    console.log(`${bot.user.username} is online!`);
    console.log("I am ready!");
});

// Handle messages
bot.on("message", handleMessage);

// Login using the bot.
bot.login(token ? token : process.env.BOT_TOKEN); //BOT_TOKEN is the Client Secret

//HANDLEGAMEDIGQUERY IS CALLED AFTER THE QUERY FOR THE SERVER HAS BEEN MADE, AND
//I HAVE THE DATA FOR THAT GUILD AND ITS SERVERS. 
//SERVER OBJECT: (TYPE, HOST)
