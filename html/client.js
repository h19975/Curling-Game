/*
(c) 2018 LD Nel
Assignment 3: Real-Time Collaboration with Web Sockets
build the real-time collaborative app based on web sockets. This allows people
working in different browsers to collaborate.

The game only has two players.
People need to submit the request with their name in order to play the game. 
When two players are in the game, no more players are accepted, but others are
still able to watch the game.
If one player wants to quit the game, click the 'quit' button and the game will
be reset.

citation:
  use some logics of the given java code to calculate the collisions

More instructions are in the README
*/

let stones = []; //Use javascript array of objects to represent stones and their locations
stones.push({ name: "r1", color: "Red", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "r2", color: "Red", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "r3", color: "Red", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y1", color: "Yellow", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y2", color: "Yellow", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
stones.push({ name: "y3", color: "Yellow", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})

let friction = .98; //friction factor
let speedThreshold = 0.06; // if less than the threshold, consider the stone as stop
let milliseconds = 2; //time between timer events
let fullViewRadius = 11; //the radius of full view stone

let stoneBeingMoved; //stone being dragged by mouse
let cueTip; //tip of the shooting cue
let cueEnd; //end of the shooting cue

let collisions = [] //collisions pair

//players in the server
let playerRed
let playerYellow

//players in the client
let playerName
let playerColor

// deal with single click (aiming) and double click(move)
let clickTimer = 0;
let clickDelay = 200;
let clickPrevent = false;

let timer //used to control the free moving word

const canvas1 = document.getElementById("canvas1") // focus view
const canvas2 = document.getElementById("canvas2") // full view

//reset
function reset() {
  initializeStones()
  playerRed = null
  playerYellow = null
  playerName = null
  playerColor = null
  emitDataThroughSocket()
  drawCanvas()
}

//initialize the stones
function initializeStones () {
  stones = []
  stones.push({ name: "r1", color: "Red", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
  stones.push({ name: "r2", color: "Red", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
  stones.push({ name: "r3", color: "Red", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})
  stones.push({ name: "y1", color: "Yellow", x: 80, y: 490, vx: 0, vy: 0, moving: false, used: false})
  stones.push({ name: "y2", color: "Yellow", x: 120, y: 490, vx: 0, vy: 0, moving: false, used: false})
  stones.push({ name: "y3", color: "Yellow", x: 160, y: 490, vx: 0, vy: 0, moving: false, used: false})
}

//If Need to draw the focus view
function focusViewAvailable(stone) {
  //return false
  return stone.y <= (100 + (canvas1.height / 2 + 240) / 3.0)
}

//translate the X, Y to the focus canvas
function translateToFocusView(stone) {
  let dx = stone.x - (canvas2.width / 2.0)
  let dy = stone.y - 100
  let focusX = canvas1.width / 2 + dx * 3.0
  let focusY = canvas1.height / 2 + dy * 3.0

  return {x: focusX, y: focusY}
}

//locate the stone targeted by aCanvasX, aCanvasY
//find a stone whose bounding box contains location (aCanvasX, aCanvasY)
function getStoneAtLocation(aCanvasX, aCanvasY) {
  if (playerName == null || playerColor == null) return
  const context = canvas2.getContext("2d")
  for (let i = 0; i < stones.length; i++) {
    if (stones[i].moving || stones[i].used) continue;
    if (stones[i].color != playerColor) continue;
    //console.log(aCanvasX + ":" + aCanvasY + ":" + stones[i].x + ":"  + stones[i].y);
    if (distanceBetweenPoints(aCanvasX, aCanvasY, stones[i].x, stones[i].y) <= fullViewRadius) {
      return stones[i];
    }
  }
}

function distanceBetweenStones(stone1, stone2) {
  return Math.sqrt((stone1.x - stone2.x) * (stone1.x - stone2.x)
                  + (stone1.y - stone2.y) * (stone1.y - stone2.y));
}

function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) *  (x2 - x1) +
              (y2 - y1) * (y2 - y1));
}

function isStoneInBound (stone) {
    //answer whether stone is inside the board
    if(stone.x < 9) return false;
    if(stone.x > canvas2.width - 9) return false;
    if(stone.y < 9) return false;
    if(stone.y > canvas2.height * 0.85 - 9) return false;
    return true;
}

//If two stones are touching with each other
function isTouching(stone1, stone2) {
  return distanceBetweenStones(stone1, stone2) <= 2 * fullViewRadius && stone1.name != stone2.name
}

//Find the stone that touchs the current stone
function getStoneTouching(stone) {
  for (let i = 0; i < stones.length; i++) {
    let distance = distanceBetweenStones(stone, stones[i])
    if (distance <= 2 * fullViewRadius && stone.name != stones[i].name) {
      //console.log("touching distance:" + distance)
      return stones[i]
    }
  }
  return null;
}

//If the collision is already exist, won't deal with it twice
function dealWithCollisions(stone1, stone2){
  if (stone1.name == stone2.name || !stone1.used || !stone2.used) return;
  for (let i = 0; i < collisions.length; i++) {
    if ((collisions[i].s1.name == stone1.name && collisions[i].s2.name == stone2.name)
    || (collisions[i].s1.name == stone2.name && collisions[i].s2.name == stone1.name)) {
      console.log("already exist")
      return; //already exist, don't want to repeat
    }
  }

  console.log("push collision")
  collisions.push({ s1: stone1, s2: stone2})
  // collisions Math
  // call this function twice (it's possible stone2 is moving too)
  applyCollisionMath(stone1, stone2)
  //applyCollisionMath(stone2, stone1)
}

// Use Math to calculate the speed after the collision
function applyCollisionMath(stone1, stone2) {
  //assume stone1 is moving, stone2 is stop
  console.log("applyCollisionMath")
  if (!stone1.moving) return
  let dx = Math.abs(stone2.x - stone1.x)
  let dy = Math.abs(stone2.y - stone1.y)
  let v = Math.sqrt((stone1.vx * stone1.vx) + (stone1.vy * stone1.vy))

  let angleb = Math.asin(dy / (fullViewRadius * 2))
  let angled = Math.asin(Math.abs(stone1.vx) / v)
  let anglea = (3.14159 / 2.0) - angleb - angled
  let anglec = angleb - anglea

  let v1 = v * Math.abs(Math.sin(anglea))
  let v2 = v * Math.abs(Math.cos(anglea))

  let v1x = v1 * Math.abs(Math.cos(anglec))
  let v1y = v1 * Math.abs(Math.sin(anglec))
  let v2x = v2 * Math.abs(Math.cos(angleb))
  let v2y = v2 * Math.abs(Math.sin(angleb))

  //set directions based on initial direction of hitting Ball
  //set horizontal directions
  if (stone1.vx > 0) { //ball1 is going right
    if (stone1.x < stone2.x) {
      v1x = -v1x
    } else {
      v2x = -v2x
    }
  } else {
    if (stone1.x > stone2.x) {
      v2x = -v2x
    } else {
      v1x = -v1x
    }
  }

  //set vertical directions
  if (stone1.vy > 0) { //ball1 is going down
    if (stone1.y < stone2.y) {
      v1y = -v1y
    } else {
      v2y = -v2y
    }
  } else {
    if (stone1.y > stone2.y) {
      v2y = -v2y
    } else {
      v1y = -v1y
    }
  }

  stone1.vx = v1x
  stone1.vy = v1y
  stone2.vx = v2x
  stone2.vy = v2y

  stone2.moving = true

}

//remove old collisions: stones are not touched anymore or both are stopped
function removeOldCollisions () {
  let old = null
  for (let i = 0; i < collisions.length; i++) {
    if (isTouching(collisions[i].s1, collisions[i].s2)) {
      old = i
    }
    if (!collisions[i].s1.moving && !collisions[i].s2.moving) {
      old = i
    }
  }
  if (old != null) {
    collisions.splice(old, 1)
  }
}

//called by the timer event handler. Moved the stone based on the current location
//and velocity, check the Collisions
function CalNextLocationCheckCollisions(stone) {
  if (stone.moving) {
    stone.x += stone.vx * milliseconds
    stone.y += stone.vy * milliseconds

    stone.vx = stone.vx * friction
    stone.vy = stone.vy * friction

    if (Math.abs(stone.vx) < speedThreshold && Math.abs(stone.vy) < speedThreshold) {
      stone.moving = false
      stone.vx = 0
      stone.vy = 0
      emitDataThroughSocket()
      return
    }

    let inbound = isStoneInBound(stone)
    let touchingStone = getStoneTouching(stone)
    if (touchingStone != null) {
      //console.log("touching:" + stone.name + ":" + touchingStone.name)
      dealWithCollisions(stone, touchingStone);
    }
    removeOldCollisions();
  }
}

//drawing method
function drawCircle(context, xCord, yCord, radius, strokeColor, fillStyle) {
  context.beginPath();
  context.arc(
    xCord, //x co-ord
    yCord, //y co-ord
    radius, //radius
    0, //start angle
    2 * Math.PI //end angle
  );
  context.strokeStyle = strokeColor;
  context.fillStyle = fillStyle;
  context.fill();
  context.stroke();
}

function drawLine(context, fromX, fromY, toX, toY, strokeStyle, lineWidth) {
  context.beginPath();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
}

//draw canvas
function drawCanvas() {

  const context1 = canvas1.getContext("2d")
  const context2 = canvas2.getContext("2d")

  context1.fillStyle = "white"
  context1.fillRect(0, 0, canvas1.width, canvas1.height) //erase canvas1
  context2.fillStyle = "white"
  context2.fillRect(0, 0, canvas2.width, canvas2.height) //erase canvas2

  //draw canvas1
  drawCircle(context1, canvas1.width / 2, canvas1.height / 2, 240, "blue", "blue")
  drawCircle(context1, canvas1.width / 2, canvas1.height / 2, 180, "white", "white")
  drawCircle(context1, canvas1.width / 2, canvas1.height / 2, 120, "red", "red")
  drawCircle(context1, canvas1.width / 2, canvas1.height / 2, 60, "white", "white")

  //draw canvas2
  drawCircle(context2, canvas2.width / 2, 100, 80, "blue", "blue")
  drawCircle(context2, canvas2.width / 2, 100, 60, "white", "white")
  drawCircle(context2, canvas2.width / 2, 100, 40, "red", "red")
  drawCircle(context2, canvas2.width / 2, 100, 20, "white", "white")
  drawLine(context2, 0, canvas2.height * 0.85, canvas2.width, canvas2.height * 0.85, "black", 3)

  //focus stones
  for (let i = 0; i < stones.length; i++) {
    let stone = stones[i]
    if (stone.color != playerColor && !stone.used) continue
    if (focusViewAvailable(stone)) {
      let focusLoc = translateToFocusView(stone)
      drawCircle(context1, focusLoc.x, focusLoc.y, fullViewRadius * 3.0, "grey", "grey")
      drawCircle(context1, focusLoc.x, focusLoc.y, 7.0 * 3, stone.color, stone.color)
    }
  }  

  //stones
  for (let i = 0; i < stones.length; i++) {
    let stone = stones[i]
    if (stone.color != playerColor && !stone.used) continue
    drawCircle(context2, stone.x, stone.y, fullViewRadius, "grey", "grey")
    drawCircle(context2, stone.x, stone.y, 7, stone.color, stone.color)
  }  

  if (playerName != null && playerColor != null) {
    //aiming
    if (cueTip != null && cueEnd != null) {
      //console.log("cueTip:" + cueTip.x + "," + cueTip.y + " " + "cueEnd:" + cueEnd.x + "," + cueEnd.y)
      drawLine(context2, cueTip.x, cueTip.y, cueEnd.x, cueEnd.y, "black", 3)
    }
  }
  
  //player
  drawCircle(context2, 35, canvas2.height * 0.85 + 40, fullViewRadius * 1.2, "grey", "grey")
  drawCircle(context2, 35, canvas2.height * 0.85 + 40, 7 * 1.2, "red", "red")
  drawCircle(context2, 35, canvas2.height * 0.85 + 70, fullViewRadius * 1.2, "grey", "grey")
  drawCircle(context2, 35, canvas2.height * 0.85 + 70, 7 * 1.2, "yellow", "yellow")
  context2.font = '12pt Arial'
  context2.fillStyle = 'black'
  context2.fillText("Players", canvas2.width * 0.05, canvas2.height * 0.88)
  if (playerRed != null && playerRed != '') {
    context2.fillText(playerRed, 60, canvas2.height * 0.85 + 45)
  }
  if (playerYellow != null && playerYellow != '') {
    context2.fillText(playerYellow, 60, canvas2.height * 0.85 + 75)
  }
}

//only player can aiming the corresponding stone
//red player always first to aim
//two player should play alternately: red -> yellow -> red -> yellow -> red -> yellow
function checkIfAimingAvailable() {
  let redCount = 0
  let yellowCount = 0

  for (let i = 0; i < stones.length; i++) {
    let stone = stones[i]
    if (stone.color == "Red" && stone.used && !stone.moving) {
      redCount++
    } else if (stone.color == "Yellow" && stone.used && !stone.moving) {
      yellowCount++
    }
  }

  if (playerColor == "Red") {
    if (redCount == yellowCount) {
      return true
    } else {
      window.alert("Wait until Yellow Player to finish.")
      return false
    }
  } else if (playerColor == "Yellow") {
    if (yellowCount == redCount - 1) {
      return true
    } else {
      window.alert("Wait until Red Player to finish.")
      return false
    }
  }
}

//single click to aiming
function handleAiming(e) {
  if (playerName == null) {
    e.stopPropagation()
    e.preventDefault()
    window.alert("You are not the player, don't have the control")
    return
  }

  // should wait until other player has finished
  if (!checkIfAimingAvailable()) {
    e.stopPropagation()
    e.preventDefault()
    return
  }

  //get mouse location relative to canvas top left
  let rect = canvas2.getBoundingClientRect()
  let canvasX = e.pageX - rect.left //use jQuery event object pageX and pageY
  let canvasY = e.pageY - rect.top
  //console.log("single click aiming:" + canvasX + ", " + canvasY)

  //start a new shot be making a cue stick
  stoneBeingMoved = getStoneAtLocation(canvasX, canvasY)

  if (stoneBeingMoved != null) {
    //make start of cue stick
    cueTip = {x: stoneBeingMoved.x, y: stoneBeingMoved.y}
    $("#canvas2").mousemove(handleMouseMove)
    $("#canvas2").mouseup(handleMouseUp)
  }

  // Stop propagation of the event and stop any default
  //  browser action
  e.stopPropagation()
  e.preventDefault()

  drawCanvas()
}

function handleMouseMove(e) {
  //console.log("mouse move")

  //get mouse location relative to canvas2 top left
  let rect = canvas2.getBoundingClientRect()
  let canvasX = e.pageX - rect.left
  let canvasY = e.pageY - rect.top

  // get the end of the cue
  if (cueTip != null) {
    cueEnd = {x: canvasX, y: canvasY}
  }
  
  e.stopPropagation()

  drawCanvas()
}

function handleMouseUp(e) {
  console.log("mouse up")
  e.stopPropagation()

  //shoot the stone based on direction and length of the cue stick
  if (cueTip != null && cueEnd != null) {
    let dx = cueTip.x - cueEnd.x
    let dy = cueTip.y - cueEnd.y
    //setup speed according to the distance of the cueEnd to cueTip
    if (distanceBetweenPoints(cueTip.x, cueTip.y, cueEnd.x, cueEnd.y) > fullViewRadius) {
      stoneBeingMoved.vx = dx / 10;
      stoneBeingMoved.vy = dy / 10;
      stoneBeingMoved.moving = true;
      stoneBeingMoved.used = true;
    }
  }
  //remove mouse move and mouse up handlers but leave mouse down handler
  $("#canvas2").off("mousemove", handleMouseMove) //remove mouse move handler
  $("#canvas2").off("mouseup", handleMouseUp);//remove mouse up handler

  //clear stone being moved
  stoneBeingMoved = null;
  cueTip = null;
  cueEnd = null;
  emitDataThroughSocket()
  drawCanvas() //redraw the canvas
}

//submit playerName
function handleSubmitButton() {

  let userText = $('#playerNameField').val(); //get text from user text input field
  if (userText == null || userText == '') {
    window.alert("Player name can't be empay. Please enter your name")
    return
  }
  
  //user text was not empty
  let userRequestObj = {
    playerName: userText,
    action: "Apply"
  } //make object to send to server
  let userRequestJSON = JSON.stringify(userRequestObj) //make JSON string
  $('#playerNameField').val('') //clear the user text field

  //Prepare a POST message for the server and a call back function
  //to catch the server repsonse.
  $.post("userText", userRequestJSON, function(data, status) {
    console.log("data: " + data)
    console.log("typeof: " + typeof data)
    let responseObj = JSON.parse(data)
    // request success
    if (responseObj.success) {
      playerName = responseObj.playerName
      playerColor = responseObj.playerColor
      let textDiv = document.getElementById("text-area")
      textDiv.innerHTML = textDiv.innerHTML + `<p> Your are the player ${playerName} control ${playerColor}</p>` + 
                          `<input type="button" id="logout" value="I want to quit" onClick="handleLogoutButton()">`
    }
  })
}

//logout
function handleLogoutButton() {
  let userRequestObj = {
    playerColor: playerColor,
    action: "Quit"
  }
  let userRequestJSON = JSON.stringify(userRequestObj) //make JSON string
  $.post("logout", userRequestJSON, function(data, status){
    console.log("data: " + data)
    console.log("typeof: " + typeof data)
    let responseObj = JSON.parse(data)
    playerName = null
    playerColor = null
    let textDiv = document.getElementById("text-area")
    textDiv.innerHTML = ``
    reset()
  }) 
}

// periodically calculate the location and check collisions for each stone
function handleTimer() {
  for (let i = 0; i < stones.length; i++) {
    CalNextLocationCheckCollisions(stones[i])
  }
  drawCanvas()
}

//connect to server and retain the socket
let socket = io('http://' + window.document.location.host)

//socket setup
socket.on('playerData', function(data) {
  console.log("data: " + data)
  console.log("typeof: " + typeof data)
  let playerData = JSON.parse(data)
  playerRed = playerData.playerRed
  playerYellow = playerData.playerYellow
  if (playerData.playerNum != null && playerData.playerNum == 2) {
    document.getElementById("button").disabled = true
  } else {
    document.getElementById("button").disabled = false
  }
  stones = playerData.stones
  cueEnd = playerData.cueEnd
  cueTip = playerData.cueTip
  drawCanvas()
})

// emit data to the server
function emitDataThroughSocket(){
  let dataObj = {
    stones: stones,
    cueEnd: cueEnd,
    cueTip: cueTip
  }
  //create a JSON string representation of the data object
  var jsonString = JSON.stringify(dataObj)
  socket.emit('playerData', jsonString)
}

$(document).ready(function() {
  //add mouse down listener to our canvas object
  $("#canvas2").mousedown(handleAiming)
  timer = setInterval(handleTimer, milliseconds)
})
