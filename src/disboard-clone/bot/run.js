require('dotenv').config();
const { Client, GatewayIntentBits, Events} = require('discord.js');
const database = require('../database/database.js');
const { data } = require('autoprefixer');
const token = process.env.discord_bot_token //temp move to .env

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers]});


client.once(Events.ClientReady, () => {
	
});
client.on(Events.GuildCreate, (guild) => {
   console.log(`Joined ${guild.name}`)
   //guild.members.cache.each(member => console.log(member.presence))
   database.createServer(guild.id, guild.memberCount, guild.members.cache.filter(member => (member.presence != null && member.presence.status != "offline")).size)
   guild.members.fetch({withPresences: true})
      .then(members => {
         members.each(member => {
            database.createUser(guild.id, member.id, member.presence ? member.presence.status : "offline")
         })
      })
      .catch(() => console.warn("Failed to fetch members"));
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
   if (newPresence == null) return; //nothing we can do here
   if (oldPresence == null){
      database.getUser(newPresence.user.id, newPresence.guild.id, (data) => {
         if (data.length == 0){
            database.createUser(newPresence.guild.id, newPresence.user.id, newPresence.status)
         }else{
            database.userPresenceChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)
         }
      });
      return; //end of gaurd clause so return
   }
   if (oldPresence.status != newPresence.status) {
      database.userPresenceChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)      
   }
   
});


// Login to Discord with your client's token
client.login(token);