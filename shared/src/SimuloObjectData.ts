import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloObjectData extends Box2D.b2BodyUserData {
    id: number;
    /**
     * Path to a sound file for collisions. Relative to /assets/sounds/
    */
    sound: string | null;
    color: string;
    border: string | null;
    borderWidth: number | null;
    borderScaleWithZoom: boolean;
    circleCake?: boolean;
    image: string | null;
    /** For polygons, this is the full shape used in rendering. In physics, the points from addPolygon are triangulated via earcut. */
    points?: [x: number, y: number][];
    /** We sort shapes with this for almost everything, including rendering. Newer shapes get a higher Z Depth. At the start of a scene, IDs and Z Depths will be the same, but user interaction can change this. */
    zDepth: number;
}

export default SimuloObjectData;