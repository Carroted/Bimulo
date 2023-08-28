import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloObjectData {
    id: number;
    positionOffset: [x: number, y: number];
    angleOffset: number;
    /**
     * Path to a sound file for collisions. Relative to /assets/sounds/
    */
    name: string | undefined;
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
    decomposedParts?: [x: number, y: number][][];
    flipImage?: boolean;
}

interface SimuloParentData extends Box2D.b2BodyUserData {
    // it has a bunch of simuloobjects
    objects: {
        [id: number]: SimuloObjectData
    };
    id: number;
}

interface SimuloFixtureData extends Box2D.b2FixtureUserData {
    id: number; // all we have is an ID, we get the rest from the parent. this prevents duplication of data and having to update it in loads of places
}

export { SimuloObjectData, SimuloParentData, SimuloFixtureData };