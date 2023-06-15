import SimuloServerController from '../../../shared/src/SimuloServerController.js';
import themesJSON from "../../../shared/themes.json" assert { type: "json" };
import SimuloViewer from '../SimuloViewer/index.js';
function loadThemes() {
    var themesJSONAny = themesJSON;
    var themes = {};
    for (let themeName in themesJSONAny) {
        themes[themeName] = {
            background: themesJSONAny[themeName].background,
            ground: themesJSONAny[themeName].ground,
            newObjects: themesJSONAny[themeName].newObjects,
            toolIcons: themesJSONAny[themeName].toolIcons,
            systemCursor: themesJSONAny[themeName].systemCursor,
            toolIconSize: themesJSONAny[themeName].toolIconSize,
            toolIconOffset: themesJSONAny[themeName].toolIconOffset
        };
    }
    ;
    return themes;
}
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
/** `SimuloClientController` manages connecting to the server, `SimuloViewer` and the UI. */
class SimuloClientController {
    constructor(canvas) {
        this.timeScale = null;
        this.paused = null;
        this.themes = {};
        this.maxZoom = 5;
        this.minZoom = 0.1;
        this.scrollSensitivity = 0.0005;
        this.player = {
            x: 0,
            y: 0,
            name: 'Anonymous',
            down: false,
            zoom: 1,
        };
        // TODO: Make these created by this script (loaded from an HTML file) so each ClientController can define its own UI
        this.timeScaleSlider = document.getElementById('time-scale-slider');
        this.timeScaleInput = document.getElementById('time-scale-input');
        this.pauseButton = document.getElementById('pause-button');
        /** Entities to render. This is updated every time a world update from the server is received.
         *
         * It only includes properties that are needed for rendering, things like mass and velocity must be obtained from the server. */
        this.entities = [];
        this.creatingObjects = {};
        this.selectedObjects = {};
        this.creatingSprings = {};
        this.players = {};
        this.springs = [];
        this.toolIcon = null;
        this.toolIconSize = null;
        this.toolIconOffset = null;
        this.mousePos = { x: 0, y: 0 };
        this.themes = loadThemes();
        this.theme = this.themes.default;
        this.serverController = new SimuloServerController(this.theme, null, true);
        this.client = this.serverController.localClients[0];
        // Since it loops back, we can use the exact same code for both host and client, excluding the networking code.
        // try to fetch /version and set #version-info text to "Simulo Alpha v{version} ({date}) - Hold Shift and Refresh to update"
        fetch('version').then(async (response) => {
            if (response.ok) {
                let versionInfo = document.getElementById('version-info');
                if (versionInfo) {
                    // the result is json, so parse it
                    let version = await response.json();
                    // we want month name, then day, then year. no time
                    let versionDate = new Date(version.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                    versionInfo.innerText = `Simulo Alpha v${version.version} (${versionDate}) - Hold Shift and refresh to update`;
                }
            }
        }).catch(() => { });
        this.client.on('connect', () => {
            console.log('WebSocket connection established');
        });
        this.client.on('ready', () => {
            console.log('WebRTC connection established');
        });
        this.client.on('data', (data) => {
            this.handleData(data); // Parses and displays the data in the world
        });
        this.client.connect(); // Connects to the server
        // on click tool, set active tool
        const tools = document.querySelectorAll('.tool');
        tools.forEach((toolElement) => {
            let tool = toolElement;
            this.setUpClickSound(tool);
            tool.addEventListener('click', () => {
                // return if has fake class
                if (tool.classList.contains('fake')) {
                    return;
                }
                // remove active class from all tools in that toolbar, without removing it from other toolbars
                let toolbar = queryParent(tool, "toolbar");
                if (toolbar) {
                    toolbar.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
                    tool.classList.add('active');
                    // if it has data-tool, setTool with that value
                    if (tool.dataset.tool) {
                        console.log('setting tool to', tool.dataset.tool);
                        this.setTool(tool.dataset.tool);
                        // if theres data-img, set the icon to that
                        if (this.theme.toolIcons[tool.dataset.tool]) {
                            this.toolIcon = this.theme.toolIcons[tool.dataset.tool];
                            this.toolIconSize = this.theme.toolIconSize;
                            this.toolIconOffset = this.theme.toolIconOffset;
                        }
                        else {
                            this.toolIcon = null;
                            this.toolIconSize = null;
                            this.toolIconOffset = null;
                        }
                    }
                    // if data-action, handle
                    if (tool.dataset.action) {
                        if (tool.dataset.action == 'play') {
                            this.setPaused(false);
                        }
                        if (tool.dataset.action == 'pause') {
                            this.setPaused(true);
                        }
                        if (tool.dataset.action == '2x') {
                            this.setTimeScale(5);
                        }
                        if (tool.dataset.action == '1x') {
                            this.setTimeScale(1);
                        }
                    }
                    // if data-menu, show that .toolbar.secondary and hide all others
                    if (tool.dataset.menu) {
                        document.querySelectorAll('.toolbar.secondary').forEach(toolbarElement => {
                            let toolbar = toolbarElement;
                            if (toolbar.id == tool.dataset.menu) {
                                toolbar.style.display = toolbar.classList.contains('tool-grid') ? 'grid' : 'flex';
                            }
                            else {
                                toolbar.style.display = 'none';
                            }
                        });
                    }
                }
            });
        });
        // on click .file-menu, show the thing
        const fileMenus = document.querySelectorAll('.file-menu');
        fileMenus.forEach(fileMenuElement => {
            let fileMenu = fileMenuElement;
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
        this.timeScaleSlider.addEventListener('input', (e) => {
            if (e.target) {
                let targetInput = e.target;
                this.setTimeScale(parseFloat(targetInput.value));
                // change input
                this.timeScaleSlider.value = targetInput.value;
            }
        });
        // on change input
        this.timeScaleInput.addEventListener('change', (e) => {
            if (e.target) {
                let targetInput = e.target;
                this.setTimeScale(parseFloat(targetInput.value));
                // change slider
                this.timeScaleSlider.value = targetInput.value;
            }
        });
        this.pauseButton.addEventListener('click', () => {
            // set checked class
            this.pauseButton.classList.toggle('checked');
            this.setPaused(this.pauseButton.classList.contains('checked'));
        });
        this.viewer = new SimuloViewer(canvas);
        this.player.zoom = this.viewer.cameraZoom;
        this.viewer.setFullscreen(true);
        this.viewer.on('mouseMove', (pos) => {
            this.player = {
                x: pos.x,
                y: pos.y,
                down: this.viewer.pointerDown,
                name: this.player.name,
                zoom: this.viewer.cameraZoom
            };
            this.mousePos = pos;
            this.client.emitData("player mouse", this.player);
        });
        this.viewer.on('mouseDown', (pos) => {
            this.player = {
                x: pos.x,
                y: pos.y,
                down: this.viewer.pointerDown,
                name: this.player.name,
                zoom: this.viewer.cameraZoom
            };
            this.mousePos = pos;
            this.client.emitData("player mouse down", this.player);
        });
        this.viewer.on('mouseUp', (pos) => {
            this.player = {
                x: pos.x,
                y: pos.y,
                down: this.viewer.pointerDown,
                name: this.player.name,
                zoom: this.viewer.cameraZoom
            };
            this.mousePos = pos;
            this.client.emitData("player mouse up", this.player);
        });
        this.viewer.systemCursor = this.theme.systemCursor;
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false); // disable right click menu since we will make our own
        this.viewer.start(); // loops as often as possible, up to screen refresh rate (requestAnimationFrame)
    }
    sendServiceWorkerMessage(message) {
        // This wraps the message posting/response in a promise, which will
        // resolve if the response doesn't contain an error, and reject with
        // the error if it does. If you'd prefer, it's possible to call
        // controller.postMessage() and set up the onmessage handler
        // independently of a promise, but this is a convenient wrapper.
        return new Promise(function (resolve, reject) {
            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                }
                else {
                    resolve(event.data);
                }
            };
            // This sends the message data as well as transferring
            // messageChannel.port2 to the service worker.
            // The service worker can then use the transferred port to reply
            // via postMessage(), which will in turn trigger the onmessage
            // handler on messageChannel.port1.
            // See
            // https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
            if (!navigator.serviceWorker.controller) {
                reject(new Error('No service worker controller'));
                return;
            }
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
    }
    async update() {
        if ('serviceWorker' in navigator) {
            if (navigator.serviceWorker.controller) {
                console.log('Telling worker to update');
                await this.sendServiceWorkerMessage({
                    type: 'update'
                });
                console.log('Worker told to update, refreshing page');
                // refresh the page
                window.location.reload(); // TODO: once saving is added, we need to temporarily save the world, then after the page reloads, load the world again so nothing is lost
            }
            else {
                // error out
                throw new Error('Service worker not supported or not yet registered');
            }
        }
        else {
            // error out
            throw new Error('Service worker not supported or not yet registered');
        }
    }
    setTheme(name) {
        this.client.emitData('set_theme', name);
    }
    setTool(name) {
        this.client.emitData('set_tool', name);
    }
    setPaused(paused) {
        this.client.emitData('set_paused', paused);
    }
    setTimeScale(timeScale) {
        this.client.emitData('set_time_scale', timeScale);
    }
    /** Handles data received from the server, typically only called from `client.on('data')`. */
    handleData(body) {
        if (body.type !== null && body.type !== undefined && body.data !== null && body.data !== undefined) {
            if (body.type == 'world update') {
                this.entities = body.data.shapes;
                this.creatingObjects = body.data.creating_objects;
                this.creatingSprings = body.data.creating_springs;
                this.selectedObjects = body.data.selected_objects;
                // change :root background to body.data.background
                document.documentElement.style.background = body.data.background;
                this.springs = body.data.springs;
                if (this.timeScale == null) {
                    this.timeScale = body.data.time_scale;
                    this.timeScaleSlider.value = this.timeScale.toString();
                    this.timeScaleInput.value = this.timeScale.toString();
                }
                if (this.paused == null) {
                    this.paused = body.data.paused;
                    if (this.paused) {
                        this.pauseButton.classList.add('checked');
                    }
                    else {
                        this.pauseButton.classList.remove('checked');
                    }
                }
                var shapes = [];
                // push all the entities
                //shapes = shapes.concat(this.entities);
                this.entities.forEach((entity) => {
                    Object.keys(this.selectedObjects).forEach((key) => {
                        let selectedObjectArray = this.selectedObjects[key];
                        if (selectedObjectArray.includes(entity.id.toString())) {
                            entity.border = 'white';
                            entity.borderWidth = 3.5;
                            entity.borderScaleWithZoom = true;
                        }
                    });
                    shapes.push(entity);
                });
                Object.keys(this.creatingObjects).forEach((key) => {
                    let creatingObject = this.creatingObjects[key];
                    if (creatingObject.shape == 'polygon') {
                        var splitColor = creatingObject.color.split(',');
                        var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                        alpha = alpha / 2;
                        splitColor[3] = alpha + ')';
                        var newColor = splitColor.join(',');
                        /*this.ctx.fillStyle = newColor;
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 3.5 / this.cameraZoom;*/
                        console.log('creatingObjects[client.id]:', creatingObject);
                        var points = creatingObject.vertices;
                        console.log('points:', points);
                        //points.push(points[0]);
                        var pointsMapped = points.map((point) => {
                            console.log('point:', point);
                            // add a dot at the point
                            shapes.push({
                                x: point[0] - 0.05, y: point[1] - 0.05, radius: 0.1, angle: 0, circleCake: false,
                                type: 'circle', color: newColor, image: null,
                                border: 'white',
                                borderWidth: 3.5,
                                borderScaleWithZoom: true
                            });
                            return { x: point[0], y: point[1] };
                        });
                        // Draw the circle
                        //this.drawVertsAt(0, 0, pointsMapped, 0);
                        shapes.push({
                            points: pointsMapped, angle: 0, type: 'polygon', color: newColor, image: null, x: 0, y: 0,
                            border: 'white',
                            borderWidth: 3.5,
                            borderScaleWithZoom: true
                        });
                    }
                    else if (creatingObject.shape == 'circle') {
                        var dx = (creatingObject.currentX - creatingObject.x);
                        var dy = (creatingObject.currentY - creatingObject.y);
                        var radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
                        var splitColor = creatingObject.color.split(',');
                        var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                        alpha = alpha / 2;
                        splitColor[3] = alpha + ')';
                        var newColor = splitColor.join(',');
                        /*this.ctx.fillStyle = newColor;
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 3.5 / this.cameraZoom;*/
                        // if dx is negative
                        var posX = creatingObject.x + radius;
                        var posY = creatingObject.y + radius;
                        if (dx < 0) {
                            posX = creatingObject.x - radius;
                        }
                        if (dy < 0) {
                            posY = creatingObject.y - radius;
                        }
                        // Draw the circle
                        //this.drawCircleAt(posX, posY, radius, 0, creatingObject.circleCake);
                        shapes.push({
                            x: posX, y: posY, radius: radius, angle: 0, circleCake: creatingObject.circleCake,
                            type: 'circle', color: newColor, image: null,
                            border: 'white',
                            borderWidth: 3.5,
                            borderScaleWithZoom: true
                        });
                    }
                    else if (creatingObject.shape == 'rectangle' || creatingObject.shape == 'select' && !creatingObject.moving) {
                        // Calculate the difference between creatingObjects[id] x and y and the current player x and y
                        const width = Math.abs(creatingObject.currentX - creatingObject.x);
                        const height = Math.abs(creatingObject.currentY - creatingObject.y);
                        // Determine the top-left corner of the rectangle
                        const topLeftX = Math.min(creatingObject.currentX, creatingObject.x);
                        const topLeftY = Math.min(creatingObject.currentY, creatingObject.y);
                        // Set the fill style to transparent white
                        //ctx.fillStyle = creatingObjects[client.id].color;
                        // empty fill
                        var splitColor = creatingObject.color.split(',');
                        console.log('splitColor: ' + splitColor);
                        var alpha = parseFloat(splitColor[3].trim().slice(0, -1));
                        alpha = alpha / 2;
                        splitColor[3] = alpha + ')';
                        var newColor = splitColor.join(',');
                        console.log('newColor: ' + newColor);
                        /*this.ctx.fillStyle = newColor;
                        this.ctx.strokeStyle = 'white';
                        this.ctx.lineWidth = 3.5 / this.cameraZoom;*/
                        // Draw the rectangle
                        /*this.ctx.fillRect(topLeftX, topLeftY, width, height);
                        this.ctx.strokeRect(topLeftX, topLeftY, width, height);
                        // text of width and height
                        this.ctx.fillStyle = 'white';
                        this.ctx.font = (20 / this.cameraZoom) + 'px Arial';
 
                        this.ctx.fillText(width.toFixed(1), topLeftX + width / 2, topLeftY - 0.1);
                        this.ctx.fillText(height.toFixed(1), topLeftX - 0.1, topLeftY + height / 2);*/
                        shapes.push({
                            x: topLeftX, y: topLeftY, width: width, height: height, angle: 0, type: 'rectangle', color: newColor, image: null,
                            border: 'white',
                            borderWidth: 3.5,
                            borderScaleWithZoom: true
                        });
                        console.log('rendered with topLeftX: ' + topLeftX + ' topLeftY: ' + topLeftY + ' width: ' + width + ' height: ' + height);
                    }
                });
                Object.keys(this.creatingSprings).forEach((key) => {
                    let creatingSpring = this.creatingSprings[key];
                    /* if (creatingSprings[client.id]) {
                if (creatingSprings[client.id].image) {
                    //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                    console.log('img on spring')
                    this.drawStretchedImageLine(this.getImage(creatingSprings[client.id].image as string), creatingSprings[client.id].start[0], creatingSprings[client.id].start[1], mousePos.x, mousePos.y, false, 0.2);
                }
                else {
                    console.log('no img on spring')
                    this.ctx.beginPath();
                    this.ctx.moveTo(creatingSprings[client.id].start[0], creatingSprings[client.id].start[1]);
                    this.ctx.lineTo(mousePos.x, mousePos.y);
                    this.ctx.stroke();
                }
            }*/
                    if (creatingSpring.image) {
                        let height = creatingSpring.width;
                        // stretch between the two points
                        var { x, y, angle, length } = this.viewer.lineBetweenPoints(creatingSpring.start[0], creatingSpring.start[1], creatingSpring.end[0], creatingSpring.end[1], true);
                        shapes.push({
                            x, y, width: length, height, angle, type: 'rectangle', color: '#00000000', image: creatingSpring.image,
                            border: null,
                            borderWidth: null,
                            borderScaleWithZoom: false,
                            stretchImage: true
                        });
                    }
                    else {
                        // draw a line
                        var height = creatingSpring.width;
                        var { x, y, angle, length } = this.viewer.lineBetweenPoints(creatingSpring.start[0], creatingSpring.start[1], creatingSpring.end[0], creatingSpring.end[1]);
                        shapes.push({
                            x, y, width: length, height: creatingSpring.width, type: 'rectangle', color: '#ffffff', image: null,
                            border: null,
                            borderWidth: null,
                            borderScaleWithZoom: false
                        });
                    }
                });
                // same for real springs, yo
                this.springs.forEach((spring) => {
                    if (spring.image) {
                        let height = spring.width;
                        var { x, y, angle, length } = this.viewer.lineBetweenPoints(spring.p1[0], spring.p1[1], spring.p2[0], spring.p2[1], true);
                        shapes.push({
                            x, y, width: length, height, angle, type: 'rectangle', color: '#00000000', image: spring.image,
                            border: null,
                            borderWidth: null,
                            borderScaleWithZoom: false,
                            stretchImage: true
                        });
                    }
                    else {
                        var { x, y, angle, length } = this.viewer.lineBetweenPoints(spring.p1[0], spring.p1[1], spring.p2[0], spring.p2[1]);
                        var height = spring.width;
                        if (spring.line && spring.line.scale_with_zoom) {
                            height = height / this.viewer.cameraZoom;
                        }
                        shapes.push({
                            x, y, width: length, height: height, angle, type: 'rectangle', color: spring.line ? spring.line.color : '#ffffff', image: null,
                            border: null,
                            borderWidth: null,
                            borderScaleWithZoom: false
                        });
                    }
                });
                var cursorSize = 2;
                var scaleWithZoom = true;
                if (scaleWithZoom) {
                    cursorSize = cursorSize * 40 / this.viewer.cameraZoom;
                }
                var cursorWidth = 0.7 * cursorSize;
                let cursorImg = this.viewer.getImage('assets/textures/cursor.png');
                var cursorHeight = cursorImg.height * ((0.7 * cursorSize) / cursorImg.width);
                Object.keys(this.players).forEach((key) => {
                    if (key == this.client.id)
                        return;
                    // this.ctx.drawImage(cursor, player.x, player.y, 0.7, cursor.height * (0.7 / cursor.width));
                    let player = this.players[key];
                    shapes.push({
                        x: player.x + (cursorWidth / 4), y: player.y + (cursorHeight / 4), width: cursorWidth, height: cursorHeight, angle: Math.PI, type: 'rectangle', color: '#00000000', image: 'assets/textures/cursor.png',
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    });
                });
                // draw our own cursor
                let cursor = this.viewer.getImage('assets/textures/cursor.png');
                if (!this.viewer.systemCursor) {
                    shapes.push({
                        x: this.mousePos.x + (cursorWidth / 4), y: this.mousePos.y + (cursorHeight / 4), width: cursorWidth, height: cursorHeight, angle: Math.PI, type: 'rectangle', color: '#00000000', image: 'assets/textures/cursor.png',
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    });
                }
                if (this.toolIcon) {
                    //this.ctx.drawImage(this.getImage(this.toolIcon), mousePos.x + (((this.toolIconOffset as [x: number, y: number])[0] * cursorSize)), mousePos.y + (((this.toolIconOffset as [x: number, y: number])[1] * cursorSize)), (toolIconSize as number * cursorSize), (toolIconSize as number * cursorSize));
                    shapes.push({
                        x: this.mousePos.x + ((this.toolIconOffset[0] * cursorSize)), y: this.mousePos.y + ((this.toolIconOffset[1] * cursorSize)), width: (this.toolIconSize * cursorSize), height: (this.toolIconSize * cursorSize), angle: Math.PI, type: 'rectangle', color: '#00000000', image: this.toolIcon,
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    });
                }
                this.viewer.shapes = shapes;
            }
            if (body.type == 'player mouse') {
                this.players[body.data.id] = {
                    x: body.data.x,
                    y: body.data.y
                };
                this.springs = body.data.springs;
            }
            if (body.type == 'collision') {
                // body.data.sound is relative to /assets/sounds/. lets set volume based on body.data.volume
                var audio = new Audio('assets/sounds/' + body.data.sound);
                audio.volume = body.data.volume;
                // pitch from 0.5 to 1.5
                audio.playbackRate = body.data.pitch;
                audio.play();
            }
            if (body.type == 'set_time_scale') {
                this.timeScale = body.data;
                this.timeScaleSlider.value = this.timeScale.toString();
                this.timeScaleInput.value = this.timeScale.toString();
            }
            if (body.type == 'set_paused') {
                this.paused = body.data;
                // set #pause-button
                if (this.paused) {
                    this.pauseButton.classList.add('checked');
                }
                else {
                    this.pauseButton.classList.remove('checked');
                }
            }
        }
    }
    setUpClickSound(element) {
        element.addEventListener('mousedown', (e) => {
            // if element has active class, ignore
            if (element.classList.contains('active')) {
                return;
            }
            var audio = new Audio(element.classList.contains('fake') ? 'assets/sounds/deny.wav' : 'assets/sounds/button_down.wav');
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
            var audio = new Audio('assets/sounds/button_up.wav');
            audio.volume = 0.02;
            // pitch up
            audio.playbackRate = element.classList.contains('fake') ? 1 : 5;
            audio.play();
        });
    }
}
export default SimuloClientController;
//# sourceMappingURL=index.js.map