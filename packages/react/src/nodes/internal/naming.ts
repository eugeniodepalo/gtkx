/**
 * Converts a camelCase or PascalCase identifier to snake_case.
 *
 * Used at the boundary between the React reconciler (which keeps JSX-style
 * camelCase prop names) and the FFI construction metadata registry (whose
 * keys match the snake_case `ConstructorProperties` shape published by the
 * ts-for-gir-generated `.d.ts` contract).
 *
 * Examples: `"canShrink"` → `"can_shrink"`, `"iconName"` → `"icon_name"`,
 * `"label"` → `"label"` (unchanged for already-snake/lowercase identifiers).
 */
export function camelToSnake(name: string): string {
    return name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}
