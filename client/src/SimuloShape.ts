interface SimuloShape {
    x: number;
    y: number;
    type: "circle" | "polygon" | "edge" | "rectangle";
    radius?: number;
    /** Measured in radians, angle to rotate the shape by */
    angle: number;
    color: string;
    border?: string | null;
    borderWidth?: number | null;
    borderScaleWithZoom?: boolean;
    image?: string | null;
    imageTransformations?: {
        scale: number;
        rotate: number;
        translate: [x: number, y: number];
    } | null;
    zDepth: number;
    id: number;
    text?: {
        color: string;
        border?: string | null;
        borderWidth?: number | null;
        borderScaleWithZoom?: boolean;
        // zDepth: number; // Text is always on top or same as parent shape
        text: string;
        fontSize: number;
        fontFamily?: string;
        align?: "left" | "center" | "right";    // Default = start
        baseline?: "alphabetic" | "top" | "middle" | "bottom"; // Default = alphabetic
    } | null;
    decomposedParts?: [x: number, y: number][][];
}

interface SimuloCircle extends SimuloShape {
    type: "circle";
    circleCake: boolean;
}

interface SimuloPolygon extends SimuloShape {
    type: "polygon";
    points: { x: number; y: number }[]; // points is the points of all polygon fixtures so they can be drawn as one
    vertices: { x: number, y: number }[]; // vertices is per-fixture
}

interface SimuloRectangle extends SimuloShape {
    type: "rectangle";
    width: number;
    height: number;
}

interface SimuloEdge extends SimuloShape {
    type: "edge";
    vertices: { x: number; y: number }[];
}

export default SimuloShape;
export { SimuloCircle, SimuloPolygon, SimuloEdge, SimuloShape, SimuloRectangle };