import type * as Gtk from "@gtkx/ffi/gtk";
import * as queries from "./queries.js";
import type { Container } from "./traversal.js";
import type { BoundQueries, ByRoleOptions, TextMatch, TextMatchOptions } from "./types.js";

type ContainerOrGetter = Container | (() => Container);

const resolveContainer = (containerOrGetter: ContainerOrGetter): Container =>
    typeof containerOrGetter === "function" ? containerOrGetter() : containerOrGetter;

/**
 * Binds all query functions to a container.
 *
 * @param containerOrGetter - The container to bind queries to, or a function that returns it
 * @returns Object with all query methods bound to the container
 *
 * @internal
 */
export const bindQueries = (containerOrGetter: ContainerOrGetter): BoundQueries => ({
    queryByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) =>
        queries.queryByRole(resolveContainer(containerOrGetter), role, options),
    queryByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.queryByLabelText(resolveContainer(containerOrGetter), text, options),
    queryByText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.queryByText(resolveContainer(containerOrGetter), text, options),
    queryByName: (name: TextMatch, options?: TextMatchOptions) =>
        queries.queryByName(resolveContainer(containerOrGetter), name, options),
    queryAllByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) =>
        queries.queryAllByRole(resolveContainer(containerOrGetter), role, options),
    queryAllByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.queryAllByLabelText(resolveContainer(containerOrGetter), text, options),
    queryAllByText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.queryAllByText(resolveContainer(containerOrGetter), text, options),
    queryAllByName: (name: TextMatch, options?: TextMatchOptions) =>
        queries.queryAllByName(resolveContainer(containerOrGetter), name, options),
    findByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) =>
        queries.findByRole(resolveContainer(containerOrGetter), role, options),
    findByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findByLabelText(resolveContainer(containerOrGetter), text, options),
    findByText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findByText(resolveContainer(containerOrGetter), text, options),
    findByName: (name: TextMatch, options?: TextMatchOptions) =>
        queries.findByName(resolveContainer(containerOrGetter), name, options),
    findAllByRole: (role: Gtk.AccessibleRole, options?: ByRoleOptions) =>
        queries.findAllByRole(resolveContainer(containerOrGetter), role, options),
    findAllByLabelText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByLabelText(resolveContainer(containerOrGetter), text, options),
    findAllByText: (text: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByText(resolveContainer(containerOrGetter), text, options),
    findAllByName: (name: TextMatch, options?: TextMatchOptions) =>
        queries.findAllByName(resolveContainer(containerOrGetter), name, options),
});
