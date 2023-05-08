interface SimuloShape {
    x: number;
    y: number;
    type: "circle" | "polygon" | "edge";
    radius?: number;
    angle: number;
    color: string;
    border?: string | null;
    border_width?: number | null;
    border_scale_with_zoom?: boolean;
    image?: string | null;
}

interface SimuloCircle extends SimuloShape {
    type: "circle";
    circle_cake: boolean;
}

interface SimuloPolygon extends SimuloShape {
    type: "polygon";
    points: { x: number; y: number }[]; // points is the points of all polygon fixtures so they can be drawn as one
    vertices: { x: number, y: number }[]; // vertices is per-fixture
}

interface SimuloEdge extends SimuloShape {
    type: "edge";
    vertices: { x: number; y: number }[];
}

export default SimuloShape;
export { SimuloCircle, SimuloPolygon, SimuloEdge, SimuloShape };