export type TransformProperty = "x" | "y" | "scale" | "scaleX" | "scaleY" | "rotate";

type TransformValues = {
    x: number;
    y: number;
    scale: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
};

const DEFAULT_VALUES: TransformValues = {
    x: 0,
    y: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
};

export class TransformState {
    private values: TransformValues = { ...DEFAULT_VALUES };
    private onChangeCallback: (() => void) | null = null;

    constructor(onChange?: () => void) {
        this.onChangeCallback = onChange ?? null;
    }

    get(property: TransformProperty): number {
        return this.values[property];
    }

    set(property: TransformProperty, value: number): void {
        if (this.values[property] !== value) {
            this.values[property] = value;
            this.onChangeCallback?.();
        }
    }

    isDefault(): boolean {
        return (
            this.values.x === 0 &&
            this.values.y === 0 &&
            this.values.scale === 1 &&
            this.values.scaleX === 1 &&
            this.values.scaleY === 1 &&
            this.values.rotate === 0
        );
    }

    toCss(): string {
        const transforms: string[] = [];

        if (this.values.x !== 0 || this.values.y !== 0) {
            transforms.push(`translate(${this.values.x}px, ${this.values.y}px)`);
        }

        const hasUniformScale = this.values.scale !== 1;
        const hasAxisScale = this.values.scaleX !== 1 || this.values.scaleY !== 1;

        if (hasUniformScale) {
            transforms.push(`scale(${this.values.scale})`);
        } else if (hasAxisScale) {
            transforms.push(`scale(${this.values.scaleX}, ${this.values.scaleY})`);
        }

        if (this.values.rotate !== 0) {
            transforms.push(`rotate(${this.values.rotate}deg)`);
        }

        return transforms.length > 0 ? transforms.join(" ") : "none";
    }

    reset(): void {
        const wasDefault = this.isDefault();
        this.values = { ...DEFAULT_VALUES };
        if (!wasDefault) {
            this.onChangeCallback?.();
        }
    }
}
