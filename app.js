/*
(c) 2018 LD Nel

//collaboration with Socket IO
//=============================

install modules:
You must first install npm socket.io module
>npm install socket.io

To run:
>node app.js

To test:
Open several browsers at http://localhost:3000/assignment3.html
*/

//Cntl+C to stop server
const app = require('http').createServer(handler)
const io = require('socket.io')(app) //wrap server app in socket io capability
const fs = require("fs") //need to read static files
const url = require("url") //to parse url strings
const PORT = process.env.PORT || 3000

app.listen(PORT) //start server listening on PORT

const ROOT_DIR = "html"; //dir to serve static files from

//server maintaned player data
let stones = []
stones.push({ name: "r1", color: "Red", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "r2", color: "Red", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "r3", color: "Red", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y1", color: "Yellow", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y2", color: "Yellow", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y3", color: "Yellow", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})

let playerData = {
  playerRed: null,
  playerYellow: null,
  playerNum: 0,
  stones: stones,
  cueEnd: null,
  cueTip: null
}

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}

function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}

io.on('connection', function(socket) {
  socket.on('playerData', function(data) {
    console.log('RECEIVED PLAYERS DATA: ' + data)
    let receivedData = JSON.parse(data)
    playerData.stones = receivedData.stones
    playerData.cueEnd = receivedData.cueEnd
    playerData.cueTip = receivedData.cueTip
    //to broadcast message to everyone including sender:
    io.emit('playerData', JSON.stringify(playerData)) //broadcast to everyone including sender
  })
})

function handler(request, response) {
  let urlObj = url.parse(request.url, true, false)
  console.log("\n============================")
  console.log("PATHNAME: " + urlObj.pathname)
  console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
  console.log("METHOD: " + request.method)

  let receivedData = ""

  //attached event handlers to collect the message data
  request.on("data", function(chunk) {
    receivedData += chunk;
  })

  //event handler for the end of the message
  request.on("end", function() {
    console.log("REQUEST END: ")
    console.log("received data: ", receivedData)
    console.log("type: ", typeof receivedData)

    if (request.method == "POST") {
      var dataObj = JSON.parse(receivedData)
      console.log("received data object: ", dataObj)
      console.log("type: ", typeof dataObj)

      console.log("USER REQUEST: " + dataObj.action)
      var returnObj = {}
      if (dataObj.action == "Quit") {
        if (dataObj.playerColor == "Red") {
          playerData.playerRed = null
          playerData.playerNum--
        } else if (dataObj.playerColor == "Yellow") {
          playerData.playerYellow = null
          playerData.playerNum--
        }
      } else if (dataObj.action == "Apply") {
        if (playerData.playerNum == 2) {
          returnObj.success = false
          //object to return to client
          response.writeHead(200, { "Content-Type": MIME_TYPES["txt"] })
          response.end(JSON.stringify(returnObj)) //send just the JSON object as plain text
          return
        } else if (playerData.playerRed == null) {
          returnObj.success = true
          returnObj.playerName = dataObj.playerName
          returnObj.playerColor = "Red"
          playerData.playerNum++
          playerData.playerRed = dataObj.playerName
        } else if (playerData.playerYellow == null) {
          returnObj.success = true
          returnObj.playerName = dataObj.playerName
          returnObj.playerColor = "Yellow"
          playerData.playerNum++
          playerData.playerYellow = dataObj.playerName
        }
      }
      //object to return to client
      response.writeHead(200, { "Content-Type": MIME_TYPES["txt"] })
      response.end(JSON.stringify(returnObj)) //send just the JSON object as plain text
      io.emit('playerData', JSON.stringify(playerData)) //broadcast to everyone including sender
    }

    if (request.method == "GET") {
      //handle GET requests as static file requests
      fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
        if (err) {
          //report error to console
          console.log("ERROR: " + JSON.stringify(err))
          //respond with not found 404 to client
          response.writeHead(404)
          response.end(JSON.stringify(err))
          return
        }
        response.writeHead(200, {
          "Content-Type": get_mime(urlObj.pathname)
        })
        response.end(data)
      })
    }
  })
}

console.log("Server Running at PORT 3000 CNTL-C to quit")
console.log("To Test")
console.log("Open several browsers at http://localhost:3000/assignment3.html")
