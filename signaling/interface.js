let blessed = require("blessed");
let contrib = require("blessed-contrib");

let screen = blessed.screen();

let grid = new contrib.grid({
    rows: 2,
    cols: 2,
    screen: screen
})

let serverTable = grid.set(0, 0, 1, 1, contrib.table, {
    keys: true,
    fg: "white",
    selectedFg: "white",
    selectedBg: "blue",
    interactive: true,
    label: "Servers",
    width: "100%",
    height: "100%",
    border: {
        type: "line",
        fg: "cyan"
    },
    columnSpacing: 10,
    columnWidth: [6, 12, 15,9]
});

serverTable.setData({
    headers: ["Server","IP","Assigned client","Connected"],
    data: [
    ]
});

let clientTable = grid.set(1, 0, 1, 1, contrib.table, {
    keys: true,
    fg: "white",
    selectedFg: "white",
    selectedBg: "blue",
    interactive: true,
    label: "Clients",
    width: "100%",
    height: "100%",
    border: {
        type: "line",
        fg: "cyan"
    },
    columnSpacing: 10,
    columnWidth: [6, 12, 15,9]
});


clientTable.setData({
    headers: ["Client","IP","Assigned server","Connected"],
    data: [
    ]
});

let log = grid.set(0, 1, 2, 1, contrib.log, {
    fg: "white",
    selectedFg: "white",
    label: "Log"
})

let focusTargets=[serverTable,clientTable];
let focusIndex=0;
function focusTarget(){
    focusTargets[focusIndex%focusTargets.length].focus();
}
focusTarget();

screen.key(["tab"], function(ch, key) {
    focusIndex++;
    focusTarget();
});

screen.key(["escape", "q", "C-c"], function(ch, key) {
    process.exit(0);
});

screen.render()

module.exports = {log:log,clientTable:clientTable,serverTable:serverTable,screen:screen}
