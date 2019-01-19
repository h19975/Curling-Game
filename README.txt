Version: 
  node.js : v10.13.0
  OS : Mac

Install: npm install socket.io

Launch: node app.js

Testing steps:
1. Visit http://localhost:3000/assignment3.html 
   Initially, no players, so you cannot see the available stones
2. Enter the player name and click “I want to play(Enter your name)”, if succeed, you will see your stones.
   The order is always Red player -> Yellow player -> Red player -> Yellow player -> Red player -> Yellow player.
3. Click the stone and move the mouse (you will see a line which indicates your angle) then release the mouse, the stone will go out
4. If you want to quit, click “I want to quit”. The game will be reset and other browsers are able to send request to be a player.

Issue:
Browser should be in normal view (otherwise the two canvas will not be in the same row)


