export type AntialiasingSetting = 'none' | 'fxaa' | 'msaa4';

export interface RenderSettings {
    bloom: boolean;
    autoExposure: boolean;
    antialiasing: AntialiasingSetting;
    disableFog: boolean;
    fullbright: boolean;
    showZones: boolean;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
    bloom: true,
    autoExposure: true,
    antialiasing: 'msaa4',
    disableFog: false,
    fullbright: false,
    showZones: true,
};
