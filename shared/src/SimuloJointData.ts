import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloJointData extends Box2D.b2JointUserData {
    id: number;
    image: string | null;
    line: { color: string, scale_with_zoom: boolean } | null;
    width: number;
}

export default SimuloJointData;