import SimuloShape, { SimuloCircle, SimuloEdge, SimuloPolygon, SimuloRectangle } from '../SimuloShape.js';
import SimuloText from '../SimuloText.js';

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

export default class SimuloRendererCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
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
    transformPoint(x: number, y: number) {
        var newX, newY;
        newX = (x - this.ctx.getTransform().e) / (this.ctx.getTransform().a);
        newY = (y - this.ctx.getTransform().f) / (this.ctx.getTransform().d);
        return { x: newX, y: newY };
    }
    updateTransform(zoom: number) {
        this.ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
    }
    render(shapes: SimuloShape[], texts: SimuloText[], zoom: number, handleZooming = false) {
        if (handleZooming) {
            this.updateTransform(zoom);
        }
        // fill
        this.ctx.fillStyle = '#a1acfa';
        // no border
        this.ctx.strokeStyle = 'transparent';
        // the shapes are verts
        for (var i = 0; i < shapes.length; i++) {
            var shape = shapes[i];
            let shapeHeight = 0;
            let shapeWidth = 0;
            this.ctx.fillStyle = shape.color;
            if (shape.border) {
                this.ctx.strokeStyle = shape.border;
                this.ctx.lineWidth = shape.borderWidth as number / (shape.borderScaleWithZoom ? zoom : 1);
            }
            else {
                this.ctx.strokeStyle = 'transparent';
            }

            if (shape.type === 'polygon') {
                let shapePolygon = shape as SimuloPolygon;
                if (!shapePolygon.points) {
                    shapePolygon.vertices.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeWidth) shapeWidth = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeHeight) shapeHeight = Math.abs(vert.y);
                    });
                }
                else {
                    shapePolygon.points.forEach(function (vert) {
                        if (Math.abs(vert.x) > shapeWidth) shapeWidth = Math.abs(vert.x);
                        if (Math.abs(vert.y) > shapeHeight) shapeHeight = Math.abs(vert.y);
                    });
                }
            }
            else if (shape.type === 'rectangle') {
                let shapeRectangle = shape as SimuloRectangle;
                shapeWidth = shapeRectangle.width;
                shapeHeight = shapeRectangle.height;
            }
            else if (shape.type === 'circle') {
                let shapeCircle = shape as SimuloCircle;
                shapeWidth = shapeCircle.radius as number;
                shapeHeight = shapeCircle.radius as number;
            }

            if (shape.image) {
                var image = this.getImage(shape.image);
                if (image) {
                    this.ctx.save();
                    let imageTranslation = shape.imageTransformations ? shape.imageTransformations.translate : [0, 0]
                    let imageScale = shape.imageTransformations ? shape.imageTransformations.scale : 1;
                    let imageRotation = shape.imageTransformations ? shape.imageTransformations.rotate : 0;
                    this.ctx.translate(shape.x + imageTranslation[0], shape.y + imageTranslation[1]);
                    this.ctx.rotate(shape.angle + imageRotation);
                    // rotate 180deg
                    this.ctx.rotate(Math.PI);
                    // width is determined based on shape size. height is determined based on image aspect ratio
                    try {
                        this.ctx.drawImage(image, -shapeWidth, -shapeHeight, shapeWidth * 2, shapeHeight * 2);
                    }
                    catch (e) {
                        console.error(e);
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
        for (var i = 0; i < texts.length; i++) {
            var text = texts[i];
            this.drawText(text.text, text.x, text.y, text.fontSize, text.color, text.fontFamily, text.align, text.baseline);
        }
    }
}