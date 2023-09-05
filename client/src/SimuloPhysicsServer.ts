/** Universal interface for all physics servers in Simulo.
 * 
 * By server, we don't mean a web server, but just a class that handles physics. */
export default interface SimuloPhysicsServer {
    /** make the world do simulate one step */
    step(delta: number): void;

    /** adds a polygon to the world */
    addPolygon(
        vertices: [x: number, y: number][],
        position: [x: number, y: number],
        rotation: number,
        density: number,
        friction: number,
        restitution: number,
        // general data to be stored with the shape for rendering and stuff
        // examples: border, image, color, etc
        data: { [key: string]: any },
        // aka "glued to background"
        isStatic: boolean,
    ): void;

    // created SimuloPhysicsServerRapier folder, gonna go there

    save(): any; // serialize in any way the engine can, for use with load
    load(data: any): void; // deserialize from save() format

    saveSimulo(): string;
    loadSimulo(data: string): void;
    constructor(): void;

    // i have read https://rapier.rs/docs/user_guides/bevy_plugin/common_mistakes#the-simulation-panics
    // not really much to take from it except:
    // - dont forgtger --releasee!11
    // - dnt setmass 0!11
}
