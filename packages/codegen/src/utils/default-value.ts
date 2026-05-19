/**
 * Default Value Utilities
 *
 * Collects properties that declare default values from a class and its
 * implemented interfaces.
 */

import type { GirClass, GirProperty, GirRepository } from "../gir/index.js";

/**
 * Collects all properties with default values from a class and its implemented interfaces.
 *
 * @param cls - The class to analyze
 * @param repo - The GIR repository for interface resolution
 * @returns Map of property names to their GirProperty objects
 */
export function collectPropertiesWithDefaults(cls: GirClass, repo: GirRepository): Map<string, GirProperty> {
    const defaults = new Map<string, GirProperty>();

    for (const prop of cls.getAllProperties()) {
        if (prop.defaultValue) {
            defaults.set(prop.name, prop);
        }
    }

    for (const ifaceQn of cls.getAllImplementedInterfaces()) {
        const iface = repo.resolveInterface(ifaceQn);
        if (iface) {
            for (const prop of iface.properties) {
                if (prop.defaultValue && !defaults.has(prop.name)) {
                    defaults.set(prop.name, prop);
                }
            }
        }
    }

    return defaults;
}
