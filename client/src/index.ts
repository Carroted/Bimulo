

var tintedImages: { [key: string]: HTMLCanvasElement } = {};

import SimuloClientController from './SimuloClientController/index.js';

var host = true;
let dev = false;
// get query string for host (?host=true, ?host=false or none for true)
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
        else if (queryPair[0] == 'dev') {
            if (queryPair[1] == 'true') {
                dev = true;
            } else if (queryPair[1] == 'false') {
                dev = false;
            }
        }
    });
}

if (dev) {
    console.log('dev mode');
    // websocket to 4614 localhost
    let setupSocket = function () {
        let socket = new WebSocket('ws://localhost:4614');
        socket.onopen = function () {
            console.log('connected to dev server socket');
        }
        socket.onmessage = function (event) {
            // when it sends "refresh", refresh the page
            if (event.data == 'refresh') {
                location.reload();
            }
        }
        socket.onclose = function () {
            console.log('disconnected from dev server socket');
            setTimeout(setupSocket, 800);
        }
    }
    setupSocket();
}

let loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;
let spinner = document.getElementById('spinner') as HTMLDivElement;

// if host, hide the loading overlay
if (host) {
    loadingOverlay.style.display = 'none';
    spinner.style.display = 'none';

    var clientController = new SimuloClientController(document.getElementById('game') as HTMLCanvasElement, true);
    // @ts-ignore
    window.clientController = clientController; // so we can access it from the console
}
// otherwise, we can show it but hide the spinner and instead show the multiplayer join menu
else {
    let startingPopup = document.querySelector('.starting-popup') as HTMLDivElement;
    startingPopup.style.display = 'none';

    spinner.style.display = 'none';
    let multiplayerJoinMenu = document.getElementById('multiplayer-join-menu') as HTMLDivElement;
    multiplayerJoinMenu.style.display = 'flex';

    let clientController = new SimuloClientController(document.getElementById('game') as HTMLCanvasElement, false);
    // @ts-ignore
    window.clientController = clientController; // so we can access it from the console
    // wait for the user to click #submit-join-code (it submits the #join-code textarea)
    let submitJoinCode = document.getElementById('submit-join-code') as HTMLButtonElement;
    let joinCode = document.getElementById('join-code') as HTMLTextAreaElement;
    submitJoinCode.addEventListener('click', function () {
        // change cursor to loading
        loadingOverlay.style.cursor = 'wait';

        clientController.client.on('answerSdp', function (encodedSdp: string) {
            // now we put it in the box
            let answerCode = document.getElementById('answer-code') as HTMLTextAreaElement;
            answerCode.value = encodedSdp;
            // cursor back to normal
            loadingOverlay.style.cursor = 'default';
            // make copy-answer-code copy it
            let copyAnswerCode = document.getElementById('copy-answer-code') as HTMLButtonElement;
            copyAnswerCode.addEventListener('click', function () {
                // since its disabled, we cant select, lets make invisible thingy
                let invisibleAnswerCode = document.createElement('textarea');
                invisibleAnswerCode.value = answerCode.value;
                document.body.appendChild(invisibleAnswerCode);
                invisibleAnswerCode.select();
                document.execCommand('copy');
                document.body.removeChild(invisibleAnswerCode);
                // give #copied-answer-code the .active class
                let copiedAnswerCode = document.getElementById('copied-answer-code') as HTMLDivElement;
                copiedAnswerCode.classList.add('active');
            });
            // now remove .active from join-step-1 and move it to join-step-2 (the final step)
            let joinStep1 = document.getElementById('join-step-1') as HTMLDivElement;
            let joinStep2 = document.getElementById('join-step-2') as HTMLDivElement;
            joinStep1.classList.remove('active');
            joinStep2.classList.add('active');
        });
        // on ready, hide the loading overlay
        clientController.client.on('ready', function () {
            loadingOverlay.style.display = 'none';
        });
        clientController.client.connect(decodeURIComponent(joinCode.value.trim()));
    });
}

var game = document.getElementById('game');







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




const scaleOffset = 0.009999999776482582;







// movement system where we can move in multiple directions at once







// make canvas full screen



// make canvas bg black
//draw();

// on resize, make canvas full screen

/*
function setName(name: string) {
    player.name = name;
    client.emitData('update player', player);
}
*/






/*
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
*/

/*

document.addEventListener('keyup', function (e) {
    delete keysDown[e.keyCode];

    if (e.keyCode === 37) {
        client.emitData("player stop", "left");
    } else if (e.keyCode === 39) {
        client.emitData("player stop", "right");
    }
}, false);*/
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


var lastSpriteUpdate = new Date().getTime();
var spriteUpdateDelay = 100;
var currentSprite = 1;
var framerate = 30;
var speed = 300 / framerate;
// round speed to increments of 8 (pixels are 8x8)
speed = Math.round(speed / 8) * 8;


// Modified version of https://stackoverflow.com/a/28416298 to render on top of canvas and at the same place image would otherwise be rendered, with size





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

