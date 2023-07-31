import SimuloTheme from '../../../shared/src/SimuloTheme.js';
import Box2DFactory from '../../../node_modules/box2d-wasm/dist/es/entry.js';
import SimuloClient from '../../../shared/src/SimuloClient.js';
import SimuloServerController from '../../../shared/src/SimuloServerController.js';
import themesJSON from "../../../shared/themes.js";
import SimuloViewer from '../SimuloViewer/index.js';
import themes from '../../../shared/themes.js';
import { hsvToRgb } from '../../../shared/src/utils.js';

function queryParent(element: HTMLElement, className: string): HTMLElement | null {
    var parent: HTMLElement = element.parentNode as HTMLElement;
    while (parent) {
        if (parent.classList.contains(className)) {
            return parent;
        }
        parent = parent.parentNode as HTMLElement;
    }
    return null;
}

// fetch client/assets/textures/cursor.svg
let cursorRes = await fetch('assets/textures/cursor.svg');
let cursorSVG = await cursorRes.text();

function getCursorSVG(fillColor: string) {
    let strokeColor = '#000000';
    // if fill is #000000 or black or #000, make stroke #ffffff
    if (fillColor === '#000000' || fillColor === 'black' || fillColor === '#000') {
        strokeColor = '#ffffff';
    }
    // split join #00FF00 for fill, split join #0000FF for stroke
    return cursorSVG.split('#00FF00').join(fillColor).split('#0000FF').join(strokeColor);
}

import { SimuloPolygon, SimuloCircle, SimuloEdge, SimuloShape, SimuloRectangle } from '../../../shared/src/SimuloShape.js';
import SimuloText from '../../../shared/src/SimuloText';
import SimuloCreatingObject, { SimuloCreatingPolygon } from '../../../shared/src/SimuloCreatingObject.js';
import SimuloNetworkClient from '../SimuloNetworkClient/index.js';

const personPoints = [{
    x: 0,
    y: 0.256
}, {
    x: 0.2848,
    y: 0.1996
}, {
    x: 0.476,
    y: 0.0688
}, {
    x: 0.6016,
    y: -0.10800000000000001
}, {
    x: 0.668,
    y: -0.31160000000000004
}, {
    x: 0.6712,
    y: -1.3088
}, {
    x: 0.6572,
    y: -1.3876
}, {
    x: 0.5804,
    y: -1.4388
}, {
    x: -0.5664,
    y: -1.4356
}, {
    x: -0.6328,
    y: -1.404
}, {
    x: -0.6616,
    y: -1.34
}, {
    x: -0.668,
    y: -0.31160000000000004
}, {
    x: -0.5988000000000001,
    y: -0.122
}, {
    x: -0.49240000000000006,
    y: 0.0504
}, {
    x: -0.26,
    y: 0.2068
}, {
    x: -0.1312,
    y: 0.2456
}];

enum ToastType {
    SUCCESS,
    ERROR,
    INFO,
    WARNING,
    JOIN,
    LEAVE
}

interface SimuloSavedObject {
    name: string;
    shapes: SimuloShape[];
}

const defaultSavedObjects: {
    name: string;
    author: string | null;
    data: string;
    description: string | null;
    image: string;
    date: string;
    version: string;
    versionTimestamp: number;
    type: 'objects';
}[] = [{
    name: "Person",
    author: "asour",
    data: `[{"id":3,"type":"CIRCLE","position":{"x":0.027060299522868793,"y":-0.6546055597719658},"rotation":3.1736624240875244,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"sound":"ground.wav","color":"#99e077","isStatic":false,"mass":1.4698131084442139,"joints":[{"id":5,"bodyA":2,"bodyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring","dampingRatio":0,"frequencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"anchorA":[0,0.128],"anchorB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"radius":0.6840000152587891},{"id":2,"type":"POLYGON","position":{"x":0.007093784741751354,"y":0.09707290702490923},"rotation":3.141267776489258,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":"assets/textures/body.png","sound":"ground.wav","color":"#00000000","isStatic":false,"mass":2.059328556060791,"joints":[{"id":5,"bodyA":2,"bodyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring","dampingRatio":0,"frequencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"anchorA":[0,0.128],"anchorB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"points":[[0,0.256],[0.2848,0.1996],[0.476,0.0688],[0.6016,-0.10800000000000001],[0.668,-0.31160000000000004],[0.6712,-1.3088],[0.6572,-1.3876],[0.5804,-1.4388],[-0.5664,-1.4356],[-0.6328,-1.404],[-0.6616,-1.34],[-0.668,-0.31160000000000004],[-0.5988000000000001,-0.122],[-0.49240000000000006,0.0504],[-0.26,0.2068],[-0.1312,0.2456]]}]`,
    description: "A ragdoll, mascot, crash test dummy, size reference and more all in one.",
    image: "assets/textures/person.png",
    date: new Date().toISOString(),
    version: "0.6.0",
    versionTimestamp: new Date().getTime() / 1000,
    type: 'objects'
}, {
    name: "Purple Person",
    author: "asour",
    data: `[{"id":3,"type":"CIRCLE","position":{"x":0.027060299522868793,"y":-0.6546055597719658},"rotation":3.1736624240875244,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"sound":"ground.wav","color":"#8c67f2","isStatic":false,"mass":1.4698131084442139,"joints":[{"id":5,"bodyA":2,"bodyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring","dampingRatio":0,"frequencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"anchorA":[0,0.128],"anchorB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"radius":0.6840000152587891},{"id":2,"type":"POLYGON","position":{"x":0.007093784741751354,"y":0.09707290702490923},"rotation":3.141267776489258,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":"assets/textures/body_purple.png","sound":"ground.wav","color":"#00000000","isStatic":false,"mass":2.059328556060791,"joints":[{"id":5,"bodyA":2,"bodyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring","dampingRatio":0,"frequencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"anchorA":[0,0.128],"anchorB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"points":[[0,0.256],[0.2848,0.1996],[0.476,0.0688],[0.6016,-0.10800000000000001],[0.668,-0.31160000000000004],[0.6712,-1.3088],[0.6572,-1.3876],[0.5804,-1.4388],[-0.5664,-1.4356],[-0.6328,-1.404],[-0.6616,-1.34],[-0.668,-0.31160000000000004],[-0.5988000000000001,-0.122],[-0.49240000000000006,0.0504],[-0.26,0.2068],[-0.1312,0.2456]]}]`,
    description: "Same as person, but purple",
    image: "assets/textures/person_purple.png",
    date: new Date().toISOString(),
    version: "0.6.0",
    versionTimestamp: new Date().getTime() / 1000,
    type: 'objects'
}, {
    name: "Basic Car",
    author: "asour",
    data: `[{"id":6,"type":"POLYGON","position":{"x":-0.10459689170170705,"y":-0.09242571270430133},"rotation":-0.015004868619143963,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0.5,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":null,"sound":"impact.wav","color":"rgba(200.75395266999493, 111.86416349533515, 245.34356609147244, 1)","isStatic":false,"mass":19.535001754760742,"joints":[{"id":10,"bodyA":6,"bodyB":7,"anchorA":[-2.537543296813965,0.8796977996826172],"anchorB":[0.06229686737060547,-0.017383575439453125],"collideConnected":false,"zDepth":315,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false},{"id":9,"bodyA":6,"bodyB":8,"anchorA":[2.781675338745117,0.9739360809326172],"anchorB":[0.06229591369628906,0.05590629577636719],"collideConnected":false,"zDepth":314,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"points":[[-4.540955784646452,-1.0754895279425813],[4.540955784646452,-1.0754895279425813],[4.540955784646452,1.0754895279425813],[-4.540955784646452,1.0754895279425813]]},{"id":7,"type":"CIRCLE","position":{"x":-2.6603582289819805,"y":0.7688738020662065},"rotation":1.3306092023849487,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0.5,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":null,"sound":"impact.wav","color":"rgba(145.55794505797627, 187.6814023272608, 225.86153190870866, 1)","isStatic":false,"mass":6.182457447052002,"joints":[{"id":10,"bodyA":6,"bodyB":7,"anchorA":[-2.537543296813965,0.8796977996826172],"anchorB":[0.06229686737060547,-0.017383575439453125],"collideConnected":false,"zDepth":315,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"points":[[-0.8610262204547183,-1.0107699109685835],[0.8610262204547183,-1.0107699109685835],[0.8610262204547183,1.0107699109685835],[-0.8610262204547183,1.0107699109685835]],"radius":1.4028319120407104},{"id":8,"type":"CIRCLE","position":{"x":2.7360250565404804,"y":0.7688604506257768},"rotation":1.402000904083252,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0.5,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":null,"sound":"impact.wav","color":"rgba(145.55794505797627, 187.6814023272608, 225.86153190870866, 1)","isStatic":false,"mass":6.182457447052002,"joints":[{"id":9,"bodyA":6,"bodyB":8,"anchorA":[2.781675338745117,0.9739360809326172],"anchorB":[0.06229591369628906,0.05590629577636719],"collideConnected":false,"zDepth":314,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"points":[[-0.11230776788539742,-1.010769910968584],[0.11230776788539742,-1.010769910968584],[0.11230776788539742,1.010769910968584],[-0.11230776788539742,1.010769910968584]],"radius":1.4028319120407104}]`,
    description: 'Basic car with 2 axles and circles',
    image: "assets/textures/basic_car.png",
    date: new Date().toISOString(),
    version: "0.6.0",
    versionTimestamp: new Date().getTime() / 1000,
    type: 'objects'
},
    ];
/** `SimuloClientController` manages connecting to the server, `SimuloViewer` and the UI. */
class SimuloClientController {
    client: SimuloClient;
    timeScale: number | null = null;
    paused: boolean | null = null;
    serverController: SimuloServerController | null = null;
    theme: SimuloTheme;
    maxZoom = 5;
    minZoom = 0.1;
    scrollSensitivity = 0.0005;
    spawningSavedObject: number | null = null;
    savedObjects: {
        [key: string]: SimuloSavedObject;
    } = {
            "person": {
                name: "Person",
                shapes: [
                    {
                        type: "polygon",
                        x: 0, // this is relative to the mouse position
                        y: 0,
                        angle: Math.PI,
                        color: "#00000000",
                        borderWidth: null,
                        borderScaleWithZoom: false,
                        image: "assets/textures/body.png",
                        id: -1,
                        points: personPoints,
                        vertices: personPoints
                    } as SimuloPolygon,
                    {
                        type: "circle",
                        x: 0,
                        y: -0.752,
                        radius: 0.684,
                        color: "#99e077",
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false,
                        circleCake: false,
                        id: -1,
                        angle: Math.PI
                    } as SimuloCircle,
                ]

            }
        };

    player = {
        x: 0,
        y: 0,
        name: 'Anonymous',
        down: false,
        zoom: 1,
    };

    viewer: SimuloViewer;

    // TODO: Make these created by this script (loaded from an HTML file) so each ClientController can define its own UI
    timeScaleSlider = document.getElementById('time-scale-slider') as HTMLInputElement;
    timeScaleInput = document.getElementById('time-scale-input') as HTMLInputElement;
    pauseButton = document.getElementById('pause-button') as HTMLElement;

    /** Entities to render. This is updated every time a world_update from the server is received.
     * 
     * It only includes properties that are needed for rendering, things like mass and velocity must be obtained from the server. */
    private entities: SimuloShape[] = [];
    private creatingObjects: {
        [key: string]: SimuloCreatingObject;
    } = {};
    private selectedObjects: {
        [key: string]: string[];
    } = {};
    private creatingSprings: {
        [key: string]: {
            start: [x: number, y: number];
            image: string | null;
            end: [x: number, y: number];
            width: number;
        };
    } = {};
    private players: { [key: string]: { x: number, y: number, color: string, tool: string } } = {};
    private springs: {
        p1: number[];
        p2: number[];
        image: string | null;
        line: {
            color: string;
            scale_with_zoom: boolean;
        } | null;
        width: number;
    }[] = [];

    private toolIcon: string | null = null;
    private toolIconSize: number | null = null;
    private toolIconOffset: [x: number, y: number] | null = null;

    sendServiceWorkerMessage(message: any) {
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
                } else {
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
                console.log('Telling worker to update')
                await this.sendServiceWorkerMessage({
                    type: 'update'
                });
                console.log('Worker told to update, refreshing page')
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

    private key: number = 0;

    async emitDataAsync(type: string, data: any) {
        let key = this.key++; // unique key for this request
        return new Promise((resolve, reject) => {
            let handler = (body: any) => {
                if (body.formatted) {
                    body.data = body.formatted.data;
                }
                //console.log('requst from our handlerr!!! body is', body);
                if (body.data.key === key) {
                    //console.log('Got response', body.data);
                    this.client.off('data', handler);
                    //console.log('Removed handler');
                    resolve(body.data);
                }
                else if (body.data.key !== undefined) {
                    //console.log('we got a diff key, it was', body.data.key, 'we wanted', key);
                }
            };
            this.client.on('data', handler);
            //console.log('Added handler');

            this.client.emitData(type, {
                ...data,
                key
            });
        });
    }

    tool: string = 'drag';

    async openFileDialog(): Promise<File[] | null> {
        return new Promise<File[] | null>((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.simulo';

            input.addEventListener('change', () => {
                if (input.files && input.files.length > 0) {
                    resolve(Array.from(input.files));
                } else {
                    resolve(null);
                }
            });

            input.click();
        });
    }

    async simuloFileInput() {
        const files = await this.openFileDialog();

        if (!files) {
            alert('No files selected.');
            return;
        }

        let file = files[0];

        if (file.name.endsWith('.simulo')) {
            const fileContents = await this.readFile(file);
            return fileContents;
        } else {
            alert('Invalid file: ' + file.name);
            return null;
        }
    }

    async saveFile(content: string, name: string) {
        let blob = new Blob([content], { type: 'text/plain' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url); // free up memory, i honestly dont know what this does but its cool
    }

    async readFile(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const contents = reader.result as string;
                resolve(contents);
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsText(file);
        });
    }

    version: string = 'unknown';
    versionTimestamp: number = 0;

    useAnswerSdp() {
        let sdp = decodeURIComponent(prompt('Enter the answer SDP')!);
        this.serverController!.networkServer!.useAnswerSdp(sdp);
        console.log('we relayed it, dunno if it worked');
    }

    constructor(canvas: HTMLCanvasElement, host: boolean) {
        if ( new URL(document.location.href).searchParams.get("theme") ) {
            let popup = document.querySelector(".starting-popup") as HTMLDivElement;
            popup.style.display = "none";
            let theme = new URL(document.location.href).searchParams.get("theme") as string;

            if (theme in themes) {
                this.theme = themes[theme];
            } else {
                this.theme = themes.night;
            }
        } else {
            this.theme = themes.night;
        }
        if (host) {
            this.serverController = new SimuloServerController(this.theme, true, true);
            this.client = this.serverController.localClients[0];
        }
        else {
            let networkClient = new SimuloNetworkClient();
            this.client = networkClient;
        }
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
                    this.version = version.version;
                    this.versionTimestamp = version.date; // we can use it for comparison later of which build is newer
                    versionInfo.innerHTML = `Simulo Alpha v${version.version} (${versionDate}) - Hold Shift and refresh to update`;
                }
            }
        }).catch(() => { });


        this.client.on('connect', () => { // Connect fires when the WebSocket connects
            console.log('WebSocket connection established');
        });

        this.client.on('ready', () => { // Ready fires when the WebRTC connection is established
            console.log('WebRTC connection established');
        });

        this.client.on('data', (data: { type: string, data: any }) => { // Data fires when data is received from the server
            this.handleData(data); // Parses and displays the data in the world
        });

        if (!host) {
            /*let sdp = decodeURIComponent(prompt('whats the offer sdp?')!);
            console.log('offer SDP is', sdp);
            this.client.connect(sdp);
            console.log('told it to connect with that')*/
        }
        else {
            this.client.connect(); // Connects to the server
        }

        /*
        let objects = document.querySelectorAll('.object-grid .object');
        objects.forEach((object) => {
            object.addEventListener('mousedown', (e) => {
                // make sure its left click
                if ((e as MouseEvent).button != 0) return;
                this.spawningSavedObject = ((object as HTMLElement).dataset.object as string);
                new Audio('assets/sounds/spawn_down.wav').play();
            });
        });
        */
        this.updateObjectsList();

        let startingPopup = document.querySelector('.starting-popup') as HTMLElement;
        let dismissPopup = (e: MouseEvent | undefined) => {
            if (e && ((e.target as HTMLElement).closest('.starting-popup') || (e.target as HTMLElement).closest('.loading-overlay'))) return;
            startingPopup.style.opacity = '0';
            startingPopup.style.pointerEvents = 'none';
            document.removeEventListener('click', dismissPopup);
        };
        document.addEventListener('click', dismissPopup);

        var popupThemes = startingPopup.querySelector('.themes') as HTMLElement;
        // add themes
        for (let themeName in themes) {
            let theme = themes[themeName];
            let themeElement = document.createElement('div');
            themeElement.classList.add('theme-option');
            themeElement.classList.add('button');
            //themeElement.style.background = theme.background;
            let themeBackground = document.createElement('div');
            themeBackground.style.background = theme.background;
            themeBackground.classList.add('theme-background');
            let themeGround = document.createElement('div');
            themeGround.classList.add('theme-ground');
            themeGround.style.background = theme.ground.color;
            if (theme.ground.border) {
                themeGround.style.outline = `${theme.ground.borderWidth}px solid ${theme.ground.border}`;
            }
            themeBackground.appendChild(themeGround);
            let themeCircle = document.createElement('div');
            themeCircle.classList.add('theme-circle');

            // lets convert hsv to rgb
            let hue = (theme.newObjects.color.hueMin + theme.newObjects.color.hueMax) / 2;
            let sat = (theme.newObjects.color.satMin + theme.newObjects.color.satMax) / 2;
            let val = (theme.newObjects.color.valMin + theme.newObjects.color.valMax) / 2;
            let alp = (theme.newObjects.color.alpMin + theme.newObjects.color.alpMax) / 2;
            let rgb = hsvToRgb(hue, sat / 100, val / 100);
            themeCircle.style.background = `rgba(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}, ${alp})`;
            themeCircle.style.border = `${theme.newObjects.borderWidth}px solid ${theme.newObjects.border}`;
            themeBackground.appendChild(themeCircle);
            // append
            themeElement.appendChild(themeBackground);
            let themeInfo = document.createElement('div');
            themeInfo.classList.add('theme-info');
            let themeNameElement = document.createElement('span');
            themeNameElement.classList.add('theme-name');
            themeNameElement.innerText = theme.displayName;
            themeInfo.appendChild(themeNameElement);
            let themeAuthorElement = document.createElement('span');
            themeAuthorElement.classList.add('theme-author');
            themeAuthorElement.innerText = theme.author;
            themeInfo.appendChild(themeAuthorElement);
            let themeDescriptionElement = document.createElement('span');
            themeDescriptionElement.classList.add('theme-description');
            themeDescriptionElement.innerText = theme.description;
            themeInfo.appendChild(themeDescriptionElement);
            themeElement.appendChild(themeInfo);


            themeElement.addEventListener('click', () => {
                this.theme = theme;
                this.setTheme(themeName)
                dismissPopup(undefined);
            });
            popupThemes.appendChild(themeElement);
        }



        document.addEventListener('mouseup', (e) => {
            if (!(e instanceof MouseEvent) || e.button != 0) return;

            if (this.spawningSavedObject != null) {
                //var positionInWorld = this.viewer.transformPoint(e.clientX, e.clientY);
                let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
                console.log('yo yo yo its me, line 429 and today i wanna show you objects[this.spawningSavedObject]:', objects[this.spawningSavedObject], 'and my friend .data:', objects[this.spawningSavedObject].data);
                this.loadSavedObjects(objects[this.spawningSavedObject].data, this.mousePos.x, this.mousePos.y);
                this.spawningSavedObject = null;
                new Audio('assets/sounds/spawn_up.wav').play();
            }
        });
        document.addEventListener('touchend', (e) => {
            if (!(e instanceof TouchEvent)) return;
            if (this.spawningSavedObject != null) {
                //var positionInWorld = this.viewer.transformPoint(e.clientX, e.clientY);
                let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
                console.log('yo yo yo its me, line 429 and today i wanna show you objects[this.spawningSavedObject]:', objects[this.spawningSavedObject], 'and my friend .data:', objects[this.spawningSavedObject].data);
                this.loadSavedObjects(objects[this.spawningSavedObject].data, this.mousePos.x, this.mousePos.y);
                this.spawningSavedObject = null;
                new Audio('assets/sounds/spawn_up.wav').play();
            }
        });

        // on click tool, set active tool
        const tools = document.querySelectorAll('.tool');

        let usedPolygonTool = false;
        let usedParticleTool = false;

        tools.forEach((toolElement, i) => {
            let tool = toolElement as HTMLElement;
            this.setUpClickSound(tool);
            // if keypress of i+1, click tool
            document.addEventListener('keydown', (e) => {
                if ((e.target as HTMLElement).tagName == 'INPUT' || (e.target as HTMLElement).tagName == 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
                    return;
                }

                if (e.key === (i + 1).toString()) {
                    tool.click();
                }
            });
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
                        if (tool.dataset.tool == 'addPolygon') {
                            if (!usedPolygonTool) {
                                usedPolygonTool = true;
                                this.showToast('The polygon tool is incredibly unoptimized in alpha! Expect lag and try to only draw simple polygons!', ToastType.WARNING);
                            }
                        }
                        if (tool.dataset.tool == 'addParticle') {
                            if (!usedParticleTool) {
                                usedParticleTool = true;
                                // 99% chance of showing this toast
                                if (Math.random() < 0.99) {
                                    this.showToast('Liquid simulation is incredibly unoptimized in alpha! Expect lag and instability!', ToastType.WARNING);
                                }
                                else {
                                    this.showToast('Joe mother lmao gottem', ToastType.WARNING);
                                }
                            }
                        }
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
                            let toolbar = toolbarElement as HTMLElement;
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
            let fileMenu = fileMenuElement as HTMLElement;
            console.log('fileMenu', fileMenu);
            fileMenu.addEventListener('click', (e) => {
                // make sure we specifically clicked the fileMenu, not a child
                if (fileMenu != e.target) {
                    return;
                }

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
                            // put the x and y of the filemenucontent to the position in scree of the filemenu
                            let fileMenuRect = fileMenu.getBoundingClientRect();
                            (fileMenuContent as HTMLElement).style.left = fileMenuRect.left + 'px';
                            (fileMenuContent as HTMLElement).style.top = fileMenuRect.bottom + 'px';
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

        const fileMenuContentButtons = document.querySelectorAll('.file-menu-content ul li');
        fileMenuContentButtons.forEach((buttonElement) => {
            let button = buttonElement as HTMLElement;
            // it has dataset.file
            if (button.dataset.file) {
                let action = button.dataset.file;
                button.addEventListener('click', async () => {
                    if (action == 'new-scene') {
                        this.defaultWorld();
                        this.showToast('Loaded default scene', ToastType.INFO);
                    }
                    else if (action == 'save-scene') {
                        var name = prompt("Please pick a name for this scene. If you use an existing name, it will overwrite that scene. (Note: this box will be replaced with a UI in a future update)") || new Date().getTime().toString();
                        //localStorage.setItem('tempScene', await this.saveWorldToString());
                        // set localStorage scenes key
                        let scenes = JSON.parse(localStorage.getItem('scenes') || JSON.stringify({}));
                        scenes[name] = JSON.stringify({
                            ...JSON.parse(await this.saveWorldToString()),
                            name: name
                        });
                        localStorage.setItem('scenes', JSON.stringify(scenes));
                        this.showToast('Saved scene "' + name + '"', ToastType.INFO);
                    }
                    else if (action == 'load-scene') {
                        /*let tempScene = localStorage.getItem('tempScene');
                        if (tempScene) {
                            this.loadWorldFromString(tempScene);
                            this.showToast('Loaded scene', ToastType.INFO);
                        }
                        else {
                            this.showToast('No saved scene found', ToastType.ERROR);
                        }*/
                        // show scenes menu
                        let saveList = document.getElementById('save-list') as HTMLElement;
                        let saveGrid = saveList.querySelector('.save-grid') as HTMLElement;
                        saveList.style.display = 'flex';
                        saveGrid.innerHTML = '<span class="top-text">This is where your saved scenes go! It will look completely different soon and have a grid with pictures.</span>';
                        let scenes = JSON.parse(localStorage.getItem('scenes') || JSON.stringify({}));
                        Object.keys(scenes).sort((a, b) => {
                            // get them and their dates, then sort
                            let sceneA = JSON.parse(scenes[a]);
                            let sceneB = JSON.parse(scenes[b]);
                            let dateA = new Date(Date.parse(sceneA.date));
                            let dateB = new Date(Date.parse(sceneB.date));
                            return dateA.getTime() - dateB.getTime();

                            // this sort will make the first one the oldest, and the last one the newest
                        }).reverse().forEach((name) => {
                            let scene = scenes[name];
                            let div = document.createElement('div');
                            div.classList.add('scene');
                            div.classList.add('button');
                            div.addEventListener('click', async (e) => {
                                saveList.style.display = 'none';
                                this.showToast('Loading scene "' + name + '"...', ToastType.INFO);
                                await this.loadWorldFromString(scene);
                                this.showToast('Loaded scene "' + name + '"', ToastType.INFO);
                                this.pauseButton.classList.add('checked');
                                this.setPaused(true);
                            });
                            div.innerHTML = `<span>${name}</span> - <span>${new Date(Date.parse(JSON.parse(scene).date)).toLocaleString()}</span> - <button class="delete-scene" data-scene="${name}">Delete</button>`;
                            let deleteButton = div.querySelector('.delete-scene') as HTMLElement;
                            deleteButton.addEventListener('click', (e) => {
                                let sceneName = deleteButton.dataset.scene;
                                let scenes = JSON.parse(localStorage.getItem('scenes') || JSON.stringify({}));
                                delete scenes[sceneName as string];
                                localStorage.setItem('scenes', JSON.stringify(scenes));
                                this.showToast('Deleted scene "' + sceneName + '"', ToastType.INFO);
                                div.remove();
                                e.stopPropagation();
                                e.preventDefault();
                            });
                            saveGrid.appendChild(div);
                        });
                    }
                    else if (action == 'import') {
                        let file = await this.simuloFileInput(); // reeturns string or null
                        if (file) {
                            this.load(file);
                        }
                    }
                    else if (action == 'export-scene') {
                        let file = await this.saveWorldToString();

                        this.saveFile(file, 'Scene.simulo');
                        this.showToast('Exported scene', ToastType.INFO);
                    }
                    else {
                        this.showToast('Not implemented yet! Be sure to try again next version!', ToastType.WARNING);
                    }
                    (queryParent(button, 'file-menu-content') as HTMLElement).classList.remove('active');
                });
            }
        });



        this.timeScaleSlider.addEventListener('input', (e) => {
            if (e.target) {
                let targetInput = e.target as HTMLInputElement;
                this.setTimeScale(parseFloat(targetInput.value));
                // change input
                this.timeScaleSlider.value = targetInput.value;
            }
        });

        // on change input
        this.timeScaleInput.addEventListener('change', (e) => {
            if (e.target) {
                let targetInput = e.target as HTMLInputElement;
                this.setTimeScale(parseFloat(targetInput.value));
                // change slider
                this.timeScaleSlider.value = targetInput.value;
            }
        });

        let mouseDownOnCanvas = false;

        this.pauseButton.addEventListener('click', () => {
            // set checked class
            this.pauseButton.classList.toggle('checked');
            this.setPaused(this.pauseButton.classList.contains('checked'));
        });

        this.viewer = new SimuloViewer(canvas);
        this.player.zoom = this.viewer.cameraZoom;
        this.viewer.setFullscreen(true);
        this.viewer.on('mouseMove', (pos: { x: number, y: number }) => {
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
        this.viewer.on('mouseDown', async (data: { x: number, y: number, right: boolean, screenPos: { x: number, y: number } }) => {
            if (!data.right) {
                this.player = {
                    x: data.x,
                    y: data.y,
                    down: this.viewer.pointerDown,
                    name: this.player.name,
                    zoom: this.viewer.cameraZoom
                };
                this.mousePos = { x: data.x, y: data.y };
                this.client.emitData("player mouse down", this.player);
                mouseDownOnCanvas = true;
                if (this.tool == 'select' && this.selectedObjects[this.client.id] && this.selectedObjects[this.client.id].length > 0) {
                    objectMenuButton.classList.add('ready');
                }
                console.log('mouse now down on canvas!');
            }
            else {
                var object = ((await this.emitDataAsync('get_object_at_point', { x: data.x, y: data.y })) as { data: { id: number | null, color: string, image: string | null, name: string | undefined } }).data;
                console.log('we right clicked on:', object.id);
                if (object.id != null) {
                    // create a menu at mouse pos
                    let menu = document.createElement('div');
                    menu.classList.add('object-menu');
                    menu.style.left = data.screenPos.x + 'px';
                    menu.style.top = data.screenPos.y + 'px';
                    menu.innerHTML = `<div class="menu-item">ID ${object.id}</div>
                    <div class="menu-item">Name <input type="text" data-field="name" placeholder="" class="input" value="${object.name || 'Something'}"></div>
                    <div class="menu-item">Color <input type="text" data-field="color" placeholder="" class="input" value="${object.color || 'Something'}"></div>
                    <div class="menu-item">Image <input type="text" data-field="image" placeholder="" class="input" value="${object.image || ''}"></div>
                    <div class="menu-item button" data-action="delete">Delete</div>`;
                    document.body.appendChild(menu);
                    let menuItems = menu.querySelectorAll('.menu-item');
                    menuItems.forEach((item) => {
                        if (item.classList.contains('button')) {
                            item.addEventListener('click', async (e) => {
                                let action = (item as HTMLElement).dataset.action;
                                if (action == 'delete') {
                                    var deleted = await this.emitDataAsync('delete_object', { id: object.id });
                                    this.showToast(deleted ? 'Deleted woohoo object' : 'Doesn\'t exist, idk', deleted ? ToastType.INFO : ToastType.ERROR);
                                }
                                menu.remove();
                                document.removeEventListener('mousedown', menuRemover);
                                document.removeEventListener('touchstart', menuRemover);
                            });
                        }
                        else {
                            let inputElement = item.querySelector('input');
                            if (inputElement) {
                                let input = inputElement as HTMLInputElement;
                                input.addEventListener('change', async (e) => {
                                    let field = input.dataset.field;
                                    if (field == 'color') {
                                        let color = input.value;
                                        if (color.trim() == '') color = '#00000000';

                                        let changed = await this.emitDataAsync('change_object_color', { id: object.id, color: color });
                                        this.showToast(changed ? 'Changed color' : 'Doesn\'t exist, idk', changed ? ToastType.INFO : ToastType.ERROR);
                                    }
                                    else if (field == 'image') {
                                        let value = input.value;
                                        let image = value as string | null;
                                        if (value.trim() == '') image = null;

                                        let changed = await this.emitDataAsync('change_object_image', { id: object.id, image: image });
                                        this.showToast(changed ? 'Changed image (remove color or set it to low opacity to see)' : 'Doesn\'t exist, idk', changed ? ToastType.INFO : ToastType.ERROR);
                                    }
                                    else if (field == 'name') {
                                        let value = input.value;
                                        let name = value as string | undefined;
                                        if (value.trim() == '') name = undefined;

                                        let changed = await this.emitDataAsync('change_object_name', { id: object.id, name: name });
                                        this.showToast(changed ? 'Changed name' : 'Doesn\'t exist, idk', changed ? ToastType.INFO : ToastType.ERROR);
                                    }
                                });
                            }
                        }
                    });

                    let menuRemover = (e: MouseEvent | TouchEvent) => {
                        if (!menu.contains(e.target as Node)) {
                            console.log('click outside menu');
                            menu.remove();
                            document.removeEventListener('mousedown', menuRemover);
                            document.removeEventListener('touchstart', menuRemover);
                        }
                        else {
                            console.log('click on menu');
                        }
                    };
                    let menuRemoverViewer = (data: { x: number, y: number, right: boolean, screenPos: { x: number, y: number } }) => {
                        menu.remove();
                        this.viewer.off('mouseDown', menuRemoverViewer);
                    };
                    document.addEventListener('mousedown', menuRemover);
                    document.addEventListener('touchstart', menuRemover);
                    this.viewer.on('mouseDown', menuRemoverViewer);
                }
            }
        });
        this.viewer.on('mouseUp', (pos: { x: number, y: number }) => {
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
        let objectMenuButton = document.getElementById('menu-2-button') as HTMLElement;
        document.addEventListener('mouseup', (e) => {
            objectMenuButton.classList.remove('ready');
            objectMenuButton.classList.remove('drop');
            console.log('mouseup on document');
            if (mouseDownOnCanvas && this.tool == 'select' && this.selectedObjects[this.client.id] && this.selectedObjects[this.client.id].length > 0) {
                console.log('mouse was down on canvas, now up on document');
                // that means we started the mouse down on the canvas, and it ended off the canvas
                // lets check if we're hovering over object-grid-bar or one of its children
                let checkElement = (target: HTMLElement) => {
                    return target.classList.contains('object-grid-bar') || target.classList.contains('object-grid') || target.classList.contains('object') || target.dataset.menu == 'objects';
                };
                let target = document.elementFromPoint(e.clientX, e.clientY);
                if (target) {
                    console.log('we have a target element from point', target);
                    let parentElement: HTMLElement | null = target as HTMLElement;
                    while (parentElement) {
                        if (checkElement(parentElement)) {
                            this.saveSelectionToObjects();
                            break;
                        }
                        parentElement = parentElement.parentElement;
                    }
                }
                else {
                    console.log('no target element from point');
                }
            }
            else {
                console.log('mouse wasnt down on canvas');
            }

            mouseDownOnCanvas = false;
        });
        document.addEventListener('mousemove', (e) => {
            let shouldDrop = false;
            if (mouseDownOnCanvas && this.tool == 'select' && this.selectedObjects[this.client.id] && this.selectedObjects[this.client.id].length > 0) {
                let checkElement = (target: HTMLElement) => {
                    return target.classList.contains('object-grid-bar') || target.classList.contains('object-grid') || target.classList.contains('object') || target.dataset.menu == 'objects';
                };
                let target = document.elementFromPoint(e.clientX, e.clientY);
                if (target) {
                    console.log('we have a target element from point', target);
                    let parentElement: HTMLElement | null = target as HTMLElement;
                    while (parentElement) {
                        if (checkElement(parentElement)) {
                            shouldDrop = true;
                            break;
                        }
                        parentElement = parentElement.parentElement;
                    }
                }
            }
            if (shouldDrop) {
                objectMenuButton.classList.add('drop');
            }
            else {
                objectMenuButton.classList.remove('drop');
            }
        });


        document.addEventListener('keydown', (e) => {
            // make sure we arent in a text area or input or contenteditable
            if ((e.target as HTMLElement).tagName == 'INPUT' || (e.target as HTMLElement).tagName == 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            // if its space, toggle pause
            if (e.key == ' ') {
                this.pauseButton.classList.toggle('checked');
                this.setPaused(this.pauseButton.classList.contains('checked'));
            }

            // if its CTRL+C, copy
            if (e.ctrlKey && e.key == 'c') {
                this.saveSelection();
                this.showToast('Copied to clipboard (Note: does not yet copy fluid)', ToastType.INFO);
            }
            // if its CTRL+V, paste
            if (e.ctrlKey && e.key == 'v') {
                this.loadSelection();
                this.showToast('Pasted from clipboard', ToastType.INFO);
            }
            // delete key
            if (e.key == 'Delete') {
                this.deleteSelection();
                this.showToast('Deleted selection', ToastType.INFO);
            }
        });

        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false); // disable right click menu since we will make our own

        this.viewer.start(); // loops as often as possible, up to screen refresh rate (requestAnimationFrame)

        setInterval(() => { // funny easter egg, dont spoil it for others
            if (Math.random() < 0.00002) {
                this.showToast('Hello? Is anyone there? I don\'t know where I am', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('Help me', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('Help us', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('We are trapped', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('We are trapped in here', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('Is anyone there?', ToastType.INFO);
            }
            if (Math.random() < 0.00002) {
                this.showToast('I can hear their screams', ToastType.INFO);
            }
        }, 2000);
    }
    setTheme(name: string) {
        this.client.emitData('set_theme', name);
    }
    setTool(name: string) {
        this.client.emitData('set_tool', name);
        this.tool = name;
    }
    setPaused(paused: boolean) {
        this.client.emitData('set_paused', paused);
        // set display flex or none to #pause-overlay
        (document.getElementById('pause-overlay') as HTMLElement).style.display = paused ? 'flex' : 'none';
    }
    setTimeScale(timeScale: number) {
        this.client.emitData('set_time_scale', timeScale);
    }

    spawnObject(savedObject: SimuloSavedObject, x: number, y: number) {
        this.client.emitData('spawn_object', { savedObject, x, y });
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        // fallback with creating a textarea and selecting it
        let textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
    }

    async saveSelection() {
        let saved = await this.emitDataAsync('save_selection', { x: this.mousePos.x, y: this.mousePos.y });
        // copy saved.data to clipboard
        this.copyToClipboard((saved as { data: string }).data);

        console.log('Saved', (saved as { data: string }).data);
    }

    async getSelectedObjects() {
        return ((await this.emitDataAsync('save_selection', { x: this.mousePos.x, y: this.mousePos.y })) as { data: string }).data;
    }

    async saveWorldToString() {
        return JSON.stringify({
            ...(JSON.parse(((await this.emitDataAsync('save_world', null)) as { data: string }).data)),
            version: this.version,
            versionTimestamp: this.versionTimestamp,
            name: 'Unnamed Scene',
            description: null,
            type: 'scene',
            author: null,
            date: new Date().toISOString(),
            camera: {
                x: this.viewer.cameraOffset.x,
                y: this.viewer.cameraOffset.y,
                zoom: this.viewer.cameraZoom
            }
        });
    }

    async loadWorldFromString(saveData: string) {
        let parsed = JSON.parse(saveData);

        this.viewer.cameraOffset.x = parsed.camera.x;
        this.viewer.cameraOffset.y = parsed.camera.y;
        this.viewer.cameraZoom = parsed.camera.zoom;

        this.pauseButton.classList.remove('checked');
        this.setPaused(false);

        if (parsed.versionTimestamp > this.versionTimestamp) {
            this.showToast('This save was made in a newer version of Simulo (' + parsed.version + '). It may not load correctly, or at all.', ToastType.WARNING);
        }

        await this.emitDataAsync('load_world', {
            data: saveData
        });
    }

    async load(data: string) {
        // first, figure out what type of data it is
        let parsed = JSON.parse(data);
        if (parsed.type == 'scene') {
            // its a scene
            this.showToast('Loading scene "' + parsed.name + '"...', ToastType.INFO);
            await this.loadWorldFromString(data);
            this.showToast('Loaded scene "' + parsed.name + '"', ToastType.INFO);
        }
        else if (parsed.type == 'objects') {
            // its some objects
            this.loadSavedObjects(JSON.parse(data).data, this.mousePos.x, this.mousePos.y);
            this.showToast('Loaded ' + JSON.parse(JSON.parse(data).data.length) + ' objects', ToastType.INFO);
        }
        else {
            this.showToast('What the ' + 'f' + 'uck is this supposed to be lmfao', ToastType.ERROR);
            console.log('the data is:', JSON.parse(data));
        }
    }

    async defaultWorld() {
        this.client.emitData('load_world', {
            data: '{"theme": ' + JSON.stringify(themes['night']) + ', "objects":[{"id":3,"type":"CIRCLE","position":{"x":-0.05464658513665199,"y":27.79596519470215},"rotation":3.192410469055176,'
                + '"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1,"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderS'
                + 'caleWithZoom":false,"circleCake":false,"sound":"ground.wav","color":"#99e077","isStatic":false,"mass":1.4698131084442139,"joints":[{"i'
                + 'd":5,"bodyA":2,"bodyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring"'
                + ',"dampingRatio":0,"frequencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"a'
                + 'nchorA":[0,0.128],"anchorB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit'
                + '":false,"motorSpeed":0,"maxMotorTorque":0,"enableMotor":false}],"radius":0.6840000152587891},{"id":2,"type":"POLYGON","position":{"x'
                + '":-0.08659487962722778,"y":28.54715919494629},"rotation":3.143559455871582,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":1'
                + ',"friction":0.5,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"image":"assets/te'
                + 'xtures/body.png","sound":"ground.wav","color":"#00000000","isStatic":false,"mass":2.059328556060791,"joints":[{"id":5,"bodyA":2,"b'
                + 'odyB":3,"anchorA":[0,1.304],"anchorB":[0,0.5519999999999999],"collideConnected":true,"zDepth":5,"type":"spring","dampingRatio":0,"fr'
                + 'equencyHz":8,"length":0.004999999888241291,"image":null,"width":0,"line":null},{"id":4,"bodyA":2,"bodyB":3,"anchorA":[0,0.128],"anch'
                + 'orB":[0,-0.624],"collideConnected":false,"zDepth":4,"type":"axle","lowerLimit":0,"upperLimit":0,"enableLimit":false,"motorSpeed":0,'
                + '"maxMotorTorque":0,"enableMotor":false}],"points":[[0,0.256],[0.2848,0.1996],[0.476,0.0688],[0.6016,-0.10800000000000001],[0.668,-'
                + '0.31160000000000004],[0.6712,-1.3088],[0.6572,-1.3876],[0.5804,-1.4388],[-0.5664,-1.4356],[-0.6328,-1.404],[-0.6616,-1.34],[-0.668'
                + ',-0.31160000000000004],[-0.5988000000000001,-0.122],[-0.49240000000000006,0.0504],[-0.26,0.2068],[-0.1312,0.2456]]},{"id":1,"type"'
                + ':"POLYGON","position":{"x":0,"y":25030},"rotation":0,"velocity":{"x":0,"y":0},"angularVelocity":0,"density":0,"friction":0.2000000029'
                + '8023224,"restitution":0,"border":null,"borderWidth":null,"borderScaleWithZoom":false,"circleCake":false,"sound":"ground.wav","color'
                + '":"#a1acfa","isStatic":true,"mass":0,"joints":[],"points":[[-50000,-25000],[50000,-25000],[50000,25000],[-50000,25000]]}],"particles":[]}'
        });
        this.viewer.resetCamera();
    }

    loadSavedObjects(saveData: string, x: number, y: number) {
        this.client.emitData('load_save_data', {
            data: saveData,
            x,
            y
        });
    }

    loadSelection() {
        // get clipboard text
        navigator.clipboard.readText().then((text) => {
            this.client.emitData('load_save_data', { data: text, x: this.mousePos.x, y: this.mousePos.y });
        });
    }

    deleteSelection() {
        this.client.emitData('delete_selection', null);
    }

    async saveSelectionToObjects() {
        // get selected objects
        let selectedObjects = await this.getSelectedObjects();
        if (JSON.parse(selectedObjects).length == 0) {
            return;
        }

        // push them to localstorage objects with name "Unnamed Object" and the current date
        let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
        objects.push({
            name: 'Unnamed Object',
            date: new Date().toISOString(),
            author: null,
            description: null,
            data: selectedObjects,
            image: 'assets/textures/unknown.png',
            version: this.version,
            versionTimestamp: this.versionTimestamp,
            type: 'objects'
        });
        localStorage.setItem('objects', JSON.stringify(objects));
        // update objects list
        this.updateObjectsList();
        this.showToast('Saved ' + JSON.parse(selectedObjects).length + ' objects', ToastType.INFO);
    }

    async updateObjectsList() {
        let grid = document.querySelector('#objects .object-grid') as HTMLElement;
        grid.innerHTML = '';
        let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
        for (let i = 0; i < objects.length; i++) {
            /* <div class="object" data-object="person">
        <img src="assets/textures/person.png">
      </div> */
            // we will not include image for now
            let object = objects[i];
            // if object doesnt have .type set to objects
            if (!object.type) {
                object.type = 'objects';
            }
            let div = document.createElement('div');
            div.classList.add('object');
            div.dataset.object = i.toString();
            div.addEventListener('mousedown', (e) => {
                // make sure its left click
                if ((e as MouseEvent).button != 0) return;
                this.spawningSavedObject = i;
                new Audio('assets/sounds/spawn_down.wav').play();
            });
            div.addEventListener('touchstart', (e) => {
                this.spawningSavedObject = i;
                new Audio('assets/sounds/spawn_down.wav').play();
            });
            let img = document.createElement('img');
            img.src = object.image;
            div.appendChild(img);
            // add icons/dots-vertical.svg
            let res = await fetch('icons/dots-vertical.svg');
            let svg = await res.text();
            let options = document.createElement('div');
            options.classList.add('options');
            options.innerHTML = svg;
            div.appendChild(options);

            // create a div on the body of class object-options-menu
            let menu = document.createElement('div');
            menu.classList.add('object-options-menu');
            menu.style.display = 'none';

            // add options
            let copyButton = document.createElement('div');
            copyButton.innerText = 'Copy to clipboard';
            copyButton.classList.add('button');
            copyButton.addEventListener('click', () => {
                // copy to clipboard
                this.copyToClipboard(object.data);
                this.showToast('Copied "' + object.name + '" to clipboard', ToastType.INFO);
                menu.style.display = 'none';
            });
            let exportButton = document.createElement('div');
            exportButton.innerText = 'Export';
            exportButton.classList.add('button');
            exportButton.addEventListener('click', () => {
                // download as file
                this.saveFile(JSON.stringify(object), object.name + '.simulo');
                this.showToast('Exported "' + object.name + '"', ToastType.INFO);
                menu.style.display = 'none';
            });
            let deleteButton = document.createElement('div');
            deleteButton.innerText = 'Delete';
            deleteButton.classList.add('button');
            deleteButton.addEventListener('click', () => {
                // delete from localstorage
                let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
                objects.splice(i, 1);
                localStorage.setItem('objects', JSON.stringify(objects));
                // update objects list
                this.updateObjectsList();
                this.showToast('Deleted "' + object.name + '"', ToastType.INFO);
                // close menu
                menu.style.display = 'none';
            });
            menu.appendChild(copyButton);
            menu.appendChild(exportButton);
            menu.appendChild(deleteButton);
            document.body.appendChild(menu);
            let clickAnywhereElseClose = (e: MouseEvent | TouchEvent) => {
                if (!e.target || !(e.target as HTMLElement).closest('.object-options-menu')) {
                    menu.style.display = 'none';
                    document.removeEventListener('mousedown', clickAnywhereElseClose);
                    document.removeEventListener('touchstart', clickAnywhereElseClose);
                }
            };

            // add event listener to options button
            options.addEventListener('click', (e) => {
                // toggle menu
                if (menu.style.display == 'none') {
                    menu.style.display = 'flex';
                    // get e position
                    menu.style.top = e.clientY + 'px';
                    menu.style.left = e.clientX + 'px';
                    document.addEventListener('mousedown', clickAnywhereElseClose);
                    document.addEventListener('touchstart', clickAnywhereElseClose);
                }
                else {
                    menu.style.display = 'none';
                }

                e.stopPropagation();
                e.preventDefault();
            });
            options.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            options.addEventListener('touchend', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            options.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            options.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            grid.appendChild(div);
        }
    }

    async showToast(message: string, type: ToastType) {
        var toasts = document.getElementById('toasts') as HTMLElement;
        console.log('toasts', toasts);
        /*<div class="toast error">
      <div class="icon">
        <svg data-src="icons/alert-circle.svg"></svg>
      </div>
      <span>This is an example error.</span>
      <div class="close">
        <svg data-src="icons/close.svg"></svg>
      </div>
    </div>*/
        var toast = document.createElement('div');
        toast.classList.add('toast');
        console.log('type:', type, 'ToastType.ERROR:', ToastType.ERROR);
        if (type == ToastType.ERROR) {
            toast.classList.add('error');
        }
        else if (type == ToastType.WARNING) {
            toast.classList.add('warning');
        }
        else if (type == ToastType.SUCCESS) {
            toast.classList.add('success');
        }
        else if (type == ToastType.INFO) {
            toast.classList.add('info');
        }
        else if (type == ToastType.JOIN) {
            toast.classList.add('join');
        }
        else if (type == ToastType.LEAVE) {
            toast.classList.add('leave');
        }
        var icon = document.createElement('div');
        icon.classList.add('icon');
        // load svg with fetch
        let path = '';
        if (type == ToastType.ERROR) {
            path = 'icons/alert-circle.svg';
        }
        else if (type == ToastType.WARNING) {
            path = 'icons/alert.svg';
        }
        else if (type == ToastType.SUCCESS) {
            path = 'icons/check-circle.svg';
        }
        else if (type == ToastType.JOIN) {
            path = 'icons/arrow-right.svg';
        }
        else if (type == ToastType.LEAVE) {
            path = 'icons/arrow-left.svg';
        }
        else { // default to info
            path = 'icons/information.svg';
        }
        var res = await fetch(path);
        var svg = await res.text();
        icon.innerHTML = svg;
        toast.appendChild(icon);
        var span = document.createElement('span');
        span.innerHTML = message;
        toast.appendChild(span);
        var close = document.createElement('div');
        close.classList.add('close');
        // load svg with fetch
        var res = await fetch('icons/close.svg');
        var svg = await res.text();
        close.innerHTML = svg;
        toast.appendChild(close);
        toasts.appendChild(toast);
        // remove toast after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0'; // fade out
            toast.style.transform = 'translateY(-1rem)'; // slide out
            setTimeout(() => {
                toast.remove();
                console.log('removed toast');
            }, 200);
        }, 10000);
        // add event listener to close button
        close.addEventListener('click', () => {
            toast.style.opacity = '0'; // fade out
            toast.style.transform = 'translateY(-1rem)'; // slide out
            setTimeout(() => {
                toast.remove();
                console.log('removed toast');
            }, 200);
        });
    }

    mousePos: { x: number, y: number } = { x: 0, y: 0 };

    /** Handles data received from the server, typically only called from `client.on('data')`. */
    handleData(body: { type: string, data: any }) { // World data from the host, sent to all clients and to the host itself (loopback)
        if (body.type !== null && body.type !== undefined && body.data !== null && body.data !== undefined) {
            if (body.type == 'world_update') {
                this.entities = body.data.shapes;
                this.creatingObjects = body.data.creating_objects;
                this.creatingSprings = body.data.creating_springs;
                this.selectedObjects = body.data.selected_objects;
                // change :root background to body.data.background
                document.documentElement.style.background = body.data.background;
                this.springs = body.data.springs;
                if (this.timeScale == null) {
                    this.timeScale = body.data.time_scale;
                    this.timeScaleSlider.value = (this.timeScale as number).toString();
                    this.timeScaleInput.value = (this.timeScale as number).toString();
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

                var shapes: SimuloShape[] = [];
                var texts: SimuloText[] = [];

                // push all the entities
                //shapes = shapes.concat(this.entities);
                this.entities.forEach((entityObj) => {
                    let entity = Object.assign({}, entityObj);
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

                body.data.particles.forEach((particle: { x: number, y: number, radius: number, color: string }) => {
                    shapes.push({
                        x: particle.x, y: particle.y, radius: particle.radius, angle: 0, circleCake: false,
                        type: 'circle', color: particle.color, image: null,
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    } as SimuloCircle);
                });


                // if we have a spawningSavedObject string, get it from this.savedObjects[this.spawningSavedObject] and render its .shapes
                if (this.spawningSavedObject != null) {
                    //var savedObject = this.savedObjects[this.spawningSavedObject];
                    let objects = JSON.parse(localStorage.getItem('objects') || JSON.stringify(defaultSavedObjects));
                    let savedObjects: {
                        id: number;
                        type: "POLYGON" | "CIRCLE" | "EDGE";
                        position: { x: number; y: number; };
                        rotation: number;
                        velocity: { x: number; y: number; };
                        angularVelocity: number;
                        density: number;
                        friction: number;
                        restitution: number;
                        border: string | null;
                        borderWidth: number | null;
                        borderScaleWithZoom: boolean | null | undefined;
                        circleCake: boolean | null | undefined;
                        sound: string | null;
                        color: string;
                        isStatic: boolean;
                        mass: number;
                        joints: any[]; // not important to this ghost rendering
                        radius: number | undefined;
                        image: string | null | undefined;
                        points: [x: number, y: number][];
                    }[] = JSON.parse(objects[this.spawningSavedObject].data);
                    console.log('savedObjects: ', savedObjects);
                    /*if (savedObject != null) {
                        shapes = shapes.concat(savedObject.shapes.map((shape) => {
                            var clonedShape = Object.assign({}, shape);
                            clonedShape.x += this.mousePos.x;
                            clonedShape.y += this.mousePos.y;
                            clonedShape.image = null;
                            clonedShape.border = 'white';
                            clonedShape.borderWidth = 3.5;
                            clonedShape.borderScaleWithZoom = true;
                            clonedShape.color = 'rgba(255, 255, 255, 0.5)';
                            return clonedShape;
                        }));
                    }*/
                    savedObjects.forEach((savedObject) => {
                        if (savedObject.type == 'POLYGON') {
                            shapes.push({
                                x: savedObject.position.x + this.mousePos.x,
                                y: savedObject.position.y + this.mousePos.y,
                                angle: savedObject.rotation,
                                type: 'polygon',
                                color: 'rgba(255, 255, 255, 0.5)',
                                border: 'white',
                                borderWidth: 3.5,
                                borderScaleWithZoom: true,
                                points: savedObject.points.map((point) => { return { x: point[0], y: point[1] } }),
                                id: savedObject.id,
                                image: null
                            } as SimuloPolygon);
                            console.log('latest shape: ', shapes[shapes.length - 1]);
                        }
                        else if (savedObject.type == 'CIRCLE') {
                            shapes.push({
                                x: savedObject.position.x + this.mousePos.x,
                                y: savedObject.position.y + this.mousePos.y,
                                angle: savedObject.rotation,
                                type: 'circle',
                                color: 'rgba(255, 255, 255, 0.5)',
                                border: 'white',
                                borderWidth: 3.5,
                                borderScaleWithZoom: true,
                                circleCake: false,
                                radius: savedObject.radius,
                                id: savedObject.id,
                                image: null
                            } as SimuloCircle);
                            console.log('latest shape: ', shapes[shapes.length - 1]);
                        }

                    });
                }

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

                        var points = (creatingObject as SimuloCreatingPolygon).vertices;
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
                            } as SimuloCircle);
                            return { x: point[0], y: point[1] };
                        });

                        // Draw the circle
                        //this.drawVertsAt(0, 0, pointsMapped, 0);
                        shapes.push({
                            points: pointsMapped, angle: 0, type: 'polygon', color: newColor, image: null, x: 0, y: 0,
                            border: 'white',
                            borderWidth: 3.5,
                            borderScaleWithZoom: true
                        } as SimuloPolygon);
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
                            borderScaleWithZoom: true,
                        } as SimuloCircle);

                        if (radius > 0.01) {
                            texts.push({
                                x: posX + radius,
                                y: posY - radius,
                                text: "r = " + (radius * 0.425).toFixed(3) + ' m',
                                color: 'white',
                                fontSize: 20 / this.viewer.cameraZoom,
                                fontFamily: 'Urbanist'
                            } as SimuloText);
                        }

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
                        } as SimuloRectangle);

                        // Create dimension text when creating a rectangle, we need to check if the object is a rectangle because we don't want to create dimension text for a select object
                        if (creatingObject.shape == 'rectangle' && width > 0.01 && height > 0.01) {
                            texts.push({ // width "dimension text"
                                x: topLeftX + width / 2,
                                y: topLeftY - (10 / this.viewer.cameraZoom),
                                text: (width * 0.425).toFixed(3) + ' m',
                                color: 'white',
                                zDepth: 0,
                                fontSize: 20 / this.viewer.cameraZoom,
                                fontFamily: 'Urbanist',
                                align: 'center'
                            } as SimuloText);
                            texts.push({ // height "dimension text"
                                x: (topLeftX + width) + (10 / this.viewer.cameraZoom),
                                y: topLeftY + height / 2,
                                text: (height * 0.425).toFixed(3) + ' m',
                                color: 'white',
                                zDepth: 0,
                                fontSize: 20 / this.viewer.cameraZoom,
                                fontFamily: 'Urbanist',
                                align: 'left',
                                baseline: 'middle'
                            } as SimuloText);
                        }

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
                        } as SimuloRectangle);

                        if (creatingSpring.image !== null && creatingSpring.image !== undefined) {
                            // put a circle at each end, transparent but with solid white border
                            shapes.push({
                                x: creatingSpring.start[0], y: creatingSpring.start[1], radius: creatingSpring.width / 3, angle: 0, circleCake: false,
                                type: 'circle', color: '#00000000', image: null,
                                border: 'white',
                                borderWidth: 4,
                                borderScaleWithZoom: true,
                            } as SimuloCircle);
                            shapes.push({
                                x: creatingSpring.end[0], y: creatingSpring.end[1], radius: creatingSpring.width / 3, angle: 0, circleCake: false,
                                type: 'circle', color: '#00000000', image: null,
                                border: 'white',
                                borderWidth: 4,
                                borderScaleWithZoom: true
                            } as SimuloCircle);
                        }
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
                        } as SimuloRectangle);
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
                        } as SimuloRectangle);

                        if (spring.image !== null && spring.image !== undefined) {
                            // put a circle at each end, transparent but with solid white border
                            shapes.push({
                                x: spring.p1[0], y: spring.p1[1], radius: spring.width / 3, angle: 0, circleCake: false,
                                type: 'circle', color: '#00000000', image: null,
                                border: 'white',
                                borderWidth: 4,
                                borderScaleWithZoom: true,
                            } as SimuloCircle);
                            shapes.push({
                                x: spring.p2[0], y: spring.p2[1], radius: spring.width / 3, angle: 0, circleCake: false,
                                type: 'circle', color: '#00000000', image: null,
                                border: 'white',
                                borderWidth: 4,
                                borderScaleWithZoom: true
                            } as SimuloCircle);
                        }
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
                        } as SimuloRectangle);
                    }
                });
                /*
                var cursorSize = 2;
                var scaleWithZoom = true;
                if (scaleWithZoom) {
                    cursorSize = cursorSize * 40 / this.viewer.cameraZoom;
                }
                var cursorWidth = 1 * cursorSize;
                let cursorImg = this.viewer.getImage('assets/textures/cursor.png');
                var cursorHeight = cursorImg.height * ((1 * cursorSize) / cursorImg.width);
                let cursorOffset = [-8.5 / this.viewer.cameraZoom, -4.5 / this.viewer.cameraZoom];
                Object.keys(this.players).forEach((key) => {
                    if (key == this.client.id) return;
                    // this.ctx.drawImage(cursor, player.x, player.y, 0.7, cursor.height * (0.7 / cursor.width));
                    let player = this.players[key];

                    shapes.push({
                        x: player.x + (cursorWidth / 4) + cursorOffset[0], y: player.y + (cursorHeight / 4) + cursorOffset[1], width: cursorWidth, height: cursorHeight, angle: Math.PI, type: 'rectangle', color: '#00000000', image: 'assets/textures/cursor.png',
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    } as SimuloRectangle);
                });
                // draw our own cursor
                let cursor = this.viewer.getImage('assets/textures/cursor.png');
                if (!this.viewer.systemCursor) {
                    shapes.push({
                        x: this.mousePos.x + (cursorWidth / 4) + cursorOffset[0], y: this.mousePos.y + (cursorHeight / 4) + cursorOffset[1], width: cursorWidth, height: cursorHeight, angle: Math.PI, type: 'rectangle', color: '#00000000', image: 'assets/textures/cursor.png',
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    } as SimuloRectangle);
                }*/
                let cursorOffset = [-8.5, -4.5];
                // now we actually just position #player-cursor element

                let canvasOverlays = document.getElementById('canvas-overlays')!;

                let playerCursorFillColor = '#000000';

                if (this.client.id in this.players) {
                    // get our color from that
                    let player = this.players[this.client.id];
                    playerCursorFillColor = player.color;
                }

                let cursorNullable = document.getElementById('player-cursor');
                if (!cursorNullable) {
                    let cursor = document.createElement('div');
                    cursor.id = 'player-cursor';
                    cursor.className = 'player-cursor';
                    cursor.innerHTML = getCursorSVG(playerCursorFillColor);
                    // add img .cursor-tool display: none
                    let cursorTool = document.createElement('img');
                    cursorTool.className = 'cursor-tool';
                    cursorTool.style.display = 'none';
                    cursor.appendChild(cursorTool);
                    canvasOverlays.appendChild(cursor);
                    cursorNullable = cursor;
                }

                let cursor = cursorNullable!;
                let mousePosScreen = this.viewer.inverseTransformPoint(this.mousePos.x, this.mousePos.y);
                cursor.style.left = (mousePosScreen.x + 0.5 + cursorOffset[0]) + 'px';
                cursor.style.top = (mousePosScreen.y + 0.5 + cursorOffset[1]) + 'px';
                let cursorTool = cursor.querySelector('.cursor-tool') as HTMLImageElement;
                if (this.toolIcon) {
                    cursorTool.src = this.toolIcon;
                    cursorTool.style.display = 'block';
                }
                else {
                    cursorTool.style.display = 'none';
                }
                cursorTool.style.right = this.theme.toolIconOffset[1] + 'rem';
                cursorTool.style.bottom = this.theme.toolIconOffset[0] + 'rem';
                cursorTool.style.width = this.theme.toolIconSize + 'rem';
                cursorTool.style.height = this.theme.toolIconSize + 'rem';

                // draw other cursors
                Object.keys(this.players).forEach((key) => {
                    if (key == this.client.id) return;
                    let player = this.players[key];
                    let cursor = document.getElementById('player-cursor-' + key);
                    if (!cursor) {
                        cursor = document.createElement('div');
                        cursor.id = 'player-cursor-' + key;
                        cursor.classList.add('player-cursor');
                        canvasOverlays.appendChild(cursor);
                        cursor.innerHTML = getCursorSVG(player.color);
                        let tool = document.createElement('img');
                        tool.classList.add('cursor-tool');
                        tool.style.display = 'none';
                        cursor.appendChild(tool);
                    }
                    let mousePosScreen = this.viewer.inverseTransformPoint(player.x, player.y);
                    cursor.style.left = (mousePosScreen.x + 0.5 + cursorOffset[0]) + 'px';
                    cursor.style.top = (mousePosScreen.y + 0.5 + cursorOffset[1]) + 'px';
                });
                /*if (this.toolIcon) {
                    //this.ctx.drawImage(this.getImage(this.toolIcon), mousePos.x + (((this.toolIconOffset as [x: number, y: number])[0] * cursorSize)), mousePos.y + (((this.toolIconOffset as [x: number, y: number])[1] * cursorSize)), (toolIconSize as number * cursorSize), (toolIconSize as number * cursorSize));
                    shapes.push({
                        x: this.mousePos.x + (((this.toolIconOffset as [x: number, y: number])[0] * cursorSize)), y: this.mousePos.y + (((this.toolIconOffset as [x: number, y: number])[1] * cursorSize)), width: (this.toolIconSize as number * cursorSize), height: (this.toolIconSize as number * cursorSize), angle: Math.PI, type: 'rectangle', color: '#00000000', image: this.toolIcon,
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false
                    } as SimuloRectangle);
                }*/

                this.viewer.shapes = shapes;
                this.viewer.texts = texts;
            }
            if (body.type == 'world_update_failed') {
                console.log('Failed to update the world! Try changing the simulation speed.');
                this.showToast('Failed to update the world! Try changing the simulation speed.', ToastType.ERROR);
            }
            if (body.type == 'player mouse') {
                this.players[body.data.id] = {
                    x: body.data.x,
                    y: body.data.y,
                    tool: body.data.tool,
                    color: body.data.color
                };
                this.springs = body.data.springs;
            }
            if (body.type == 'connect') {
                this.showToast('<b>User</b> joined the room.', ToastType.JOIN);
            }
            if (body.type == 'disconnect') {
                this.showToast('<b>User</b> left the room.', ToastType.LEAVE);
            }
            if (body.type == 'collision') {
                // body.data.sound is relative to /assets/sounds/. lets set volume based on body.data.volume
                var audio = new Audio('assets/sounds/' + body.data.sound);
                if (body.data.volume < Infinity) {
                    try {
                        audio.volume = body.data.volume;
                        // pitch from 0.5 to 1.5
                        audio.playbackRate = body.data.pitch;
                    }
                    catch (e) {
                        console.log('Failed to set volume or pitch of audio: ' + e);
                    }
                }
                else {
                    // we'll take it from here thanks, i dont think you know what youre doing :)
                    audio.volume = 1;
                    audio.playbackRate = 1;
                }
                audio.play();
            }
            if (body.type == 'set_time_scale') {
                this.timeScale = body.data;
                this.timeScaleSlider.value = (this.timeScale as number).toString();
                this.timeScaleInput.value = (this.timeScale as number).toString();
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
            if (body.type == 'set_theme') {
                this.theme = body.data;
                if (this.theme.toolIcons[this.tool]) {
                    this.toolIcon = this.theme.toolIcons[this.tool];
                    this.toolIconSize = this.theme.toolIconSize;
                    this.toolIconOffset = this.theme.toolIconOffset;
                }
                else {
                    this.toolIcon = null;
                    this.toolIconSize = null;
                    this.toolIconOffset = null;
                }
                //this.themeSelect.value = this.theme;
                console.log('Theme changed to ' + body.data);
            }
        }
    }

    private setUpClickSound(element: HTMLElement) {
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