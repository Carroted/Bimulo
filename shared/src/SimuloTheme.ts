interface SimuloTheme {
    background: string;
    ground: {
        color: string;
        border: string | null;
        border_width: number | null;
        border_scale_with_zoom: boolean;
    };
    new_objects: {
        color: {
            hue_min: number;
            hue_max: number;
            sat_min: number;
            sat_max: number;
            val_min: number;
            val_max: number;
            alp_min: number;
            alp_max: number;
        };
        border: string | null;
        border_width: number | null;
        border_scale_with_zoom: boolean;
        circle_cake: boolean;
    };
};

export default SimuloTheme;