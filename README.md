# ![Simulo](https://cdn.discordapp.com/attachments/930251495688003624/1120527107810934835/joe3.png)

Simulo is a web-based TypeScript 2D physics sandbox and game engine with scripting support and soon multiplayer. It uses Box2D for physics and currently Canvas for rendering, though WebGL support is planned.

## Table of Contents

- [Developer Guide](#developer-guide)
  - [Introduction](#introduction)
  - [Getting Started](#getting-started)
    - [1. Cloning the Repository](#1-cloning-the-repository)
    - [2. Installing Dependencies](#2-installing-dependencies)
    - [3. Building and Running](#3-building-and-running)
  - [Modules](#modules)
    - [Server-side Physics Diagram](#server-side-physics-diagram)
    - [Client-side Physics Multiplayer Diagram](#client-side-physics-multiplayer-diagram)
    - [Client-side Physics Singleplayer Diagram](#client-side-physics-singleplayer-diagram)
  - [File Structure](#file-structure)
  - [FAQ](#faq)
    - [Why is the client and server in the same repo?](#why-is-the-client-and-server-in-the-same-repo)
  - [Contributing](#contributing)
  - [License](#license)
  
# Developer Guide

If you're interested in contributing to Simulo or just curious about how it works, you've come to the right place!
This guide will explain everything, like how to run Simulo, the architecture of Simulo, and much more.

## Introduction

Firstly, when we say "server" in this guide, we mean the host of the Simulo room. When we are talking about the web server, we will explicitly say "web server", so keep that in mind and remember that the host often runs on the client.

Simulo is a TypeScript project which is designed to let both the web server and the client host. As multiplayer support is currently broken, hosting on the web server has not been tested in a while, but even if it doesn't currently work, it should be easy to fix.

The Simulo web server uses Node.js Express, and the client uses a custom game engine (named the Simulo engine or just Simulo) which uses Box2D for physics and Canvas for rendering. No framework is used on the UI to keep things simple, as it's just one page. Soon, a basic Simulo website will be set up, and since it'll just be 2-3 pages, it will most likely not use a framework either, though this is subject to change.

## Getting Started

If you don't have Node.js, NPM and Git installed, install them now. You can find them at https://nodejs.org/en/ and https://git-scm.com/downloads respectively.

### 1. Cloning the Repository

Clone the repository with this command:
```bash
git clone https://github.com/Carroted/Simulo.git
```

Or, if you have GitHub SSH set up:
```bash
git clone git@github.com:Carroted/Simulo
```

### 2. Installing Dependencies

Next, you should install the dependencies. To do this, run this command:
```bash
npm i
```

### 3. Building and Running

Finally, you can build and run Simulo. To do this, run this command:
```bash
npm run build && npm start
```

If you want to start it later without rebuilding, you can just run this command:
```bash
npm start
```
The opposite is true for building without starting.

Building will take between 10 and 40 seconds, so try not to get frustrated if it takes a while.

## Modules

In Simulo, we have **3 kinds of modules**. These are **client modules**, **server modules** and **shared modules**.

Client modules are only run on the client, server modules are only run on the server, and shared modules are run on both the client and the server. This is useful for things like physics, which need to be run on both the client and the server. (remember again, by server we mean host, not web server)

Here's a handy table of most modules:

| Name                     | Description                                                                             |
|--------------------------|-----------------------------------------------------------------------------------------|
| [`SimuloPhysicsServer`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloPhysicsServer.ts)    | Wrapper of Box2D ([liquidfun-wasm](https://github.com/Birch-san/box2d-wasm/tree/liquidfun)) which makes it way easier to use                                              |
| [`SimuloNetworkServer`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloNetworkServer.ts)    | WebRTC and WebSocket server   |
| [`SimuloNetworkClient`](https://github.com/Carroted/Simulo/blob/main/client/src/SimuloNetworkClient/)    | Receives data from `NetworkServer`, which is sometimes the client (loopback)              |
| [`SimuloViewer`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloViewer/)           | Displays the world, plays sounds and captures input from mouse, controller and keyboard |
| [`SimuloClientController`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloClientController/) | Controls the client, gets input from Viewer and sends it to `NetworkClient`               |
| [`SimuloServerController`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloServerController.ts) | Hosts the room and manages the physics, tools and more      |
| [`SimuloLocalClient`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloLocalClient.ts)    | Works identically to `NetworkClient`, but instead of getting data from network, it gets it directly from `ServerController` to avoid host sending data through network back to itself              |

### Server-side Physics Diagram

Here's a handy diagram to help you understand how the server-side physics works:

![The PhysicsServer is connected to the ServerController which is connected to the NetworkServer which splits up between WebRTC and WebSocket which link together to a NetworkClient that makes a 3 way group with Viewer and ClientController](https://cdn.discordapp.com/attachments/1101319239052300378/1101319790313881700/serverside.png)

Here we have 3 modules running on the server:
- [`SimuloPhysicsServer`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloPhysicsServer.ts) - Wrapper of Box2D ([liquidfun-wasm](https://github.com/Birch-san/box2d-wasm/tree/liquidfun)) which makes it way easier to use
- [`SimuloServerController`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloServerController.ts) - Hosts the room and manages the physics, tools and more
- [`SimuloNetworkServer`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloNetworkServer.ts) - Currently broken, but hosts WebRTC and WebSocket

We also have 3 modules running on the client:
- [`SimuloNetworkClient`](https://github.com/Carroted/Simulo/blob/main/client/src/SimuloNetworkClient/) - Currently broken, but connects to the server via WebRTC and WebSocket
- [`SimuloClientController`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloClientController/) - Manages UI, tools, `NetworkClient` and `Viewer`
- [`SimuloViewer`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloViewer/) - Renders `SimuloShape` data and sets up panning and zooming (will be moved to `SimuloClientController` soon)

### Client-side Physics Multiplayer Diagram

Here we have a peer as the host, with another peer connected to it:

![Exactly the same as the server-side physics diagram, but with 3 things attached to ServerController: SimuloLocalClient, SimuloViewer and SimuloClientController](https://cdn.discordapp.com/attachments/1101319239052300378/1101319903635583067/clientside_multiplayer.png)

You'll notice it's almost the same, except for the 3 new nodes attached to `SimuloServerController`:
- [`SimuloLocalClient`](https://github.com/Carroted/Simulo/blob/main/shared/src/SimuloLocalClient.ts) - Loopback which connects directly to `SimuloServerController` and is used for the host
- [`SimuloViewer`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloViewer/) - Renders `SimuloShape` data and sets up panning and zooming (will be moved to `SimuloClientController` soon)
- [`SimuloClientController`](https://github.com/Carroted/Simulo/tree/main/client/src/SimuloClientController/) - Manages UI, tools, `NetworkClient` and `Viewer`

### Client-side Physics Singleplayer Diagram

Same but singleplayer:

![Same as before but we cut off NetworkServer and everything network-related](https://cdn.discordapp.com/attachments/1101319239052300378/1101319988998062120/clientside_singleplayer.png)

We just cut off `SimuloNetworkServer` and everything connected to it.

## File Structure

Here's a handy diagram of the file structure:

- 📂 **client** - Assets and source for the client all in one
   - 📂 **assets**
      - 📂 **fonts**
      - 📂 **sounds**
      - 📂 **textures**
   - 📂 **icons** - Custom icons and overrides of the [MDI icons](https://pictogrammers.com/library/mdi/) we serve at /icons
   - 📂 **src** - TypeScript source for client-only scripts
   - 📄 **index.html**
   - 📄 **index.css**
   - 📄 **manifest.json**
   - 📄 **sw.js**
   - 📄 **tsconfig.json** - Config for the TypeScript compiler
- 📂 **media** - Icons and logos
- 📂 **server** - Source for the web server
   - 📂 **src** - TypeScript source for server-only scripts
   - 📄 **tsconfig.json** - Config for the TypeScript compiler
- 📂 **shared** - Source for scripts shared between the client and server
   - 📂 **src** - TypeScript source for shared scripts
   - 📄 **themes.ts** - Previously `themes.json` but turned into a module to use `import` for it
   - 📄 **tsconfig.json** - Config for the TypeScript compiler
- 📄 **assetFloatEqual.js** - May be deleted soon or converted to TypeScript
- 📄 **build.js** - Builds Simulo to `📂 dist`
- 📄 **deploy.js** - If you have write access to the Simulo repo, it will deploy to the `gh-pages` branch
- 📄 **Inkscape Workspace.svg** - Workspace for Inkscape where logos and textures are made
- 📄 **package.json**
- 📄 **README.md** - Look, it's me!
- 📄 **tsedition** - Just something I'm working on for scripting API, ignore it

## FAQ

### Why is the client and server in the same repo?

Since a lot of modules are shared between the client and server, it's easier to have them in the same repo.

## Contributing

To get started, check out the issues at https://github.com/Carroted/Simulo/issues/. If you want to contribute, fork the repo and make a pull request. If you want to make a big change, make an issue first so we can discuss it.

## License

That's a good question.
