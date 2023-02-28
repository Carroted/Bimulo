var socket = io();
var entities = [];

function drawVerts(verts) {
    ctx.beginPath();
    verts.forEach(e => ctx.lineTo(e.x, e.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d'); // main layer

let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1;
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

var players = {};

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
        socket.emit("player click", { x: mousePos.x, y: mousePos.y });
    }
}

function onPointerUp(e) {
    if (e.button == 0) {
        pointerDown = false;
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
    socket.emit("player mouse", { x: mousePos.x, y: mousePos.y });
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
        socket.emit("player mouse", { x: mousePos.x, y: mousePos.y });
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
    socket.emit('update player', player);
}

socket.on('connect', function () {
    socket.emit('new player', player);
});

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


socket.on('rank', function (data) {
    player.rank = data;
});

socket.on('message', function (message) {
    // bah
});


socket.on('state', function (data) {
    // data has id (socketid) and player (player object)
    players[data.id] = data.player;
    draw();
});

socket.on('states', function (playersArray) {
    players = {};
    for (var i = 0; i < playersArray.length; i++) {
        players[playersArray[i].id] = playersArray[i].player;
    }


    draw();
});


socket.on('disconnected', function (id) {
    delete players[id];
    draw();
});


document.addEventListener('keydown', function (e) {


    keysDown[e.keyCode] = true;
    movementUpdate();
    if (e.keyCode === 37) {
        socket.emit("player start", "left");
    } else if (e.keyCode === 39) {
        socket.emit("player start", "right");
    }

}, false);

function movementUpdate() {
    socket.emit('movementUpdate', {
        // send position as it is now for reference
        x: player.x,
        y: player.y
    });
}

document.addEventListener('keyup', function (e) {
    delete keysDown[e.keyCode];

    if (e.keyCode === 37) {
        socket.emit("player stop", "left");
    } else if (e.keyCode === 39) {
        socket.emit("player stop", "right");
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

socket.on("update state", ({ boxes, walls, carBox, online }) => {
    entities = [...boxes, ...walls, carBox]; // o7
});

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
    ctx.setTransform(cameraZoom, 0, 0, cameraZoom, cameraOffset.x, cameraOffset.y);

    ctx.fillStyle = '#151832';
    var origin = transformPoint(0, 0);
    var end = transformPoint(window.innerWidth, window.innerHeight);
    var width = end.x - origin.x;
    var height = end.y - origin.y;
    ctx.fillRect(origin.x, origin.y, width, height);
    /*
        var map = getImage('/sprites/map.png');
        ctx.drawImage(map, 0, 0, map.width * 4, map.height * 4);
        */

    // draw map
    //ctx.drawImage(canvasMap, 0, 0);


    var mousePos = transformPoint(lastX, lastY); // this is also the last touch position, however we will only use it for mouse hover effects in this function so touch isnt gonna be very relevant (hence the name mousePos)
    /*
    // draw a dot on mouse (for debugging)
    ctx.fillStyle = 'black';
    
    // round to 4 as thats the scale
    ctx.fillText("(" + (Math.round(mousePos.x / 4) * 4) + ", " + (Math.round(mousePos.y / 4) * 4) + ")", mousePos.x + 10, mousePos.y + 10);
    // if pos not in drawnPixels, draw it
    if (drawnPixels.indexOf({ x: (Math.round(mousePos.x / 4) * 4), y: (Math.round(mousePos.y / 4) * 4) }) == -1) {
        drawnPixels.push({ x: (Math.round(mousePos.x / 4) * 4), y: (Math.round(mousePos.y / 4) * 4) });
        console.log(drawnPixels);
    }
 
    for (var i = 0; i < drawnPixels.length; i++) {
        var pos = drawnPixels[i];
        ctx.fillRect((Math.round(pos.x / 4) * 4), (Math.round(pos.y / 4) * 4), 4, 4);
    }*/

    ctx.fillStyle = 'red';
    ctx.fillRect(mousePos.x, mousePos.y, 4, 4);

    // fill
    ctx.fillStyle = '#9ac4f1';
    // no border
    ctx.strokeStyle = 'transparent';
    /* the entities are verts */
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        drawVerts(entity);
    }

    for (var id in players) {
        console.log('ID: ' + id);
        var player = players[id];
        ctx.fillStyle = 'blue';
        drawRect(player.x, player.y, 4, 4);
    }


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



window.onbeforeunload = function (e) {
    socket.disconnect();
};


function loop() {
    if (update()) {
        //socket.emit('movement', player);
    }

    physics();
    draw();

}

function physics() {
    // fall d
}

setInterval(loop, 1000 / framerate);