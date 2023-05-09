import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";

interface SimuloJointData extends Box2D.b2JointUserData {
    image: string | null;
}

export default SimuloJointData;