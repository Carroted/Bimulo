import SimuloTheme from '../../../shared/src/SimuloTheme.js';
import Box2DFactory from '../../../node_modules/box2d-wasm/dist/es/entry.js';
import SimuloClient from '../../../shared/src/SimuloClient.js';
import SimuloServerController from '../../../shared/src/SimuloServerController.js';
import themesJSON from "../../../shared/themes.json";
import SimuloViewer from '../SimuloViewer/index.js';

function loadThemes() {
    var themesJSONAny = themesJSON as { [key: string]: any };
    var themes: { [key: string]: SimuloTheme } = {};
    for (let themeName in themesJSONAny) {
        themes[themeName] = {
            background: themesJSONAny[themeName].background,
            ground: themesJSONAny[themeName].ground,
            new_objects: themesJSONAny[themeName].new_objects,
            tool_icons: themesJSONAny[themeName].tool_icons,
            system_cursor: themesJSONAny[themeName].system_cursor,
            tool_icon_size: themesJSONAny[themeName].tool_icon_size,
            tool_icon_offset: themesJSONAny[themeName].tool_icon_offset
        }
    };
    return themes;
}

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

import { SimuloPolygon, SimuloCircle, SimuloEdge, SimuloShape } from '../../../shared/src/SimuloShape.js';
import SimuloCreatingObject, { SimuloCreatingPolygon } from '../../../shared/src/SimuloCreatingObject.js';

/** `SimuloClientController` manages connecting to the server, `SimuloViewer` and the UI. */
class SimuloClientController {
    client: SimuloClient;
    timeScale: number | null = null;
    paused: boolean | null = null;
    serverController: SimuloServerController;
    theme: SimuloTheme;
    themes: { [key: string]: SimuloTheme } = {};
    maxZoom = 5;
    minZoom = 0.1;
    scrollSensitivity = 0.0005;

    player = {
        x: 0,
        y: 0,
        name: 'Anonymous',
        down: false
    };

    viewer: SimuloViewer;

    // TODO: Make these created by this script (loaded from an HTML file) so each ClientController can define its own UI
    timeScaleSlider = document.getElementById('time-scale-slider') as HTMLInputElement;
    timeScaleInput = document.getElementById('time-scale-input') as HTMLInputElement;
    pausedToggle = document.getElementById('paused-toggle') as HTMLInputElement;

    /** Entities to render. This is updated every time a world update from the server is received.
     * 
     * It only includes properties that are needed for rendering, things like mass and velocity must be obtained from the server. */
    private entities: SimuloShape[] = [];
    private creatingObjects: {
        [key: string]: SimuloCreatingObject;
    } = {};
    private creatingSprings: {
        [key: string]: {
            start: [x: number, y: number];
            image: string | null;
        };
    } = {};
    private players: { [key: string]: { x: number, y: number } } = {};
    private springs: {
        p1: number[];
        p2: number[];
        image: string | null;
        line: {
            color: string;
            width: number;
            scale_with_zoom: boolean;
        } | null;
    }[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.themes = loadThemes();
        this.theme = this.themes.default;
        this.serverController = new SimuloServerController(this.theme, null, true);
        this.client = this.serverController.localClients[0];
        // Since it loops back, we can use the exact same code for both host and client, excluding the networking code.

        this.client.on('connect', () => { // Connect fires when the WebSocket connects
            console.log('WebSocket connection established');
        });

        this.client.on('ready', () => { // Ready fires when the WebRTC connection is established
            console.log('WebRTC connection established');
        });

        this.client.on('data', (data: { type: string, data: any }) => { // Data fires when data is received from the server
            this.handleData(data); // Parses and displays the data in the world
        });

        this.client.connect(); // Connects to the server

        // on click tool, set active tool
        const tools = document.querySelectorAll('.tool');
        var toolIcon: string | null = null;
        var toolIconSize: number | null = null;
        var toolIconOffset: [x: number, y: number] | null = null;
        tools.forEach((toolElement) => {
            let tool = toolElement as HTMLElement;
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
                        if (this.theme.tool_icons[tool.dataset.tool]) {
                            toolIcon = this.theme.tool_icons[tool.dataset.tool];
                            toolIconSize = this.theme.tool_icon_size;
                            toolIconOffset = this.theme.tool_icon_offset;
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
                                toolbar.style.display = 'flex';
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

        // on change toggle
        this.pausedToggle.addEventListener('change', (e) => {
            if (e.target) {
                let targetInput = e.target as HTMLInputElement;
                this.setPaused(targetInput.checked);
            }
        });

        this.viewer = new SimuloViewer(canvas);
        this.viewer.on('mouseMove', (pos: { x: number, y: number }) => {
            this.player = {
                x: pos.x,
                y: pos.y,
                down: this.viewer.pointerDown,
                name: this.player.name
            };
            this.client.emitData("player mouse", this.player);
        });
        this.viewer.start(); // loops as often as possible, up to screen refresh rate (requestAnimationFrame)
    }
    setTheme(name: string) {
        this.client.emitData('set_theme', name);
    }
    setTool(name: string) {
        this.client.emitData('set_tool', name);
    }
    setPaused(paused: boolean) {
        this.client.emitData('set_paused', paused);
    }
    setTimeScale(timeScale: number) {
        this.client.emitData('set_time_scale', timeScale);
    }

    /** Handles data received from the server, typically only called from `client.on('data')`. */
    handleData(body: { type: string, data: any }) { // World data from the host, sent to all clients and to the host itself (loopback)
        if (body.type !== null && body.type !== undefined && body.data !== null && body.data !== undefined) {
            if (body.type == 'world update') {
                this.entities = body.data.shapes;
                this.creatingObjects = body.data.creating_objects;
                this.creatingSprings = body.data.creating_springs;
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
                    this.pausedToggle.checked = this.paused as boolean;
                }
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
                var audio = new Audio('/assets/sounds/' + body.data.sound);
                audio.volume = body.data.volume;
                // pitch from 0.5 to 1.5
                audio.playbackRate = body.data.pitch;
                audio.play();
            }
            if (body.type == 'set_time_scale') {
                this.timeScale = body.data;
                this.timeScaleSlider.value = (this.timeScale as number).toString();
                this.timeScaleInput.value = (this.timeScale as number).toString();
            }
            if (body.type == 'set_paused') {
                this.paused = body.data;
                // set #paused-toggle
                this.pausedToggle.checked = this.paused as boolean;
            }
        }
    }

    private setUpClickSound(element: HTMLElement) {
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
}

export default SimuloClientController;