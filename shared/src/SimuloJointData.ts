import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloJointData extends Box2D.b2JointUserData {
    id: number;
    image: string | null;
    line: { color: string, scale_with_zoom: boolean } | null;
    width: number;
    /** We sort shapes with this for almost everything, including rendering. Newer shapes get a higher Z Depth. At the start of a scene, IDs and Z Depths will be the same, but user interaction can change this. */
    zDepth: number;
    anchorA: [x: number, y: number];
    anchorB: [x: number, y: number];
}

export default SimuloJointData;