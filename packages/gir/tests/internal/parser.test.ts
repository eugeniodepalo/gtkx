import { describe, expect, it } from "vitest";
import { GirParser } from "../../src/internal/parser.js";

const createMinimalGir = (namespaceContent: string, name = "Test", version = "1.0") => `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0"
    xmlns:c="http://www.gtk.org/introspection/c/1.0"
    xmlns:glib="http://www.gtk.org/introspection/glib/1.0">
    <include name="GObject" version="2.0"/>
    <namespace name="${name}" version="${version}" shared-library="libtest.so"
        c:identifier-prefixes="Test" c:symbol-prefixes="test">
        ${namespaceContent}
    </namespace>
</repository>`;

describe("GirParser", () => {
    describe("parseHeader", () => {
        it("extracts namespace name and version", () => {
            const parser = new GirParser();
            const header = parser.parseHeader(createMinimalGir(""));
            expect(header.namespaceName).toBe("Test");
            expect(header.namespaceVersion).toBe("1.0");
        });

        it("extracts include dependencies", () => {
            const parser = new GirParser();
            const header = parser.parseHeader(createMinimalGir(""));
            expect(header.dependencies).toEqual([{ name: "GObject", version: "2.0" }]);
        });

        it("extracts multiple dependencies", () => {
            const parser = new GirParser();
            const xml = `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0">
    <include name="Gio" version="2.0"/>
    <include name="Gtk" version="4.0"/>
    <namespace name="Adw" version="1" shared-library="libadwaita-1.so.0"
        c:identifier-prefixes="Adw">
    </namespace>
</repository>`;
            const header = parser.parseHeader(xml);
            expect(header.namespaceName).toBe("Adw");
            expect(header.dependencies).toEqual([
                { name: "Gio", version: "2.0" },
                { name: "Gtk", version: "4.0" },
            ]);
        });
    });

    describe("parseNamespace", () => {
        it("parses namespace metadata", () => {
            const parser = new GirParser();
            const result = parser.parseNamespace(createMinimalGir(""));
            expect(result.name).toBe("Test");
            expect(result.version).toBe("1.0");
            expect(result.sharedLibrary).toBe("libtest.so");
            expect(result.cPrefix).toBe("Test");
        });

        it("initializes empty arrays for all type collections", () => {
            const parser = new GirParser();
            const result = parser.parseNamespace(createMinimalGir(""));
            expect(result.classes).toEqual([]);
            expect(result.interfaces).toEqual([]);
            expect(result.functions).toEqual([]);
            expect(result.enumerations).toEqual([]);
            expect(result.bitfields).toEqual([]);
            expect(result.records).toEqual([]);
            expect(result.callbacks).toEqual([]);
            expect(result.constants).toEqual([]);
        });

        it("parses basic class", () => {
            const parser = new GirParser();
            const gir = createMinimalGir(`
                <class name="Widget" c:type="TestWidget" parent="GObject.Object" abstract="1"
                    glib:type-name="TestWidget" glib:get-type="test_widget_get_type"/>
            `);
            const result = parser.parseNamespace(gir);
            expect(result.classes.length).toBe(1);
            expect(result.classes[0]?.name).toBe("Widget");
            expect(result.classes[0]?.parent).toBe("GObject.Object");
            expect(result.classes[0]?.abstract).toBe(true);
        });

        it("parses enumeration with members", () => {
            const parser = new GirParser();
            const gir = createMinimalGir(`
                <enumeration name="Orientation" c:type="TestOrientation">
                    <member name="horizontal" value="0" c:identifier="TEST_ORIENTATION_HORIZONTAL"/>
                    <member name="vertical" value="1" c:identifier="TEST_ORIENTATION_VERTICAL"/>
                </enumeration>
            `);
            const result = parser.parseNamespace(gir);
            expect(result.enumerations.length).toBe(1);
            expect(result.enumerations[0]?.members.length).toBe(2);
            expect(result.enumerations[0]?.members[0]?.name).toBe("horizontal");
        });

        it("parses method with parameters", () => {
            const parser = new GirParser();
            const gir = createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <method name="set_name" c:identifier="test_widget_set_name">
                        <return-value><type name="none"/></return-value>
                        <parameters>
                            <instance-parameter name="self"><type name="Widget"/></instance-parameter>
                            <parameter name="name"><type name="utf8"/></parameter>
                        </parameters>
                    </method>
                </class>
            `);
            const result = parser.parseNamespace(gir);
            const method = result.classes[0]?.methods[0];
            expect(method?.name).toBe("set_name");
            expect(method?.parameters.length).toBe(1);
            expect(method?.instanceParameter).toBeDefined();
        });

        it("filters non-introspectable methods", () => {
            const parser = new GirParser();
            const gir = createMinimalGir(`
                <class name="Widget" c:type="TestWidget">
                    <method name="visible" c:identifier="test_widget_visible">
                        <return-value><type name="gboolean"/></return-value>
                    </method>
                    <method name="internal" c:identifier="test_widget_internal" introspectable="0">
                        <return-value><type name="none"/></return-value>
                    </method>
                </class>
            `);
            const result = parser.parseNamespace(gir);
            expect(result.classes[0]?.methods.length).toBe(1);
            expect(result.classes[0]?.methods[0]?.name).toBe("visible");
        });
    });
});
