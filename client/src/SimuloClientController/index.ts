import SimuloTheme from '../../../shared/src/SimuloTheme.js';
import Box2DFactory from '../../../node_modules/box2d-wasm/dist/es/entry.js';
import SimuloClient from '../../../shared/src/SimuloClient.js';
import SimuloServerController from '../../../shared/src/SimuloServerController.js';
import themesJSON from "../../../shared/themes.json";

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

class SimuloClientController {
    client: SimuloClient;
    timeScale: number | null = null;
    paused: boolean | null = null;
    serverController: SimuloServerController;
    theme: SimuloTheme;
    themes: { [key: string]: SimuloTheme } = {};
    constructor() {
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
            handleData(data); // Parses and displays the data in the world
        });

        this.client.connect(); // Connects to the server
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
}
