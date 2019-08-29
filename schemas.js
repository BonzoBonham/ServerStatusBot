const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Discord Guild schema
const guildSchema = Schema({
    name: { type: String },
    discordid: { type: String },
    prefix: { type: String },
    servers: [{
        name: { type: String },
        type: { type: String },
        host: { type: String },
        vchannelid: { type: String },
        tchannelid: { type: String }
    }]
})

module.exports = mongoose.model("Guild", guildSchema)
