interface SimuloCreatingObject {
    x: number;
    y: number;
    currentX: number;
    currentY: number;
    color: string;
    shape: "circle" | "rectangle" | "polygon" | "edge" | "square" | "select";
    border: string | null;
    borderWidth: number | null;
    borderScaleWithZoom: boolean;
    circleCake?: boolean; // for circles
    moving?: boolean; // for select tool
    wasStatic?: { [key: number]: boolean }; // for select tool
    initialVelocity?: { x: number, y: number }; // for select tool
}

// extension of creatingobject called creatingpolygon
interface SimuloCreatingPolygon extends SimuloCreatingObject {
    vertices: [x: number, y: number][];
    shape: "polygon";
}

export default SimuloCreatingObject;
export { SimuloCreatingPolygon, SimuloCreatingObject };