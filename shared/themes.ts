// This file was originally named themes.json. Treat it similarly to a JSON file, except that it can be imported as a module.

import SimuloTheme from "./src/SimuloTheme";

export default {
  "night": {
    "displayName": "Night",
    "description": "The default theme, also known as Dimulo",
    "background": "linear-gradient(180deg, #0f1130 0%, #553f90 100%)",
    "person": {
      "color": "#99e077",
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false
    },
    "ground": {
      "color": "#a1acfa",
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false
    },
    "newObjects": {
      "color": {
        "hueMin": 0,
        "hueMax": 360,
        "satMin": 0,
        "satMax": 100,
        "valMin": 80,
        "valMax": 100,
        "alpMin": 1,
        "alpMax": 1
      },
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false,
      "circleCake": false,
      "springImage": "assets/textures/spring.png"
    },
    "toolIcons": {
      "drag": null,
      "addRectangle": "assets/textures/add_rectangle.png",
      "addCircle": "assets/textures/add_circle.png",
      "addPerson": "media/icon_square.png",
      "addPolygon": "assets/textures/add_polygon.png",
      "addSpring": "assets/textures/add_spring.png",
      "addAxle": "assets/textures/add_axle.png",
      "addFixedJoint": "assets/textures/add_fixed_joint.png",
      "select": "assets/textures/select.png",
    },
    "systemCursor": false,
    "toolIconSize": 0.5,
    "toolIconOffset": [0.42, 0.55]
  },
  "sunrise": {
    "displayName": "Sunrise",
    "description": "The same palette used in the icon of the app",
    "background": "linear-gradient(180deg, #271e5f 0%, #903f63 100%)",
    "person": {
      "color": "#b1c963",
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false
    },
    "ground": {
      "color": "#a1acfa",
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false
    },
    "newObjects": {
      "color": {
        "hueMin": 0,
        "hueMax": 360,
        "satMin": 0,
        "satMax": 100,
        "valMin": 80,
        "valMax": 100,
        "alpMin": 1,
        "alpMax": 1
      },
      "border": null,
      "borderWidth": null,
      "borderScaleWithZoom": false,
      "circleCake": false,
      "springImage": "assets/textures/spring.png"
    },
    "toolIcons": {
      "drag": null,
      "addRectangle": "assets/textures/add_rectangle.png",
      "addCircle": "assets/textures/add_circle.png",
      "addPerson": "media/icon_square.png",
      "addPolygon": "assets/textures/add_polygon.png",
      "addSpring": "assets/textures/add_spring.png",
      "addAxle": "assets/textures/add_axle.png",
      "addFixedJoint": "assets/textures/add_fixed_joint.png",
      "select": "assets/textures/select.png",
    },
    "systemCursor": false,
    "toolIconSize": 0.5,
    "toolIconOffset": [0.42, 0.55]
  },
  "nostalgia": {
    "displayName": "Nostalgia",
    "description": "A theme that reminds me of the old days",
    "background": "#738cff",
    "person": {
      "color": "#99e077",
      "border": "#111111a0",
      "borderWidth": 1,
      "borderScaleWithZoom": true
    },
    "ground": {
      "color": "#57b00d",
      "border": "#111111a0",
      "borderWidth": 1,
      "borderScaleWithZoom": true
    },
    "newObjects": {
      "color": {
        "hueMin": 0,
        "hueMax": 360,
        "satMin": 0,
        "satMax": 100,
        "valMin": 0,
        "valMax": 100,
        "alpMin": 1,
        "alpMax": 1
      },
      "border": "#111111a0",
      "borderWidth": 1,
      "borderScaleWithZoom": true,
      "circleCake": true,
      "springImage": "assets/textures/spring.png"
    },
    "toolIcons": {
      "drag": "assets/textures/tools/drag.png",
      "addRectangle": "assets/textures/tools/box.png",
      "addCircle": "assets/textures/tools/circle.png",
      "addPerson": "media/icon_square.png",
      "addPolygon": "assets/textures/tools/polygon.png",
      "addSpring": "assets/textures/tools/spring.png",
      "addAxle": "assets/textures/tools/hinge.png",
      "addFixedJoint": "assets/textures/tools/fixjoint.png",
      "select": "assets/textures/tools/move.png",
    },
    "systemCursor": true,
    "toolIconSize": 0.7,
    "toolIconOffset": [0.3, 0.4]
  }
} as { [key: string]: SimuloTheme };
