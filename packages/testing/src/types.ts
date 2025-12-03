import type * as Gtk from "@gtkx/ffi/gtk";
import type { AccessibleRole } from "@gtkx/ffi/gtk";
import type { ComponentType, ReactNode } from "react";

export interface TextMatchOptions {
    exact?: boolean;
    normalizer?: (text: string) => string;
}

export interface ByRoleOptions extends TextMatchOptions {
    name?: string | RegExp;
    checked?: boolean;
    pressed?: boolean;
    selected?: boolean;
    expanded?: boolean;
    level?: number;
}

export interface WaitForOptions {
    timeout?: number;
    interval?: number;
    onTimeout?: (error: Error) => Error;
}

export interface RenderOptions {
    wrapper?: ComponentType<{ children: ReactNode }>;
}

export interface RenderResult {
    container: Gtk.Application;

    getByRole: (role: AccessibleRole, options?: ByRoleOptions) => Gtk.Widget;
    getByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget;
    getByText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget;
    getByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Gtk.Widget;

    queryByRole: (role: AccessibleRole, options?: ByRoleOptions) => Gtk.Widget | null;
    queryByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget | null;
    queryByText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget | null;
    queryByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Gtk.Widget | null;

    getAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Gtk.Widget[];
    getAllByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];
    getAllByText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];
    getAllByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];

    queryAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Gtk.Widget[];
    queryAllByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];
    queryAllByText: (text: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];
    queryAllByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Gtk.Widget[];

    findByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget>;
    findByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    findByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;
    findByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget>;

    findAllByRole: (role: AccessibleRole, options?: ByRoleOptions) => Promise<Gtk.Widget[]>;
    findAllByLabelText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    findAllByText: (text: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;
    findAllByTestId: (testId: string | RegExp, options?: TextMatchOptions) => Promise<Gtk.Widget[]>;

    unmount: () => void;
    rerender: (element: ReactNode) => void;
    debug: () => void;
}
