/**
 * Splits a dot-separated qualified name into its namespace and name components.
 *
 * @param qn - A qualified name in the format "Namespace.Name"
 * @returns An object with the namespace and name parts
 */
export function splitQualifiedName(qn: string): { namespace: string; name: string } {
    const dot = qn.indexOf(".");
    return { namespace: qn.slice(0, dot), name: qn.slice(dot + 1) };
}
