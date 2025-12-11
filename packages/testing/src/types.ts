import type * as Gtk from "@gtkx/ffi/gtk";
import type { AccessibleRole } from "@gtkx/ffi/gtk";
import type { ComponentType, ReactNode } from "react";

/**
 * A function that receives the text content and widget, returning true for a match.
 * Matches React Testing Library's function matcher signature.
 */
export type TextMatchFunction = (content: string, widget: Gtk.Widget) => boolean;

/**
 * Flexible text matching: string for exact/partial, RegExp for patterns, or function for custom logic.
 * Matches React Testing Library's TextMatch type.
 */
export type TextMatch = string | RegExp | TextMatchFunction;

/**
 * Options for normalizing text before comparison.
 */
export interface NormalizerOptions {
    /** Whether to trim whitespace from text. Defaults to true. */
    trim?: boolean;
    /** Whether to collapse multiple whitespace into single spaces. Defaults to true. */
    collapseWhitespace?: boolean;
}

/**
 * Options for text matching in queries.
 */
export interface TextMatchOptions {
    /** Whether to match the entire string exactly. Defaults to true. */
    exact?: boolean;
    /**
     * Custom function to normalize text before comparison.
     * Cannot be used with trim/collapseWhitespace options.
     */
    normalizer?: (text: string) => string;
    /** Whether to trim whitespace from text. Defaults to true. */
    trim?: boolean;
    /** Whether to collapse multiple whitespace into single spaces. Defaults to true. */
    collapseWhitespace?: boolean;
    /** Maximum time in milliseconds to wait for a match. */
    timeout?: number;
}

/**
 * Options for querying elements by their accessible role.
 */
export interface ByRoleOptions extends TextMatchOptions {
    /** Filter by the element's accessible name. Supports string, RegExp, or function matcher. */
    name?: TextMatch;
    /** Filter checkboxes/switches by checked state. */
    checked?: boolean;
    /** Filter toggle buttons by pressed state. */
    pressed?: boolean;
    /** Filter selectable items by selected state. */
    selected?: boolean;
    /** Filter expandable elements by expanded state. */
    expanded?: boolean;
    /** Filter headings by their level (1-6). */
    level?: number;
}

/**
 * Options for waitFor and related async utilities.
 */
export interface WaitForOptions {
    /** Maximum time in milliseconds to wait. Defaults to 1000ms. */
    timeout?: number;
    /** Interval in milliseconds between condition checks. Defaults to 50ms. */
    interval?: number;
    /** Custom error handler called when timeout is reached. */
    onTimeout?: (error: Error) => Error;
}

/**
 * Options for the render function.
 */
export interface RenderOptions {
    /**
     * Controls how the rendered element is wrapped.
     * - `true` (default): Wrap in ApplicationWindow
     * - `false`: No wrapping, render element as-is
     * - Component: Use a custom wrapper component
     */
    wrapper?: boolean | ComponentType<{ children: ReactNode }>;
}

/**
 * Query methods bound to a specific container. All queries return promises
 * that resolve when a matching element is found or reject on timeout.
 */
export interface BoundQueries {
    /** Find a single element by its accessible role. */
    findByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its associated label text. */
    findByLabelText: (text: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its text content. */
    findByText: (text: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    /** Find a single element by its test ID. */
    findByTestId: (testId: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget>;

    /** Find all elements matching an accessible role. */
    findAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching label text. */
    findAllByLabelText: (text: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching text content. */
    findAllByText: (text: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    /** Find all elements with matching test ID. */
    findAllByTestId: (testId: TextMatch, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
}

/**
 * The result returned by the render function. Includes query methods
 * and utilities for interacting with the rendered component.
 */
export interface RenderResult extends BoundQueries {
    /** The GTK Application instance containing the rendered component. */
    container: Gtk.Application;

    /** Unmount the rendered component and clean up resources. */
    unmount: () => Promise<void>;
    /** Re-render with a new element, preserving state where possible. */
    rerender: (element: ReactNode) => Promise<void>;
    /** Print the current widget tree to the console for debugging. */
    debug: () => void;
}
