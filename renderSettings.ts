export interface RenderSettings {
    bloom: boolean;
    autoExposure: boolean;
    fxaa: boolean;
    disableFog: boolean;
    fullbright: boolean;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
    bloom: true,
    autoExposure: true,
    fxaa: true,
    disableFog: false,
    fullbright: false,
};
