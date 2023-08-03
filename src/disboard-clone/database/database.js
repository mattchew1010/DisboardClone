var mysql = require('mysql');
 
var con = mysql.createConnection({  
  host: process.env.db_host, 
  user: process.env.db_user,  
  password: process.env.db_password,
  database: "main"
});  
con.connect(function(err) {  
  if (err) throw err;  
  console.log("Connected!");  
});

function userPresenceChanged(isOnline, guildId, userId){
      con.query("UPDATE servers SET online_users = online_users + IF(?, 1, -1) WHERE server_id = ?", [isOnline, guildId], function (err, result, fields) {  
         if (err) throw err;  
      });
}


function serverJoined(guildId, totalUsers, onlineUsers){
   con.query("INSERT INTO servers (server_id, total_users, online_users) VALUES (?, ?, ?)", [guildId, totalUsers, onlineUsers], function (err, result, fields) {
   console.log(err);
   });
}
module.exports = {serverJoined, userPresenceChanged};
