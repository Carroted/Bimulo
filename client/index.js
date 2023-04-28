var clientConnection = new SimuloClientConnection(host); // If true, our client is a host that loops data back to itself.
// Since it loops back, we can use the exact same code for both host and client, excluding the networking code.

clientConnection.on('connect', () => { // Connect fires when the WebSocket connects
    console.log('WebSocket connection established');
});

clientConnection.on('ready', () => { // Ready fires when the WebRTC connection is established
    console.log('WebRTC connection established');
});

clientConnection.on('data', (data) => { // Data fires when data is received from the server
    handleData(data); // Parses and displays the data in the world
});

clientConnection.connect(); // Connects to the server

var entities = []; // We update this every time we receive a world update from the server
var creatingEntities = {};
var players = {}; // We update this every time we receive a player mouse update from the server

function handleData(body) { // World data from the host, sent to all clients and to the host itself (loopback)
    if (body.type !== null && body.type !== undefined && body.data !== null && body.data !== undefined) {
        if (body.type == 'world update') {
            entities = body.data.shapes;
            creatingEntities = body.data.creatingObjects;
            // change :root background to body.data.background
            document.documentElement.style.background = body.data.background;
        }
        if (body.type == 'player mouse') {
            players[body.data.id] = {
                x: body.data.x,
                y: body.data.y
            };
        }
    }
}

// load all svg data-src images
var svgs = document.querySelectorAll('svg[data-src]');
svgs.forEach(function (svg) {
    var src = svg.getAttribute('data-src');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', src, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            svg.outerHTML = xhr.responseText;
        }
    };
    xhr.send();
});

function drawVerts(verts) {
    ctx.beginPath();
    verts.forEach(e => ctx.lineTo(e.x, e.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function rotateVerts(vertices, angle) {
    // rotate the vertices at the origin (0,0)
    var rotatedVertices = [];
    for (var i = 0; i < vertices.length; i++) {
        // use math to rotate the vertices
        var rotatedX = vertices[i].x * Math.cos(angle) - vertices[i].y * Math.sin(angle);
        var rotatedY = vertices[i].x * Math.sin(angle) + vertices[i].y * Math.cos(angle);
        // add the rotated vertices to the array
        rotatedVertices.push({ x: rotatedX, y: rotatedY });
    }
    return rotatedVertices;
}


function drawVertsAt(x, y, verts, rotation = 0) {
    ctx.beginPath();
    verts = rotateVerts(verts, rotation);
    verts.forEach(e => {
        ctx.lineTo((e.x + x), (e.y + y));
    });
    ctx.closePath();
    //ctx.strokeStyle = '#000000a0';

    ctx.save();
    ctx.clip();
    ctx.lineWidth *= 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    /*
        ctx.fill();
        ctx.stroke();
        */
}
function drawVertsNoFillAt(x, y, verts, rotation = 0) {
    ctx.beginPath();
    verts = rotateVerts(verts, rotation);
    verts.forEach(e => {
        ctx.lineTo((e.x + x), (e.y + y));
    });
    ctx.closePath();
    // set stroke color
    ctx.strokeStyle = '#9ac4f1';
    // set line width
    ctx.lineWidth = 0.01;
    ctx.stroke();
    // reset to transparent
    ctx.strokeStyle = 'transparent';
}

function drawCircleAt(x, y, radius, rotation = 0) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}


var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d'); // main layer

var windowEnd = transformPoint(window.innerWidth, window.innerWidth);

let cameraOffset = { x: windowEnd.x / 2, y: windowEnd.y / 2 };
let cameraZoom = 42;
let MAX_ZOOM = 5;
let MIN_ZOOM = 0.1;
let SCROLL_SENSITIVITY = 0.0005;

let lastX = window.innerWidth / 2;
let lastY = window.innerHeight / 2;

// lastX is for touch and mouse, this is specifically for mouse
let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;

// Gets the relevant location from a mouse or single touch event
function getEventLocation(e) {
    if (e.touches && e.touches.length == 1) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    else if (e.clientX && e.clientY) {
        return { x: e.clientX, y: e.clientY };
    }
}

function drawRect(x, y, width, height) {
    ctx.fillRect(x, y, width, height);
}

function drawText(text, x, y, size, font) {
    ctx.font = `${size}px ${font}`;
    ctx.fillText(text, x, y);
}

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragStart2 = { x: 0, y: 0 };



// movement system where we can move in multiple directions at once
var keysDown = {};

var pointerDown = false;



function onPointerDown(e) {
    var mousePos = transformPoint(getEventLocation(e).x, getEventLocation(e).y);

    if (e.button == 2 || e.button && 3) {
        isDragging = true;
        dragStart.x = getEventLocation(e).x - cameraOffset.x;
        dragStart.y = getEventLocation(e).y - cameraOffset.y;

        dragStart2.x = getEventLocation(e).x;
        dragStart2.y = getEventLocation(e).y;
    }
    // if its not those buttons, we will see how much cursor moves first

    if (e.button == 0) {
        player = {
            x: mousePos.x,
            y: mousePos.y,
            down: true
        };
        clientConnection.emitData("player mouse down", player);
        pointerDown = true;
    }
}

function onPointerUp(e) {
    if (e.button == 0) {
        pointerDown = false;
        var mousePos = transformPoint(getEventLocation(e).x, getEventLocation(e).y);
        player = {
            x: mousePos.x,
            y: mousePos.y,
            down: false
        };
        clientConnection.emitData("player mouse up", player);
    }
    isDragging = false;
    initialPinchDistance = null;
    lastZoom = cameraZoom;
}

var prevSprite;

function onPointerMove(e) {
    if (isDragging) {
        cameraOffset.x = getEventLocation(e).x - dragStart.x;
        cameraOffset.y = getEventLocation(e).y - dragStart.y;
    }

    lastX = getEventLocation(e).x;
    lastY = getEventLocation(e).y;

    lastMouseX = getEventLocation(e).x;
    lastMouseY = getEventLocation(e).y;

    // send mouse position to server
    var mousePos = transformPoint(getEventLocation(e).x, getEventLocation(e).y);
    player = {
        x: mousePos.x,
        y: mousePos.y,
        down: pointerDown
    };
    clientConnection.emitData("player mouse", player);
}

var touchStartElement = null;

function handleTouch(e, singleTouchHandler) {
    if (touchStartElement != canvas) {
        return;
    }

    if (e.touches.length == 1) {
        singleTouchHandler(e);
    }
    else if (e.type == "touchmove" && e.touches.length == 2) {
        isDragging = false;
        handlePinch(e);
    }
}

let initialPinchDistance = null;
let lastZoom = cameraZoom;

let previousPinchDistance = null;

function handlePinch(e) {
    e.preventDefault();

    let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

    // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
    let currentDistance = (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2;
    if (!previousPinchDistance)
        previousPinchDistance = currentDistance;

    if (initialPinchDistance == null) {
        initialPinchDistance = currentDistance;
    }
    else {
        adjustZoom((currentDistance - previousPinchDistance) > 0 ? 1.05 : (currentDistance - previousPinchDistance) < 0 ? 0.95 : 0, null, { x: (touch1.x + touch2.x) / 2, y: (touch1.y + touch2.y) / 2 });
    }

    previousPinchDistance = currentDistance;
}

function scaleAt(x, y, scaleBy) {  // at pixel coords x, y scale by scaleBy
    cameraZoom *= scaleBy;
    cameraOffset.x = x - (x - cameraOffset.x) * scaleBy;
    cameraOffset.y = y - (y - cameraOffset.y) * scaleBy;
}

function adjustZoom(zoomAmount, zoomFactor, center) {
    if (!isDragging) {
        if (center) {
            lastX = center.x;
            lastY = center.y;
        }
        if (zoomAmount) {
            // cameraZoom += zoomAmount
            scaleAt(lastX, lastY, zoomAmount);
        }
        else if (zoomFactor) {
            console.log(zoomFactor + ' is zoom factor');
            scaleAt(lastX, lastY, zoomFactor);
            // cameraZoom = zoomFactor * lastZoom
        }


        //cameraZoom = Math.min(cameraZoom, MAX_ZOOM)
        //cameraZoom = Math.max(cameraZoom, MIN_ZOOM)





        console.log(zoomAmount)

        // mouse moved, lets send
        var mousePos = transformPoint(lastX, lastY);
        clientConnection.emitData("player mouse", { x: mousePos.x, y: mousePos.y });
    }
}


canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('touchstart', (e) => handleTouch(e, onPointerDown));

document.addEventListener('touchstart', (e) => {
    touchStartElement = e.target;
});
document.addEventListener('mouseup', onPointerUp);
document.addEventListener('touchend', (e) => handleTouch(e, onPointerUp));
document.addEventListener('mousemove', onPointerMove);
document.addEventListener('touchmove', (e) => handleTouch(e, onPointerMove));
canvas.addEventListener('wheel', (e) => adjustZoom((-e.deltaY * SCROLL_SENSITIVITY) > 0 ? 1.1 : 0.9, null, null));

// make canvas full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var player = {
    x: 0,
    y: 0,
    name: 'Anonymous'
};

var images = {};
var imageNames = [];

for (var i = 0; i < imageNames.length; i++) {
    getImage(spritesDir + player.color + '/' + imageNames[i] + '.png');
}

function getImage(src) {
    if (images[src] != undefined) {
        return images[src];
    }
    else {
        var img = new Image();
        img.src = src;
        images[src] = img;
        return img;
    }

} // with this system, all images are cached

// make canvas bg black
draw();

// on resize, make canvas full screen
window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}, false);

function setName(name) {
    player.name = name;
    clientConnection.emitData('update player', player);
}



// polyfill for roundRect
function roundRect(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    return ctx;
}

function roundTri(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arcTo(x + w, y, x + w, y + h, 10);
    ctx.arcTo(x + w, y + h, x, y + h, 10);
    ctx.arcTo(x, y + h, x, y, 10);
    ctx.closePath();
    return ctx;
}




document.addEventListener('keydown', function (e) {


    keysDown[e.keyCode] = true;
    movementUpdate();
    if (e.keyCode === 37) {
        clientConnection.emitData("player start", "left");
    } else if (e.keyCode === 39) {
        clientConnection.emitData("player start", "right");
    }

}, false);

function movementUpdate() {
    clientConnection.emitData('movementUpdate', {
        // send position as it is now for reference
        x: player.x,
        y: player.y
    });
}

function setTheme(name) {
    clientConnection.emitData('set_theme', name);
}

document.addEventListener('keyup', function (e) {
    delete keysDown[e.keyCode];

    if (e.keyCode === 37) {
        clientConnection.emitData("player stop", "left");
    } else if (e.keyCode === 39) {
        clientConnection.emitData("player stop", "right");
    }
}, false);
/*
        // hold right click to move camera
        document.addEventListener('mousedown', function (e) {
            if (e.button == 2) {
                keysDown[1] = true;
            }
        }, false);
 
        document.addEventListener('mouseup', function (e) {
            if (e.button == 2) {
                delete keysDown[1];
            }
        }, false);
 
        document.addEventListener('mousemove', function (e) {
            if (1 in keysDown) {
                camera.x -= e.movementX;
                camera.y -= e.movementY;
            }
        }, false);*/

// disable right click menu
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
}, false);

var lastSpriteUpdate = new Date().getTime();
var spriteUpdateDelay = 100;
var currentSprite = 1;
var framerate = 30;
var speed = 300 / framerate;
// round speed to increments of 8 (pixels are 8x8)
speed = Math.round(speed / 8) * 8;







function update() {
    var moved = false;


    return moved;

    // this is the most useful function of all time.
    // it is the most called function in the entire game. if you remove this, the game will not work. we are not quite sure why. but we dont mess with the update function.
}

// Modified version of https://stackoverflow.com/a/28416298 to render on top of canvas and at the same place image would otherwise be rendered, with size
function outlinedImage(img, s, color, x, y, width, height) {

    var canvas2 = document.createElement('canvas');
    var ctx2 = canvas2.getContext('2d');
    canvas2.width = width + (s * 4);
    canvas2.height = height + (s * 4);
    ctx2.imageSmoothingEnabled = false;
    ctx2.mozImageSmoothingEnabled = false;
    ctx2.webkitImageSmoothingEnabled = false;
    ctx2.msImageSmoothingEnabled = false;

    var dArr = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
        i = 0;  // iterator

    // draw images at offsets from the array scaled by s
    for (; i < dArr.length; i += 2)
        ctx2.drawImage(img, (1 + dArr[i] * s) + s, (1 + dArr[i + 1] * s) + s, width, height);

    // fill with color
    ctx2.globalCompositeOperation = "source-in";
    ctx2.fillStyle = color;
    ctx2.fillRect(0, 0, width + (s * 4), height + (s * 40));

    // draw original image in normal mode
    ctx2.globalCompositeOperation = "source-over";
    ctx2.drawImage(img, 1 + s, 1 + s, width, height);

    ctx.drawImage(canvas2, x - 1 - s, y - 1 - s);

    // dispose responsibly
    canvas2 = null;
    ctx2 = null;
}


function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;



    // Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
    ctx.setTransform(cameraZoom, 0, 0, cameraZoom, cameraOffset.x, cameraOffset.y);

    //ctx.fillStyle = '#151832';
    var origin = transformPoint(0, 0);
    var end = transformPoint(window.innerWidth, window.innerHeight);
    var width = end.x - origin.x;
    var height = end.y - origin.y;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw map
    //ctx.drawImage(canvasMap, 0, 0);


    var mousePos = transformPoint(lastX, lastY); // this is also the last touch position, however we will only use it for mouse hover effects in this function so touch isnt gonna be very relevant (hence the name mousePos)

    var cursor = getImage('/cursor.png');

    // fill
    ctx.fillStyle = '#a1acfa';
    // no border
    ctx.strokeStyle = 'transparent';
    // the entities are verts
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        ctx.fillStyle = entity.color;
        if (entity.border) {
            ctx.strokeStyle = entity.border;
            ctx.lineWidth = entity.border_width / (entity.border_scale_with_zoom ? cameraZoom : 1);
        }
        else {
            ctx.strokeStyle = 'transparent';
        }
        if (entity.type === 'polygon') {
            //console.log('drawing polygon');
            drawVertsAt(entity.x, entity.y, entity.vertices, entity.angle);
        }
        else if (entity.type === 'circle') {
            // console.log('drawing circle');
            drawCircleAt(entity.x, entity.y, entity.radius, entity.angle);
        }
        else if (entity.type === 'edge') {
            //console.log('drawing edge');
            drawVertsNoFillAt(entity.x, entity.y, entity.vertices, entity.angle);
        }
        else {
            //console.log('what is ' + entity.type);
        }
    }

    for (var id in players) {
        //console.log('ID: ' + id);
        var player = players[id];
        ctx.fillStyle = 'blue';
        //drawRect(player.x, player.y, 4, 4);
        // draw image getImage('/cursor.png')
        ctx.drawImage(cursor, player.x, player.y, 0.7, cursor.height * (0.7 / cursor.width));

        if (creatingEntities[id]) {
            // Calculate the difference between creatingEntities[id] x and y and the current player x and y
            const width = Math.abs(player.x - creatingEntities[id].x);
            const height = Math.abs(player.y - creatingEntities[id].y);

            // Determine the top-left corner of the rectangle
            const topLeftX = Math.min(player.x, creatingEntities[id].x);
            const topLeftY = Math.min(player.y, creatingEntities[id].y);

            // Set the fill style to transparent white
            //ctx.fillStyle = creatingEntities[id].color;
            // we have "rgba(R, G, B, A)". lets change A to be half of what it is
            var splitColor = creatingEntities[id].color.split(',');
            var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
            alpha = alpha / 2;
            splitColor[3] = alpha + ')';
            var newColor = splitColor.join(',');
            ctx.fillStyle = newColor;

            // Draw the rectangle
            ctx.fillRect(topLeftX, topLeftY, width, height);
        }
        else {
            console.log('no color');
        }
    }

    ctx.fillStyle = 'red';

    ctx.drawImage(cursor, mousePos.x, mousePos.y, 0.7, cursor.height * (0.7 / cursor.width));
    if (clientConnection.id) {
        if (creatingEntities[clientConnection.id]) {
            // Calculate the difference between creatingEntities[id] x and y and the current player x and y
            const width = Math.abs(mousePos.x - creatingEntities[clientConnection.id].x);
            const height = Math.abs(mousePos.y - creatingEntities[clientConnection.id].y);

            // Determine the top-left corner of the rectangle
            const topLeftX = Math.min(mousePos.x, creatingEntities[clientConnection.id].x);
            const topLeftY = Math.min(mousePos.y, creatingEntities[clientConnection.id].y);

            // Set the fill style to transparent white
            //ctx.fillStyle = creatingEntities[clientConnection.id].color;
            // empty fill
            var splitColor = creatingEntities[clientConnection.id].color.split(',');
            console.log('splitColor: ' + splitColor);
            var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
            alpha = alpha / 2;
            splitColor[3] = alpha + ')';
            var newColor = splitColor.join(',');
            console.log('newColor: ' + newColor);
            ctx.fillStyle = newColor;

            // Draw the rectangle
            //ctx.fillRect(topLeftX, topLeftY, width, height);
            ctx.fillRect(topLeftX, topLeftY, width, height);
        }
    }


    // draw text that says mouse pos in world space
    ctx.fillStyle = 'white';
    ctx.font = '0.2px Arial';
    // round to 1 decimal place
    var mousePosXRound = Math.round(mousePos.x * 10) / 10;
    var mousePosYRound = Math.round(mousePos.y * 10) / 10;
    ctx.fillText('(' + mousePosXRound + ', ' + mousePosYRound + ')', mousePos.x + 0.2, mousePos.y);
}

function transformPoint(x, y) {
    // transform a point in the ctx from screen space to world space
    var newX, newY;
    // calculate, based on ctx translation and scale, what the point would be
    newX = (x - ctx.getTransform().e) / (ctx.getTransform().a);
    newY = (y - ctx.getTransform().f) / (ctx.getTransform().d);

    return { x: newX, y: newY };
}

function inverseTransformPoint(x, y) {
    // transform a point in the ctx from world space to screen space
    var newX, newY;
    // calculate, based on ctx translation and scale, what the point would be
    newX = (x * ctx.getTransform().a) + ctx.getTransform().e;
    newY = (y * ctx.getTransform().d) + ctx.getTransform().f;

    return { x: newX, y: newY };
}





function loop() {
    if (update()) {
        //socket.emit('movement', player);
    }

    physics();
    draw();

    window.requestAnimationFrame(loop);
}

function physics() {
    // fall d
}

window.requestAnimationFrame(loop);