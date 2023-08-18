require('dotenv').config();
const { Client, GatewayIntentBits, Events} = require('discord.js');
const {Database, queryStatements, onlineStatus} = require('../database/database.js');
const { data } = require('autoprefixer');
const token = process.env.discord_bot_token //temp move to .env
const db = new Database
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers]});


client.once(Events.ClientReady, () => {
   db.query(queryStatements.listServerIds).then((serverIds) => {
     client.guilds.fetch()
      .then(guilds => {
         guilds.each(oauthguild => {
            oauthguild.fetch()
            .then(guild => {
               //new guild joined while bot was offline
               if (!serverIds.find(({server_id}) => server_id === guild.id)){
                  console.log(`+ Adding '${guild.name}' to database`)
                  db.query(queryStatements.createServer, [guild.id, guild.memberCount, 0])
                  .then(() => console.log("Success"))
                  .catch(() => console.warn("Failed adding guild to database"))
                  //set online to 0 since it will be updated later. possibly change this to remove extra queries
               }

               //update server count
               guild.members.fetch({withPresences: true})
               .then(members => {
                  let onlineCount = 0
                  db.query(queryStatements.listServerUsers, [guild.id]).then((users) => {//users = [{user_id: 123, status: "online"}]
                     members.each(member => {
                        if (!users.find(({user_id}) => user_id === member.id)){ //can not find an entry for a guild member in the db
                           console.log(`+ adding user ${member.displayName} (${member.id}) in guild ${guild.name} `)
                           db.query(queryStatements.createUser, [guild.id, member.id, (member.presence != null) ? member.presence.status : "offline"]) //if no presence then consider them offline
                           .then(db.query(queryStatements.newEvent, [Date.now(), "user_join", JSON.stringify({guild_id: guild.id, member_id: member.id, member_status: (member.presence != null) ? member.presence.status : "offline"}), guild.id, member.id]))
                           .catch(console.warn)
                        }
                        db.query(queryStatements.userOnlineStatusUpdate, [(member.presence != null) ? member.presence.status : "offline", guild.id, member.id])
                        .catch(console.warn)
                        if (member.presence != null && member.presence.status != "offline") onlineCount++;
                     })
                     //after members.each set the online count in db
                     db.query(queryStatements.updateServerCount, [guild.memberCount, onlineCount, guild.id])
                     .catch(console.warn)
                  })                  
               })
               //todo: case where new users join while bot is offline
               //todo: case where users leave while bot is offline
               //todo: case where bot joins server while offline
            })
         })
      }) 
   })
   .catch((err) => console.warn("Error getting server Ids: \n" + err))
   .finally(console.log("## Finished Setup ##"))
})

client.on(Events.GuildCreate, (guild) => {
   console.log(`Joined ${guild.name}`)
   //guild.members.cache.each(member => console.log(member.presence))
   db.query(queryStatements.createServer, [guild.id, guild.memberCount, guild.members.cache.filter(member => (member.presence != null && member.presence.status != "offline")).size])
   .then(db.query(queryStatements.newEvent, [Date.now(), "guild_join", JSON.stringify({guild_id: guild.id, guild_name: guild.name, member_count: guild.memberCount}), guild.id, null]))
   .catch(console.warn)
   guild.members.fetch({withPresences: true})
      .then(members => {
         members.each(member => {
            db.query(queryStatements.createUser, [guild.id, member.id, member.presence ? member.presence.status : "offline"])
            .catch(console.warn)
         })
      })
      .catch(() => console.warn("Failed to fetch members"));
})

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
   if (newPresence == null) return; //nothing we can do here
   console.log(`+ ${newPresence.user.username} is now ${newPresence.status} in '${newPresence.guild.name}' (${newPresence.guild.id})`)
   if (oldPresence == null){
      db.query(queryStatements.getUser, [newPresence.guild.id, newPresence.user.id]).then(userArray =>{
         if (userArray.length == 0){
            //create new user
            db.query(queryStatements.createUser, [newPresence.guild.id, newPresence.user.id, newPresence.status])
            .catch(console.warn)
         }else if (userArray > 1){
            //??? unlikely to happen but how do we deal with this
         }else{
            let user = userArray[0]
            if ((onlineStatus.includes(user.status) && newPresence.status == "offline") || (user.status == "offline" && onlineStatus.includes(newPresence.status))){
               db.query(queryStatements.userOnlineStatusServerUpdate, [newPresence.status == "offline" ? false : true, newPresence.guild.id])
               .then(db.query(queryStatements.userOnlineStatusUpdate, [newPresence.status, newPresence.guild.id, newPresence.user.id]))
               .then(db.query(queryStatements.newEvent, [Date.now(), "status_update", JSON.stringify({status: newPresence.status}), newPresence.guild.id, newPresence.user.id]))
               .catch(console.warn)
            }
         }
      })
      return; //end of gaurd clause for null old pres
   }
   if (oldPresence.status != newPresence.status) {
      if ((onlineStatus.includes(oldPresence.status) && newPresence.status == "offline") || (oldPresence.status == "offline" && onlineStatus.includes(newPresence.status))){
         //^^ if the user was online and is now offline, or was offline and is now online
         db.query(queryStatements.userOnlineStatusServerUpdate, [newPresence.status == "offline" ? false : true, newPresence.guild.id])// no server id
               .then(db.query(queryStatements.userOnlineStatusUpdate, [newPresence.status, newPresence.guild.id, newPresence.user.id]))
               .then(db.query(queryStatements.newEvent, [Date.now(), "status_update", JSON.stringify({status: newPresence.status}), newPresence.guild.id, newPresence.user.id]))
               .catch(console.warn)
      }else{
         db.query(queryStatements.userOnlineStatusUpdate, [newPresence.status, newPresence.guild.id, newPresence.user.id])
         .then(db.query(queryStatements.newEvent, [Date.now(), "status_update", JSON.stringify({status: newPresence.status}), newPresence.guild.id, newPresence.user.id]))
         .catch(console.warn)
      } 
   }
})

client.on(Events.GuildMemberAdd, (member) => {
   console.log(`+ ${member.displayName} joined '${member.guild.name}' (${member.guild.id})`)
   db.query(queryStatements.createUser, [member.guild.id, member.id, member.presence ? member.presence.status : "offline"])
   .then(db.query(queryStatements.userOnlineStatusServerUpdate, [member.presence ? true : false, member.guild.id]))
   .then(db.query(queryStatements.getServerCount, [member.guild.id])
   .then(count => {
      db.query(queryStatements.updateServerCount, [count[0].total_users + 1, count[0].online_users + ((member.presence && member.presence.status != "offline") ? 1 : 0), member.guild.id])
   }))
   .then(db.query(queryStatements.newEvent, [Date.now(), "user_join", JSON.stringify({guild_id: member.guild.id, member_id: member.id, member_status: member.presence ? member.presence.status : "offline"}), member.guild.id, member.id]))
   .catch(console.warn)
})

//todo: handle user join/leave
//todo: handle bot leave
//todo: events table


// Login to Discord with your client's token
client.login(token)