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
