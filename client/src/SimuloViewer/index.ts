/** Displays shapes and images on a canvas at high performance, typically paired with `SimuloClientController` or a custom controller. */
class SimuloViewer {
    /** Whether the viewer is currently running, should only be altered by `start()` and `stop()` */
    private running: boolean = false;
    /** The drawing context of the canvas. You can use it directly for low-level drawing, but this should rarely be needed. */
    ctx: CanvasRenderingContext2D;
    /** The canvas that the viewer is drawing to. You can update this along with `ctx` to change the canvas mid-run. */
    canvas: HTMLCanvasElement;
    cameraOffset: { x: number, y: number };
    cameraZoom = 30;
    private lastX: number;
    private lastY: number;
    // lastX is for touch and mouse, these are specifically for mouse
    private lastMouseX: number;
    private lastMouseY: number;
    touchStartElement: HTMLElement | null = null;

    /** Transform a point from screen space to world space */
    transformPoint(x: number, y: number) {
        var newX, newY;
        newX = (x - this.ctx.getTransform().e) / (this.ctx.getTransform().a);
        newY = (y - this.ctx.getTransform().f) / (this.ctx.getTransform().d);
        return { x: newX, y: newY };
    }

    /** Transform a point from world space to screen space */
    inverseTransformPoint(x: number, y: number) {
        var newX, newY;
        newX = (x * this.ctx.getTransform().a) + this.ctx.getTransform().e;
        newY = (y * this.ctx.getTransform().d) + this.ctx.getTransform().f;
        return { x: newX, y: newY };
    }

    /** Start a loop that calls `draw()` as fast as possible, up to the display's refresh rate. (`window.requestAnimationFrame`) */
    start() {
        this.running = true;
        window.requestAnimationFrame(this.loop);
    }
    /** Stop the loop that calls `draw()`, can be restarted with `start()` */
    stop() {
        this.running = false;
    }
    /** The loop that calls `draw()`, should not be called manually, just call `draw()` directly instead for that. */
    loop() {
        // For consistency so it always draws on loop call, we don't include the draw() call in the if statement.
        this.draw();
        if (this.running) {
            window.requestAnimationFrame(this.loop);
        }
    }
    /** Draw the current state of the world to the canvas or other drawing context. */
    draw() {

    }
    constructor(canvas: HTMLCanvasElement) {
        console.log("SimuloViewer constructor");
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        var windowEnd = this.transformPoint(this.canvas.width, this.canvas.height);
        this.cameraOffset = { x: windowEnd.x / 2, y: (windowEnd.y / 2) - 700 }; // start at center, offset by 700. can be changed later by controller

        this.lastX = window.innerWidth / 2;
        this.lastY = window.innerHeight / 2;
        this.lastMouseX = this.lastX;
        this.lastMouseY = this.lastY;

        this.canvas.addEventListener('touchstart', (e) => {
            this.touchStartElement = e.target as HTMLElement;
        });
        this.canvas.addEventListener('touchend', (e) => this.handleTouch(e, this.onPointerUp));
        this.canvas.addEventListener('mousemove', this.onPointerMove);
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e, this.onPointerMove));
        this.canvas.addEventListener('wheel', (e) => this.adjustZoom((-e.deltaY) > 0 ? 1.1 : 0.9, null, null));
    }
}

export default SimuloViewer;