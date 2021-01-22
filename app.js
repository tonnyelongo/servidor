const express = require('express')
const https = require('http')
var cors = require('cors')
const session=require("express-session")
const app = express()
//const mysql=require("mysql");
const bodyParser = require('body-parser')
const path = require("path")
var xss = require("xss")

const fs = require('fs')

/*key: fs.readFileSync('./key.pem'),
cert: fs.readFileSync('./cert.pem'),
passphrase: 'YOUR PASSPHRASE HERE'*/



/*var server = https.createServer({
	key: fs.readFileSync('./server.key'),
	cert: fs.readFileSync('./server.cert')
  }, app)
  
 
 
 
 
 {
	key: fs.readFileSync('./localhost.key'),
	cert: fs.readFileSync('./localhost.cert'),
	requestCert: false,
    rejectUnauthorized: false
  },  */

var server = https.createServer(app)
var io = require('socket.io')(server)

app.use(cors())
app.use(bodyParser.json())

/*var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'almadb'
});*/

/*app.post("/login",(req,res)=>{

	let nome=req.body.nome;
	let senha=req.body.senha;

	console.log("dados: "+nome+" senha: "+senha);

	if(nome && senha)
	{
		connection.query("SELECT * FROM `estudantes` WHERE NOME=? AND senha=?",[nome,senha],function(error,rows,fields){
		console.log(rows);
		 if(error)
		 {
			console.log(error);
			connection.end();
		 }
		 
			
		 else
		 {
			 if(rows)
			 {
				res.json({message:"logado"})
			 
			 }
			 else
			 {
				res.json({message:"erro"});
				res.end();
				connection.end();
			 }
		 }
		 
	});
	
	app.get("/estudantes",(req,res)=>{
		connection.query("SELECT * FROM `ESTUDANTES` ",function(err,rows,fields){
			if(err)
			{
				console.log(err);
				connection.end();
			}
			else
			{
				res.json(rows);
				connection.end();
			}
		   });
	});

  }
	
});*/

/*app.get("/estudantes",(req,res)=>{
	connection.query("SELECT * FROM `ESTUDANTE` ",function(err,rows,fields){
		if(err)
		{
			console.log(err);
			connection.end();
			res.end()
		}
		else
		{
			res.json(rows);
			connection.end();
			res.end()
		}
	   })
});

app.post("/login",(req,res)=>{

	let nome=req.body.nome;
	let senha=req.body.senha;

	console.log("dados: "+nome+" senha: "+senha);
	 
});
*/

app.get("/ola",(req,res)=>{
   res.json({message:"helloworld"})
});


if(process.env.NODE_ENV==='production'){
	app.use(express.static(__dirname+"/build"))
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname+"/build/index.html"))
	})
}
app.set('port', (process.env.PORT || 4001))

sanitizeString = (str) => {
	return xss(str)
}

connections = {}
messages = {}
timeOnline = {}

io.on('connection', (socket) => {

	socket.on('join-call', (path) => {
		if(connections[path] === undefined){
			connections[path] = []
		}
		connections[path].push(socket.id)

		timeOnline[socket.id] = new Date()

		for(let a = 0; a < connections[path].length; ++a){
			io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
		}

		if(messages[path] !== undefined){
			for(let a = 0; a < messages[path].length; ++a){
				io.to(socket.id).emit("chat-message", messages[path][a]['data'], 
					messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
			}
		}

		console.log(path, connections[path])
	})

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message)
	})

	socket.on('chat-message', (data, sender) => {
		data = sanitizeString(data)
		sender = sanitizeString(sender)

		var key
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(messages[key] === undefined){
				messages[key] = []
			}
			messages[key].push({"sender": sender, "data": data, "socket-id-sender": socket.id})
			console.log("message", key, ":", sender, data)

			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("chat-message", data, sender, socket.id)
			}
		}
	})

	socket.on('disconnect', () => {
		var diffTime = Math.abs(timeOnline[socket.id] - new Date())
		var key
		for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k

					for(let a = 0; a < connections[key].length; ++a){
						io.to(connections[key][a]).emit("user-left", socket.id)
					}
			
					var index = connections[key].indexOf(socket.id)
					connections[key].splice(index, 1)

					console.log(key, socket.id, Math.ceil(diffTime / 1000))

					if(connections[key].length === 0){
						delete connections[key]
					}
				}
			}
		}
	})
})

server.listen(app.get('port'), () => {
	console.log("listening on", app.get('port'))
})
