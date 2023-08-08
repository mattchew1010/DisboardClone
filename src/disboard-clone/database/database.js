var mysql = require('mysql');
 
var con = mysql.createConnection({  
  host: process.env.db_host, 
  user: process.env.db_user,  
  password: process.env.db_password,
  database: "main"
});  
con.connect(function(err) {  
  if (err) throw err;  
  console.log("## Database Connected ##");  
});
eventTypes = [
  "status_update"
]

function userOnlineStatusChanged(status, guildId, userId){
      con.query("UPDATE servers SET online_users = GREATEST(0, online_users + IF(?, 1, -1)) WHERE server_id = ?", [((status !== "offline") ? true : false), guildId], function (err, result, fields) {  
         if (err) throw err;  
      });
      con.query("UPDATE users SET status = ? WHERE server_id = ? AND user_id = ?", [status, guildId, userId], function (err, result, fields) {
          if (err) throw err;
      });
      con.query("INSERT INTO events (timestamp, event_type, event_data, guild_id, user_id) VALUES (?, ?, ?, ? ,?)", [Date.now(), eventTypes[0], JSON.stringify({status: status}), guildId, userId], function (err, result, fields) {
      });
}

function userPresenceChanged(status, guildId, userId){
  //online status did NOT change, but presence did
  con.query("UPDATE users SET status = ? WHERE server_id = ? AND user_id = ?", [status, guildId, userId], function (err, result, fields) {
      if (err) throw err;
  });
  con.query("INSERT INTO events (timestamp, event_type, event_data, guild_id, user_id) VALUES (?, ?, ?, ? ,?)", [Date.now(), eventTypes[0], JSON.stringify({status: status}), guildId, userId], function (err, result, fields) {
  });
}

function getUser(userId, guildId, cb){
    con.query("SELECT * FROM users WHERE server_id = ? AND user_id = ?", [guildId, userId], function (err, result, fields) {
        if (err) throw err;
        cb(fields)
    });
}

function createServer(guildId, totalUsers, onlineUsers){
   con.query("INSERT INTO servers (server_id, total_users, online_users) VALUES (?, ?, ?)", [guildId, totalUsers, onlineUsers], function (err, result, fields) {
   });
}

function updateServerCount(guildId, totalUsers, onlineUsers){
   con.query("UPDATE servers SET total_users = ?, online_users = ? WHERE server_id = ?", [totalUsers, onlineUsers, guildId], function (err, result, fields) {
   });
}
function createUser(guildId, userId, status){
   con.query("INSERT INTO users (server_id, user_id, status) VALUES (?, ?, ?)", [guildId, userId, status], function (err, result, fields) {
   });
}

function updateUserStatus(guildId, userId, status){
   con.query("UPDATE users SET status = ? WHERE server_id = ? AND user_id = ?", [status, guildId, userId], function (err, result, fields) {
   });
}

function getAllServerIds(cb){
    con.query("SELECT server_id FROM servers", function (err, result, fields) {
        if (err) throw err;
        cb(result)
    });
}
module.exports = {userOnlineStatusChanged, createServer, createUser, getUser, updateServerCount, updateUserStatus, userPresenceChanged, getAllServerIds};
