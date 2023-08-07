// WebGL edition of simuloviewer, super stable and way more readable code

import SimuloShape, { SimuloCircle, SimuloEdge, SimuloPolygon, SimuloRectangle } from '../../../shared/src/SimuloShape';

interface WebGLShaderUniforms {
    resolution: WebGLUniformLocation;
    translation: WebGLUniformLocation;
    rotation: WebGLUniformLocation;
    scale: WebGLUniformLocation;
    zoom: WebGLUniformLocation;
    zDepth: WebGLUniformLocation;
    borderWidth: WebGLUniformLocation;
    borderScaleWithZoom: WebGLUniformLocation;
    borderColor: WebGLUniformLocation;
    // Add other uniforms as needed
}

interface WebGLShaderAttributes {
    position: number;
    color: number;
    texcoord: number;
}

// super minimal simuloviewer that only has draw function
class SimuloViewer {
    shapes: SimuloShape[] = [];
    canvas: HTMLCanvasElement;

    // webgl stuff
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    buffer: WebGLBuffer;
    texture: WebGLTexture;
    uniforms: WebGLShaderUniforms;
    attributes: WebGLShaderAttributes;

    // camera stuff
    translation: [number, number] = [0, 0];
    rotation: number = 0;
    scale: [number, number] = [1, 1];
    zoom: number = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') as WebGLRenderingContext;
        this.program = this.createProgram();
        this.buffer = this.createBuffer();
        this.texture = this.createTexture();
        this.uniforms = {
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution') as WebGLUniformLocation,
            translation: this.gl.getUniformLocation(this.program, 'u_translation') as WebGLUniformLocation,
            rotation: this.gl.getUniformLocation(this.program, 'u_rotation') as WebGLUniformLocation,
            scale: this.gl.getUniformLocation(this.program, 'u_scale') as WebGLUniformLocation,
            zoom: this.gl.getUniformLocation(this.program, 'u_zoom') as WebGLUniformLocation,
            zDepth: this.gl.getUniformLocation(this.program, 'u_zDepth') as WebGLUniformLocation,
            borderWidth: this.gl.getUniformLocation(this.program, 'u_borderWidth') as WebGLUniformLocation,
            borderScaleWithZoom: this.gl.getUniformLocation(this.program, 'u_borderScaleWithZoom') as WebGLUniformLocation,
            borderColor: this.gl.getUniformLocation(this.program, 'u_borderColor') as WebGLUniformLocation,
        };
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            color: this.gl.getAttribLocation(this.program, 'a_color'),
            texcoord: this.gl.getAttribLocation(this.program, 'a_texcoord'),
        };
    }

    createProgram() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            attribute vec2 a_texcoord;

            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform float u_rotation;
            uniform vec2 u_scale;
            uniform float u_zoom;
            uniform float u_zDepth;
            uniform float u_borderWidth;
            uniform bool u_borderScaleWithZoom;
            uniform vec4 u_borderColor;

            varying vec4 v_color;
            varying vec2 v_texcoord;

            vec2 rotate(vec2 position, float angle) {
                float s = sin(angle);
                float c = cos(angle);
                mat2 rotationMatrix = mat2(c, -s, s, c);
                return rotationMatrix * position;
            }

            void main() {
                vec2 scaledPosition = a_position * u_scale;
                vec2 rotatedPosition = rotate(scaledPosition, u_rotation);
                vec2 position = rotatedPosition + u_translation;
                vec2 zeroToOne = position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), u_zDepth, 1);

                v_color = a_color;
                v_texcoord = a_texcoord;
            }
        `;
        const fragmentShaderSource = `
            precision mediump float;

            uniform sampler2D u_image;

            varying vec4 v_color;
            varying vec2 v_texcoord;

            void main() {
                gl_FragColor = v_color * texture2D(u_image, v_texcoord);
            }
        `;
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = this.createProgramFromShaders(vertexShader, fragmentShader);
        this.gl.useProgram(program);
        return program;
    }

    createShader(type: number, source: string) {
        const shader = this.gl.createShader(type) as WebGLShader;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    createProgramFromShaders(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        const program = this.gl.createProgram() as WebGLProgram;
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(program));
        }
        return program;
    }

    createBuffer() {
        const buffer = this.gl.createBuffer() as WebGLBuffer;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        return buffer;
    }

    createTexture() {
        const texture = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255])
        );
        return texture;
    }

    setUniform(name: string, value: any) {
        const uniform = (this.uniforms as unknown as { [key: string]: WebGLUniformLocation })[name];
        if (typeof value === 'number') {
            this.gl.uniform1f(uniform, value);
        } else if (value instanceof Array) {
            if (value.length === 2) {
                this.gl.uniform2fv(uniform, value);
            } else if (value.length === 4) {
                this.gl.uniform4fv(uniform, value);
            }
        } else if (typeof value === 'boolean') {
            this.gl.uniform1i(uniform, value ? 1 : 0);
        }
    }

    setAttribute(name: string, value: any) {
        const attribute = (this.attributes as unknown as { [key: string]: number })[name];
        if (value instanceof Array) {
            if (value.length === 2) {
                this.gl.vertexAttrib2fv(attribute, value);
            } else if (value.length === 4) {
                this.gl.vertexAttrib4fv(attribute, value);
            }
        }
    }

    setTexture(image: HTMLImageElement) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    }

    setVertices(vertices: number[]) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    }

    setIndices(indices: number[]) {
        const buffer = this.createBuffer();
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        return buffer;
    }

    setColors(colors: number[]) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Uint8Array(colors), this.gl.STATIC_DRAW);
    }

    setTexcoords(texcoords: number[]) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texcoords), this.gl.STATIC_DRAW);
    }

    drawIndices(indices: number[], count: number) {
        this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, 0);
    }

    // now draw func for SimuloShapes (this.shapes)
    draw() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // ok so now we set the the the the the the the triangles, first we check .type to see if rectangle or circle or polygon. if its polygon, it comes with free triangles on the .decomposedParts

        // first some universal setup based on .color and whatever
        this.shapes.forEach(shape => {
            this.setUniform('u_color', shape.color);
            this.setUniform('u_borderColor', shape.border);
            this.setUniform('u_borderWidth', shape.borderWidth);
            this.setUniform('u_zDepth', shape.zDepth);

            // now we check if its a rectangle or circle or polygon
            if (shape.type === 'rectangle') {
                // make 2 rectangular triangles that make up the rectangle
                let rectangle = shape as SimuloRectangle;
                // one liner
                this.setVertices([
                    rectangle.x,
                    rectangle.y,
                    rectangle.x + rectangle.width,
                    rectangle.y, rectangle.x,
                    rectangle.y + rectangle.height,
                    rectangle.x + rectangle.width,
                    rectangle.y + rectangle.height
                ]);
                this.drawIndices([0, 1, 2, 2, 1, 3], 6);
            } else if (shape.type === 'circle') {
                // easy peasy, lets just make a circle with x triangles
                let triCount = 128;
                let circle = shape as SimuloCircle;
                let vertices = [];
                let indices = [];
                for (let i = 0; i < triCount; i++) {
                    let angle = i / triCount * Math.PI * 2;
                    vertices.push(
                        circle.x + Math.cos(angle) * circle.radius!,
                        circle.y + Math.sin(angle) * circle.radius!
                    );
                    indices.push(i);
                }
                this.setVertices(vertices);
                this.drawIndices(indices, triCount);
            } else if (shape.type === 'polygon') {
                // easiest one, we already have .decomposedParts
                let polygon = shape as SimuloPolygon;
                let parts = polygon.decomposedParts as [x: number, y: number][][]; // array of triangles of vertices
                let vertices: number[] = [];
                let indices: number[] = [];
                parts.forEach(part => {
                    part.forEach(vertex => {
                        vertices.push(vertex[0], vertex[1]);
                        indices.push(indices.length);
                    });
                });
                this.setVertices(vertices);
                this.drawIndices(indices, indices.length);
            }
        });
    }

}

export default SimuloViewer;