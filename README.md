# Simulo

Simulo is a web-based TypeScript 2D physics sandbox and game engine with scripting support and soon multiplayer. It uses Box2D for physics and currently Canvas for rendering, though WebGL support is planned.

# Developer Guide

If you're interested in contributing to Simulo or just curious about how it works, you've come to the right place!
This guide will explain everything, like how to run Simulo, the architecture of Simulo, and much more.

## Table of Contents

- [Simulo](#simulo)
- [Developer Guide](#developer-guide)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Getting Started](#getting-started)

## Introduction

Firstly, when we say "server" in this guide, we mean the host of the Simulo room. When we are talking about the web server, we will explicitly say "web server", so keep that in mind and remember that the host often runs on the client.

Simulo is a TypeScript project which is designed to let both the web server and the client host. As multiplayer support is currently broken, hosting on the web server has not been tested in a while, but even if it doesn't currently work, it should be easy to fix.

The Simulo web server uses Node.js Express, and the client uses a custom game engine (named the Simulo engine or just Simulo) which uses Box2D for physics and Canvas for rendering. No framework is used on the UI to keep things simple, as it's just one page. Soon, a basic Simulo website will be set up, and since it'll just be 2-3 pages, it will most likely not use a framework either, though this is subject to change.

## Getting Started

If you don't have Node.js and NPM installed, install them now. You can find them [here](https://nodejs.org/en/).