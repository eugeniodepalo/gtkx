import assert from "node:assert";
import { girParser } from "@ts-for-gir/lib";
import { describe, expect, it } from "vitest";
import { adaptNamespace } from "../../../src/gir/internal/adapter.js";

const createMinimalGir = (namespaceContent: string, name = "Test", version = "1.0") => `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0"
    xmlns:c="http://www.gtk.org/introspection/c/1.0"
    xmlns:glib="http://www.gtk.org/introspection/glib/1.0">
    <namespace name="${name}" version="${version}" shared-library="libtest.so"
        c:identifier-prefixes="Test" c:symbol-prefixes="test">
        ${namespaceContent}
    </namespace>
</repository>`;

const adapt = (xml: string) => {
    const namespace = girParser(xml).repository.namespace?.[0];
    if (!namespace) {
        throw new Error("test GIR has no namespace");
    }
    return adaptNamespace(namespace);
};

describe("adaptNamespace / namespace metadata", () => {
    it("parses namespace metadata", () => {
        const result = adapt(createMinimalGir(""));
        expect(result.name).toBe("Test");
        expect(result.version).toBe("1.0");
        expect(result.sharedLibrary).toBe("libtest.so");
        expect(result.cPrefix).toBe("Test");
    });

    it("initializes empty arrays for all type collections", () => {
        const result = adapt(createMinimalGir(""));
        expect(result.classes).toEqual([]);
        expect(result.interfaces).toEqual([]);
        expect(result.functions).toEqual([]);
        expect(result.enumerations).toEqual([]);
        expect(result.bitfields).toEqual([]);
        expect(result.records).toEqual([]);
        expect(result.callbacks).toEqual([]);
        expect(result.constants).toEqual([]);
    });
});

describe("adaptNamespace / classes and members (1)", () => {
    it("parses basic class", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget" parent="GObject.Object" abstract="1"
                    glib:type-name="TestWidget" glib:get-type="test_widget_get_type"/>
            `),
        );
        expect(result.classes.length).toBe(1);
        expect(result.classes[0]?.name).toBe("Widget");
        expect(result.classes[0]?.parent).toBe("GObject.Object");
        expect(result.classes[0]?.abstract).toBe(true);
    });

    it("parses enumeration with members", () => {
        const result = adapt(
            createMinimalGir(`
                <enumeration name="Orientation" c:type="TestOrientation">
                    <member name="horizontal" value="0" c:identifier="TEST_ORIENTATION_HORIZONTAL"/>
                    <member name="vertical" value="1" c:identifier="TEST_ORIENTATION_VERTICAL"/>
                </enumeration>
            `),
        );
        expect(result.enumerations.length).toBe(1);
        expect(result.enumerations[0]?.members.length).toBe(2);
        expect(result.enumerations[0]?.members[0]?.name).toBe("horizontal");
    });

    it("parses method with parameters", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <method name="set_name" c:identifier="test_widget_set_name">
                        <return-value><type name="none"/></return-value>
                        <parameters>
                            <instance-parameter name="self"><type name="Widget"/></instance-parameter>
                            <parameter name="name"><type name="utf8"/></parameter>
                        </parameters>
                    </method>
                </class>
            `),
        );
        const method = result.classes[0]?.methods[0];
        expect(method?.name).toBe("set_name");
        expect(method?.parameters.length).toBe(1);
        expect(method?.instanceParameter).toBeDefined();
    });
});

describe("adaptNamespace / classes and members (2)", () => {
    it("filters non-introspectable methods", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <method name="visible" c:identifier="test_widget_visible">
                        <return-value><type name="gboolean"/></return-value>
                    </method>
                    <method name="internal" c:identifier="test_widget_internal" introspectable="0">
                        <return-value><type name="none"/></return-value>
                    </method>
                </class>
            `),
        );
        expect(result.classes[0]?.methods.length).toBe(1);
        expect(result.classes[0]?.methods[0]?.name).toBe("visible");
    });
});

describe("adaptNamespace / callback fields in records (1)", () => {
    it("preserves callback fields alongside plain fields", () => {
        const result = adapt(
            createMinimalGir(`
                <record name="VTable" c:type="TestVTable">
                    <field name="parent_ptr"><type name="gpointer" c:type="gpointer"/></field>
                    <field name="fn_ptr">
                        <callback name="fn_ptr">
                            <return-value transfer-ownership="none"><type name="none" c:type="void"/></return-value>
                        </callback>
                    </field>
                </record>
            `),
        );
        const record = result.records[0];
        expect(record?.fields.length).toBe(2);
        expect(record?.fields.map((f) => f.name)).toEqual(["parent_ptr", "fn_ptr"]);
    });

    it("synthesizes a gpointer type for callback fields so layout math is correct", () => {
        const result = adapt(
            createMinimalGir(`
                <record name="VTable" c:type="TestVTable">
                    <field name="fn_ptr">
                        <callback name="fn_ptr">
                            <return-value transfer-ownership="none"><type name="none" c:type="void"/></return-value>
                        </callback>
                    </field>
                </record>
            `),
        );
        const field = result.records[0]?.fields[0];
        expect(field?.type.name).toBe("gpointer");
        expect(field?.type.cType).toBe("gpointer");
    });
});

describe("adaptNamespace / callback fields in records (2)", () => {
    it("attaches the parsed callback signature to callback fields", () => {
        const result = adapt(
            createMinimalGir(`
                <record name="Hook" c:type="TestHook">
                    <field name="func">
                        <callback name="func">
                            <return-value transfer-ownership="none"><type name="gboolean" c:type="gboolean"/></return-value>
                            <parameters>
                                <parameter name="data" transfer-ownership="none"><type name="gpointer" c:type="gpointer"/></parameter>
                            </parameters>
                        </callback>
                    </field>
                </record>
            `),
        );
        const field = result.records[0]?.fields[0];
        expect(field?.callback).toBeDefined();
        expect(field?.callback?.name).toBe("func");
        expect(field?.callback?.returnType.name).toBe("gboolean");
        expect(field?.callback?.parameters.length).toBe(1);
        expect(field?.callback?.parameters[0]?.name).toBe("data");
        expect(field?.callback?.introspectable).toBe(true);
    });

    it("marks non-introspectable callback fields", () => {
        const result = adapt(
            createMinimalGir(`
                <record name="VTable" c:type="TestVTable">
                    <field name="opaque_fn">
                        <callback name="opaque_fn" introspectable="0">
                            <return-value transfer-ownership="none"><type name="none" c:type="void"/></return-value>
                        </callback>
                    </field>
                </record>
            `),
        );
        expect(result.records[0]?.fields[0]?.callback?.introspectable).toBe(false);
    });
});

describe("adaptNamespace / implements and prerequisites", () => {
    it("parses a class with a single implements element", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Button" c:type="TestButton">
                    <implements name="Gtk.Actionable"/>
                </class>
            `),
        );
        expect(result.classes[0]?.implements).toEqual(["Gtk.Actionable"]);
    });

    it("parses a class with multiple implements elements", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Button" c:type="TestButton">
                    <implements name="Gtk.Actionable"/>
                    <implements name="Gtk.Buildable"/>
                </class>
            `),
        );
        expect(result.classes[0]?.implements).toEqual(["Gtk.Actionable", "Gtk.Buildable"]);
    });

    it("parses an interface with a single prerequisite", () => {
        const result = adapt(
            createMinimalGir(`
                <interface name="Scrollable" c:type="TestScrollable">
                    <prerequisite name="Gtk.Widget"/>
                </interface>
            `),
        );
        expect(result.interfaces[0]?.prerequisites).toEqual(["Gtk.Widget"]);
    });

    it("parses an interface with multiple prerequisites", () => {
        const result = adapt(
            createMinimalGir(`
                <interface name="Scrollable" c:type="TestScrollable">
                    <prerequisite name="Gtk.Widget"/>
                    <prerequisite name="GObject.Object"/>
                </interface>
            `),
        );
        expect(result.interfaces[0]?.prerequisites).toEqual(["Gtk.Widget", "GObject.Object"]);
    });
});

describe("adaptNamespace / constructors", () => {
    it("parses a class constructor with return-value and shadows metadata", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Window" c:type="TestWindow">
                    <constructor name="new" c:identifier="test_window_new" shadows="new_full" shadowed-by="new_with_title">
                        <return-value transfer-ownership="full">
                            <doc xml:space="preserve">Returns a new window</doc>
                            <type name="Window"/>
                        </return-value>
                    </constructor>
                </class>
            `),
        );
        const ctor = result.classes[0]?.constructors[0];
        expect(ctor?.name).toBe("new");
        expect(ctor?.cIdentifier).toBe("test_window_new");
        expect(ctor?.shadows).toBe("new_full");
        expect(ctor?.shadowedBy).toBe("new_with_title");
        expect(ctor?.returnDoc).toBe("Returns a new window");
        expect(ctor?.returnType.transferOwnership).toBe("full");
    });

    it("filters out non-introspectable constructors", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Window" c:type="TestWindow">
                    <constructor name="new" c:identifier="test_window_new"/>
                    <constructor name="new_internal" c:identifier="test_window_new_internal" introspectable="0"/>
                </class>
            `),
        );
        expect(result.classes[0]?.constructors.length).toBe(1);
        expect(result.classes[0]?.constructors[0]?.name).toBe("new");
    });
});

describe("adaptNamespace / functions metadata", () => {
    it("parses a namespace function with shadows and throws", () => {
        const result = adapt(
            createMinimalGir(`
                <function name="parse" c:identifier="test_parse" throws="1" shadows="parse_old" shadowed-by="parse_new">
                    <return-value transfer-ownership="none" nullable="1"><type name="utf8"/></return-value>
                </function>
            `),
        );
        const fn = result.functions[0];
        expect(fn?.throws).toBe(true);
        expect(fn?.shadows).toBe("parse_old");
        expect(fn?.shadowedBy).toBe("parse_new");
        expect(fn?.returnType.transferOwnership).toBe("none");
        expect(fn?.returnType.nullable).toBe(true);
    });
});

describe("adaptNamespace / properties (1)", () => {
    it("parses property metadata including default-value, readable/writable, construct-only", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="visible" writable="1" construct-only="0" default-value="true">
                        <type name="gboolean"/>
                    </property>
                </class>
            `),
        );
        const prop = result.classes[0]?.properties[0];
        expect(prop?.name).toBe("visible");
        expect(prop?.writable).toBe(true);
        expect(prop?.readable).toBe(true);
        expect(prop?.constructOnly).toBe(false);
        expect(prop?.defaultValueRaw).toBe("true");
        expect(prop?.type.name).toBe("gboolean");
    });

    it("honours top-level getter and setter attributes on properties", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="name" getter="get_name" setter="set_name">
                        <type name="utf8"/>
                    </property>
                </class>
            `),
        );
        const prop = result.classes[0]?.properties[0];
        expect(prop?.getter).toBe("get_name");
        expect(prop?.setter).toBe("set_name");
    });
});

describe("adaptNamespace / properties (2)", () => {
    it("applies org.gtk.Property.get/set attribute overrides", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="label">
                        <attribute name="org.gtk.Property.get" value="get_label"/>
                        <attribute name="org.gtk.Property.set" value="set_label"/>
                        <type name="utf8"/>
                    </property>
                </class>
            `),
        );
        const prop = result.classes[0]?.properties[0];
        expect(prop?.getter).toBe("get_label");
        expect(prop?.setter).toBe("set_label");
    });

    it("applies a single org.gtk.Property attribute", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="value">
                        <attribute name="org.gtk.Property.get" value="get_value"/>
                        <type name="gint"/>
                    </property>
                </class>
            `),
        );
        const prop = result.classes[0]?.properties[0];
        expect(prop?.getter).toBe("get_value");
        expect(prop?.setter).toBeUndefined();
    });
});

describe("adaptNamespace / properties (3)", () => {
    it("ignores unrelated property attributes", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="hint">
                        <attribute name="unrelated.attr" value="ignored"/>
                        <type name="utf8"/>
                    </property>
                </class>
            `),
        );
        const prop = result.classes[0]?.properties[0];
        expect(prop?.getter).toBeUndefined();
        expect(prop?.setter).toBeUndefined();
    });

    it("tracks readable=0 as not readable", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <property name="opaque" readable="0">
                        <type name="utf8"/>
                    </property>
                </class>
            `),
        );
        expect(result.classes[0]?.properties[0]?.readable).toBe(false);
    });
});

describe("adaptNamespace / signals (1)", () => {
    it("parses signals with parameters and when=last", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <glib:signal name="clicked" when="last">
                        <return-value><type name="none"/></return-value>
                        <parameters>
                            <parameter name="x"><type name="gdouble"/></parameter>
                        </parameters>
                    </glib:signal>
                </class>
            `),
        );
        const signal = result.classes[0]?.signals[0];
        assert(signal !== undefined);
        expect(signal.name).toBe("clicked");
        expect(signal.when).toBe("last");
        assert(signal.parameters !== undefined);
        expect(signal.parameters.length).toBe(1);
        expect(signal.parameters[0]?.name).toBe("x");
    });

    it("falls back to when=last when `when` is unrecognized", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <glib:signal name="custom" when="never">
                        <return-value><type name="none"/></return-value>
                    </glib:signal>
                </class>
            `),
        );
        expect(result.classes[0]?.signals[0]?.when).toBe("last");
    });

    it("preserves when=first and when=cleanup", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <glib:signal name="a" when="first"><return-value><type name="none"/></return-value></glib:signal>
                    <glib:signal name="b" when="cleanup"><return-value><type name="none"/></return-value></glib:signal>
                </class>
            `),
        );
        expect(result.classes[0]?.signals[0]?.when).toBe("first");
        expect(result.classes[0]?.signals[1]?.when).toBe("cleanup");
    });
});

describe("adaptNamespace / signals (2)", () => {
    it("returns an empty parameter list when the signal has no parameters element", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <glib:signal name="noisy">
                        <return-value><type name="none"/></return-value>
                    </glib:signal>
                </class>
            `),
        );
        expect(result.classes[0]?.signals[0]?.parameters).toEqual([]);
    });
});

describe("adaptNamespace / return types", () => {
    it("marks container transfer-ownership", () => {
        const result = adapt(
            createMinimalGir(`
                <function name="batch" c:identifier="test_batch">
                    <return-value transfer-ownership="container"><type name="utf8"/></return-value>
                </function>
            `),
        );
        expect(result.functions[0]?.returnType.transferOwnership).toBe("container");
    });

    it("returns void when no return value is provided", () => {
        const result = adapt(
            createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <method name="bare" c:identifier="test_widget_bare"/>
                </class>
            `),
        );
        expect(result.classes[0]?.methods[0]?.returnType.name).toBe("void");
    });
});

describe("adaptNamespace / array and GLib container types (1)", () => {
    it("parses an inline <array> element without a name attribute", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="zeros" c:identifier="test_zeros">
                    <return-value>
                        <array zero-terminated="0" fixed-size="4">
                            <type name="gint"/>
                        </array>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.name).toBe("array");
        expect(fn?.returnType.isArray).toBe(true);
        expect(fn?.returnType.zeroTerminated).toBe(false);
        expect(fn?.returnType.fixedSize).toBe(4);
        expect(fn?.returnType.elementType?.name).toBe("gint");
    });

    it("returns the void type when the type node has neither name nor array markers", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="weird" c:identifier="test_weird">
                    <return-value><type/></return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.name).toBe("void");
    });
});

describe("adaptNamespace / array and GLib container types (2)", () => {
    it("parses GLib.HashTable container with key and value type parameters", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="map" c:identifier="test_map">
                    <return-value>
                        <type name="GLib.HashTable">
                            <type name="utf8"/>
                            <type name="gint"/>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.name).toBe("GLib.HashTable");
        expect(fn?.returnType.containerType).toBe("ghashtable");
        expect(fn?.returnType.typeParameters?.length).toBe(2);
        expect(fn?.returnType.elementType?.name).toBe("gint");
    });

    it("parses GLib.PtrArray container", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="items" c:identifier="test_items">
                    <return-value>
                        <type name="GLib.PtrArray">
                            <type name="utf8"/>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.containerType).toBe("gptrarray");
        expect(fn?.returnType.elementType?.name).toBe("utf8");
    });
});

describe("adaptNamespace / array and GLib container types (3)", () => {
    it("parses GLib.Array container", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="ints" c:identifier="test_ints">
                    <return-value>
                        <type name="GLib.Array">
                            <type name="gint"/>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.containerType).toBe("garray");
        expect(fn?.returnType.elementType?.name).toBe("gint");
    });

    it("parses GLib.ByteArray with a synthesized guint8 element type", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="bytes" c:identifier="test_bytes">
                    <return-value><type name="GLib.ByteArray"/></return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.name).toBe("GLib.ByteArray");
        expect(fn?.returnType.containerType).toBe("gbytearray");
        expect(fn?.returnType.elementType?.name).toBe("guint8");
    });

    it("parses GLib.List as a glist-typed array", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="walk" c:identifier="test_walk">
                    <return-value>
                        <type name="GLib.List">
                            <type name="utf8"/>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.name).toBe("array");
        expect(fn?.returnType.containerType).toBe("glist");
        expect(fn?.returnType.elementType?.name).toBe("utf8");
    });
});

describe("adaptNamespace / array and GLib container types (4)", () => {
    it("parses GLib.SList as a gslist-typed array", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="walk" c:identifier="test_walk">
                    <return-value>
                        <type name="GLib.SList">
                            <type name="utf8"/>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.containerType).toBe("gslist");
    });

    it("parses GLib.List with no inner type", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="walk" c:identifier="test_walk">
                    <return-value><type name="GLib.List"/></return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.containerType).toBe("glist");
        expect(fn?.returnType.elementType).toBeUndefined();
    });
});

describe("adaptNamespace / type parameters", () => {
    it("collects type parameters from <array> children", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="frame" c:identifier="test_frame">
                    <return-value>
                        <type name="GLib.HashTable">
                            <array>
                                <type name="gint"/>
                            </array>
                            <array>
                                <type name="utf8"/>
                            </array>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.typeParameters?.length).toBe(2);
        expect(fn?.returnType.typeParameters?.[0]?.isArray).toBe(true);
    });

    it("collects a single <array> child as a type parameter", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="frame" c:identifier="test_frame">
                    <return-value>
                        <type name="GLib.PtrArray">
                            <array>
                                <type name="gint"/>
                            </array>
                        </type>
                    </return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.returnType.typeParameters?.length).toBe(1);
        expect(fn?.returnType.typeParameters?.[0]?.isArray).toBe(true);
    });
});

describe("adaptNamespace / doc extraction", () => {
    it("ignores doc nodes without text content", () => {
        const fn = adapt(
            createMinimalGir(`
                <function name="thing" c:identifier="test_thing">
                    <doc/>
                    <return-value><type name="none"/></return-value>
                </function>
            `),
        ).functions[0];
        expect(fn?.doc).toBeUndefined();
    });
});
