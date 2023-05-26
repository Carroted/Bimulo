

var tintedImages: { [key: string]: HTMLCanvasElement } = {};

import SimuloClientController from './SimuloClientController/index.js';
new SimuloClientController(document.getElementById('game') as HTMLCanvasElement); // We don't need to store it as we have no need to access it later.

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


var systemCursor = false;
var game = document.getElementById('game');

function enableSystemCursor() {
    if (game != null) {
        game.classList.add('cursor');
    }
    systemCursor = true;
}
function disableSystemCursor() {
    if (game != null) {
        game.classList.remove('cursor');
    }
    systemCursor = false;
}
if (theme.system_cursor) {
    enableSystemCursor();
}
else {
    disableSystemCursor();
}





// load all svg data-src images
var svgs = document.querySelectorAll('svg[data-src]');
svgs.forEach(function (svg) {
    var src = svg.getAttribute('data-src');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', src as string, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            svg.outerHTML = xhr.responseText;
        }
    };
    xhr.send();
});

function drawVerts(verts: { x: number, y: number }[]) {
    ctx.beginPath();
    verts.forEach(e => ctx.lineTo(e.x, e.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawStretchedImageLine(image: HTMLImageElement, x1: number, y1: number, x2: number, y2: number, useHeight: boolean, otherAxisLength: number) {
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


const scaleOffset = 0.009999999776482582;






function drawRect(x: number, y: number, width: number, height: number) {
    ctx.fillRect(x, y, width, height);
}

function drawText(text: string, x: number, y: number, size: number, font: string) {
    ctx.font = `${size}px ${font}`;
    ctx.fillText(text, x, y);
}





// movement system where we can move in multiple directions at once
var keysDown: { [key: number]: boolean } = {};




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



// make canvas full screen




var images: { [key: string]: HTMLImageElement } = {};

function getImage(src: string) {
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

function setName(name: string) {
    player.name = name;
    client.emitData('update player', player);
}



// polyfill for roundRect
function roundRect(x: number, y: number, w: number, h: number, r: number) {
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

function roundTri(x: number, y: number, w: number, h: number) {
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


// Modified version of https://stackoverflow.com/a/28416298 to render on top of canvas and at the same place image would otherwise be rendered, with size
function outlinedImage(img: HTMLImageElement, s: number, color: string, x: number, y: number, width: number, height: number) {

    var canvas2 = document.createElement('canvas');
    var ctx2 = canvas2.getContext('2d') as CanvasRenderingContext2D;
    canvas2.width = width + (s * 4);
    canvas2.height = height + (s * 4);
    ctx2.imageSmoothingEnabled = false;
    // @ts-ignore
    ctx2.mozImageSmoothingEnabled = false; // we ignore because typescript doesnt know about these
    // @ts-ignore
    ctx2.webkitImageSmoothingEnabled = false;
    // @ts-ignore
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
            ctx.lineWidth = entity.border_width as number / (entity.border_scale_with_zoom ? cameraZoom : 1);
        }
        else {
            ctx.strokeStyle = 'transparent';
        }
        if (entity.type === 'polygon') {
            let entityPolygon = entity as SimuloPolygon;
            if (!entityPolygon.points) {
                drawVertsAt(entityPolygon.x, entityPolygon.y, entityPolygon.vertices, entityPolygon.angle);
                entityPolygon.vertices.forEach(function (vert) {
                    if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                    if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                });
            }
            else {
                drawVertsAt(entityPolygon.x, entityPolygon.y, entityPolygon.points, entityPolygon.angle);
                entityPolygon.points.forEach(function (vert) {
                    if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                    if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                });
            }
        }
        else if (entity.type === 'circle') {
            let entityCircle = entity as SimuloCircle;
            // console.log('drawing circle');
            drawCircleAt(entityCircle.x, entityCircle.y, entityCircle.radius as number, entityCircle.angle, entityCircle.circle_cake);
        }
        else if (entity.type === 'edge') {
            let entityEdge = entity as SimuloEdge;
            //console.log('drawing edge');
            drawVertsNoFillAt(entityEdge.x, entityEdge.y, entityEdge.vertices, entityEdge.angle);
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
            if (spring.line) {
                ctx.strokeStyle = spring.line.color;
                ctx.lineWidth = spring.line.width;
                if (spring.line.scale_with_zoom) {
                    ctx.lineWidth /= cameraZoom;
                }
                ctx.beginPath();
                ctx.moveTo(spring.p1[0], spring.p1[1]);
                ctx.lineTo(spring.p2[0], spring.p2[1]);
                ctx.stroke();
            }
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
                drawStretchedImageLine(getImage(creatingSprings[id].image as string), creatingSprings[id].start[0], creatingSprings[id].start[1], player.x, player.y, false, 0.2);
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
            if (creatingObjects[id].shape === 'rectangle' || creatingObjects[id].shape === 'select') { // selection box is a rectangle and has same properties for rendering
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
        ctx.drawImage(getImage(toolIcon), mousePos.x + (((toolIconOffset as [x: number, y: number])[0] * cursorSize)), mousePos.y + (((toolIconOffset as [x: number, y: number])[1] * cursorSize)), (toolIconSize as number * cursorSize), (toolIconSize as number * cursorSize));
    }
    if (client.id) {
        if (creatingSprings[client.id]) {
            if (creatingSprings[client.id].image) {
                //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                console.log('img on spring')
                drawStretchedImageLine(getImage(creatingSprings[client.id].image as string), creatingSprings[client.id].start[0], creatingSprings[client.id].start[1], mousePos.x, mousePos.y, false, 0.2);
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
            if (creatingObjects[client.id].shape === 'rectangle' || creatingObjects[client.id].shape === 'select') {
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

                var points = (creatingObjects[client.id] as SimuloCreatingPolygon).vertices;
                console.log('points:', points);
                //points.push(points[0]);

                var pointsMapped = points.map(function (point) {
                    console.log('point:', point);
                    // add a dot at the point
                    drawCircleAt(point[0] - 0.05, point[1] - 0.05, 0.1, 0, false);
                    return { x: point[0], y: point[1] };
                });

                // Draw the circle
                drawVertsAt(0, 0, pointsMapped, 0);
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


function tintImage(image: HTMLImageElement, color: string) {
    if (!tintedImages[image.src + ' -> ' + color]) {
        const buffer = document.createElement('canvas');
        const btx = buffer.getContext('2d') as CanvasRenderingContext2D;
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

