/**
 * Class Meta Builder
 *
 * Builds CodegenWidgetMeta and CodegenControllerMeta for in-memory metadata during generation.
 * This metadata is consumed by React generators - nothing is written to output files.
 */

import type { GirClass, GirRepository, QualifiedName } from "@gtkx/gir";
import { parseQualifiedName, qualifiedName } from "@gtkx/gir";
import type { ConstructorAnalyzer, PropertyAnalyzer, SignalAnalyzer } from "../../../core/analyzers/index.js";
import type { CodegenControllerMeta, CodegenWidgetMeta } from "../../../core/codegen-metadata.js";
import { getClassification, getHiddenPropNames, type WidgetClassificationType } from "../../../core/config/index.js";
import { normalizeClassName, toKebabCase } from "../../../core/utils/naming.js";
import { isAdjustableMethod, isContainerMethod, isWidgetType } from "../../../core/utils/widget-detection.js";

export type ClassMetaAnalyzers = {
    readonly property: PropertyAnalyzer;
    readonly signal: SignalAnalyzer;
    readonly constructor: ConstructorAnalyzer;
};

const SKIP_CONTROLLERS = new Set<string>();

export class ClassMetaBuilder {
    private readonly widgetQualifiedName: QualifiedName;
    private readonly eventControllerQualifiedName: QualifiedName;

    constructor(
        private readonly cls: GirClass,
        private readonly repository: GirRepository,
        private readonly namespace: string,
        private readonly analyzers: ClassMetaAnalyzers,
    ) {
        this.widgetQualifiedName = qualifiedName("Gtk", "Widget");
        this.eventControllerQualifiedName = qualifiedName("Gtk", "EventController");
    }

    isWidget(): boolean {
        return this.cls.isSubclassOf(this.widgetQualifiedName);
    }

    isEventController(): boolean {
        if (this.cls.abstract) return false;
        if (this.namespace !== "Gtk") return false;
        if (SKIP_CONTROLLERS.has(this.cls.name)) return false;
        return this.cls.isSubclassOf(this.eventControllerQualifiedName);
    }

    buildCodegenControllerMeta(): CodegenControllerMeta | null {
        if (!this.isEventController()) {
            return null;
        }

        const className = normalizeClassName(this.cls.name, this.namespace);
        const properties = this.analyzers.property.analyzeWidgetProperties(this.cls, new Set());
        const signals = this.analyzers.signal.analyzeWidgetSignals(this.cls);
        const propNames = properties.filter((p) => p.isWritable).map((p) => p.camelName);
        const constructorParams = this.analyzers.constructor.getConstructorParamNames(this.cls);
        const parentInfo = this.extractParentInfo();

        return {
            className,
            namespace: this.namespace,
            jsxName: `${this.namespace}${className}`,
            parentClassName: parentInfo?.className ?? null,
            parentNamespace: parentInfo?.namespace ?? null,
            propNames,
            signalNames: signals.map((s) => s.name),
            properties,
            signals,
            constructorParams,
            doc: this.cls.doc,
        };
    }

    buildCodegenWidgetMeta(): CodegenWidgetMeta | null {
        if (!this.isWidget()) {
            return null;
        }

        const className = normalizeClassName(this.cls.name, this.namespace);
        const hiddenPropNames = getHiddenPropNames(className);
        const hiddenPropsSet = new Set(hiddenPropNames);
        const properties = this.analyzers.property.analyzeWidgetProperties(this.cls, hiddenPropsSet);
        const signals = this.analyzers.signal.analyzeWidgetSignals(this.cls);
        const propNames = properties.filter((p) => p.isWritable).map((p) => p.name);
        const constructorParams = this.analyzers.constructor.getConstructorParamNames(this.cls);
        const parentInfo = this.extractParentInfo();

        return {
            className,
            namespace: this.namespace,
            jsxName: `${this.namespace}${className}`,
            isContainer: this.detectIsContainer(),
            isAdjustable: this.detectIsAdjustable(),
            hasBuffer: this.detectHasBuffer(),
            hasMarks: this.detectHasMarks(className),
            hasOffsets: this.detectHasOffsets(className),
            hasColorDialog: this.detectHasColorDialog(className),
            hasFontDialog: this.detectHasFontDialog(className),
            slots: this.detectSlots(),
            propNames,
            signalNames: signals.map((s) => s.name),
            parentClassName: parentInfo?.className ?? null,
            parentNamespace: parentInfo?.namespace ?? null,
            modulePath: `./${toKebabCase(this.cls.name)}.js`,
            properties,
            signals,
            constructorParams,
            doc: this.cls.doc,
            classification: this.computeClassification(className),
            hiddenPropNames,
        };
    }

    private computeClassification(className: string): WidgetClassificationType | null {
        return getClassification(className);
    }

    private detectIsContainer(): boolean {
        const allMethods = this.cls.getAllMethods();
        for (const method of allMethods) {
            if (isContainerMethod(method.name)) {
                return true;
            }
        }

        const allProperties = this.cls.getAllProperties();
        for (const prop of allProperties) {
            if (prop.writable && isWidgetType(prop.type.name, this.repository, this.widgetQualifiedName)) {
                return true;
            }
        }

        return false;
    }

    private detectIsAdjustable(): boolean {
        const allMethods = this.cls.getAllMethods();
        for (const method of allMethods) {
            if (isAdjustableMethod(method.name)) {
                return true;
            }
        }
        return false;
    }

    private detectHasBuffer(): boolean {
        const allMethods = this.cls.getAllMethods();
        for (const method of allMethods) {
            if (method.name === "set_buffer") {
                return true;
            }
        }
        return false;
    }

    private detectHasMarks(className: string): boolean {
        return className === "Scale" || className === "Calendar";
    }

    private detectHasOffsets(className: string): boolean {
        return className === "LevelBar";
    }

    private detectHasColorDialog(className: string): boolean {
        return className === "ColorDialogButton";
    }

    private detectHasFontDialog(className: string): boolean {
        return className === "FontDialogButton";
    }

    private detectSlots(): string[] {
        const slots: string[] = [];

        for (const prop of this.cls.properties) {
            if (!prop.writable) continue;

            if (isWidgetType(prop.type.name, this.repository, this.widgetQualifiedName)) {
                slots.push(prop.name);
            }
        }

        return slots;
    }

    private extractParentInfo(): { className: string; namespace: string } | null {
        const parent = this.cls.parent;
        if (!parent) return null;

        if (parent.includes(".")) {
            const { namespace: parentNs, name } = parseQualifiedName(parent as QualifiedName);
            return {
                className: normalizeClassName(name, parentNs),
                namespace: parentNs,
            };
        }

        return {
            className: normalizeClassName(parent, this.namespace),
            namespace: this.namespace,
        };
    }
}
