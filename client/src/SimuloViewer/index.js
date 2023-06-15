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
    /* This is overridden by the cursor class below, which is applied when \`systemCursor\` is true in SimuloViewer */
    cursor: none;
    overflow: hidden;
    margin: 0;
    padding: 0;
}

canvas.simulo-viewer.cursor {
    cursor: default;
}`;
const viewerClass = 'simulo-viewer';
/** Gets the relevant location from a mouse or single touch event */
function getEventLocation(e) {
    // check if its a touch event
    if (e instanceof TouchEvent) {
        if (e.touches && e.touches.length == 1) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }
    else if (e.clientX && e.clientY) {
        return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
}
function rotateVerts(verts, angle) {
    // Whoah there! hold up, if (angle % 2pi) is 0, then we don't need to rotate anything!
    if (angle % (2 * Math.PI) == 0) {
        return verts; // This will slightly improve performance when rotating a lot of verts all the time, which we do every frame
    }
    // rotate the vertices at the origin (0,0)
    var rotatedVertices = [];
    for (var i = 0; i < verts.length; i++) {
        // use math to rotate the vertices
        var rotatedX = verts[i].x * Math.cos(angle) - verts[i].y * Math.sin(angle);
        var rotatedY = verts[i].x * Math.sin(angle) + verts[i].y * Math.cos(angle);
        // add the rotated vertices to the array
        rotatedVertices.push({ x: rotatedX, y: rotatedY });
    }
    return rotatedVertices;
}
/** Displays shapes and images on a canvas at high performance, typically paired with `SimuloClientController` or a custom controller. */
class SimuloViewer {
    constructor(canvas) {
        /** Whether the viewer is currently running, should only be altered by `start()` and `stop()` */
        this.running = false;
        this.cameraZoom = 30;
        this.touchStartElement = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragStart2 = { x: 0, y: 0 };
        /** Is the primary mouse or touch input down on the canvas? */
        this.pointerDown = false;
        /** Tracks any mouse or touch input down on the canvas, even if it's not the primary input. */
        this.mouseTouchDown = 0;
        this.initialPinchDistance = null;
        this.lastZoom = this.cameraZoom;
        this.keysDown = {};
        this.previousPinchDistance = null;
        this.cachedImages = {};
        this.listeners = {};
        /** The loop that calls `draw()`, should not be called manually, just call `draw()` directly instead for that. */
        this.loop = () => {
            // For consistency so it always draws on loop call, we don't include the draw() call in the if statement.
            this.draw();
            if (this.running) {
                window.requestAnimationFrame(this.loop);
            }
        };
        this.onPointerMove = (e) => {
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
        };
        this.oldWidth = 50;
        this.oldHeight = 50;
        this.shapes = [];
        console.log("SimuloViewer constructor");
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        var windowEnd = this.transformPoint(this.canvas.width, this.canvas.height);
        this.cameraOffset = { x: windowEnd.x / 2, y: (windowEnd.y / 2) - 700 }; // start at center, offset by 700. can be changed later by controller
        this.lastX = window.innerWidth / 2;
        this.lastY = window.innerHeight / 2;
        this.lastMouseX = this.lastX;
        this.lastMouseY = this.lastY;
        this.canvas.addEventListener('touchstart', (e) => {
            this.mouseTouchDown++;
            this.touchStartElement = e.target;
        });
        /*this.canvas.addEventListener('touchend', (e) => {
            if (this.fullscreen) { return; } // we will handle on document element instead
            this.handleTouch(e, this.onPointerUp)
        });*/
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseTouchDown > 0) {
                return;
            } // we will handle on document element instead
            this.onPointerMove(e);
        });
        /*this.canvas.addEventListener('touchmove', (e) => {
            if (this.fullscreen) { return; } // we will handle on document element instead
            this.handleTouch(e, this.onPointerMove);
        });*/
        this.canvas.addEventListener('wheel', (e) => {
            this.adjustZoom((-e.deltaY) > 0 ? 1.1 : 0.9, null, null);
        });
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseTouchDown++;
            this.onPointerDown(e);
            // stop propagation to prevent text selection
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        /*this.canvas.addEventListener('mouseup', (e) => {
            this.onPointerUp(e);
            e.stopPropagation();
            e.preventDefault();
            return false;
        });*/
        this.canvas.addEventListener('touchstart', (e) => {
            this.handleTouch(e, this.onPointerDown);
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        var documentElement = this.canvas.ownerDocument; // we could do .documentElement, but document.addEventListener is more common practice, i just named it documentElement to avoid conflict with the document variable
        documentElement.addEventListener('touchend', (e) => {
            if (this.mouseTouchDown <= 0) {
                return;
            } // its not from us
            this.mouseTouchDown--;
            this.handleTouch(e, this.onPointerUp);
            // on all of these we will allow propagation so UI works EXCEPT scroll
        });
        documentElement.addEventListener('touchmove', (e) => {
            if (this.mouseTouchDown <= 0) {
                return;
            } // its not from us
            this.handleTouch(e, this.onPointerMove);
        });
        documentElement.addEventListener('mousemove', (e) => {
            if (this.mouseTouchDown <= 0) {
                return;
            } // its not from us
            this.onPointerMove(e);
        });
        documentElement.addEventListener('mouseup', (e) => {
            if (this.mouseTouchDown <= 0) {
                return;
            } // its not from us
            this.mouseTouchDown--;
            this.onPointerUp(e);
        });
        window.addEventListener('resize', () => {
            this.draw();
        }, false);
        // look for a #simulo-viewer-style element, if it doesn't exist, create it
        var styleElement = document.getElementById("simulo-viewer-style");
        if (!styleElement) {
            var head = document.head || document.getRootNode().appendChild(document.createElement('head'));
            styleElement = document.createElement('style');
            styleElement.id = "simulo-viewer-style";
            head.appendChild(styleElement);
            styleElement.innerHTML = style;
        }
        this.canvas.classList.add(viewerClass);
    }
    getImage(src) {
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
    /** Emit data to listeners. Call `on` to add listeners and `off` to remove them. */
    emit(event, data = null) {
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
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }
    /** Transform a point from screen space to world space */
    transformPoint(x, y) {
        var newX, newY;
        newX = (x - this.ctx.getTransform().e) / (this.ctx.getTransform().a);
        newY = (y - this.ctx.getTransform().f) / (this.ctx.getTransform().d);
        return { x: newX, y: newY };
    }
    /** Transform a point from world space to screen space */
    inverseTransformPoint(x, y) {
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
    drawVertsAt(x, y, verts, rotation = 0) {
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
    drawVertsNoFillAt(x, y, verts, rotation = 0) {
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
    drawCircleAt(x, y, radius, rotation = 0, circleCake = false) {
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
    onPointerDown(e) {
        var mousePos = this.transformPoint(getEventLocation(e).x, getEventLocation(e).y);
        if (e instanceof TouchEvent) {
            this.emit("mouseDown", {
                x: mousePos.x,
                y: mousePos.y
            });
            this.pointerDown = true;
        }
        else {
            if (e.button == 2 || e.button && 3) {
                this.isDragging = true;
                this.dragStart.x = getEventLocation(e).x - this.cameraOffset.x;
                this.dragStart.y = getEventLocation(e).y - this.cameraOffset.y;
                this.dragStart2.x = getEventLocation(e).x;
                this.dragStart2.y = getEventLocation(e).y;
            }
            // if its not those buttons, we will see how much cursor moves first
            if (e.button == 0) {
                this.emit("mouseDown", {
                    x: mousePos.x,
                    y: mousePos.y
                });
                this.pointerDown = true;
            }
        }
    }
    onPointerUp(e) {
        if (e instanceof TouchEvent) {
            this.pointerDown = false;
            var mousePos = this.transformPoint(getEventLocation(e).x, getEventLocation(e).y);
            this.emit("mouseUp", {
                x: mousePos.x,
                y: mousePos.y
            });
        }
        else {
            if (e.button == 0) {
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
    handleTouch(e, singleTouchHandler) {
        if (this.touchStartElement != this.canvas) {
            return;
        }
        if (e.touches.length == 1) {
            singleTouchHandler(e);
        }
        else if (e.type == "touchmove" && e.touches.length == 2) {
            this.isDragging = false;
            this.handlePinch(e);
        }
    }
    handlePinch(e) {
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
    scaleAt(x, y, scaleBy) {
        this.cameraZoom *= scaleBy;
        this.cameraOffset.x = x - (x - this.cameraOffset.x) * scaleBy;
        this.cameraOffset.y = y - (y - this.cameraOffset.y) * scaleBy;
    }
    adjustZoom(zoomAmount, zoomFactor, center) {
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
            console.log(zoomAmount);
            // mouse moved, lets send
            var mousePos = this.transformPoint(this.lastX, this.lastY);
            this.emit("mouseMove", { x: mousePos.x, y: mousePos.y });
        }
    }
    /** Adds or removes `.fullscreen` class from the canvas element, which has CSS to make it fill the screen. */
    setFullscreen(fullscreen) {
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
    get fullscreen() {
        return this.canvas.classList.contains("fullscreen");
    }
    /** Adds or removes `.cursor` class from the canvas element, which has CSS to make it show the system cursor or hide it. */
    get systemCursor() {
        return this.canvas.classList.contains('cursor');
    }
    set systemCursor(value) {
        if (value) {
            this.canvas.classList.add('cursor');
        }
        else {
            this.canvas.classList.remove('cursor');
        }
    }
    drawVerts(verts) {
        this.ctx.beginPath();
        verts.forEach(e => this.ctx.lineTo(e.x, e.y));
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    drawStretchedImageLine(image, x1, y1, x2, y2, useHeight, otherAxisLength) {
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
        }
        else {
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
    lineBetweenPoints(x1, y1, x2, y2, center = false) {
        if (!center) {
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            return { x: x1, y: y1, angle: angle, length: length };
        }
        else {
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            var x = x1 + ((x2 - x1) / 2);
            var y = y1 + ((y2 - y1) / 2);
            return { x: x, y: y, angle: angle, length: length * 2 };
        }
    }
    drawRect(x, y, width, height) {
        this.ctx.fillRect(x, y, width, height);
    }
    drawText(text, x, y, size, font) {
        this.ctx.font = `${size}px ${font}`;
        this.ctx.fillText(text, x, y);
    }
    outlinedImage(img, s, color, x, y, width, height) {
        var canvas2 = document.createElement('canvas');
        var ctx2 = canvas2.getContext('2d');
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
        i = 0; // iterator
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
    roundRect(x, y, w, h, r) {
        if (w < 2 * r)
            r = w / 2;
        if (h < 2 * r)
            r = h / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, r);
        this.ctx.arcTo(x + w, y + h, x, y + h, r);
        this.ctx.arcTo(x, y + h, x, y, r);
        this.ctx.arcTo(x, y, x + w, y, r);
        this.ctx.closePath();
        return this.ctx;
    }
    roundTri(x, y, w, h) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, 10);
        this.ctx.arcTo(x + w, y + h, x, y + h, 10);
        this.ctx.arcTo(x, y + h, x, y, 10);
        this.ctx.closePath();
        return this.ctx;
    }
    /** Draw the current state of the world to the canvas or other drawing context. */
    draw() {
        // if the classlist contains .fullscreen
        if (this.canvas.classList.contains('fullscreen')) {
            // set the canvas size to the window size
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        // Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
        this.ctx.setTransform(this.cameraZoom, 0, 0, this.cameraZoom, this.cameraOffset.x, this.cameraOffset.y);
        //ctx.fillStyle = '#151832';
        var origin = this.transformPoint(0, 0);
        var end = this.transformPoint(this.canvas.width, this.canvas.height);
        var width = end.x - origin.x;
        var height = end.y - origin.y;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
                this.ctx.lineWidth = shape.borderWidth / (shape.borderScaleWithZoom ? this.cameraZoom : 1);
            }
            else {
                this.ctx.strokeStyle = 'transparent';
            }
            if (shape.type === 'polygon') {
                let shapePolygon = shape;
                if (!shapePolygon.points) {
                    shapePolygon.vertices.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeSize)
                            shapeSize = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeSize)
                            shapeSize = Math.abs(vert.y);
                    });
                }
                else {
                    shapePolygon.points.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeSize)
                            shapeSize = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeSize)
                            shapeSize = Math.abs(vert.y);
                    });
                }
            }
            else if (shape.type === 'rectangle') {
                let shapeRectangle = shape;
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
                        this.ctx.drawImage(image, -shapeSize, -shapeSize * (image.height / image.width), shapeSize * 2, shapeSize * 2 * (image.height / image.width));
                    }
                    else {
                        // instead we use the rect height for height of the image. if its not a rectangle, shapesize
                        if (shape.type === 'rectangle') {
                            let shapeRectangle = shape;
                            this.ctx.drawImage(image, -shapeSize, -shapeSize * (shapeRectangle.height / shapeRectangle.width), shapeSize * 2, shapeSize * 2 * (shapeRectangle.height / shapeRectangle.width));
                        }
                        else {
                            this.ctx.drawImage(image, -shapeSize, -shapeSize, shapeSize * 2, shapeSize * 2);
                        }
                    }
                    this.ctx.restore();
                }
            }
            if (shape.type === 'polygon') {
                let shapePolygon = shape;
                if (!shapePolygon.points) {
                    this.drawVertsAt(shapePolygon.x, shapePolygon.y, shapePolygon.vertices, shapePolygon.angle);
                }
                else {
                    this.drawVertsAt(shapePolygon.x, shapePolygon.y, shapePolygon.points, shapePolygon.angle);
                }
            }
            else if (shape.type === 'circle') {
                let shapeCircle = shape;
                // console.log('drawing circle');
                this.drawCircleAt(shapeCircle.x, shapeCircle.y, shapeCircle.radius, shapeCircle.angle, shapeCircle.circleCake);
            }
            else if (shape.type === 'edge') {
                let shapeEdge = shape;
                //console.log('drawing edge');
                this.drawVertsNoFillAt(shapeEdge.x, shapeEdge.y, shapeEdge.vertices, shapeEdge.angle);
            }
            else if (shape.type === 'rectangle') {
                let shapeRectangle = shape;
                //console.log('drawing rectangle');
                var verts = [
                    { x: 0, y: 0 },
                    { x: shapeRectangle.width, y: 0 },
                    { x: shapeRectangle.width, y: shapeRectangle.height },
                    { x: 0, y: shapeRectangle.height }
                ];
                this.drawVertsAt(shapeRectangle.x, shapeRectangle.y, verts, shapeRectangle.angle);
            }
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
}
export default SimuloViewer;
//# sourceMappingURL=index.js.map