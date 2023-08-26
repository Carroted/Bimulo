import SimuloShape, { SimuloCircle, SimuloEdge, SimuloPolygon, SimuloRectangle } from '../SimuloShape.js';
import SimuloText from '../SimuloText.js';
import SimuloViewer from '../SimuloViewer.js';

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

function rotateVerts(verts: { x: number, y: number }[], angle: number) {
    // Whoah there! hold up, if (angle % 2pi) is 0, then we don't need to rotate anything!
    if (angle % (2 * Math.PI) == 0) {
        return verts; // This will slightly improve performance when rotating a lot of verts all the time, which we do every frame
    }

    // rotate the vertices at the origin (0,0)
    var rotatedVertices: { x: number, y: number }[] = [];
    for (var i = 0; i < verts.length; i++) {
        // use math to rotate the vertices
        var rotatedX = verts[i].x * Math.cos(angle) - verts[i].y * Math.sin(angle);
        var rotatedY = verts[i].x * Math.sin(angle) + verts[i].y * Math.cos(angle);
        // add the rotated vertices to the array
        rotatedVertices.push({ x: rotatedX, y: rotatedY });
    }
    return rotatedVertices;
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

    private cachedImages: { [key: string]: HTMLImageElement } = {};
    getImage(src: string) {
        if (this.cachedImages[src] != undefined) {
            return this.cachedImages[src];
        }
        else {
            var img = new Image();
            img.src = src;
            this.cachedImages[src] = img;
            return img;
        }
    }

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

    constructor(canvas: HTMLCanvasElement) {
        console.log("SimuloViewer constructor");
        this.canvas = canvas;
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
    drawVertsAt(x: number, y: number, verts: { x: number, y: number }[], rotation = 0) {
        this.ctx.beginPath();
        verts = rotateVerts(verts, rotation);
        verts.forEach(e => {
            this.ctx.lineTo((e.x + x), (e.y + y));
        });
        this.ctx.closePath();
        //ctx.strokeStyle = '#000000a0';

        this.ctx.save();
        this.ctx.clip();
        this.ctx.lineWidth *= 2;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
        /*
            ctx.fill();
            ctx.stroke();
            */
    }
    drawVertsNoFillAt(x: number, y: number, verts: { x: number, y: number }[], rotation = 0) {
        this.ctx.beginPath();
        verts = rotateVerts(verts, rotation);
        verts.forEach(e => {
            this.ctx.lineTo((e.x + x), (e.y + y));
        });
        this.ctx.closePath();
        // set stroke color
        this.ctx.strokeStyle = '#9ac4f1';
        // set line width
        this.ctx.lineWidth = 0.01;
        this.ctx.stroke();
        // reset to transparent
        this.ctx.strokeStyle = 'transparent';
    }

    drawCircleAt(x: number, y: number, radius: number, rotation = 0, circleCake = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        // if circleCake, draw a partial circle (20 degrees)
        if (circleCake) {
            // fill color darker
            this.ctx.fillStyle = '#00000080';
            this.ctx.strokeStyle = 'transparent';
            this.ctx.beginPath();
            //ctx.arc(x, y, radius, 0, 20 * Math.PI / 180);
            // offset based on rotation
            this.ctx.arc(x, y, radius, rotation, rotation + 23 * Math.PI / 180);
            this.ctx.lineTo(x, y);
            this.ctx.closePath();
            this.ctx.fill();
        }
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

    drawVerts(verts: { x: number, y: number }[]) {
        this.ctx.beginPath();
        verts.forEach(e => this.ctx.lineTo(e.x, e.y));
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawStretchedImageLine(image: HTMLImageElement, x1: number, y1: number, x2: number, y2: number, useHeight: boolean, otherAxisLength: number) {
        // if useHeight is true, we will stretch along height between p1 and p2. if false, we will stretch along width between p1 and p2
        if (useHeight) {
            // draw between 2 points, offsetting other axis by half of otherAxisLength
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            var halfOtherAxisLength = otherAxisLength / 2;
            this.ctx.save();
            this.ctx.translate(x1, y1);
            this.ctx.rotate(angle);
            this.ctx.drawImage(image, -halfOtherAxisLength, 0, otherAxisLength, length);
            this.ctx.restore();
        } else {
            // draw between 2 points, offsetting other axis by half of otherAxisLength
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            var halfOtherAxisLength = otherAxisLength / 2;
            this.ctx.save();
            this.ctx.translate(x1, y1);
            this.ctx.rotate(angle);
            this.ctx.drawImage(image, 0, -halfOtherAxisLength, length, otherAxisLength);
            this.ctx.restore();
        }
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


    drawRect(x: number, y: number, width: number, height: number) {
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(text: string, x: number, y: number, size: number, color: string, font: string = "urbanist",
        align: "left" | "center" | "right" = "left", baseline: "alphabetic" | "top" | "middle" | "bottom" = "alphabetic") {
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.font = `${size}px ${font}`;
        this.ctx.fillText(text, x, y);
    }

    outlinedImage(img: HTMLImageElement, s: number, color: string, x: number, y: number, width: number, height: number) {
        var canvas2 = document.createElement('canvas');
        var ctx2 = canvas2.getContext('2d') as CanvasRenderingContext2D;
        canvas2.width = width + (s * 4);
        canvas2.height = height + (s * 4);
        ctx2.imageSmoothingEnabled = false;
        // @ts-ignore
        ctx2.mozImageSmoothingEnabled = false; // we ignore because typescript doesnt know about these
        // @ts-ignore
        ctx2.webkitImageSmoothingEnabled = false;
        // @ts-ignore
        ctx2.msImageSmoothingEnabled = false;

        var dArr = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
            i = 0;  // iterator

        // draw images at offsets from the array scaled by s
        for (; i < dArr.length; i += 2)
            ctx2.drawImage(img, (1 + dArr[i] * s) + s, (1 + dArr[i + 1] * s) + s, width, height);

        // fill with color
        ctx2.globalCompositeOperation = "source-in";
        ctx2.fillStyle = color;
        ctx2.fillRect(0, 0, width + (s * 4), height + (s * 40));

        // draw original image in normal mode
        ctx2.globalCompositeOperation = "source-over";
        ctx2.drawImage(img, 1 + s, 1 + s, width, height);

        this.ctx.drawImage(canvas2, x - 1 - s, y - 1 - s);
    }

    // polyfill for roundRect
    roundRect(x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, r);
        this.ctx.arcTo(x + w, y + h, x, y + h, r);
        this.ctx.arcTo(x, y + h, x, y, r);
        this.ctx.arcTo(x, y, x + w, y, r);
        this.ctx.closePath();
        return this.ctx;
    }

    roundTri(x: number, y: number, w: number, h: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, 10);
        this.ctx.arcTo(x + w, y + h, x, y + h, 10);
        this.ctx.arcTo(x, y + h, x, y, 10);
        this.ctx.closePath();
        return this.ctx;
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

        //ctx.fillStyle = '#151832';
        var origin = this.transformPoint(0, 0);
        var end = this.transformPoint(this.canvas.width, this.canvas.height);
        var width = end.x - origin.x;
        var height = end.y - origin.y;
        //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // draw map
        //ctx.drawImage(canvasMap, 0, 0);


        var mousePos = this.transformPoint(this.lastX, this.lastY); // this is also the last touch position, however we will only use it for mouse hover effects in this function so touch isnt gonna be very relevant (hence the name mousePos)

        var cursor = this.getImage('assets/textures/cursor.png');

        // fill
        this.ctx.fillStyle = '#a1acfa';
        // no border
        this.ctx.strokeStyle = 'transparent';
        // the shapes are verts
        for (var i = 0; i < this.shapes.length; i++) {
            var shape = this.shapes[i];
            var shapeSize = 1; // width of shape
            this.ctx.fillStyle = shape.color;
            if (shape.border) {
                this.ctx.strokeStyle = shape.border;
                this.ctx.lineWidth = shape.borderWidth as number / (shape.borderScaleWithZoom ? this.cameraZoom : 1);
            }
            else {
                this.ctx.strokeStyle = 'transparent';
            }

            if (shape.type === 'polygon') {
                let shapePolygon = shape as SimuloPolygon;
                if (!shapePolygon.points) {
                    shapePolygon.vertices.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                    });
                }
                else {
                    shapePolygon.points.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeSize) shapeSize = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeSize) shapeSize = Math.abs(vert.y);
                    });
                }
            }
            else if (shape.type === 'rectangle') {
                let shapeRectangle = shape as SimuloRectangle;
                shapeSize = Math.abs(shapeRectangle.width / 2);
            }

            shapeSize = Math.abs(shapeSize / 2.1);

            if (shape.image) {
                var image = this.getImage(shape.image);
                if (image) {
                    this.ctx.save();
                    this.ctx.translate(shape.x, shape.y);
                    this.ctx.rotate(shape.angle);
                    // rotate 180deg
                    this.ctx.rotate(Math.PI);
                    // width is determined based on shape size. height is determined based on image aspect ratio
                    if (!shape.stretchImage) {
                        try {
                            this.ctx.drawImage(image, -shapeSize, -shapeSize * (image.height / image.width), shapeSize * 2, shapeSize * 2 * (image.height / image.width));
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                    else {
                        try {
                            // instead we use the rect height for height of the image. if its not a rectangle, shapesize
                            if (shape.type === 'rectangle') {
                                let shapeRectangle = shape as SimuloRectangle;
                                this.ctx.drawImage(image, -shapeSize, -shapeSize * (shapeRectangle.height / shapeRectangle.width), shapeSize * 2, shapeSize * 2 * (shapeRectangle.height / shapeRectangle.width));
                            }
                            else {
                                this.ctx.drawImage(image, -shapeSize, -shapeSize, shapeSize * 2, shapeSize * 2);
                            }
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                    this.ctx.restore();
                }
            }

            if (shape.type === 'polygon') {
                let shapePolygon = shape as SimuloPolygon;
                /*
                if (shapePolygon.decomposedParts) {
                    for (var j = 0; j < shapePolygon.decomposedParts.length; j++) {
                        var part = shapePolygon.decomposedParts[j];
                        this.ctx.fillStyle = '#ffffff30';
                        this.ctx.strokeStyle = '#ffffffff';
                        this.ctx.lineWidth = 1 / this.cameraZoom;
                        this.drawVertsAt(shapePolygon.x, shapePolygon.y, part.map(function (vert) {
                            return { x: vert[0], y: vert[1] };
                        }), shapePolygon.angle);
                    }
                }
                else */if (!shapePolygon.points) {
                    this.drawVertsAt(shapePolygon.x, shapePolygon.y, shapePolygon.vertices, shapePolygon.angle);
                }
                else {
                    this.drawVertsAt(shapePolygon.x, shapePolygon.y, shapePolygon.points, shapePolygon.angle);
                }
            }
            else if (shape.type === 'circle') {
                let shapeCircle = shape as SimuloCircle;
                // console.log('drawing circle');
                this.drawCircleAt(shapeCircle.x, shapeCircle.y, shapeCircle.radius as number, shapeCircle.angle, shapeCircle.circleCake);
            }
            else if (shape.type === 'edge') {
                let shapeEdge = shape as SimuloEdge;
                //console.log('drawing edge');
                this.drawVertsNoFillAt(shapeEdge.x, shapeEdge.y, shapeEdge.vertices, shapeEdge.angle);
            }
            else if (shape.type === 'rectangle') {
                let shapeRectangle = shape as SimuloRectangle;
                //console.log('drawing rectangle');
                var verts = [
                    { x: 0, y: 0 },
                    { x: shapeRectangle.width, y: 0 },
                    { x: shapeRectangle.width, y: shapeRectangle.height },
                    { x: 0, y: shapeRectangle.height }
                ];
                this.drawVertsAt(shapeRectangle.x, shapeRectangle.y, verts, shapeRectangle.angle);
            }

            if (shape.text) {
                this.drawText(shape.text.text, shape.x, shape.y, shape.text.fontSize, shape.text.color, shape.text.fontFamily, shape.text.align, shape.text.baseline);
            }
        }

        // Draw any text that is not attached to a shape
        for (var i = 0; i < this.texts.length; i++) {
            var text = this.texts[i];
            this.drawText(text.text, text.x, text.y, text.fontSize, text.color, text.fontFamily, text.align, text.baseline);
        }


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
        // round to 1 decimal place
        var mousePosXRound = Math.round(mousePos.x * 10) / 10;
        var mousePosYRound = Math.round(mousePos.y * 10) / 10;
        //ctx.fillText('(' + mousePosXRound + ', ' + mousePosYRound + ')', mousePos.x + 0.2, mousePos.y);
    }

    destroy() {
        this.clearEventListeners();
    }
}

export default SimuloViewerCanvas;