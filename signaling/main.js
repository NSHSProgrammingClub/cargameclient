let {
    log,
    serverTable,
    clientTable,
    screen
} = require("./interface");

let USE_PROD_SERVERS=true;


let WebSocketServer = require("websocket").server;
let port = 8080;

if(USE_PROD_SERVERS){
    var https = require('https');
    var fs = require('fs');

    var options = {
      key: fs.readFileSync('/etc/letsencrypt/live/priv.larrys.tech/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/priv.larrys.tech/fullchain.pem')
    };

    var server = https.createServer(options, function (req, res) {
      res.writeHead(200);
      res.end("hello world\n");
    });

}else{
    var http = require("http");
    var server = http.createServer(function(req, res) {
        res.writeHead(404);
        res.end();
    });
}



server.listen(port, function() {
    log.log("Server is listening on port "+port+(USE_PROD_SERVERS?" with tls":""));
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

let servers = {};
let clients = {};
let nextServerId = 0;
let nextClientId = 0;
/*
Format of servers:
{
    <server id>:{
        connection:<connection>,
        assignedClient:<client id or null>,
    }
}
Format of clients:
{
    <client id>:{
        connection:<connection>,
        assignedServer:<server id or null>,
    }
}
*/
function updateTables() {
    let serverTableHeaders = ["Server", "IP", "Assigned client", "Connected"];
    let serverTableData = [];
    for (var serverId in servers) {
        if (servers.hasOwnProperty(serverId)) {
            serverTableData.push([serverId, servers[serverId].connection.remoteAddress, servers[serverId].assignedClient == null ? "Not assigned" : servers[serverId].assignedClient, servers[serverId].connection.connected]);
        }
    }
    let clientTableHeaders = ["Client", "IP", "Assigned server", "Connected"];
    let clientTableData = [];
    for (var clientId in clients) {
        if (clients.hasOwnProperty(clientId)) {
            clientTableData.push([clientId, clients[clientId].connection.remoteAddress, clients[clientId].assignedServer == null ? "Not assigned" : clients[clientId].assignedServer, clients[clientId].connection.connected]);
        }
    }
    serverTable.setData({
        headers: serverTableHeaders,
        data: serverTableData
    });

    clientTable.setData({
        headers: clientTableHeaders,
        data: clientTableData
    });
    screen.render()

}
updateTables();

function findPropertyWhere(obj, condition) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (condition(obj[prop])) return (prop);
        }
    }
    return (null);
}

function findServerWithConnection(connection) {
    return (findPropertyWhere(servers, server => server.connection === connection));
}

function findClientWithConnection(connection) {
    return (findPropertyWhere(clients, client => client.connection === connection));
}
wsServer.on("request", (request) => {
    var connection = request.accept(null, request.origin);
    log.log("Connection accepted from " + connection.remoteAddress);

    connection.on("message", (message) => {
        if (message.type === "utf8") {
            let messageParsed = null;
            try {
                messageParsed = JSON.parse(message.utf8Data);
            } catch (e) {
                log.log("Invalid message: " + message.utf8Data);
            }
            if (messageParsed) processMessage(messageParsed, connection);
        } else {
            log.log("Invalid message format");
        }
    });
    connection.on("close", (reasonCode, description) => {
        let serverId = findServerWithConnection(connection);
        if (serverId != null){
            let clientId=servers[serverId].assignedClient;
            delete servers[serverId];

            if(clientId!=null&&clients.hasOwnProperty(clientId)&&clients[clientId].assignedServer==serverId){
                clients[clientId].assignedServer=null;
            }
        }

        let clientId = findClientWithConnection(connection);
        if (clientId != null){
            let serverId=clients[clientId].assignedServer;
            delete clients[clientId];
            if(serverId!=null&&servers.hasOwnProperty(serverId)&&servers[serverId].assignedClient==clientId){
                servers[serverId].assignedClient=null;
            }
        }

        log.log(connection.remoteAddress + " disconnected");
        updateTables();
    });
});



function processMessage(message, connection) {
    if (!message.type) {
        log.log("Message with invalid type recieved");
        return;
    }
    if (message.type == "openServer") {
        let serverId = nextServerId++;
        servers[serverId] = {
            connection: connection,
            assignedClient: null
        };
        connection.sendUTF(JSON.stringify({
            type: "openServerInfo",
            id: serverId
        }));
        log.log("New server with id " + serverId);
        updateTables();
        attemptAssign();
    } else if (message.type == "openClient") {
        let clientId = nextClientId++;
        clients[clientId] = {
            connection: connection,
            assignedServer: null
        };
        connection.sendUTF(JSON.stringify({
            type: "openClientInfo",
            id: clientId
        }));
        log.log("New client with id " + clientId);
        updateTables();
        attemptAssign();
    } else if (message.type == "serverOfferSDP") {
        let serverId=findServerWithConnection(connection);
        if(serverId==null){
            log.log("Server with invalid id attempted operation");
            return;
        }
        if(servers[serverId].assignedClient==null){
            log.log("Unassigned server attempted to send SDP");
            return;
        }
        let clientId=servers[serverId].assignedClient;
        if (!clients.hasOwnProperty(clientId)) {
            log.log("Server assigned to invalid client attempted to send SDP");
            return;
        }

        clients[clientId].connection.sendUTF(JSON.stringify({
            type: "serverOfferSDP",
            sdp: message.sdp
        }));
        log.log("Server "+serverId+" sent Offer SDP to "+clientId);
    } else if (message.type == "clientAnswerSDP") {
        let clientId=findClientWithConnection(connection);
        if(clientId==null){
            log.log("Client with invalid id attempted operation");
            return;
        }
        if(clients[clientId].assignedServer==null){
            log.log("Unassigned client attempted to send SDP");
            return;
        }
        let serverId=clients[clientId].assignedServer;
        if (!servers.hasOwnProperty(serverId)) {
            log.log("Client assigned to invalid server attempted to send SDP");
            return;
        }

        servers[serverId].connection.sendUTF(JSON.stringify({
            type: "clientAnswerSDP",
            sdp: message.sdp
        }));

        log.log("Client "+clientId+" sent Answer SDP to "+serverId);
    }else if (message.type == "serverIceCandidate") {
        let serverId=findServerWithConnection(connection);
        if(serverId==null){
            log.log("Server with invalid id attempted operation");
            return;
        }
        if(servers[serverId].assignedClient==null){
            log.log("Unassigned server attempted to send ICE candidate");
            return;
        }
        let clientId=servers[serverId].assignedClient;
        if (!clients.hasOwnProperty(clientId)) {
            log.log("Server assigned to invalid client attempted to send ICE candidate");
            return;
        }

        clients[clientId].connection.sendUTF(JSON.stringify({
            type: "serverIceCandidate",
            candidate: message.candidate
        }));
        log.log("Server "+serverId+" sent ICE candidate to "+clientId);
    }else if (message.type == "clientIceCandidate") {
        let clientId=findClientWithConnection(connection);
        if(clientId==null){
            log.log("Client with invalid id attempted operation");
            return;
        }
        if(clients[clientId].assignedServer==null){
            log.log("Unassigned client attempted to send ICE candidate");
            return;
        }
        let serverId=clients[clientId].assignedServer;
        if (!servers.hasOwnProperty(serverId)) {
            log.log("Client assigned to invalid server attempted to send ICE candidate");
            return;
        }

        servers[serverId].connection.sendUTF(JSON.stringify({
            type: "clientIceCandidate",
            candidate: message.candidate
        }));

        log.log("Client "+clientId+" sent ICE candidate to "+serverId);
    }
}

function attemptAssign(){
    let freeServer=findPropertyWhere(servers, server => server.assignedClient === null);
    let freeClient=findPropertyWhere(clients, client => client.assignedServer === null);
    if(freeServer!=null&&freeClient!=null){
        log.log("Server "+freeServer+" assigned to client "+freeClient);
        servers[freeServer].assignedClient=freeClient;
        clients[freeClient].assignedServer=freeServer;

        servers[freeServer].connection.sendUTF(JSON.stringify({
            type: "openServerAssigned",
            assignedClient: freeClient
        }));
        clients[freeClient].connection.sendUTF(JSON.stringify({
            type: "openClientAssigned",
            assignedServer: freeServer
        }));

        updateTables();
    }
}

/*
<intermediate starts>
***

<server starts>
server -> intermediate:
{type:"openServer"}
intermediate -> server:
{type:"openServerInfo",id:<number>}
***

<client starts>
client -> intermediate:
{type:"openClient"}
intermediate -> client:
{type:"openClientInfo",id:<number>}

<intermediate pairs open server and open client>
intermediate -> server:
{type:"openServerAssigned", assignedClient: <client id>}
intermediate -> client:
{type:"openClientAssigned", assignedServer: <server id>}

server -> intermediate:
{type:"serverOfferSDP", sdp: <SDP>}
intermediate -> client:
{type:"serverOfferSDP", sdp: <SDP>}
client -> intermediate:
{type:"clientAnswerSDP", sdp: <SDP>}
intermediate -> server:
{type:"clientAnswerSDP", sdp: <SDP>}

<server wants to send ice candidate to client>
server -> intermediate:
{type:"serverIceCandidate", candidate: <JSON encoded candidate string>}
intermediate -> client:
{type:"serverIceCandidate", candidate: <JSON encoded candidate string>}

<client wants to send ice candidate to server>
client -> intermediate:
{type:"clientIceCandidate", candidate: <JSON encoded candidate string>}
intermediate -> server:
{type:"clientIceCandidate", candidate: <JSON encoded candidate string>}


*/
