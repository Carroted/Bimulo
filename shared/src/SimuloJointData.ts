import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloJointData extends Box2D.b2JointUserData {
    image: string | null;
    line: { color: string, width: number, scale_with_zoom: boolean } | null;
}

export default SimuloJointData;