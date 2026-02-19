import type { ListItem } from "@gtkx/react";
import { GtkListView, GtkScrolledWindow } from "@gtkx/react";
import { render, tick } from "@gtkx/testing";
import { describe, expect, it } from "vitest";

const ScrollWrapper = ({ children }: { children: React.ReactNode }) => (
    <GtkScrolledWindow minContentHeight={200} minContentWidth={200}>
        {children}
    </GtkScrolledWindow>
);

function App({ items }: { items: ListItem<string>[] }) {
    return (
        <ScrollWrapper>
            <GtkListView items={items} renderItem={() => "Item"} />
        </ScrollWrapper>
    );
}

describe("ListView performance", () => {
    it("filters 10k items to 2 in under 4s", { timeout: 30_000 }, async () => {
        const n = 10_000;
        const items: ListItem<string>[] = Array.from({ length: n }, (_, i) => ({ id: `w-${i}`, value: `w-${i}` }));
        const few = items.slice(0, 2);

        const { rerender } = await render(<App items={items} />);
        await tick();

        const start = performance.now();
        await rerender(<App items={few} />);
        await tick();
        const elapsed = performance.now() - start;

        console.log(`Filter ${n} → ${few.length}: ${elapsed.toFixed(0)}ms`);
        expect(elapsed).toBeLessThan(4000);
    });
});
