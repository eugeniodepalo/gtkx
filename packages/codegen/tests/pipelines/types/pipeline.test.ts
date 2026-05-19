import { describe, expect, it } from "vitest";
import type { GirNamespace, GirRepository } from "../../../src/gir/index.js";
import {
    buildAsyncEntries,
    buildHashTableEntry,
    collectAsyncMembers,
    collectBitfieldNames,
    collectByOwner,
    collectClassFieldNames,
    collectConnectMethodRenames,
    collectEnumValues,
    collectErrorDomainNames,
    collectGtypeStructNames,
    collectHashTableMembers,
    collectInterfaceFlattenedMethods,
    collectMethodShadowRenames,
    collectNumericConstantNames,
    collectPrerequisiteFieldNames,
    collectSignalActionMethodNames,
    connectRenameFor,
    declaredParameterCount,
    findConnectMethodDeclarer,
    isKeyedHashTable,
} from "../../../src/pipelines/types/pipeline.js";
import { FfiMapper } from "../../../src/type-system/ffi-mapper.js";
import {
    createNormalizedClass,
    createNormalizedConstant,
    createNormalizedEnumeration,
    createNormalizedEnumerationMember,
    createNormalizedFunction,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedRecord,
    createNormalizedType,
    qualifiedName,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

const repositoryOf = (namespaces: Map<string, GirNamespace>): GirRepository =>
    createMockRepository(namespaces) as unknown as GirRepository;

const singleNamespace = (ns: GirNamespace): GirRepository => repositoryOf(new Map([[ns.name, ns]]));

const repositoryWithClasses = (
    namespaceName: string,
    build: (repo: GirRepository) => ReturnType<typeof createNormalizedClass>[],
): { repository: GirRepository; namespace: GirNamespace } => {
    const namespace = createNormalizedNamespace({ name: namespaceName });
    const repository = singleNamespace(namespace);
    for (const cls of build(repository)) {
        namespace.classes.set(cls.name, cls);
    }
    return { repository, namespace };
};

describe("collectEnumValues", () => {
    it("keys enum members upper-cased by lowercase namespace name", () => {
        const enumeration = createNormalizedEnumeration({
            name: "Orientation",
            qualifiedName: "Gtk.Orientation",
            members: [
                createNormalizedEnumerationMember({ name: "horizontal", value: "0" }),
                createNormalizedEnumerationMember({ name: "vertical", value: "1" }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([[enumeration.name, enumeration]]),
        });

        const result = collectEnumValues(singleNamespace(ns));

        expect(result.get("gtk")?.get("Orientation")?.get("HORIZONTAL")).toBe(0);
        expect(result.get("gtk")?.get("Orientation")?.get("VERTICAL")).toBe(1);
    });

    it("merges bitfields into the same namespace map", () => {
        const flags = createNormalizedEnumeration({
            name: "StateFlags",
            qualifiedName: "Gtk.StateFlags",
            members: [createNormalizedEnumerationMember({ name: "active", value: "4" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            bitfields: new Map([[flags.name, flags]]),
        });

        const result = collectEnumValues(singleNamespace(ns));

        expect(result.get("gtk")?.get("StateFlags")?.get("ACTIVE")).toBe(4);
    });

    it("drops members whose value is not a finite number", () => {
        const enumeration = createNormalizedEnumeration({
            name: "Weird",
            qualifiedName: "Gtk.Weird",
            members: [
                createNormalizedEnumerationMember({ name: "good", value: "7" }),
                createNormalizedEnumerationMember({ name: "bad", value: "not-a-number" }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([[enumeration.name, enumeration]]),
        });

        const members = collectEnumValues(singleNamespace(ns)).get("gtk")?.get("Weird");

        expect(members?.has("GOOD")).toBe(true);
        expect(members?.has("BAD")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const repository = createMockRepository() as unknown as GirRepository;
        const missing: GirRepository = {
            ...repository,
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectEnumValues(missing).size).toBe(0);
    });
});

describe("collectErrorDomainNames", () => {
    it("collects only enumerations carrying a glib error domain", () => {
        const domainEnum = createNormalizedEnumeration({
            name: "FileError",
            qualifiedName: "GLib.FileError",
            glibErrorDomain: "g-file-error-quark",
        });
        const plainEnum = createNormalizedEnumeration({
            name: "SeekType",
            qualifiedName: "GLib.SeekType",
        });
        const ns = createNormalizedNamespace({
            name: "GLib",
            enumerations: new Map([
                [domainEnum.name, domainEnum],
                [plainEnum.name, plainEnum],
            ]),
        });

        const result = collectErrorDomainNames(singleNamespace(ns));

        expect(result.get("glib")?.has("FileError")).toBe(true);
        expect(result.get("glib")?.has("SeekType")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectErrorDomainNames(missing).get("ghost")).toBeUndefined();
    });
});

describe("collectBitfieldNames", () => {
    it("collects bitfield enum names keyed by lowercase namespace", () => {
        const dragAction = createNormalizedEnumeration({
            name: "DragAction",
            qualifiedName: "Gdk.DragAction",
        });
        const ns = createNormalizedNamespace({
            name: "Gdk",
            bitfields: new Map([[dragAction.name, dragAction]]),
        });

        const result = collectBitfieldNames(singleNamespace(ns));

        expect(result.get("gdk")?.has("DragAction")).toBe(true);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectBitfieldNames(missing).get("ghost")).toBeUndefined();
    });
});

describe("collectGtypeStructNames", () => {
    it("collects records that back a class or interface vtable", () => {
        const vtableByFlag = createNormalizedRecord({
            name: "WidgetClassStruct",
            qualifiedName: "Gtk.WidgetClassStruct",
            isGtypeStructFor: "Widget",
        });
        const vtableByName = createNormalizedRecord({
            name: "OrientableIface",
            qualifiedName: "Gtk.OrientableIface",
        });
        const plainRecord = createNormalizedRecord({
            name: "Rectangle",
            qualifiedName: "Gtk.Rectangle",
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([
                [vtableByFlag.name, vtableByFlag],
                [vtableByName.name, vtableByName],
                [plainRecord.name, plainRecord],
            ]),
        });

        const result = collectGtypeStructNames(singleNamespace(ns));

        expect(result.get("gtk")?.has("WidgetClassStruct")).toBe(true);
        expect(result.get("gtk")?.has("OrientableIface")).toBe(true);
        expect(result.get("gtk")?.has("Rectangle")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectGtypeStructNames(missing).get("ghost")).toBeUndefined();
    });
});

describe("collectByOwner", () => {
    it("applies the selector to every class and interface", () => {
        const cls = createNormalizedClass({ name: "Button", qualifiedName: "Gtk.Button" });
        const iface = createNormalizedInterface({ name: "Orientable", qualifiedName: "Gtk.Orientable" });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[cls.name, cls]]),
            interfaces: new Map([[iface.name, iface]]),
        });

        const result = collectByOwner(singleNamespace(ns), (owner) => [owner.name]);

        expect([...(result.get("gtk")?.get("Button") ?? [])]).toEqual(["Button"]);
        expect([...(result.get("gtk")?.get("Orientable") ?? [])]).toEqual(["Orientable"]);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectByOwner(missing, () => []).get("ghost")).toBeUndefined();
    });
});

describe("collectClassFieldNames", () => {
    it("camelCases class instance-struct field names", () => {
        const cls = createNormalizedClass({
            name: "Button",
            qualifiedName: "Gtk.Button",
            fieldNames: ["parent_instance", "click_count"],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[cls.name, cls]]),
        });

        const result = collectClassFieldNames(singleNamespace(ns));

        const names = result.get("gtk")?.get("Button");
        expect(names?.has("parentInstance")).toBe(true);
        expect(names?.has("clickCount")).toBe(true);
    });

    it("flattens transitive prerequisite fields into interface field names", () => {
        const baseIface = createNormalizedInterface({
            name: "Base",
            qualifiedName: "Gtk.Base",
            fieldNames: ["base_field"],
        });
        const iface = createNormalizedInterface({
            name: "Derived",
            qualifiedName: "Gtk.Derived",
            fieldNames: ["own_field"],
            prerequisites: ["Gtk.Base"],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([
                [baseIface.name, baseIface],
                [iface.name, iface],
            ]),
        });

        const result = collectClassFieldNames(singleNamespace(ns));

        const names = result.get("gtk")?.get("Derived");
        expect(names?.has("ownField")).toBe(true);
        expect(names?.has("baseField")).toBe(true);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectClassFieldNames(missing).get("ghost")).toBeUndefined();
    });
});

describe("collectPrerequisiteFieldNames", () => {
    it("walks the inheritance chain of a prerequisite class", () => {
        const widget = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            fieldNames: ["widget_field"],
        });
        const child = createNormalizedClass({
            name: "Child",
            qualifiedName: "Gtk.Child",
            parent: "Gtk.Widget",
            fieldNames: ["child_field"],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                [widget.name, widget],
                [child.name, child],
            ]),
        });
        const repository = singleNamespace(ns);

        const names = collectPrerequisiteFieldNames(repository, ["Gtk.Child"]);

        expect(names.has("childField")).toBe(true);
        expect(names.has("widgetField")).toBe(true);
    });

    it("walks transitive prerequisite interfaces and breaks cycles", () => {
        const ifaceA = createNormalizedInterface({
            name: "A",
            qualifiedName: "Gtk.A",
            fieldNames: ["a_field"],
            prerequisites: ["Gtk.B"],
        });
        const ifaceB = createNormalizedInterface({
            name: "B",
            qualifiedName: "Gtk.B",
            fieldNames: ["b_field"],
            prerequisites: ["Gtk.A"],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([
                [ifaceA.name, ifaceA],
                [ifaceB.name, ifaceB],
            ]),
        });

        const names = collectPrerequisiteFieldNames(singleNamespace(ns), ["Gtk.A"]);

        expect(names.has("aField")).toBe(true);
        expect(names.has("bField")).toBe(true);
    });

    it("ignores prerequisites that resolve to nothing", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });

        expect(collectPrerequisiteFieldNames(singleNamespace(ns), ["Gtk.Missing"]).size).toBe(0);
    });
});

describe("collectSignalActionMethodNames", () => {
    it("collects signal and virtual-method action names not shadowed by a real method", () => {
        const cls = createNormalizedClass({
            name: "Editable",
            qualifiedName: "Gtk.Editable",
            signals: [{ name: "committed" } as never],
            virtualMethodNames: ["do_insert"],
            methods: [createNormalizedMethod({ name: "do_insert" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[cls.name, cls]]),
        });

        const result = collectSignalActionMethodNames(singleNamespace(ns));

        const names = result.get("gtk")?.get("Editable");
        expect(names?.has("committed")).toBe(true);
        expect(names?.has("doInsert")).toBe(false);
    });
});

describe("collectNumericConstantNames", () => {
    it("collects numeric non-string constants and skips string-typed ones", () => {
        const numeric = createNormalizedConstant({
            name: "MAJOR_VERSION",
            qualifiedName: "Gtk.MAJOR_VERSION",
            value: "4",
            type: createNormalizedType({ name: "gint" }),
        });
        const stringConstant = createNormalizedConstant({
            name: "VERSION_STRING",
            qualifiedName: "Gtk.VERSION_STRING",
            value: "4",
            type: createNormalizedType({ name: "utf8" }),
        });
        const filenameConstant = createNormalizedConstant({
            name: "PATH",
            qualifiedName: "Gtk.PATH",
            value: "8",
            type: createNormalizedType({ name: "filename" }),
        });
        const nonNumeric = createNormalizedConstant({
            name: "BLURB",
            qualifiedName: "Gtk.BLURB",
            value: "hello",
            type: createNormalizedType({ name: "gint" }),
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            constants: new Map([
                [numeric.name, numeric],
                [stringConstant.name, stringConstant],
                [filenameConstant.name, filenameConstant],
                [nonNumeric.name, nonNumeric],
            ]),
        });

        const names = collectNumericConstantNames(singleNamespace(ns)).get("gtk")?.get("");

        expect(names?.has("MAJOR_VERSION")).toBe(true);
        expect(names?.has("VERSION_STRING")).toBe(false);
        expect(names?.has("PATH")).toBe(false);
        expect(names?.has("BLURB")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectNumericConstantNames(missing).get("ghost")).toBeUndefined();
    });
});

describe("connectRenameFor", () => {
    it("derives a lower-camel connect alias from an owner name", () => {
        expect(connectRenameFor("Widget")).toBe("widgetConnect");
        expect(connectRenameFor("input_stream")).toBe("inputStreamConnect");
    });
});

describe("declaredParameterCount", () => {
    it("counts only non-out parameters", () => {
        const method = createNormalizedMethod({
            name: "lookup",
            parameters: [
                createNormalizedParameter({ name: "key", direction: "in" }),
                createNormalizedParameter({ name: "found", direction: "out" }),
                createNormalizedParameter({ name: "extra", direction: "inout" }),
            ],
        });

        expect(declaredParameterCount(method)).toBe(2);
    });
});

describe("collectMethodShadowRenames", () => {
    it("renames a class method that collides with a parent method", () => {
        const { namespace } = repositoryWithClasses("Gtk", (repo) => [
            createNormalizedClass(
                {
                    name: "Widget",
                    qualifiedName: "Gtk.Widget",
                    parent: null,
                    methods: [createNormalizedMethod({ name: "show" })],
                },
                repo as never,
            ),
            createNormalizedClass(
                {
                    name: "Button",
                    qualifiedName: "Gtk.Button",
                    parent: "Gtk.Widget",
                    methods: [
                        createNormalizedMethod({
                            name: "show",
                            parameters: [createNormalizedParameter({ name: "flag" })],
                        }),
                    ],
                },
                repo as never,
            ),
        ]);

        const result = collectMethodShadowRenames(singleNamespace(namespace));

        const renames = result.get("gtk")?.get("Button");
        expect(renames).toHaveLength(1);
        expect(renames?.[0]).toEqual({
            original: "show",
            renamed: "buttonShow",
            arity: 1,
        });
    });

    it("excludes the connect method and non-colliding methods", () => {
        const { namespace } = repositoryWithClasses("Gtk", (repo) => [
            createNormalizedClass(
                {
                    name: "Widget",
                    qualifiedName: "Gtk.Widget",
                    parent: null,
                    methods: [createNormalizedMethod({ name: "connect" })],
                },
                repo as never,
            ),
            createNormalizedClass(
                {
                    name: "Button",
                    qualifiedName: "Gtk.Button",
                    parent: "Gtk.Widget",
                    methods: [createNormalizedMethod({ name: "connect" }), createNormalizedMethod({ name: "press" })],
                },
                repo as never,
            ),
        ]);

        const result = collectMethodShadowRenames(singleNamespace(namespace));

        expect(result.get("gtk")?.has("Button")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectMethodShadowRenames(missing).get("ghost")).toBeUndefined();
    });
});

describe("findConnectMethodDeclarer", () => {
    it("returns the class itself when it declares a connect method", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            methods: [createNormalizedMethod({ name: "connect" })],
        });

        expect(findConnectMethodDeclarer(cls)?.name).toBe("Widget");
    });

    it("walks ancestors to find the declaring class", () => {
        const ancestor = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            methods: [createNormalizedMethod({ name: "connect" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[ancestor.name, ancestor]]),
        });
        const repository = singleNamespace(ns);
        const child = createNormalizedClass(
            {
                name: "Button",
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
                methods: [],
            },
            repository as never,
        );

        expect(findConnectMethodDeclarer(child)?.name).toBe("Widget");
    });

    it("returns null when no class in the chain declares connect", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            methods: [],
        });

        expect(findConnectMethodDeclarer(cls)).toBeNull();
    });
});

describe("collectConnectMethodRenames", () => {
    it("records a connect rename for a class that declares the method", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            methods: [createNormalizedMethod({ name: "connect" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[cls.name, cls]]),
        });

        const result = collectConnectMethodRenames(singleNamespace(ns));

        expect(result.get("gtk")?.get("Widget")).toBe("widgetConnect");
    });

    it("records a connect rename for an interface that declares the method", () => {
        const iface = createNormalizedInterface({
            name: "Action",
            qualifiedName: "Gtk.Action",
            methods: [createNormalizedMethod({ name: "connect" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([[iface.name, iface]]),
        });

        const result = collectConnectMethodRenames(singleNamespace(ns));

        expect(result.get("gtk")?.get("Action")).toBe("actionConnect");
    });

    it("omits classes and interfaces without a connect method", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            qualifiedName: "Gtk.Widget",
            parent: null,
            methods: [],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[cls.name, cls]]),
        });

        expect(collectConnectMethodRenames(singleNamespace(ns)).get("gtk")?.size).toBe(0);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectConnectMethodRenames(missing).get("ghost")).toBeUndefined();
    });
});

const asyncCallbackParameter = (closure = 2) =>
    createNormalizedParameter({
        name: "callback",
        type: createNormalizedType({ name: "Gio.AsyncReadyCallback", nullable: true }),
        scope: "async",
        closure,
        nullable: true,
    });

const asyncMethod = (name: string, finishName: string) =>
    createNormalizedMethod({
        name,
        cIdentifier: `g_${name}`,
        finishFunc: finishName,
        returnType: createNormalizedType({ name: "none" }),
        parameters: [
            createNormalizedParameter({ name: "io_priority", type: createNormalizedType({ name: "gint" }) }),
            asyncCallbackParameter(),
            createNormalizedParameter({ name: "user_data", type: createNormalizedType({ name: "gpointer" }) }),
        ],
    });

const finishMethod = (name: string) =>
    createNormalizedMethod({
        name,
        cIdentifier: `g_${name}`,
        returnType: createNormalizedType({ name: "gboolean" }),
        parameters: [
            createNormalizedParameter({ name: "res", type: createNormalizedType({ name: "Gio.AsyncResult" }) }),
        ],
    });

describe("buildAsyncEntries", () => {
    it("pairs each async callable with its finish callable as camelCased members", () => {
        const callables = [asyncMethod("read_async", "read_finish"), finishMethod("read_finish")];

        const entries = buildAsyncEntries(callables, callables);

        expect(entries).toEqual([{ asyncMember: "readAsync", finishMember: "readFinish" }]);
    });

    it("returns an empty list when there is no async callable", () => {
        const plain = createNormalizedMethod({ name: "plain" });

        expect(buildAsyncEntries([plain], [plain])).toEqual([]);
    });
});

describe("collectInterfaceFlattenedMethods", () => {
    it("flattens own methods and transitive prerequisite interface methods", () => {
        const base = createNormalizedInterface({
            name: "Base",
            qualifiedName: "Gtk.Base",
            methods: [createNormalizedMethod({ name: "base_method" })],
        });
        const derived = createNormalizedInterface({
            name: "Derived",
            qualifiedName: "Gtk.Derived",
            prerequisites: ["Gtk.Base"],
            methods: [createNormalizedMethod({ name: "derived_method" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([
                [base.name, base],
                [derived.name, derived],
            ]),
        });

        const methods = collectInterfaceFlattenedMethods(singleNamespace(ns), "Gtk.Derived");

        expect(methods.map((m) => m.name).sort()).toEqual(["base_method", "derived_method"]);
    });

    it("deduplicates methods shared by an interface and a prerequisite", () => {
        const base = createNormalizedInterface({
            name: "Base",
            qualifiedName: "Gtk.Base",
            methods: [createNormalizedMethod({ name: "shared" })],
        });
        const derived = createNormalizedInterface({
            name: "Derived",
            qualifiedName: "Gtk.Derived",
            prerequisites: ["Gtk.Base"],
            methods: [createNormalizedMethod({ name: "shared" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([
                [base.name, base],
                [derived.name, derived],
            ]),
        });

        const methods = collectInterfaceFlattenedMethods(singleNamespace(ns), "Gtk.Derived");

        expect(methods).toHaveLength(1);
    });

    it("returns an empty list for an interface that does not resolve", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });

        expect(collectInterfaceFlattenedMethods(singleNamespace(ns), "Gtk.Missing")).toEqual([]);
    });

    it("breaks prerequisite cycles", () => {
        const ifaceA = createNormalizedInterface({
            name: "A",
            qualifiedName: "Gtk.A",
            methods: [createNormalizedMethod({ name: "a_method" })],
            prerequisites: ["Gtk.B"],
        });
        const ifaceB = createNormalizedInterface({
            name: "B",
            qualifiedName: "Gtk.B",
            methods: [createNormalizedMethod({ name: "b_method" })],
            prerequisites: ["Gtk.A"],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([
                [ifaceA.name, ifaceA],
                [ifaceB.name, ifaceB],
            ]),
        });

        const methods = collectInterfaceFlattenedMethods(singleNamespace(ns), "Gtk.A");

        expect(methods.map((m) => m.name).sort()).toEqual(["a_method", "b_method"]);
    });
});

describe("collectAsyncMembers", () => {
    it("collects async members for classes keyed by pascal-cased owner name", () => {
        const cls = createNormalizedClass({
            name: "InputStream",
            qualifiedName: "Gio.InputStream",
            parent: null,
            methods: [asyncMethod("read_async", "read_finish"), finishMethod("read_finish")],
        });
        const ns = createNormalizedNamespace({
            name: "Gio",
            sharedLibrary: "libgio-2.0.so.0",
            classes: new Map([[cls.name, cls]]),
        });

        const result = collectAsyncMembers(singleNamespace(ns));

        expect(result.get("gio")?.get("InputStream")).toEqual([
            { asyncMember: "readAsync", finishMember: "readFinish" },
        ]);
    });

    it("collects async members for interfaces and namespace-level functions", () => {
        const iface = createNormalizedInterface({
            name: "AsyncInitable",
            qualifiedName: "Gio.AsyncInitable",
            methods: [asyncMethod("init_async", "init_finish"), finishMethod("init_finish")],
        });
        const fnAsync = createNormalizedFunction({
            name: "bus_get",
            cIdentifier: "g_bus_get",
            finishFunc: "bus_get_finish",
            returnType: createNormalizedType({ name: "none" }),
            parameters: [asyncCallbackParameter()],
        });
        const fnFinish = createNormalizedFunction({
            name: "bus_get_finish",
            cIdentifier: "g_bus_get_finish",
            returnType: createNormalizedType({ name: "gboolean" }),
            parameters: [],
        });
        const ns = createNormalizedNamespace({
            name: "Gio",
            sharedLibrary: "libgio-2.0.so.0",
            interfaces: new Map([[iface.name, iface]]),
            functions: new Map([
                [fnAsync.name, fnAsync],
                [fnFinish.name, fnFinish],
            ]),
        });

        const result = collectAsyncMembers(singleNamespace(ns));

        expect(result.get("gio")?.get("AsyncInitable")).toEqual([
            { asyncMember: "initAsync", finishMember: "initFinish" },
        ]);
        expect(result.get("gio")?.get("")).toEqual([{ asyncMember: "busGet", finishMember: "busGetFinish" }]);
    });

    it("merges static-function async members into the owner entry list", () => {
        const cls = createNormalizedClass({
            name: "File",
            qualifiedName: "Gio.File",
            parent: null,
            methods: [asyncMethod("load_async", "load_finish"), finishMethod("load_finish")],
            staticFunctions: [
                createNormalizedFunction({
                    name: "new_async",
                    cIdentifier: "g_file_new_async",
                    finishFunc: "new_finish",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [asyncCallbackParameter()],
                }),
                createNormalizedFunction({
                    name: "new_finish",
                    cIdentifier: "g_file_new_finish",
                    returnType: createNormalizedType({ name: "gboolean" }),
                    parameters: [],
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gio",
            sharedLibrary: "libgio-2.0.so.0",
            classes: new Map([[cls.name, cls]]),
        });

        const result = collectAsyncMembers(singleNamespace(ns));

        const entries = result.get("gio")?.get("File");
        expect(entries).toEqual([
            { asyncMember: "loadAsync", finishMember: "loadFinish" },
            { asyncMember: "newAsync", finishMember: "newFinish" },
        ]);
    });

    it("collects async members declared on records", () => {
        const rec = createNormalizedRecord({
            name: "Task",
            qualifiedName: "Gio.Task",
            methods: [asyncMethod("run_async", "run_finish"), finishMethod("run_finish")],
        });
        const ns = createNormalizedNamespace({
            name: "Gio",
            sharedLibrary: "libgio-2.0.so.0",
            records: new Map([[rec.name, rec]]),
        });

        const result = collectAsyncMembers(singleNamespace(ns));

        expect(result.get("gio")?.get("Task")).toEqual([{ asyncMember: "runAsync", finishMember: "runFinish" }]);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectAsyncMembers(missing).get("ghost")).toBeUndefined();
    });
});

const hashTableType = (keyName: string, valueName: string) =>
    createNormalizedType({
        name: "GLib.HashTable",
        containerType: "ghashtable",
        isArray: false,
        elementType: createNormalizedType({ name: valueName }),
        typeParameters: [createNormalizedType({ name: keyName }), createNormalizedType({ name: valueName })],
    });

describe("isKeyedHashTable", () => {
    it("returns true for a hash table with concrete key and value types", () => {
        expect(isKeyedHashTable(hashTableType("utf8", "utf8"))).toBe(true);
    });

    it("returns false for a non-hash-table type", () => {
        expect(isKeyedHashTable(createNormalizedType({ name: "gint" }))).toBe(false);
    });

    it("returns false for an opaque gpointer-keyed hash table", () => {
        expect(isKeyedHashTable(hashTableType("gpointer", "gpointer"))).toBe(false);
    });

    it("returns false when the hash table has no key or value type", () => {
        const bare = createNormalizedType({
            name: "GLib.HashTable",
            containerType: "ghashtable",
            typeParameters: [],
        });

        expect(isKeyedHashTable(bare)).toBe(false);
    });
});

describe("buildHashTableEntry", () => {
    const mapper = (ns: GirNamespace) => new FfiMapper(singleNamespace(ns), ns.name);

    it("builds an entry from a keyed hash-table parameter", () => {
        const ns = createNormalizedNamespace({ name: "GLib", sharedLibrary: "libglib-2.0.so.0" });
        const callable = createNormalizedMethod({
            name: "set_table",
            parameters: [createNormalizedParameter({ name: "table", type: hashTableType("utf8", "utf8") })],
        });

        const entry = buildHashTableEntry(callable, "setTable", false, mapper(ns));

        expect(entry?.member).toBe("setTable");
        expect(entry?.isFunction).toBe(false);
        expect(entry?.mapType).toContain("Map<");
    });

    it("builds an entry from a keyed hash-table return type", () => {
        const ns = createNormalizedNamespace({ name: "GLib", sharedLibrary: "libglib-2.0.so.0" });
        const callable = createNormalizedFunction({
            name: "get_table",
            cIdentifier: "g_get_table",
            returnType: hashTableType("utf8", "utf8"),
            parameters: [],
        });

        const entry = buildHashTableEntry(callable, "getTable", true, mapper(ns));

        expect(entry?.member).toBe("getTable");
        expect(entry?.isFunction).toBe(true);
        expect(entry?.mapType).toContain("Map<");
    });

    it("returns null for a callable carrying no keyed hash table", () => {
        const ns = createNormalizedNamespace({ name: "GLib", sharedLibrary: "libglib-2.0.so.0" });
        const callable = createNormalizedMethod({ name: "plain" });

        expect(buildHashTableEntry(callable, "plain", false, mapper(ns))).toBeNull();
    });
});

describe("collectHashTableMembers", () => {
    it("collects keyed hash-table members across classes, interfaces, records and functions", () => {
        const cls = createNormalizedClass({
            name: "Settings",
            qualifiedName: "GLib.Settings",
            parent: null,
            methods: [
                createNormalizedMethod({
                    name: "set_props",
                    parameters: [createNormalizedParameter({ name: "props", type: hashTableType("utf8", "utf8") })],
                }),
            ],
        });
        const iface = createNormalizedInterface({
            name: "Configurable",
            qualifiedName: "GLib.Configurable",
            methods: [
                createNormalizedMethod({
                    name: "apply",
                    parameters: [createNormalizedParameter({ name: "values", type: hashTableType("utf8", "utf8") })],
                }),
            ],
        });
        const rec = createNormalizedRecord({
            name: "Bag",
            qualifiedName: "GLib.Bag",
            methods: [
                createNormalizedMethod({
                    name: "fill",
                    parameters: [createNormalizedParameter({ name: "items", type: hashTableType("utf8", "utf8") })],
                }),
            ],
        });
        const fn = createNormalizedFunction({
            name: "dump",
            cIdentifier: "g_dump",
            returnType: createNormalizedType({ name: "none" }),
            parameters: [createNormalizedParameter({ name: "data", type: hashTableType("utf8", "utf8") })],
        });
        const ns = createNormalizedNamespace({
            name: "GLib",
            sharedLibrary: "libglib-2.0.so.0",
            classes: new Map([[cls.name, cls]]),
            interfaces: new Map([[iface.name, iface]]),
            records: new Map([[rec.name, rec]]),
            functions: new Map([[fn.name, fn]]),
        });

        const result = collectHashTableMembers(singleNamespace(ns));

        const owners = result.get("glib");
        expect(owners?.get("Settings")?.[0]?.member).toBe("setProps");
        expect(owners?.get("Configurable")?.[0]?.member).toBe("apply");
        expect(owners?.get("Bag")?.[0]?.member).toBe("fill");
        expect(owners?.get("")?.[0]).toEqual(expect.objectContaining({ member: "dump", isFunction: true }));
    });

    it("produces no owner entries when nothing carries a keyed hash table", () => {
        const cls = createNormalizedClass({
            name: "Plain",
            qualifiedName: "GLib.Plain",
            parent: null,
            methods: [createNormalizedMethod({ name: "noop" })],
        });
        const ns = createNormalizedNamespace({
            name: "GLib",
            sharedLibrary: "libglib-2.0.so.0",
            classes: new Map([[cls.name, cls]]),
        });

        expect(collectHashTableMembers(singleNamespace(ns)).get("glib")?.has("Plain")).toBe(false);
    });

    it("skips namespace names that do not resolve", () => {
        const missing: GirRepository = {
            getNamespaceNames: () => ["Ghost"],
            getNamespace: () => null,
        } as unknown as GirRepository;

        expect(collectHashTableMembers(missing).get("ghost")).toBeUndefined();
    });
});

describe("qualifiedName fixture helper", () => {
    it("joins a namespace and a name with a dot", () => {
        expect(qualifiedName("Gtk", "Button")).toBe("Gtk.Button");
    });
});
