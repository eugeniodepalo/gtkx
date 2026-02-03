import type * as WebKit from "@gtkx/ffi/webkit";
import type { WebKitWebViewProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onLoadChanged"] as const;

type WebViewProps = Pick<WebKitWebViewProps, (typeof OWN_PROPS)[number]>;

export class WebViewNode extends WidgetNode<WebKit.WebView, WebViewProps> {
    public override commitUpdate(oldProps: WebViewProps | null, newProps: WebViewProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: WebViewProps | null, newProps: WebViewProps): void {
        if (hasChanged(oldProps, newProps, "onLoadChanged")) {
            const callback = newProps.onLoadChanged;
            this.signalStore.set(this, this.container, "load-changed", callback ?? undefined, { blockable: false });
        }
    }
}
