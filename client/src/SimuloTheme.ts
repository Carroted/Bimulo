interface SimuloTheme {
    displayName: string;
    author: string;
    description: string;
    background: string;
    ground: {
        color: string;
        border: string | null;
        borderWidth: number | null;
        borderScaleWithZoom: boolean;
    };
    newObjects: {
        color: {
            hueMin: number;
            hueMax: number;
            satMin: number;
            satMax: number;
            valMin: number;
            valMax: number;
            alpMin: number;
            alpMax: number;
        };
        border: string | null;
        borderWidth: number | null;
        borderScaleWithZoom: boolean;
        circleCake: boolean;
        springImage: string | null;
        axleImage: string | null;
        boltImage: string | null;
    };
    toolIcons: { [key: string]: string | null };
    systemCursor: boolean;
    toolIconSize: number
    toolIconOffset: [x: number, y: number];
    person: {
        color: string;
        border: string | null;
        borderWidth: number | null;
        borderScaleWithZoom: boolean;
    }
};

export default SimuloTheme;