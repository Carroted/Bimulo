import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Circle, Polygon, Rectangle, ShapeContentData, ShapeTransformData } from "../SimuloPhysicsServerRapier";

export default class SimuloViewerPIXI {
    coll2gfx: Map<string, PIXI.Graphics>;
    renderer: PIXI.Renderer;
    scene: PIXI.Container;
    viewport: Viewport;

    constructor() {
        // High pixel Ratio make the rendering extremely slow, so we cap it.
        // const pixelRatio = window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1;

        this.coll2gfx = new Map();
        this.renderer = new PIXI.Renderer({
            backgroundAlpha: 0,
            antialias: true,
            // resolution: pixelRatio,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        this.scene = new PIXI.Container();
        // add to document
        document.body.appendChild(this.renderer.view as HTMLCanvasElement);

        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 1000,
            worldHeight: 1000,
            //interaction: this.renderer.plugins.interaction,
            events: this.renderer.events
        });

        this.scene.addChild(this.viewport as any);
        this.viewport.drag().pinch().wheel().decelerate();

        let me = this;

        function onWindowResize() {
            me.renderer.resize(window.innerWidth, window.innerHeight);
        }

        function onContextMenu(event: UIEvent) {
            event.preventDefault();
        }

        document.oncontextmenu = onContextMenu;
        document.body.oncontextmenu = onContextMenu;

        window.addEventListener("resize", onWindowResize, false);
    }

    render(transformData: { [id: string]: ShapeTransformData }, debugRender: Boolean) {
        this.updatePositions(transformData);
        this.renderer.render(this.scene);
    }

    lookAt(pos: { zoom: number; target: { x: number; y: number } }) {
        this.viewport.setZoom(pos.zoom);
        this.viewport.moveCenter(pos.target.x, pos.target.y);
    }

    updatePositions(transformData: { [id: string]: ShapeTransformData }) {
        Object.keys(transformData).forEach((id) => {
            /*let gfx = this.coll2gfx.get(elt.handle);
            let translation = elt.translation();
            let rotation = elt.rotation();

            if (!!gfx) {
                gfx.position.x = translation.x;
                gfx.position.y = -translation.y;
                gfx.rotation = -rotation;
            }*/

            let gfx = this.coll2gfx.get(id);
            let data = transformData[id];
            let position = { x: data.x, y: data.y };
            let angle = data.angle;

            if (!!gfx) {
                gfx.position.x = position.x;
                gfx.position.y = -position.y;
                gfx.rotation = -angle;
            }
        });
    }

    reset() {
        this.coll2gfx.forEach((gfx) => {
            this.viewport.removeChild(gfx);
            gfx.destroy();
        });
        this.coll2gfx = new Map();
    }

    addShape(content: ShapeContentData) {
        let gfx = new PIXI.Graphics();
        switch (content.type) {
            case "rectangle":
                let rectangle = content as Rectangle;
                gfx.scale.x = rectangle.width;
                gfx.scale.y = rectangle.height;
                gfx.beginFill(rectangle.color);
                gfx.drawRect(-1, 1, 2, -2);
                gfx.endFill();
                break;
            case "circle":
                let circle = content as Circle;
                gfx.scale.x = circle.radius;
                gfx.scale.y = circle.radius;
                gfx.beginFill(circle.color);
                gfx.drawCircle(0, 0, 1);
                gfx.endFill();
                break;
            case "polygon":
                let polygon = content as Polygon;
                gfx.beginFill(polygon.color);
                gfx.moveTo(polygon.points[0][0], -polygon.points[0][1]);
                /*                 for (i = 2; i < vertices.length; i += 2) {
                    graphics.lineTo(vertices[i], -vertices[i + 1]);
                } */ // same logic but with our data structure
                for (let i = 1; i < polygon.points.length; i++) {
                    gfx.lineTo(polygon.points[i][0], -polygon.points[i][1]);
                }
                gfx.lineTo(polygon.points[0][0], -polygon.points[0][1]);
                gfx.endFill();
                break;
            default:
                console.error("Unknown shape type: " + content.type);
                break;
        }

        this.coll2gfx.set(content.id, gfx);
        this.viewport.addChild(gfx);
    }
}