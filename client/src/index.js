var themes = {
    default: {
        background: "linear-gradient(180deg, #0f1130 0%, #553f90 100%)",
        ground: {
            color: "#a1acfa",
            border: null,
            border_width: null,
            border_scale_with_zoom: false,
        },
        new_objects: {
            color: {
                hue_min: 0,
                hue_max: 360,
                sat_min: 0,
                sat_max: 100,
                val_min: 80,
                val_max: 100,
                alp_min: 1,
                alp_max: 1,
            },
            border: null,
            border_width: null,
            border_scale_with_zoom: false,
            circle_cake: false,
            spring_image: "/assets/textures/spring.png",
        },
        tool_icons: {
            "drag": null,
            "add_rectangle": "/assets/textures/add_rectangle.png",
            "add_circle": "/assets/textures/add_circle.png",
            "add_person": "/media/icon_square.png",
            "add_polygon": "/assets/textures/add_polygon.png",
            "add_spring": "/assets/textures/add_spring.png",
        },
        system_cursor: false,
        tool_icon_size: 0.5,
        tool_icon_offset: [0.55, 0.75]
    },
    nostalgia: {
        background: "#738cff",
        ground: {
            color: "#57b00d",
            border: "#111111a0",
            border_width: 1,
            border_scale_with_zoom: true,
        },
        new_objects: {
            color: {
                hue_min: 0,
                hue_max: 360,
                sat_min: 0,
                sat_max: 100,
                val_min: 0,
                val_max: 100,
                alp_min: 1,
                alp_max: 1,
            },
            border: "#111111a0",
            border_width: 1,
            border_scale_with_zoom: true,
            circle_cake: true,
            spring_image: "/assets/textures/spring.png",
        },
        tool_icons: {
            "drag": "/assets/textures/tools/drag.png",
            "add_rectangle": "/assets/textures/tools/box.png",
            "add_circle": "/assets/textures/tools/circle.png",
            "add_person": "/media/icon_square.png"
        },
        system_cursor: true,
        tool_icon_size: 0.7,
        tool_icon_offset: [0.3, 0.4]
    },
};
var theme = themes.default;

function queryParent(element, className) {
    var parent = element.parentNode;
    while (parent) {
        if (parent.classList.contains(className)) {
            return parent;
        }
        parent = parent.parentNode;
    }
    return null;
}

// on click tool, set active tool
const tools = document.querySelectorAll('.tool');
var toolIcon = null;
var toolIconSize = null;
var toolIconOffset = null;
tools.forEach(tool => {
    setUpClickSound(tool);
    tool.addEventListener('click', () => {
        // return if has fake class
        if (tool.classList.contains('fake')) {
            return;
        }
        // remove active class from all tools in that toolbar, without removing it from other toolbars
        queryParent(tool, "toolbar").querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
        tool.classList.add('active');

        // if it has data-tool, setTool with that value
        if (tool.dataset.tool) {
            console.log('setting tool to', tool.dataset.tool);
            setTool(tool.dataset.tool);
            // if theres data-img, set the icon to that
            if (theme.tool_icons[tool.dataset.tool]) {
                toolIcon = theme.tool_icons[tool.dataset.tool];
                toolIconSize = theme.tool_icon_size;
                toolIconOffset = theme.tool_icon_offset;
            }
            else {
                toolIcon = null;
                toolIconSize = null;
                toolIconOffset = null;
            }
        }
        // if data-action, handle
        if (tool.dataset.action) {
            if (tool.dataset.action == 'play') {
                setPaused(false);
            }
            if (tool.dataset.action == 'pause') {
                setPaused(true);
            }
            if (tool.dataset.action == '2x') {
                setTimeScale(5);
            }
            if (tool.dataset.action == '1x') {
                setTimeScale(1);
            }
        }
        // if data-menu, show that .toolbar.secondary and hide all others
        if (tool.dataset.menu) {
            document.querySelectorAll('.toolbar.secondary').forEach(toolbar => {
                if (toolbar.id == tool.dataset.menu) {
                    toolbar.style.display = 'flex';
                }
                else {
                    toolbar.style.display = 'none';
                }
            });
        }
    });
});

// on click .file-menu, show the thing
const fileMenus = document.querySelectorAll('.file-menu');
fileMenus.forEach(fileMenu => {
    console.log('fileMenu', fileMenu);
    fileMenu.addEventListener('click', () => {
        console.log('fileMenu clicked');
        // if data-file, show the .file-menu-content with that id
        if (fileMenu.dataset.file) {
            console.log('fileMenu.dataset.file', fileMenu.dataset.file);
            document.querySelectorAll('.file-menu-content').forEach(fileMenuContent => {
                console.log('fileMenuContent', fileMenuContent);
                if (fileMenuContent.id == fileMenu.dataset.file) {
                    console.log('showing fileMenuContent');
                    if (!fileMenuContent.classList.contains('active')) {
                        fileMenuContent.classList.add('active');
                    }
                    else {
                        fileMenuContent.classList.remove('active');
                    }
                }
                else {
                    console.log('hiding fileMenuContent');
                    if (fileMenuContent.classList.contains('active')) {
                        fileMenuContent.classList.remove('active');
                    }
                }
            });
        }
        else {
            console.log('no fileMenu.dataset.file');
        }
    });
});


//import SimuloNetworkClient from '/src/SimuloNetworkClient/index.js';
//import SimuloLocalClient from '/shared/src/SimuloLocalClient.js';

var host = false;
// get query string for host (?host=true, ?host=false or none for false)
var queryString = window.location.search;
if (queryString) {
    queryString = queryString.substring(1);
    var queryArray = queryString.split('&');
    queryArray.forEach(function (query) {
        var queryPair = query.split('=');
        if (queryPair[0] == 'host') {
            if (queryPair[1] == 'true') {
                host = true;
            } else if (queryPair[1] == 'false') {
                host = false;
            }
        }
    });
}

import Box2DFactory from '../../node_modules/box2d-wasm/dist/es/entry.js';


var timeScale = null;
var paused = null;

//var client = new SimuloNetworkClient(host); // If true, our client is a host that loops data back to itself.
import SimuloServerController from '../../shared/src/SimuloServerController.js';

var serverController = new SimuloServerController(theme, null, true);
var systemCursor = false;
function enableSystemCursor() {
    document.getElementById('game').classList.add('cursor');
    systemCursor = true;
}
function disableSystemCursor() {
    document.getElementById('game').classList.remove('cursor');
    systemCursor = false;
}
if (theme.system_cursor) {
    enableSystemCursor();
}
else {
    disableSystemCursor();
}
var client = serverController.localClients[0];
// Since it loops back, we can use the exact same code for both host and client, excluding the networking code.

client.on('connect', () => { // Connect fires when the WebSocket connects
    console.log('WebSocket connection established');
});

client.on('ready', () => { // Ready fires when the WebRTC connection is established
    console.log('WebRTC connection established');
});

client.on('data', (data) => { // Data fires when data is received from the server
    handleData(data); // Parses and displays the data in the world
});

client.connect(); // Connects to the server
function setTheme(name) {
    client.emitData('set_theme', name);
}
function setTool(name) {
    client.emitData('set_tool', name);
}

function setPaused(paused) {
    client.emitData('set_paused', paused);
}
function setTimeScale(timeScale) {
    client.emitData('set_time_scale', timeScale);
}

var entities = []; // We update this every time we receive a world update from the server
var creatingObjects = {};
var creatingSprings = {};
var players = {}; // We update this every time we receive a player mouse update from the server
var springs = [];

function handleData(body) { // World data from the host, sent to all clients and to the host itself (loopback)
    if (body.type !== null && body.type !== undefined && body.data !== null && body.data !== undefined) {
        if (body.type == 'world update') {
            entities = body.data.shapes;
            creatingObjects = body.data.creating_objects;
            creatingSprings = body.data.creating_springs;
            // change :root background to body.data.background
            document.documentElement.style.background = body.data.background;
            springs = body.data.springs;
            if (timeScale == null) {
                timeScale = body.data.time_scale;
                document.getElementById('time-scale-slider').value = timeScale;
                document.getElementById('time-scale-input').value = timeScale;
            }
            if (paused == null) {
                paused = body.data.paused;
                document.getElementById('paused-toggle').checked = paused;
            }
        }
        if (body.type == 'player mouse') {
            players[body.data.id] = {
                x: body.data.x,
                y: body.data.y
            };
            springs = body.data.springs;
        }
        if (body.type == 'collision') {
            // body.data.sound is relative to /assets/sounds/. lets set volume based on body.data.volume
            var audio = new Audio('/assets/sounds/' + body.data.sound);
            audio.volume = body.data.volume;
            // pitch from 0.5 to 1.5
            audio.playbackRate = body.data.pitch;
            audio.play();
        }
        if (body.type == 'set_time_scale') {
            timeScale = body.data;
            // set #time-scale-slider and #time-scale-input
            document.getElementById('time-scale-slider').value = timeScale;
            document.getElementById('time-scale-input').value = timeScale;
        }
        if (body.type == 'set_paused') {
            paused = body.data;
            // set #paused-toggle
            document.getElementById('paused-toggle').checked = paused;
        }
    }
}

// on change slider (not just on release, every step)
document.getElementById('time-scale-slider').addEventListener('input', function (e) {
    setTimeScale(e.target.value);
    // change input
    document.getElementById('time-scale-input').value = e.target.value;
});

// on change input
document.getElementById('time-scale-input').addEventListener('change', function (e) {
    setTimeScale(e.target.value);
    // change slider
    document.getElementById('time-scale-slider').value = e.target.value;
});

// on change toggle
document.getElementById('paused-toggle').addEventListener('change', function (e) {
    setPaused(e.target.checked);
});

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

function drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength) // if useHeight false, will stretch along width
{
    // if useHeight is true, we will stretch along height between p1 and p2. if false, we will stretch along width between p1 and p2
    if (useHeight) {
        // draw between 2 points, offsetting other axis by half of otherAxisLength
        var angle = Math.atan2(y2 - y1, x2 - x1);
        var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        var halfOtherAxisLength = otherAxisLength / 2;
        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(angle);
        ctx.drawImage(image, -halfOtherAxisLength, 0, otherAxisLength, length);
        ctx.restore();
    } else {
        // draw between 2 points, offsetting other axis by half of otherAxisLength
        var angle = Math.atan2(y2 - y1, x2 - x1);
        var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        var halfOtherAxisLength = otherAxisLength / 2;
        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(angle);
        ctx.drawImage(image, 0, -halfOtherAxisLength, length, otherAxisLength);
        ctx.restore();
    }
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

const scaleOffset = 0.009999999776482582;

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

function drawCircleAt(x, y, radius, rotation = 0, circleCake = false) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    // if circleCake, draw a partial circle (20 degrees)
    if (circleCake) {
        // fill color darker
        ctx.fillStyle = '#00000080';
        ctx.strokeStyle = 'transparent';
        ctx.beginPath();
        //ctx.arc(x, y, radius, 0, 20 * Math.PI / 180);
        // offset based on rotation
        ctx.arc(x, y, radius, rotation, rotation + 23 * Math.PI / 180);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
    }
}
var tintedImages = {};

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
        client.emitData("player mouse down", player);
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
        client.emitData("player mouse up", player);
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
    client.emitData("player mouse", player);
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
        client.emitData("player mouse", { x: mousePos.x, y: mousePos.y });
    }
}


canvas.addEventListener('mousedown', (e) => {
    onPointerDown(e);
    // stop propagation to prevent text selection
    e.stopPropagation();
    e.preventDefault();
    return false;
});
canvas.addEventListener('mouseup', (e) => {
    onPointerUp(e);
    e.stopPropagation();
    e.preventDefault();
    return false;
});

canvas.addEventListener('touchstart', (e) => {
    handleTouch(e, onPointerDown);
    e.stopPropagation();
    e.preventDefault();
    return false;
});

document.addEventListener('touchstart', (e) => {
    touchStartElement = e.target;
});
function setUpClickSound(element) {
    element.addEventListener('mousedown', (e) => {
        // if element has active class, ignore
        if (element.classList.contains('active')) {
            return;
        }
        var audio = new Audio(element.classList.contains('fake') ? '/assets/sounds/deny.wav' : '/assets/sounds/button_down.wav');
        audio.volume = element.classList.contains('fake') ? 0.3 : 0.02;
        audio.playbackRate = element.classList.contains('fake') ? 1 : 5;
        audio.play();
    });
    element.addEventListener('mouseup', (e) => {
        if (element.classList.contains('active')) {
            return;
        }
        // return if fake
        if (element.classList.contains('fake')) {
            return;
        }
        var audio = new Audio('/assets/sounds/button_up.wav');
        audio.volume = 0.02;
        // pitch up
        audio.playbackRate = element.classList.contains('fake') ? 1 : 5;
        audio.play();
    });
}
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
    client.emitData('update player', player);
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
        client.emitData("player start", "left");
    } else if (e.keyCode === 39) {
        client.emitData("player start", "right");
    }

    // if its a number from 1-9, look for #menu-X-button and click it
    if (e.keyCode >= 49 && e.keyCode <= 57) {
        var num = e.keyCode - 48;
        var element = document.getElementById('menu-' + num + '-button');
        if (element) {
            element.click();
        }
    }

}, false);

function movementUpdate() {
    client.emitData('movementUpdate', {
        // send position as it is now for reference
        x: player.x,
        y: player.y
    });
}




document.addEventListener('keyup', function (e) {
    delete keysDown[e.keyCode];

    if (e.keyCode === 37) {
        client.emitData("player stop", "left");
    } else if (e.keyCode === 39) {
        client.emitData("player stop", "right");
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

    var cursor = getImage('/assets/textures/cursor.png');

    // fill
    ctx.fillStyle = '#a1acfa';
    // no border
    ctx.strokeStyle = 'transparent';
    // the entities are verts
    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        var shapeSize = 1; // width of shape

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
            if (!entity.points) {
                drawVertsAt(entity.x, entity.y, entity.vertices, entity.angle);
                entity.vertices.forEach(function (vert) {
                    if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                    if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                });
            }
            else {
                drawVertsAt(entity.x, entity.y, entity.points, entity.angle);
                entity.points.forEach(function (vert) {
                    if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                    if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                });
            }
        }
        else if (entity.type === 'circle') {
            // console.log('drawing circle');
            drawCircleAt(entity.x, entity.y, entity.radius, entity.angle, entity.circle_cake);
        }
        else if (entity.type === 'edge') {
            //console.log('drawing edge');
            drawVertsNoFillAt(entity.x, entity.y, entity.vertices, entity.angle);
        }
        else {
            //console.log('what is ' + entity.type);
        }

        shapeSize = Math.abs(shapeSize / 2.1);

        if (entity.image) {
            var image = getImage(entity.image);
            if (image) {
                ctx.save();
                ctx.translate(entity.x, entity.y);
                ctx.rotate(entity.angle);
                // rotate 180deg
                ctx.rotate(Math.PI);
                // width is determined based on shape size. height is determined based on image aspect ratio
                ctx.drawImage(image, -shapeSize, -shapeSize * (image.height / image.width), shapeSize * 2, shapeSize * 2 * (image.height / image.width));
                ctx.restore();
            }
        }
    }

    // draw springs (white line from spring.p1 (array of x and y) to spring.p2 (array of x and y))
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3 / cameraZoom;
    for (var i = 0; i < springs.length; i++) {
        var spring = springs[i];
        if (spring.image) {
            //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
            drawStretchedImageLine(getImage(spring.image), spring.p1[0], spring.p1[1], spring.p2[0], spring.p2[1], false, 0.2);
        }
        else {
            ctx.beginPath();
            ctx.moveTo(spring.p1[0], spring.p1[1]);
            ctx.lineTo(spring.p2[0], spring.p2[1]);
            ctx.stroke();
        }
    }


    for (var id in players) {
        //console.log('ID: ' + id);
        var player = players[id];
        if (id === client.id) {
            // shit
            continue;
        }
        ctx.fillStyle = 'blue';
        //drawRect(player.x, player.y, 4, 4);
        // draw image getImage('/cursor.png')
        ctx.drawImage(cursor, player.x, player.y, 0.7, cursor.height * (0.7 / cursor.width));

        if (creatingSprings[id]) {
            if (creatingSprings[id].image) {
                //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                console.log('img on spring')
                drawStretchedImageLine(getImage(creatingSprings[id].image), creatingSprings[id].start[0], creatingSprings[id].start[1], player.x, player.y, false, 0.2);
            }
            else {
                console.log('no img on spring')
                ctx.beginPath();
                ctx.moveTo(creatingSprings[id].start[0], creatingSprings[id].start[1]);
                ctx.lineTo(player.x, player.y);
                ctx.stroke();
            }
        }
        if (creatingObjects[id]) {
            if (creatingObjects[id].shape === 'rectangle') {
                // Calculate the difference between creatingObjects[id] x and y and the current player x and y
                const width = Math.abs(player.x - creatingObjects[id].x);
                const height = Math.abs(player.y - creatingObjects[id].y);

                // Determine the top-left corner of the rectangle
                const topLeftX = Math.min(player.x, creatingObjects[id].x);
                const topLeftY = Math.min(player.y, creatingObjects[id].y);

                // Set the fill style to transparent white
                //ctx.fillStyle = creatingObjects[id].color;
                // we have "rgba(R, G, B, A)". lets change A to be half of what it is
                var splitColor = creatingObjects[id].color.split(',');
                var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                alpha = alpha / 2;
                splitColor[3] = alpha + ')';
                var newColor = splitColor.join(',');
                ctx.fillStyle = newColor;

                // Draw the rectangle
                ctx.fillRect(topLeftX, topLeftY, width, height);
            }
            else if (creatingObjects[id].shape === 'circle') {
                // radius is math.max of differences in x and y
                var dx = (player.x - creatingObjects[id].x);
                var dy = (player.y - creatingObjects[id].y);
                var radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;

                // Set the fill style to transparent white
                //ctx.fillStyle = creatingObjects[id].color;
                // we have "rgba(R, G, B, A)". lets change A to be half of what it is
                var splitColor = creatingObjects[id].color.split(',');
                var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                alpha = alpha / 2;
                splitColor[3] = alpha + ')';
                var newColor = splitColor.join(',');
                ctx.fillStyle = newColor;

                // Draw the circle
                drawCircleAt(creatingObjects[id].x + radius, creatingObjects[id].y + radius, radius, 0, true);
            }
        }
        else {
            console.log('no color');
        }
    }

    ctx.fillStyle = 'red';
    var cursorSize = 1;
    var scaleWithZoom = true;
    if (scaleWithZoom) {
        cursorSize = cursorSize * 40 / cameraZoom;
    }
    if (!systemCursor) {
        ctx.drawImage(cursor, mousePos.x, mousePos.y, (0.7 * cursorSize), (cursor.height * ((0.7 * cursorSize) / cursor.width)));
    }
    if (toolIcon) {
        console.log('drawing tool icon');
        ctx.drawImage(getImage(toolIcon), mousePos.x + ((toolIconOffset[0] * cursorSize)), mousePos.y + ((toolIconOffset[1] * cursorSize)), (toolIconSize * cursorSize), (toolIconSize * cursorSize));
    }
    if (client.id) {
        if (creatingSprings[client.id]) {
            if (creatingSprings[client.id].image) {
                //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                console.log('img on spring')
                drawStretchedImageLine(getImage(creatingSprings[client.id].image), creatingSprings[client.id].start[0], creatingSprings[client.id].start[1], mousePos.x, mousePos.y, false, 0.2);
            }
            else {
                console.log('no img on spring')
                ctx.beginPath();
                ctx.moveTo(creatingSprings[client.id].start[0], creatingSprings[client.id].start[1]);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.stroke();
            }
        }
        if (creatingObjects[client.id]) {
            if (creatingObjects[client.id].shape === 'rectangle') {
                // Calculate the difference between creatingObjects[id] x and y and the current player x and y
                const width = Math.abs(mousePos.x - creatingObjects[client.id].x);
                const height = Math.abs(mousePos.y - creatingObjects[client.id].y);

                // Determine the top-left corner of the rectangle
                const topLeftX = Math.min(mousePos.x, creatingObjects[client.id].x);
                const topLeftY = Math.min(mousePos.y, creatingObjects[client.id].y);

                // Set the fill style to transparent white
                //ctx.fillStyle = creatingObjects[client.id].color;
                // empty fill
                var splitColor = creatingObjects[client.id].color.split(',');
                console.log('splitColor: ' + splitColor);
                var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                alpha = alpha / 2;
                splitColor[3] = alpha + ')';
                var newColor = splitColor.join(',');
                console.log('newColor: ' + newColor);
                ctx.fillStyle = newColor;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3.5 / cameraZoom;

                // Draw the rectangle
                //ctx.fillRect(topLeftX, topLeftY, width, height);
                ctx.fillRect(topLeftX, topLeftY, width, height);
                ctx.strokeRect(topLeftX, topLeftY, width, height);
                // text of width and height
                ctx.fillStyle = 'white';
                ctx.font = (20 / cameraZoom) + 'px Arial';

                ctx.fillText(width.toFixed(1), topLeftX + width / 2, topLeftY - 0.1);
                ctx.fillText(height.toFixed(1), topLeftX - 0.1, topLeftY + height / 2);
            }
            else if (creatingObjects[client.id].shape === 'circle') {
                var dx = (mousePos.x - creatingObjects[client.id].x);
                var dy = (mousePos.y - creatingObjects[client.id].y);
                var radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;

                var splitColor = creatingObjects[client.id].color.split(',');
                var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                alpha = alpha / 2;
                splitColor[3] = alpha + ')';
                var newColor = splitColor.join(',');
                ctx.fillStyle = newColor;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3.5 / cameraZoom;

                // if dx is negative
                var posX = creatingObjects[client.id].x + radius;
                var posY = creatingObjects[client.id].y + radius;
                if (dx < 0) {
                    posX = creatingObjects[client.id].x - radius;
                }
                if (dy < 0) {
                    posY = creatingObjects[client.id].y - radius;
                }

                // Draw the circle
                drawCircleAt(posX, posY, radius, 0, creatingObjects[client.id].circle_cake);
            }
            // if polygon,just drawvertsat
            else if (creatingObjects[client.id].shape === 'polygon') {
                var splitColor = creatingObjects[client.id].color.split(',');
                var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                alpha = alpha / 2;
                splitColor[3] = alpha + ')';
                var newColor = splitColor.join(',');
                ctx.fillStyle = newColor;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3.5 / cameraZoom;

                console.log('creatingObjects[client.id]:', creatingObjects[client.id]);

                var points = creatingObjects[client.id].vertices;
                console.log('points:', points);
                //points.push(points[0]);

                points = points.map(function (point) {
                    console.log('point:', point);
                    // add a dot at the point
                    drawCircleAt(point[0] - 0.05, point[1] - 0.05, 0.1, 0, false);
                    return { x: point[0], y: point[1] };
                });

                // Draw the circle
                drawVertsAt(0, 0, points, 0);
            }
        }
    }


    // draw text that says mouse pos in world space
    ctx.fillStyle = 'white';
    ctx.font = '0.2px Arial';
    // round to 1 decimal place
    var mousePosXRound = Math.round(mousePos.x * 10) / 10;
    var mousePosYRound = Math.round(mousePos.y * 10) / 10;
    //ctx.fillText('(' + mousePosXRound + ', ' + mousePosYRound + ')', mousePos.x + 0.2, mousePos.y);
}


function tintImage(image, color) {
    if (!tintedImages[image.src + ' -> ' + color]) {
        const buffer = document.createElement('canvas');
        const btx = buffer.getContext('2d');
        buffer.width = image.width;
        buffer.height = image.height;
        btx.drawImage(image, 0, 0);
        btx.globalCompositeOperation = 'multiply';
        btx.fillStyle = color;
        btx.fillRect(0, 0, buffer.width, buffer.height);
        btx.globalAlpha = 0.5;
        btx.globalCompositeOperation = 'destination-in';
        btx.drawImage(image, 0, 0);
        // now we need to return an image to render on the canvas with drawImage
        tintedImages[image.src + ' -> ' + color] = buffer;
        console.log('tinted image')
        return buffer;
    }
    else {
        console.log('already tinted image')
        return tintedImages[image.src + ' -> ' + color];
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