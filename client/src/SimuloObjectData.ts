import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloObjectData {
    id: number;
    /**
     * Path to a sound file for collisions. Relative to /assets/sounds/
    */
    name: string | undefined;
    sound: string | null;
    /** Color number like 0xffffff */
    color: number;
    /** Color number or null for no border */
    border: number | null;
    borderWidth: number | null;
    borderScaleWithZoom: boolean;
    circleCake?: boolean;
    image: string | null;
    /** We sort shapes with this for almost everything, including rendering. Newer shapes get a higher Z Depth. At the start of a scene, IDs and Z Depths will be the same, but user interaction can change this. */
    zDepth: number;
    flipImage?: boolean;
}

export default SimuloObjectData;