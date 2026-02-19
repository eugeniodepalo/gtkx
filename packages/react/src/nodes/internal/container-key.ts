let nextKey = 0;

export function getNextContainerKey(): string {
    return String(nextKey++);
}
