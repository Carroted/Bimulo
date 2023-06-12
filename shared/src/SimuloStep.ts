import SimuloShape from "./SimuloShape.js";

interface SimuloStep {
    shapes: SimuloShape[];
    background: string;
    springs: {
        p1: number[], p2: number[], width: number, image: string | null, line: {
            color: string;
            scale_with_zoom: boolean;
        } | null
    }[];
    mouseSprings: {
        p1: number[], p2: number[], width: number, image: string | null, line: {
            color: string;
            scale_with_zoom: boolean;
        } | null
    }[];
}

export default SimuloStep;