import SimuloShape, { SimuloCircle, SimuloEdge, SimuloPolygon, SimuloRectangle } from "./SimuloShape.js";
import SimuloText from "./SimuloText.js";

/**
 * Class that displays SimuloShapes and SimuloTexts on a canvas or other drawing context, typically paired with `SimuloClientController` or a custom controller.
 */
export default interface SimuloViewer {
    canvas: HTMLCanvasElement;
    cameraOffset: { x: number; y: number; };
    cameraZoom: number;
    touchStartElement: any;
    isDragging: boolean;
    dragStart: { x: number; y: number; };
    dragStart2: { x: number; y: number; };
    /**
     * Is the primary mouse or touch input down on the canvas?
     */
    pointerDown: boolean;
    /**
     * Tracks any mouse or touch input down on the canvas, even if it's not the primary input.
     */
    mouseTouchDown: number;
    initialPinchDistance: number | null;
    lastZoom: number;
    keysDown: { [key: number]: boolean; };
    previousPinchDistance: number | null;
    listeners: { [key: string]: {}; };
    /**
     * The loop that calls `draw()`, should not be called manually, just call `draw()` directly instead for that.
     */
    loop: () => void;
    onPointerMove: (e: any) => void;
    onPointerDown: (e: any) => void;
    onPointerUp: (e: any) => void;
    shapes: SimuloShape[];
    texts: SimuloText[];
    /**
     * Returns true if the canvas element has the `.fullscreen` class.
     */
    readonly fullscreen: boolean;
    /**
     * Emit data to listeners. Call `on` to add listeners and `off` to remove them.
     */
    emit(event: string, data: any): void;
    on(event: string, listener: Function): void;
    off(event: string, listener: Function): void;
    /**
     * Transform a point from screen space to world space
     */
    transformPoint(x: number, y: number): { x: any; y: any; };
    /**
     * Transform a point from world space to screen space
     */
    inverseTransformPoint(x: number, y: number): { x: any; y: any; };
    /**
     * Start a loop that calls `draw()` as fast as possible, up to the display's refresh rate. (`window.requestAnimationFrame`)
     */
    start(): void;
    /**
     * Stop the loop that calls `draw()`, can be restarted with `start()`
     */
    stop(): void;
    resetCamera(): void;
    /**
     * Adds or removes `.fullscreen` class from the canvas element, which has CSS to make it fill the screen.
     */
    setFullscreen(fullscreen: boolean): void;
    lineBetweenPoints(x1: number, y1: number, x2: number, y2: number, center?: boolean): { x: number; y: number; angle: number; length: number; };
    /**
     * Draw the current state of the world to the canvas or other drawing context.
     */
    draw(): void;

    destroy(): void;
}