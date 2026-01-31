import { getSignalStore, type SignalStore } from "./nodes/internal/signal-store.js";
import type { Container, ContainerClass, Props } from "./types.js";

// biome-ignore lint/suspicious/noExplicitAny: Self-referential type bounds require any
export class Node<TContainer = any, TProps = any, TParent extends Node = any, TChild extends Node = any> {
    public static createContainer(_props: Props, _containerClass: ContainerClass, _rootContainer?: Container): unknown {
        throw new Error("Cannot create container: unsupported node type");
    }

    container: TContainer;
    typeName: string;
    signalStore: SignalStore;
    rootContainer: Container;
    parent: TParent | null = null;
    children: TChild[] = [];

    constructor(typeName: string, _props: TProps, container: TContainer, rootContainer: Container) {
        this.typeName = typeName;
        this.container = container;
        this.rootContainer = rootContainer;
        this.signalStore = getSignalStore(rootContainer);
    }

    public canAcceptChild(_child: Node): boolean {
        return false;
    }

    public appendInitialChild(child: Node): void {
        this.appendChild(child);
    }

    public appendChild(child: Node): void {
        if (!this.canAcceptChild(child)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}'`);
        }
        child.parent = this;
        (this.children as Node[]).push(child);
        child.onAddedToParent(this);
    }

    public removeChild(child: Node): void {
        const index = (this.children as Node[]).indexOf(child);
        if (index !== -1) {
            child.onRemovedFromParent(this);
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    public insertBefore(child: Node, before: Node): void {
        const beforeIndex = (this.children as Node[]).indexOf(before);
        if (beforeIndex === -1) {
            throw new Error(`Cannot find 'before' child '${before.typeName}' in '${this.typeName}'`);
        }

        const existingIndex = (this.children as Node[]).indexOf(child);
        if (existingIndex !== -1) {
            this.children.splice(existingIndex, 1);
            const adjustedIndex = existingIndex < beforeIndex ? beforeIndex - 1 : beforeIndex;
            (this.children as Node[]).splice(adjustedIndex, 0, child);
            return;
        }

        if (!this.canAcceptChild(child)) {
            throw new Error(`Cannot insert '${child.typeName}' into '${this.typeName}'`);
        }

        child.parent = this;
        (this.children as Node[]).splice(beforeIndex, 0, child);
        child.onAddedToParent(this);
    }

    public finalizeInitialChildren(props: TProps): boolean {
        this.commitUpdate(null, props);
        return false;
    }

    public commitUpdate(_oldProps: TProps | null, _newProps: TProps): void {}

    public commitMount(): void {}

    public detachDeletedInstance(): void {
        this.signalStore.clear(this);
    }

    public onAddedToParent(_parent: Node): void {}

    public onRemovedFromParent(_parent: Node): void {}
}
