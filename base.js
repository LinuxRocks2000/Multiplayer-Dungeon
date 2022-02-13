// God, I hate nodejs and the smug fact that it's the best choice for this game.

const http = require("http");
const websocketserver = require("ws");
const fs = require('fs');

class Room{
    constructor(fun){
        this.doors = [];
        this.walls = [];
        this.creator = {
            door: (x, y) => {
                this.doors.push([x, y]);
            },
            rect: (x, y, width, height) => {
                this.walls.push([x, y, width, 1]);
                this.walls.push([x, y, 1, height]);
                this.walls.push([x + width - 1, y, 1, height]);
                this.walls.push([x, y + height - 1, width, 1]);
            }
        }
        fun(this.creator);
    }
    serialize(){
        var returnval = "";
        for (var i = 0; i < this.walls.length; i ++){
            returnval += "W " + this.walls[i][0] + " " + this.walls[i][1] + " " + this.walls[i][2] + " " + this.walls[i][3] + " ";
        }
        for (var i = 0; i < this.doors.length; i ++){
            returnval += "D " + this.doors[i][0] + " " + this.doors[i][1] + " "
        }
        return returnval;
    }
}


var startingRoom = function(context){
    context.rect(-10, -10, 20, 20);
    context.door(0, 10);
    context.door(10, 0);
    context.door(20, 10);
    context.door(10, 20);
}

const requestListener = function (req, res) {
    if (req.url == "/" || req.url == "/index.html"){
        fs.readFile("index.html", (err, data) => {
            if (err){
                res.writeHead(404);
                res.end("You suck! I don't like you! I want you dead!");
            }
            else{
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(data);
            }
        });
    }
    else if (req.url.startsWith("/res/")){
        if ((/\/..\//).test(req.url)){
            res.writeHead(418);
            var sarcasm = [
                    "There are three kinds of people in this world - those smart enough to try that hack, those smart enough to function as humans, and your mom.",
                    "I'm sorry, the request couldn't be completed because your mom is nearby.",
                    "Sorry, I'm not really into that kind of thing",
                    "Nah, not really in the mood right now."
                ];
            res.end(sarcasm[req.url.length % sarcasm.length]);
        }
        else {
            fs.readFile(req.url.substring(1), (err, data) => {
                if (err){
                    res.writeHead(404);
                    res.end("I answer 404 to everything, doofus.");
                }
                else{
                    res.setHeader("Content-Type", "image/png");
                    res.writeHead(200);
                    res.end(data);
                }
            });
        }
    }
    else{
        res.writeHead(404);
        res.end("You are a huge loser and a sucker and I hate you")
    }
};

class Client{
    constructor(sock, game){
        this.pos = [0, 0];
        this.xv = 0;
        this.yv = 0;
        this.room = 0; // Starting room
        this.sock = sock;
        this.game = game;
        this.phase = 0; // 0 = ain't setup yet.
        this.pressed = {};
        this.speed = 5;
        this.sock.on("message", (data) => {
            if (this.phase == 0){
                this.name = data;
                console.log("Got the client's handle: " + this.name);
                this.sock.send(this.game.getID());
                this.phase = 1;
            }
            else if (this.phase == 1){
                var dataString = String.fromCharCode(...data);
                if (data == "U"){ // The user wants a full update of their current room.
                    this.sock.send(this.game.serializeRoom(this.room));
                }
                else if (dataString[0] == "K"){
                    this.pressed[dataString.substr(1)] = false;
                }
                else if (dataString[0] == "k") {
                    this.pressed[dataString.substr(1)] = true;
                }
                else if (dataString == "R") {
                    this.run();
                }
            }
        });
    }
    run(){ /* Updates are requested periodically by the client. */
        if (this.pressed["ArrowUp"]){
            this.yv -= this.speed;
        }
        if (this.pressed["ArrowDown"]){
            this.yv += this.speed;
        }
        if (this.pressed["ArrowLeft"]){
            this.xv -= this.speed;
        }
        if (this.pressed["ArrowRight"]){
            this.xv += this.speed;
        }
        this.yv *= 0.8;
        this.xv *= 0.8;
        if (Math.abs(this.yv) > 0.1 || Math.abs(this.xv) > 0.1){
            this.pos[1] += this.yv;
            this.pos[0] += this.xv;
            this.sock.send("M " + this.pos[0] + " " + this.pos[1] + " ");
        }
    }
}

class Game{
    constructor(){
        this.clients = [];
        this.rooms = [
            new Room(startingRoom)
        ];
        this.sock = new websocketserver.Server({port: 8070});
        this.sock.on("connection", (cli) => {
            this.clients.push(new Client(cli, this));
        });
        this.latestID = -1;
    }
    getID(){ // Get a client ID. Later I might do hashing, for now just this.
        this.latestID ++;
        return this.latestID.toString();
    }
    serializeRoom(roomnum){
        return this.rooms[roomnum].serialize();
    }
}

const server = http.createServer(requestListener);

server.listen(8080, "localhost", () => {
    console.log("Yay.");
});

var game = new Game();
