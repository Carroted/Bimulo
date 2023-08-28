import SimuloShape, { SimuloCircle, SimuloEdge, SimuloPolygon, SimuloRectangle } from '../SimuloShape.js';
import SimuloText from '../SimuloText.js';
import SimuloViewer from '../SimuloViewer.js';
import SimuloRendererCanvas from './renderer.js';

const style = `/*canvas.simulo-viewer.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}*/

/* Default CSS for viewer, some of which is used for features like \`systemCursor\`, and some of which is just for looks */
canvas.simulo-viewer {
    border: none;
    outline: none;
    cursor: none;
    overflow: hidden;
    margin: 0;
    padding: 0;
}`;
const viewerClass = 'simulo-viewer';

/** Gets the relevant location from a mouse or single touch event */
function getEventLocation(e: MouseEvent | TouchEvent) {
    // check if its a touch event
    if (window.TouchEvent && e instanceof TouchEvent) {
        if (e.touches && e.touches.length == 1) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }
    else if ((e as MouseEvent).clientX && (e as MouseEvent).clientY) {
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    }
    return { x: 0, y: 0 };
}

/** Displays shapes and images on a canvas at low performance, typically paired with `SimuloClientController` or a custom controller. */
class SimuloViewerCanvas implements SimuloViewer {
    /** Whether the viewer is currently running, should only be altered by `start()` and `stop()` */
    private running: boolean = false;
    /** The drawing context of the canvas. You can use it directly for low-level drawing, but this should rarely be needed. */
    ctx: CanvasRenderingContext2D;
    /** The canvas that the viewer is drawing to. You can update this along with `ctx` to change the canvas mid-run. */
    canvas: HTMLCanvasElement;
    cameraOffset: { x: number, y: number } = { x: 0, y: 0 };
    cameraZoom = 30;
    private lastX: number;
    private lastY: number;
    // lastX is for touch and mouse, these are specifically for mouse
    private lastMouseX: number;
    private lastMouseY: number;
    touchStartElement: HTMLElement | null = null;
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    dragStart2 = { x: 0, y: 0 };
    /** Is the primary mouse or touch input down on the canvas? */
    pointerDown = false;
    /** Tracks any mouse or touch input down on the canvas, even if it's not the primary input. */
    mouseTouchDown = 0;
    initialPinchDistance: number | null = null;
    lastZoom = this.cameraZoom;

    keysDown: { [key: number]: boolean } = {};

    previousPinchDistance: number | null = null;

    listeners: { [key: string]: Function[] } = {};
    /** Emit data to listeners. Call `on` to add listeners and `off` to remove them. */
    emit(event: string, data: any = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => {
                if (data == null) {
                    listener();
                }
                else {
                    listener(data);
                }
            });
        }
    }
    on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event: string, listener: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }

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
    loop = () => {
        if (this.running) {
            this.draw();
            window.requestAnimationFrame(this.loop);
        }
    }
    private lastTouchX = 0;
    private lastTouchY = 0;
    resetCamera() {
        this.cameraOffset = { x: window.innerWidth / 2, y: (window.innerHeight / 2) - 700 }; // start at center, offset by 700. can be changed later by controller
        this.cameraZoom = 30;
    }
    private registeredListeners: { [event: string]: { element: HTMLElement | Document, listener: EventListenerOrEventListenerObject }[] } = {};

    addEventListener(element: HTMLElement | Document, event: string, listener: EventListenerOrEventListenerObject) {
        if (!this.registeredListeners[event]) {
            this.registeredListeners[event] = [];
        }
        this.registeredListeners[event].push({ element, listener });
        element.addEventListener(event, listener as EventListener);
    }

    clearEventListeners() {
        for (let event in this.registeredListeners) {
            for (let listener of this.registeredListeners[event]) {
                listener.element.removeEventListener(event, listener.listener as EventListener);
            }
        }
    }

    renderer: SimuloRendererCanvas;

    constructor(canvas: HTMLCanvasElement) {
        console.log("SimuloViewer constructor");
        this.canvas = canvas;
        this.renderer = new SimuloRendererCanvas(canvas);
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.ctx.scale(dpr, dpr);
        // if no tabindex, set to 1
        if (this.canvas.tabIndex == -1) {
            this.canvas.tabIndex = 1;
        }
        this.resetCamera();
        this.lastX = window.innerWidth / 2;
        this.lastY = window.innerHeight / 2;
        this.lastMouseX = this.lastX;
        this.lastMouseY = this.lastY;

        this.addEventListener(this.canvas, 'touchstart', (e: any) => {
            this.mouseTouchDown++;
            this.touchStartElement = e.target as HTMLElement;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
            this.canvas.focus();
        });
        /*this.addEventListener(this.canvas, 'touchend', (e) => {
            if (this.fullscreen) { return; } // we will handle on document element instead
            this.handleTouch(e, this.onPointerUp)
        });*/
        this.addEventListener(this.canvas, 'mousemove', (e: any) => {
            if (this.mouseTouchDown > 0) { return; } // we will handle on document element instead
            this.onPointerMove(e);
        });
        this.addEventListener(this.canvas, 'keydown', (e: any) => {
            if (this.mouseTouchDown > 0) { return; } // we will handle on document element instead
            this.emit('keyDown', e);
        });
        this.addEventListener(this.canvas, 'keyup', (e: any) => {
            if (this.mouseTouchDown > 0) { return; } // we will handle on document element instead
            this.emit('keyUp', e);
        });
        /*this.addEventListener(this.canvas, 'touchmove', (e) => {
            if (this.fullscreen) { return; } // we will handle on document element instead
            this.handleTouch(e, this.onPointerMove);
        });*/
        this.addEventListener(this.canvas, 'wheel', (e: any) => {
            this.adjustZoom((-e.deltaY) > 0 ? 1.1 : 0.9, null, null);
        });
        this.addEventListener(this.canvas, 'mousedown', (e: any) => {
            this.canvas.focus();
            this.mouseTouchDown++;
            this.onPointerDown(e);
            // stop propagation to prevent text selection
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        /*this.addEventListener(this.canvas, 'mouseup', (e) => {
            this.onPointerUp(e);
            e.stopPropagation();
            e.preventDefault();
            return false;
        });*/

        this.addEventListener(this.canvas, 'touchstart', (e: any) => {
            this.handleTouch(e, this.onPointerDown);
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        var documentElement = this.canvas.ownerDocument; // we could do .documentElement, but document.addEventListener is more common practice, i just named it documentElement to avoid conflict with the document variable
        this.addEventListener(documentElement, 'touchend', (e: any) => {
            if (this.mouseTouchDown <= 0) {
                return;
            } // its not from us
            this.mouseTouchDown--;
            this.handleTouch(e, this.onPointerUp);
            // on all of these we will allow propagation so UI works EXCEPT scroll
        });
        this.addEventListener(documentElement, 'touchmove', (e: any) => {
            if (this.mouseTouchDown <= 0) { return; } // its not from us
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
            this.handleTouch(e, this.onPointerMove);
        });
        this.addEventListener(documentElement, 'mousemove', (e: any) => {
            if (this.mouseTouchDown <= 0) {
                // if mouse isnt down and cursor is in the canvas rect
                let rect = this.canvas.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom && !e.buttons) {
                    // then we will handle it
                    this.onPointerMove(e);
                }
            } // its not from us
            this.onPointerMove(e);
        });
        this.addEventListener(documentElement, 'mouseup', (e: any) => {
            if (this.mouseTouchDown <= 0) { return; } // its not from us
            this.mouseTouchDown--;
            this.onPointerUp(e);
        });
        this.addEventListener(documentElement, 'keydown', (e: any) => {
            if (this.mouseTouchDown <= 0) { return; } // its not from us
            this.emit('keyDown', e);
        });
        this.addEventListener(documentElement, 'keyup', (e: any) => {
            if (this.mouseTouchDown <= 0) { return; } // its not from us
            this.emit('keyUp', e);
        });


        window.addEventListener('resize', () => {
            this.draw();
        }, false);

        // look for a #simulo-viewer-style element, if it doesn't exist, create it
        var styleElement: HTMLStyleElement | null = document.getElementById("simulo-viewer-style") as HTMLStyleElement | null;
        if (!styleElement) {
            var head = document.head || document.getRootNode().appendChild(document.createElement('head'));
            styleElement = document.createElement('style');
            styleElement.id = "simulo-viewer-style";
            head.appendChild(styleElement);

            styleElement.innerHTML = style;
        }

        this.canvas.classList.add(viewerClass);
    }

    onPointerMove = (e: MouseEvent | TouchEvent) => {
        // ignore if getEventLocation(e).x and y are 0 or null
        if (!getEventLocation(e).x && !getEventLocation(e).y) { return; }

        if (this.isDragging) {
            this.cameraOffset.x = getEventLocation(e).x - this.dragStart.x;
            this.cameraOffset.y = getEventLocation(e).y - this.dragStart.y;
        }

        this.lastX = getEventLocation(e).x;
        this.lastY = getEventLocation(e).y;

        this.lastMouseX = getEventLocation(e).x;
        this.lastMouseY = getEventLocation(e).y;

        // send mouse position to server
        var mousePos = this.transformPoint(getEventLocation(e).x, getEventLocation(e).y);
        this.emit("mouseMove", {
            x: mousePos.x,
            y: mousePos.y
        });
    }






    onPointerDown = (e: MouseEvent | TouchEvent) => {
        var mousePos = this.transformPoint(getEventLocation(e).x, getEventLocation(e).y);
        if (window.TouchEvent && e instanceof TouchEvent) {
            this.emit("mouseDown", {
                x: mousePos.x,
                y: mousePos.y,
                right: false,
                screenPos: getEventLocation(e)
            });
            this.pointerDown = true;
        }
        else {
            if ((e as MouseEvent).button == 2 || (e as MouseEvent).button && 3) {
                this.isDragging = true;
                this.dragStart.x = getEventLocation(e).x - this.cameraOffset.x;
                this.dragStart.y = getEventLocation(e).y - this.cameraOffset.y;

                this.dragStart2.x = getEventLocation(e).x;
                this.dragStart2.y = getEventLocation(e).y;
            }
            // if its not those buttons, we will see how much cursor moves first

            if ((e as MouseEvent).button == 0 || (e as MouseEvent).button == 2) {
                this.emit("mouseDown", {
                    x: mousePos.x,
                    y: mousePos.y,
                    right: (e as MouseEvent).button == 2,
                    screenPos: getEventLocation(e)
                });
                this.pointerDown = true;
            }
        }
    }

    onPointerUp = (e: MouseEvent | TouchEvent) => {
        if (window.TouchEvent && e instanceof TouchEvent) {
            this.pointerDown = false;
            var mousePos = this.transformPoint(this.lastTouchX, this.lastTouchY);
            this.emit("mouseUp", {
                x: mousePos.x,
                y: mousePos.y
            });
        }
        else {
            if ((e as MouseEvent).button == 0) {
                this.pointerDown = false;
                var mousePos = this.transformPoint(getEventLocation(e).x, getEventLocation(e).y);
                this.emit("mouseUp", {
                    x: mousePos.x,
                    y: mousePos.y
                });
            }
        }
        this.isDragging = false;
        this.lastZoom = this.cameraZoom;
        this.initialPinchDistance = null;
    }




    handleTouch(e: TouchEvent, singleTouchHandler: (e: TouchEvent) => void) {
        if (this.touchStartElement != this.canvas) {
            console.log('it didnt start on canvas')
            return;
        }

        if (e.touches.length <= 1) {
            singleTouchHandler(e);
        }
        else if (e.type == "touchmove" && e.touches.length == 2) {
            this.isDragging = false;
            this.handlePinch(e);
        }
    }



    handlePinch(e: TouchEvent) {
        e.preventDefault();

        let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

        // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
        let currentDistance = (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2;
        if (!this.previousPinchDistance)
            this.previousPinchDistance = currentDistance;

        if (this.initialPinchDistance == null) {
            this.initialPinchDistance = currentDistance;
        }
        else {
            this.adjustZoom((currentDistance - this.previousPinchDistance) > 0 ? 1.05 : (currentDistance - this.previousPinchDistance) < 0 ? 0.95 : 0, null, { x: (touch1.x + touch2.x) / 2, y: (touch1.y + touch2.y) / 2 });
        }

        this.previousPinchDistance = currentDistance;
    }

    scaleAt(x: number, y: number, scaleBy: number) {  // at pixel coords x, y scale by scaleBy
        this.cameraZoom *= scaleBy;
        this.cameraOffset.x = x - (x - this.cameraOffset.x) * scaleBy;
        this.cameraOffset.y = y - (y - this.cameraOffset.y) * scaleBy;
    }

    adjustZoom(zoomAmount: number | null, zoomFactor: number | null, center: { x: number, y: number } | null) {
        if (!this.isDragging) {
            if (center) {
                this.lastX = center.x;
                this.lastY = center.y;
            }
            if (zoomAmount) {
                // cameraZoom += zoomAmount
                this.scaleAt(this.lastX, this.lastY, zoomAmount);
            }
            else if (zoomFactor) {
                console.log(zoomFactor + ' is zoom factor');
                this.scaleAt(this.lastX, this.lastY, zoomFactor);
                // cameraZoom = zoomFactor * lastZoom
            }

            //cameraZoom = Math.min(cameraZoom, MAX_ZOOM)
            //cameraZoom = Math.max(cameraZoom, MIN_ZOOM)

            console.log(zoomAmount)

            // mouse moved, lets send
            var mousePos = this.transformPoint(this.lastX, this.lastY);
            this.emit("mouseMove", { x: mousePos.x, y: mousePos.y });
        }
    }

    private oldWidth: number = 50;
    private oldHeight: number = 50;
    /** Adds or removes `.fullscreen` class from the canvas element, which has CSS to make it fill the screen. */
    setFullscreen(fullscreen: boolean) {
        // if its yes and wasnt before, save old width and height
        if (fullscreen && !this.fullscreen) {
            this.oldWidth = this.canvas.width;
            this.oldHeight = this.canvas.height;
        }

        if (fullscreen) {
            this.canvas.classList.add("fullscreen");
        }
        else {
            this.canvas.classList.remove("fullscreen");
        }
    }
    /** Returns true if the canvas element has the `.fullscreen` class. */
    get fullscreen(): boolean {
        return this.canvas.classList.contains("fullscreen");
    }


    lineBetweenPoints(x1: number, y1: number, x2: number, y2: number, center: boolean = false): { x: number, y: number, angle: number, length: number } {
        if (!center) {
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            return { x: x1, y: y1, angle: angle, length: length };
        } else {
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            var x = x1 + ((x2 - x1) / 2);
            var y = y1 + ((y2 - y1) / 2);
            return { x: x, y: y, angle: angle, length: length * 2 };
        }
    }

    shapes: SimuloShape[] = [];
    texts: SimuloText[] = [];
    /** Draw the current state of the world to the canvas or other drawing context. */
    draw() {
        // if the classlist contains .fullscreen
        if (this.canvas.classList.contains('fullscreen')) {
            // set the canvas size to the window size
            // check the dpr
            var dpr = window.devicePixelRatio || 1;
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = window.innerHeight * dpr;
        }

        // Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
        this.ctx.setTransform(this.cameraZoom, 0, 0, this.cameraZoom, this.cameraOffset.x, this.cameraOffset.y);

        this.renderer.render(this.shapes, this.texts, this.cameraZoom);


        /*
                // draw springs (white line from spring.p1 (array of x and y) to spring.p2 (array of x and y))
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3 / this.cameraZoom;
                for (var i = 0; i < springs.length; i++) {
                    var spring = springs[i];
                    if (spring.image) {
                        //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                        this.drawStretchedImageLine(this.getImage(spring.image), spring.p1[0], spring.p1[1], spring.p2[0], spring.p2[1], false, 0.2);
                    }
                    else {
                        if (spring.line) {
                            this.ctx.strokeStyle = spring.line.color;
                            this.ctx.lineWidth = spring.line.width;
                            if (spring.line.scale_with_zoom) {
                                this.ctx.lineWidth /= this.cameraZoom;
                            }
                            this.ctx.beginPath();
                            this.ctx.moveTo(spring.p1[0], spring.p1[1]);
                            this.ctx.lineTo(spring.p2[0], spring.p2[1]);
                            this.ctx.stroke();
                        }
                    }
                }*/

        /*
                for (var id in this.players) {
                    //console.log('ID: ' + id);
                    var player = this.players[id];
                    if (id === this.client.id) {
                        // shit
                        continue;
                    }
                    this.ctx.fillStyle = 'blue';
                    //drawRect(player.x, player.y, 4, 4);
                    // draw image getImage('cursor.png')
                    this.ctx.drawImage(cursor, player.x, player.y, 0.7, cursor.height * (0.7 / cursor.width));
                }*/
        /*
                this.ctx.fillStyle = 'red';
                var cursorSize = 1;
                var scaleWithZoom = true;
                if (scaleWithZoom) {
                    cursorSize = cursorSize * 40 / this.cameraZoom;
                }
                if (!this.systemCursor) {
                    this.ctx.drawImage(cursor, mousePos.x, mousePos.y, (0.7 * cursorSize), (cursor.height * ((0.7 * cursorSize) / cursor.width)));
                }*/
        /*if (this.toolIcon) {
            console.log('drawing tool icon');
            this.ctx.drawImage(this.getImage(this.toolIcon), mousePos.x + (((this.toolIconOffset as [x: number, y: number])[0] * cursorSize)), mousePos.y + (((this.toolIconOffset as [x: number, y: number])[1] * cursorSize)), (toolIconSize as number * cursorSize), (toolIconSize as number * cursorSize));
        }
        if (client.id) {
            if (creatingSprings[client.id]) {
                if (creatingSprings[client.id].image) {
                    //drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength)
                    console.log('img on spring')
                    this.drawStretchedImageLine(this.getImage(creatingSprings[client.id].image as string), creatingSprings[client.id].start[0], creatingSprings[client.id].start[1], mousePos.x, mousePos.y, false, 0.2);
                }
                else {
                    console.log('no img on spring')
                    this.ctx.beginPath();
                    this.ctx.moveTo(creatingSprings[client.id].start[0], creatingSprings[client.id].start[1]);
                    this.ctx.lineTo(mousePos.x, mousePos.y);
                    this.ctx.stroke();
                }
            }
            if (creatingObjects[client.id]) {
                if (creatingObjects[client.id].shape === 'rectangle' || creatingObjects[client.id].shape === 'select') {

                }
                else if (creatingObjects[client.id].shape === 'circle') {

                }
                // if polygon,just drawvertsat
                else if (this.creatingObjects[this.client.id].shape === 'polygon') {

                }
            }
        }*/

        // draw text that says mouse pos in world space
        this.ctx.fillStyle = 'white';
        this.ctx.font = '0.2px Arial';
    }

    destroy() {
        this.clearEventListeners();
    }
}

export default SimuloViewerCanvas;