const { Client, GatewayIntentBits, Events} = require('discord.js');
const database = require('../database/database.js');
const { data } = require('autoprefixer');
const token = process.env.discord_bot_token //temp move to .env

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences]});


client.once(Events.ClientReady, () => {
	client.user.setPresence({ activities: [{ name: 'around' }], status: 'online' });
});
client.on(Events.GuildCreate, (guild) => {
   console.log(`Joined ${guild.name}`)
   //guild.members.cache.each(member => console.log(member.presence))
   database.serverJoined(guild.id, guild.memberCount, guild.members.cache.filter(member => (member.presence != null && member.presence.status != "offline")).size)
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
   if (oldPresence == null){

   }
   if (oldPresence.status != newPresence.status) {
      if (newPresence.status == "online"){
         database.userPresenceChanged(true, newPresence.guild.id, newPresence.user.id)
      }else {
         database.userPresenceChanged(false, newPresence.guild.id, newPresence.user.id)
      }
   }
   
});


// Login to Discord with your client's token
client.login(token);