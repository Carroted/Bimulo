import SimuloShape from "./SimuloShape.js";

interface SimuloStep {
    shapes: SimuloShape[];
    background: string;
    springs: { p1: number[], p2: number[] }[];
    mouseSprings: { p1: number[], p2: number[] }[];
}

export default SimuloStep;