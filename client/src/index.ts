

var tintedImages: { [key: string]: HTMLCanvasElement } = {};

import SimuloClientController from './SimuloClientController/index.js';

// load all svg data-src images
var svgs = document.querySelectorAll('svg[data-src]');
svgs.forEach(function (svg) {
    try {
        var src = svg.getAttribute('data-src');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src as string, true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                svg.outerHTML = xhr.responseText;
            }
        };
        xhr.send();
    }
    catch (e) {
        console.error(e);
    }
});


let music = new Audio('assets/music/menu.ogg');

function playMenuMusic() {
    try {
        music.currentTime = 5;
        music.volume = 1;
        music.play();
        music.loop = true;
    }
    catch (e) {
        // :(
        let click = () => {
            playMenuMusic();
            document.removeEventListener('click', click);
        };

        document.addEventListener('click', click);
    }
}

// @ts-ignore
window.playMenuMusic = playMenuMusic;

function stopMenuMusic() {
    music.pause();
    music.currentTime = 0;
}

function fadeOutMenuMusic() {
    let interval = setInterval(function () {
        music.volume = Math.max(0, music.volume - 0.01);
        if (music.volume <= 0) {
            clearInterval(interval);
            stopMenuMusic();
        }
    }, 10);
}

let musicPreferences = localStorage.getItem('music-preferences');
let ambientMusic = musicPreferences === 'all';

// if no localstorage for `music-preferences`
if (!musicPreferences) {
    // set #page-mask from .hidden to .visible
    let pageMask = document.getElementById('page-mask') as HTMLDivElement;
    pageMask.classList.remove('hidden');
    pageMask.classList.add('visible');

    // #all-music, #menu-music and #no-music are the 3 buttons
    let allMusic = document.getElementById('all-music') as HTMLButtonElement;
    let menuMusic = document.getElementById('menu-music') as HTMLButtonElement;
    let noMusic = document.getElementById('no-music') as HTMLButtonElement;

    allMusic.addEventListener('click', function () {
        localStorage.setItem('music-preferences', 'all');
        playMenuMusic();
        pageMask.classList.remove('visible');
        pageMask.classList.add('hidden');
        ambientMusic = true;
    });
    menuMusic.addEventListener('click', function () {
        localStorage.setItem('music-preferences', 'menu');
        playMenuMusic();
        pageMask.classList.remove('visible');
        pageMask.classList.add('hidden');
        ambientMusic = false;
    });
    noMusic.addEventListener('click', function () {
        localStorage.setItem('music-preferences', 'none');
        pageMask.classList.remove('visible');
        pageMask.classList.add('hidden');
        ambientMusic = false;
    });
}
else {
    if (musicPreferences == 'all') {
        playMenuMusic();
    }
    else if (musicPreferences == 'menu') {
        playMenuMusic();
    }
    else if (musicPreferences == 'none') {
        // do nothing
    }
    else {
        console.error('Invalid music-preferences value: ' + musicPreferences);
    }
}

let nonGameOverlay = document.getElementById('non-game-overlay') as HTMLDivElement;
let spinner = document.getElementById('spinner') as HTMLDivElement;
/*
// if host, hide the loading overlay
if (host) {
    nonGameOverlay.style.display = 'none';
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
        nonGameOverlay.style.cursor = 'wait';

        clientController.client.on('answerSdp', function (encodedSdp: string) {
            // now we put it in the box
            let answerCode = document.getElementById('answer-code') as HTMLTextAreaElement;
            answerCode.value = encodedSdp;
            // cursor back to normal
            nonGameOverlay.style.cursor = 'default';
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
            nonGameOverlay.style.display = 'none';
        });
        clientController.client.connect(decodeURIComponent(joinCode.value.trim()));
    });
}*/

// show main menu (#main-menu)
let mainMenu = document.getElementById('main-menu') as HTMLDivElement;
mainMenu.style.display = 'flex';
spinner.style.display = 'none';

function playSingleplayer() {
    nonGameOverlay.style.display = 'none';
    spinner.style.display = 'none';

    let startingPopup = document.querySelector('.starting-popup') as HTMLDivElement;
    startingPopup.style.display = 'block';



    var clientController = new SimuloClientController(document.getElementById('game') as HTMLCanvasElement, true, ambientMusic);
    // @ts-ignore
    window.clientController = clientController; // so we can access it from the console

    fadeOutMenuMusic();
}

function playMultiplayer() {
    mainMenu.style.display = 'none';

    let multiplayerJoinMenu = document.getElementById('multiplayer-join-menu') as HTMLDivElement;
    multiplayerJoinMenu.style.display = 'flex';

    let clientController = new SimuloClientController(document.getElementById('game') as HTMLCanvasElement, false, ambientMusic);
    // @ts-ignore
    window.clientController = clientController; // so we can access it from the console
    // wait for the user to click #submit-join-code (it submits the #join-code textarea)
    let submitJoinCode = document.getElementById('submit-join-code') as HTMLButtonElement;
    let joinCode = document.getElementById('join-code') as HTMLTextAreaElement;
    submitJoinCode.addEventListener('click', function () {
        // change cursor to loading
        nonGameOverlay.style.cursor = 'wait';

        clientController.client.on('answerSdp', function (encodedSdp: string) {
            // now we put it in the box
            let answerCode = document.getElementById('answer-code') as HTMLTextAreaElement;
            answerCode.value = encodedSdp;
            // cursor back to normal
            nonGameOverlay.style.cursor = 'default';
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
            nonGameOverlay.style.display = 'none';
            fadeOutMenuMusic();
        });
        clientController.client.connect(decodeURIComponent(joinCode.value.trim()));
    });
}
// #singleplayer
let singleplayer = document.getElementById('singleplayer') as HTMLDivElement;
singleplayer.addEventListener('click', function () {
    playSingleplayer();
});

// #multiplayer
let multiplayer = document.getElementById('multiplayer') as HTMLDivElement;
multiplayer.addEventListener('click', function () {
    playMultiplayer();
});

let url = new URL(window.location.href);
let modeParam = url.searchParams.get("mode");
if (modeParam) {
    if (modeParam == "singleplayer") {
        playSingleplayer();
    } else if (modeParam == "multiplayer") {
        playMultiplayer();
    }
    else {
        alert("Invalid mode!");
    }
}


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

