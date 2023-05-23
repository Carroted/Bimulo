interface SimuloCreatingObject {
    x: number;
    y: number;
    color: string;
    shape: "circle" | "rectangle" | "polygon" | "edge" | "square" | "select";
    border: string | null;
    border_width: number | null;
    border_scale_with_zoom: boolean;
    circle_cake?: boolean; // for circles
}

// extension of creatingobject called creatingpolygon
interface SimuloCreatingPolygon extends SimuloCreatingObject {
    vertices: [x: number, y: number][];
    shape: "polygon";
}

export default SimuloCreatingObject;
export { SimuloCreatingPolygon, SimuloCreatingObject };