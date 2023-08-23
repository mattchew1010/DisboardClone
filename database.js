var mysql = require('mysql2');
 
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
const eventTypes = [
  "status_update"
]
const onlineStatus = [
   "online",
   "idle",
   "dnd"
]

const queryStatements = {
  /**
   * Updates the online status of a user in a server
   * @param {boolean} online_status - The online status of the user
   * @param {string} server_id - The ID of the server
   */
  userOnlineStatusServerUpdate: "UPDATE servers SET online_users = GREATEST(0, online_users + IF(?, 1, -1)) WHERE server_id = ?",

  /**
   * Updates the online status of a user
   * @param {string} status - The status of the user
   * @param {string} server_id - The ID of the server
   * @param {string} user_id - The ID of the user
   */
  userOnlineStatusUpdate: "UPDATE users SET status = ? WHERE server_id = ? AND user_id = ?",

  /**
   * Inserts a new event into the events table [timestamp, event_type, event_data, guild_id, user_id]
   * @param {string} timestamp - The timestamp of the event
   * @param {string} event_type - The type of the event
   * @param {string} event_data - The data associated with the event
   * @param {string} guild_id - The ID of the guild associated with the event
   * @param {string} user_id - The ID of the user associated with the event
   */
  newEvent: "INSERT INTO events (timestamp, event_type, event_data, guild_id, user_id) VALUES (?, ?, ?, ? ,?)",

  /**
   * Retrieves a user from the users table
   * @param {string} server_id - The ID of the server
   * @param {string} user_id - The ID of the user
   * @returns {string} - The user entry
   */
  getUser: "SELECT * FROM users WHERE server_id = ? AND user_id = ?",

  /**
   * Inserts a new server into the servers table
   * @param {string} server_id - The ID of the server
   * @param {number} total_users - The total number of users in the server
   * @param {number} online_users - The number of online users in the server
   */
  createServer: "INSERT INTO servers (server_id, total_users, online_users) VALUES (?, ?, ?)",

  /**
   * Updates the total and online user count of a server
   * @param {number} total_users - The total number of users in the server
   * @param {number} online_users - The number of online users in the server
   * @param {string} server_id - The ID of the server
   */
  updateServerCount: "UPDATE servers SET total_users = ?, online_users = ? WHERE server_id = ?",

  /**
   * Inserts a new user into the users table
   * @param {string} server_id - The ID of the server
   * @param {string} user_id - The ID of the user
   * @param {string} status - The status of the user
   */
  createUser: "INSERT INTO users (server_id, user_id, status) VALUES (?, ?, ?)",

  /**
   * Lists all of the server Ids
   * @returns {Array} - server ids saved in db from discord
   */
  listServerIds: "SELECT server_id FROM servers",

  /**
   * Lists all of the user Ids and status of users in a server
   * @param server_id
   * @returns {Array} - user ids and status saved in db from discord
   */
  listServerUsers: "SELECT user_id, status FROM users WHERE server_id = ?",

  /**
   * Sets server count
   * @param {number} total_users
   * @param {number} online_users
   * @param {string} server_id
    */
  setServerCount: "UPDATE servers SET total_users = ?, online_users = ? WHERE server_id = ?",

  /**
   * gets server count
   * @param {string} server_id
   * @returns {Array} - total_users and online_users 
    */
  getServerCount: "SELECT total_users, online_users from servers WHERE server_id = ?",
}

class Database {
    constructor(){
    }
    query(query, args){
      return new Promise((resolve, reject) => {
        con.query(query, args, function(err, result, fields) {
            if (err){
              reject(err)
            }else{
              resolve(result)
            }
        })
      })
    }

}

module.exports = {Database, queryStatements, eventTypes, onlineStatus};
