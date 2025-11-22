import type { SlotContainer, GtkWidget } from "./types.js";

export class SlotContainerHandler {
	parseSlotType(type: string): { parentType: string; slotName: string } | null {
		const dotIndex = type.indexOf(".");
		if (dotIndex === -1) return null;

		return {
			parentType: type.substring(0, dotIndex),
			slotName: type.substring(dotIndex + 1),
		};
	}

	convertSlotNameToProperty(slotName: string): string {
		return slotName
			.replace(/([A-Z])/g, "-$1")
			.toLowerCase()
			.replace(/^-/, "");
	}

	createContainer(parentType: string, slotName: string): SlotContainer {
		const propertyName = this.convertSlotNameToProperty(slotName);
		return {
			_isSlotContainer: true,
			parentType,
			slotName,
			propertyName,
			child: null,
		};
	}

	appendChild(parent: GtkWidget, slot: SlotContainer): void {
		if (!slot.child) {
			console.warn(`Slot ${slot.slotName} has no child widget`);
			return;
		}

		const setterName = `set${slot.slotName}`;
		if (typeof parent[setterName] === "function") {
			(parent[setterName] as (ptr: unknown) => void)(slot.child.ptr);
		} else {
			console.warn(`Cannot find setter ${setterName} on ${parent.constructor.name}`);
		}
	}

	removeChild(parent: GtkWidget, slot: SlotContainer): void {
		const setterName = `set${slot.slotName}`;
		if (typeof parent[setterName] === "function") {
			(parent[setterName] as (ptr: null) => void)(null);
		}
	}
}
