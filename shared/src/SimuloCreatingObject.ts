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
}

// extension of creatingobject called creatingpolygon
interface SimuloCreatingPolygon extends SimuloCreatingObject {
    vertices: [x: number, y: number][];
    shape: "polygon";
}

export default SimuloCreatingObject;
export { SimuloCreatingPolygon, SimuloCreatingObject };