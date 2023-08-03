require('dotenv').config();
const { Client, GatewayIntentBits, Events} = require('discord.js');
const database = require('../database/database.js');
const { data } = require('autoprefixer');
const token = process.env.discord_bot_token //temp move to .env

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers]});
const onlineStatus = [
   "online",
   "idle",
   "dnd"
]

client.once(Events.ClientReady, () => {
	client.guilds.fetch()
   .then(guilds => {
      guilds.each(oauthguild => {
         oauthguild.fetch()
         .then(guild => {
            //update server count
            guild.members.fetch({withPresences: true})
            .then(members => {
               let onlineCount = 0
               members.each(member => {
                  database.updateUserStatus(guild.id, member.id, member.presence ? member.presence.status : "offline")
                  if (member.presence != null && member.presence.status != "offline") onlineCount++;
               })
               database.updateServerCount(guild.id, guild.memberCount, onlineCount)
            })
            //todo: case where new users join while bot is offline
            //todo: case where users leave while bot is offline
            //todo: case where bot joins server while offline
         })
      })
   })
   
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
   console.log(`+ ${newPresence.user.username} is now ${newPresence.status}`)
   if (oldPresence == null){
      database.getUser(newPresence.user.id, newPresence.guild.id, (data) => {
         if (data.length == 0){
            database.createUser(newPresence.guild.id, newPresence.user.id, newPresence.status)
         }else{
            if ((onlineStatus.includes(data[0].status) && newPresence.status == "offline") || (data[0].status == "offline" && onlineStatus.includes(newPresence.status))){
               //^^ if the user was online and is now offline, or was offline and is now online
               database.userOnlineStatusChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)
            }else{
               database.userPresenceChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)
            }
         }
      });
      return; //end of gaurd clause so return
   }
   if (oldPresence.status != newPresence.status) {
      if ((onlineStatus.includes(oldPresence.status) && newPresence.status == "offline") || (oldPresence.status == "offline" && onlineStatus.includes(newPresence.status))){
         //^^ if the user was online and is now offline, or was offline and is now online
         database.userOnlineStatusChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)
      }else{
         database.userPresenceChanged(newPresence.status, newPresence.guild.id, newPresence.user.id)
      } 
   }
   
});
//todo: handle user join/leave
//todo: handle bot leave
//todo: events table


// Login to Discord with your client's token
client.login(token);