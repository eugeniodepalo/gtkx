import { useRef } from "react";
import { render } from "./render.js";
import type { RenderHookOptions, RenderHookResult, WrapperComponent } from "./types.js";

async function renderHookWithoutProps<Result>(
    callback: () => Result,
    wrapper: boolean | WrapperComponent,
): Promise<RenderHookResult<Result, undefined>> {
    const resultRef: { current: Result | undefined } = { current: undefined };

    const TestComponent = (): null => {
        const result = callback();
        const ref = useRef(resultRef);
        ref.current.current = result;
        return null;
    };

    const renderResult = await render(<TestComponent />, { wrapper });

    return {
        result: resultRef as { current: Result },
        rerender: async () => {
            await renderResult.rerender(<TestComponent />);
        },
        unmount: renderResult.unmount,
    };
}

async function renderHookWithProps<Result, Props>(
    callback: (props: Props) => Result,
    initialProps: Props,
    wrapper: boolean | WrapperComponent,
): Promise<RenderHookResult<Result, Props>> {
    const resultRef: { current: Result | undefined } = { current: undefined };
    let currentProps: Props = initialProps;

    const TestComponent = ({ props }: { props: Props }): null => {
        const result = callback(props);
        const ref = useRef(resultRef);
        ref.current.current = result;
        return null;
    };

    const renderResult = await render(<TestComponent props={currentProps} />, { wrapper });

    return {
        result: resultRef as { current: Result },
        rerender: async (newProps?: Props) => {
            if (newProps !== undefined) {
                currentProps = newProps;
            }
            await renderResult.rerender(<TestComponent props={currentProps} />);
        },
        unmount: renderResult.unmount,
    };
}

/**
 * Renders a React hook for testing.
 *
 * Creates a test component that executes the hook and provides utilities
 * for accessing the result, re-rendering with new props, and cleanup.
 *
 * When the hook callback takes props, `initialProps` is required at the
 * type level. When it takes none, `options` may be omitted entirely.
 *
 * @param callback - Function that calls the hook and returns its result
 * @param options - Render options including initialProps and wrapper
 * @returns A promise resolving to the hook result and utilities
 *
 * @example
 * ```tsx
 * import { renderHook } from "@gtkx/testing";
 * import { useState } from "react";
 *
 * test("useState hook", async () => {
 *   const { result } = await renderHook(() => useState(0));
 *   expect(result.current[0]).toBe(0);
 * });
 * ```
 *
 * @example
 * ```tsx
 * import { renderHook } from "@gtkx/testing";
 *
 * test("hook with props", async () => {
 *   const { result, rerender } = await renderHook(
 *     ({ multiplier }) => useMultiplier(multiplier),
 *     { initialProps: { multiplier: 2 } }
 *   );
 *
 *   expect(result.current).toBe(2);
 *
 *   await rerender({ multiplier: 3 });
 *   expect(result.current).toBe(3);
 * });
 * ```
 */
export function renderHook<Result>(
    callback: () => Result,
    options?: RenderHookOptions<undefined>,
): Promise<RenderHookResult<Result, undefined>>;
export function renderHook<Result, Props>(
    callback: (props: Props) => Result,
    options: RenderHookOptions<Props>,
): Promise<RenderHookResult<Result, Props>>;
export function renderHook<Result, Props>(
    callback: ((props: Props) => Result) | (() => Result),
    options?: RenderHookOptions<Props>,
): Promise<RenderHookResult<Result, Props> | RenderHookResult<Result, undefined>> {
    const wrapper = options?.wrapper ?? true;
    if (options !== undefined && "initialProps" in options && options.initialProps !== undefined) {
        return renderHookWithProps<Result, Props>(callback, options.initialProps, wrapper);
    }
    return renderHookWithoutProps(callback as () => Result, wrapper);
}
