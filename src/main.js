const WebSocket = require('ws');

// Setup websocket server for communicating with the panel
const wss = new WebSocket.Server({ port: 8081 });

/*
EVENT STRUCTURE

{
    type: "CONNECT|UPDATE",
    sessionId: "SESSION_ID",
    player: "day|night",
    playerData: {
        x: 0,
        y: 0,
        direction: "UP|DOWN|LEFT|RIGHT",
        animation: "WALKING|IDLE",
        state: "ALIVE|DEAD"
    }
}
*/

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

                console.log("CONNECTING TO SESSION: " + event.player);

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

        if (sessions[event.sessionId].players.day.ws && sessions[event.sessionId].players.night.ws) {
            console.log("BOTH PLAYERS CONNECTED!");
            sessions[event.sessionId].sessionState = "PLAYING";
        }
    });

    ws.on('close', () => {
        let session = wsMap[ws];
        if (session.players.day.ws && session.players.day.ws !== ws) {
            session.players.day.ws.close();
        }
        if (session.players.night.ws && session.players.night.ws !== ws) {
            session.players.night.ws.close();
        }
    });
});