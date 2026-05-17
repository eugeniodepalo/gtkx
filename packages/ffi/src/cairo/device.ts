import type { DeviceType, Status } from "../generated/cairo/cairo.js";
import { Device } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { DEVICE_T, INT_TYPE, LIB } from "./common.js";

const { fn } = t;

declare module "../generated/cairo/cairo.js" {
    interface Device {
        status(): Status;
        finish(): void;
        flush(): void;
        getType(): DeviceType;
        acquire(): Status;
        release(): void;
    }
}

const cairo_device_status = fn(LIB, "cairo_device_status", [{ type: DEVICE_T }], INT_TYPE);
Device.prototype.status = function (): Status {
    return cairo_device_status(getHandle(this)) as Status;
};

const cairo_device_finish = fn(LIB, "cairo_device_finish", [{ type: DEVICE_T }], t.void);
Device.prototype.finish = function (): void {
    cairo_device_finish(getHandle(this));
};

const cairo_device_flush = fn(LIB, "cairo_device_flush", [{ type: DEVICE_T }], t.void);
Device.prototype.flush = function (): void {
    cairo_device_flush(getHandle(this));
};

const cairo_device_get_type = fn(LIB, "cairo_device_get_type", [{ type: DEVICE_T }], INT_TYPE);
Device.prototype.getType = function (): DeviceType {
    return cairo_device_get_type(getHandle(this)) as DeviceType;
};

const cairo_device_acquire = fn(LIB, "cairo_device_acquire", [{ type: DEVICE_T }], INT_TYPE);
Device.prototype.acquire = function (): Status {
    return cairo_device_acquire(getHandle(this)) as Status;
};

const cairo_device_release = fn(LIB, "cairo_device_release", [{ type: DEVICE_T }], t.void);
Device.prototype.release = function (): void {
    cairo_device_release(getHandle(this));
};
