import type * as Adw from "@gtkx/ffi/adw";
import type { AdwAlertDialogProps, AlertDialogResponseProps } from "../jsx.js";
import { DialogNode } from "./dialog.js";
import { filterProps, hasChanged } from "./internal/props.js";

const OWN_PROPS = ["responses"] as const;

type Props = Pick<AdwAlertDialogProps, (typeof OWN_PROPS)[number]>;

export class AlertDialogNode extends DialogNode {
    private managedResponseIds: string[] = [];

    public override commitUpdate(oldProps: Props | null, newProps: Props): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    public override detachDeletedInstance(): void {
        this.clearResponses();
        super.detachDeletedInstance();
    }

    private applyOwnProps(oldProps: Props | null, newProps: Props): void {
        if (hasChanged(oldProps, newProps, "responses")) {
            this.syncResponses(newProps.responses ?? []);
        }
    }

    private syncResponses(newResponses: AlertDialogResponseProps[]): void {
        const dialog = this.container as Adw.AlertDialog;
        this.clearResponses();

        for (const response of newResponses) {
            dialog.addResponse(response.id, response.label);

            if (response.appearance !== undefined) {
                dialog.setResponseAppearance(response.id, response.appearance);
            }

            if (response.enabled !== undefined) {
                dialog.setResponseEnabled(response.id, response.enabled);
            }

            this.managedResponseIds.push(response.id);
        }
    }

    private clearResponses(): void {
        const dialog = this.container as Adw.AlertDialog;
        for (const id of this.managedResponseIds) {
            dialog.removeResponse(id);
        }
        this.managedResponseIds = [];
    }
}
