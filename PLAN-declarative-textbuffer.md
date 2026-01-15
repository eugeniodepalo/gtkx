# Declarative TextBuffer Implementation Plan

## Overview

Convert TextBuffer handling from offset-based ranges to fully declarative JSX where text content is embedded within the structure itself.

**Current approach:**
```tsx
<x.TextBuffer text="Hello bold world">
    <x.TextTag id="bold" weight={Pango.Weight.BOLD} start={6} end={10} />
</x.TextBuffer>
```

**New declarative approach:**
```tsx
<x.TextBuffer>
    Hello <x.TextTag id="bold" weight={Pango.Weight.BOLD}>bold</x.TextTag> world
</x.TextBuffer>
```

## Architecture

### Host Context for Text Detection

The reconciler uses `HostContext` to detect when we're inside a TextBuffer. Text children inside TextBuffer become `TextSegmentNode` instead of `GtkLabel`.

```typescript
type HostContext = {
    insideTextBuffer?: boolean;
};
```

### Node Types

| Node | Purpose |
|------|---------|
| `TextBufferNode` | Container that manages GTK TextBuffer, coordinates children |
| `TextTagNode` | Applies styling to its text children |
| `TextSegmentNode` | Represents plain text content |
| `TextAnchorNode` | Embeds widgets at current position |

### Position Tracking

Each node tracks its `bufferOffset` - the character position where it starts in the buffer. When children are added/removed/modified, offsets are updated incrementally.

### Incremental Buffer Updates

Instead of rebuilding the entire buffer on changes:
- `appendChild`: Insert text at end, record offset
- `insertBefore`: Insert text at position, shift subsequent offsets
- `removeChild`: Delete text range, shift subsequent offsets back
- Text change: Delete old range, insert new text, adjust sibling offsets

## Implementation Details

### 1. Host Config Changes (`host-config.ts`)

```typescript
type HostContext = {
    insideTextBuffer?: boolean;
};

// In createHostConfig():
getChildHostContext: (parentHostContext, type) => {
    if (type === "TextBuffer" || type === "TextTag") {
        return { insideTextBuffer: true };
    }
    if (parentHostContext.insideTextBuffer) {
        return {}; // Exit text context for widgets (e.g., inside TextAnchor)
    }
    return parentHostContext;
},

createTextInstance: (text, rootContainer, hostContext) => {
    if (hostContext.insideTextBuffer) {
        const props = { text };
        const node = createNode("TextSegment", props, undefined, rootContainer);
        node.updateProps(null, props);
        return node;
    }
    const props = { label: text };
    const node = createNode("GtkLabel", props, undefined, rootContainer);
    node.updateProps(null, props);
    return node;
},

commitTextUpdate: (textInstance, oldText, newText) => {
    if (textInstance.typeName === "TextSegment") {
        textInstance.updateProps({ text: oldText }, { text: newText });
    } else {
        textInstance.updateProps({ label: oldText }, { label: newText });
    }
},
```

### 2. TextSegmentNode (`nodes/text-segment.ts`)

```typescript
export type TextSegmentProps = {
    text: string;
};

export interface TextContentParent {
    onChildInserted(child: TextContentChild, index: number): void;
    onChildRemoved(child: TextContentChild, index: number): void;
    onChildTextChanged(child: TextSegmentNode, oldLength: number, newLength: number): void;
}

export type TextContentChild = TextSegmentNode | TextTagNode | TextAnchorNode;

export class TextSegmentNode extends VirtualNode<TextSegmentProps> {
    public static override priority = 1;

    private parent?: TextContentParent;
    public bufferOffset = 0;

    public static override matches(type: string): boolean {
        return type === "TextSegment";
    }

    public setParent(parent: TextContentParent): void {
        this.parent = parent;
    }

    public getText(): string {
        return this.props.text;
    }

    public getLength(): number {
        return this.props.text.length;
    }

    public override updateProps(oldProps: TextSegmentProps | null, newProps: TextSegmentProps): void {
        const oldText = oldProps?.text ?? "";
        const newText = newProps.text;

        super.updateProps(oldProps, newProps);

        if (oldText !== newText && this.parent) {
            this.parent.onChildTextChanged(this, oldText.length, newText.length);
        }
    }
}
```

### 3. TextTagNode (`nodes/text-tag.ts`)

Key changes:
- Implements `TextContentParent` interface
- Stores `children: TextContentChild[]` array
- Tracks `bufferOffset` for position in buffer
- `getText()` and `getLength()` aggregate from children
- `appendChild`/`removeChild`/`insertBefore` manage children and propagate changes
- `applyTagToRange()` uses `bufferOffset` and `getLength()` for range
- Propagates child changes to parent via `TextContentParent` interface

### 4. TextBufferNode (`nodes/text-buffer.ts`)

Key changes:
- Implements `TextContentParent` interface
- Removes `text` prop (no longer needed)
- `appendChild`: Insert text at offset, set child's `bufferOffset`
- `removeChild`: Delete text range, update sibling offsets
- `insertBefore`: Insert at position, shift subsequent offsets
- `onChildTextChanged`: Delete old text, insert new text, update offsets
- Uses `buffer.insert()` and `buffer.delete()` for incremental updates

### 5. TextAnchorNode (`nodes/text-anchor.ts`)

Key changes:
- `getLength()` returns 1 (placeholder character)
- `getText()` returns `"\uFFFC"` (object replacement character)
- `bufferOffset` tracks position
- Creates anchor at `bufferOffset` position
- Widget child attached to anchor

## Usage Examples

```tsx
// Simple styled text
<GtkTextView>
    <x.TextBuffer>
        Hello <x.TextTag id="bold" weight={Pango.Weight.BOLD}>world</x.TextTag>!
    </x.TextBuffer>
</GtkTextView>

// Nested tags
<GtkTextView>
    <x.TextBuffer>
        Normal <x.TextTag id="bold" weight={Pango.Weight.BOLD}>
            bold <x.TextTag id="italic" style={Pango.Style.ITALIC}>
                bold-italic
            </x.TextTag> bold
        </x.TextTag> normal
    </x.TextBuffer>
</GtkTextView>

// Embedded widgets
<GtkTextView>
    <x.TextBuffer>
        Click here: <x.TextAnchor>
            <GtkButton label="Click me" onClicked={() => console.log("clicked")} />
        </x.TextAnchor> to continue.
    </x.TextBuffer>
</GtkTextView>

// Dynamic content
<GtkTextView>
    <x.TextBuffer>
        {items.map(item => (
            <x.TextTag key={item.id} id={item.id} foreground={item.color}>
                {item.text}
            </x.TextTag>
        ))}
    </x.TextBuffer>
</GtkTextView>
```

## File Changes Summary

| File | Action |
|------|--------|
| `packages/react/src/host-config.ts` | Modify - add HostContext, update createTextInstance |
| `packages/react/src/nodes/text-segment.ts` | Create - new TextSegmentNode |
| `packages/react/src/nodes/text-tag.ts` | Rewrite - implement TextContentParent, manage children |
| `packages/react/src/nodes/text-buffer.ts` | Rewrite - incremental updates, TextContentParent |
| `packages/react/src/nodes/text-anchor.ts` | Modify - add getLength/getText, bufferOffset |
| `packages/react/src/nodes/index.ts` | Modify - export TextSegmentNode |
| `packages/react/src/jsx.ts` | Modify - update x namespace types |

## Testing Strategy

1. Unit tests for each node type
2. Integration tests for nested tags
3. Integration tests for TextAnchor with widgets
4. Integration tests for dynamic content updates
5. E2E tests for visual verification

## Open Considerations

1. **Batch FFI calls**: Multiple insert/delete operations in same commit should be batched
2. **Tag reapplication optimization**: Only reapply tags if their range actually changed
3. **Circular imports**: May need interfaces or restructuring to avoid circular dependencies
