interface SimuloText {
    x: number;
    y: number;
    /** Measured in radians, angle to rotate the text by */
    angle?: number;
    color: string;
    border?: string | null;
    borderWidth?: number | null;
    borderScaleWithZoom?: boolean;
    zDepth: number;
    text: string;
    fontSize: number;
    fontFamily?: string;
    align?: "left" | "center" | "right";    // Default = start
    baseline?: "alphabetic" | "top" | "middle" | "bottom"; // Default = alphabetic
}

export default SimuloText;