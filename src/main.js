const WebSocket = require('ws');

// Setup websocket server for communicating with the panel
const wss = new WebSocket.Server({ port: 8081 });

let sessions = {};
let wsMap = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const event = JSON.parse(message);

        switch (event.type) {
            case "CONNECT":
                if (!(event.sessionId in sessions)) {
                    console.log("SETTING UP NEW SESSION: " + event.sessionId);
                    sessions[event.sessionId] = {
                        id: event.sessionId,
                        sessionState: "SETUP",
                        players: {
                            day: {},
                            night: {}
                        },
                    };
                }
                if (sessions[event.sessionId].sessionState !== "SETUP") {
                    return;
                }

                console.log("CONNECTING TO SESSION " + event.sessionId + ": " + event.player);

                sessions[event.sessionId].players[event.player] = event.playerData;
                sessions[event.sessionId].players[event.player].ws = ws;
                wsMap[ws] = sessions[event.sessionId];
                break;
            case "UPDATE":
                if (!(event.sessionId in sessions) || sessions[event.sessionId].sessionState !== "PLAYING") {
                    return;
                }

                sessions[event.sessionId].players[event.player === "night" ? "day" : "night"].ws.send(JSON.stringify(event));
                break;
        }

        if (sessions[event.sessionId].players.day.ws && sessions[event.sessionId].players.night.ws && sessions[event.sessionId].sessionState !== "PLAYING") {
            console.log("BOTH PLAYERS CONNECTED!");
            sessions[event.sessionId].sessionState = "PLAYING";
            sessions[event.sessionId].players.day.ws.send(JSON.stringify({
                type: "READY"
            }));
            sessions[event.sessionId].players.night.ws.send(JSON.stringify({
                type: "READY"
            }));
        }
    });

    ws.on('close', () => {
        let session = wsMap[ws];
        if (session.players.day.ws) {
            console.log("CLOSING DAY");
            session.players.day.ws.close();
        }
        if (session.players.night.ws) {
            console.log("CLOSING NIGHT");
            session.players.night.ws.close();
        }
        delete sessions[session.id];
    });
});

console.log("WEB SOCKET SERVER STARTED ON PORT 8081");