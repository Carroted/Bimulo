interface SimuloObjectData extends Box2D.b2BodyUserData {
    id: number | null; // TODO: make this not nullable once its all setup
    /**
     * Path to a sound file for collisions. Relative to /assets/sounds/
    */
    sound: string | null;
    color: string;
    border: string | null;
    border_width: number | null;
    border_scale_with_zoom: boolean;
    circle_cake?: boolean;
    image: string | null;
}

export default SimuloObjectData;