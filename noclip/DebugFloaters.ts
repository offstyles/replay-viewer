// @ts-nocheck
// Stub of noclip's DebugFloaters: a decorator-driven UI for tweaking class
// properties at runtime. Source engine code uses @dfShow / @dfRange to expose
// values; we never wire up the floating UI, so the decorators are no-ops.
// This replaces a file that depends on `reflect-metadata` (~70KB) which we
// don't want in the bundle.

export function dfShow(): PropertyDecorator {
    return () => {};
}

export function dfRange(_min?: number, _max?: number, _step?: number): PropertyDecorator {
    return () => {};
}

export function dfLabel(_label: string): PropertyDecorator {
    return () => {};
}

export function dfHide(): PropertyDecorator {
    return () => {};
}

// Required for type references downstream — a no-op.
export class FloatingPanel {
    public elem: HTMLElement = document.createElement("div");
}
