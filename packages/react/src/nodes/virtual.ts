import { Node } from "../node.js";
import type { Container } from "../types.js";

// biome-ignore lint/suspicious/noExplicitAny: Self-referential type bounds require any
export class VirtualNode<TProps = any, TParent extends Node = any, TChild extends Node = any> extends Node<
    undefined,
    TProps,
    TParent,
    TChild
> {
    public static override createContainer() {}

    props: TProps;

    constructor(typeName: string, props: TProps = {} as TProps, container: undefined, rootContainer: Container) {
        super(typeName, props, container, rootContainer);
        this.props = props;
    }

    public override commitUpdate(_oldProps: TProps | null, newProps: TProps): void {
        this.props = newProps;
    }
}
