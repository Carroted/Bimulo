// SimuloRoom class has PhysicsServer, NetworkServer and ServerController
import SimuloPhysicsServer from "./SimuloPhysicsServer.js";
// import SimuloNetworkServer from "./SimuloNetworkServer"; // doesnt exist yet lmao i just dont want IDE errors
// SimuloRoom is NOT a saved scene, it's an active room that is created when a player loads a scene
export default class SimuloRoom {
    // public networkServer: SimuloNetworkServer;
    // public controller: SimuloServerController;
    //constructor(scene: SimuloScene);
    constructor(theme) {
        this.previousStep = null;
        this.physicsServer = new SimuloPhysicsServer(theme /* ? theme : scene.theme */);
        // this.networkServer = new SimuloNetworkServer();
        // this.controller = new ServerController();
    }
}
//# sourceMappingURL=SimuloRoom.js.map