import * as Gtk from "@gtkx/ffi/gtk";
import * as Pango from "@gtkx/ffi/pango";
import * as PangoCairo from "@gtkx/ffi/pangocairo";
import { useApplication } from "@gtkx/react";
import { useEffect } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./printing.tsx?raw";

const HEADER_HEIGHT = (10 * 72) / 25.4;
const HEADER_GAP = (3 * 72) / 25.4;
const FONT_SIZE = 12.0;

const PrintingDemo = () => {
    const app = useApplication();

    useEffect(() => {
        const lines = sourceCode.split("\n");
        const numLines = lines.length;

        const printOp = new Gtk.PrintOperation();
        printOp.setUseFullPage(false);
        printOp.setUnit(Gtk.Unit.POINTS);
        printOp.setEmbedPageSetup(true);

        const settings = new Gtk.PrintSettings();
        settings.set(Gtk.PRINT_SETTINGS_OUTPUT_BASENAME, "gtk-demo");
        printOp.setPrintSettings(settings);

        let linesPerPage = 0;
        let numPages = 0;

        printOp.connect("begin-print", (_self: Gtk.PrintOperation, context: Gtk.PrintContext) => {
            const height = context.getHeight() - HEADER_HEIGHT - HEADER_GAP;
            linesPerPage = Math.floor(height / FONT_SIZE);
            numPages = Math.ceil(numLines / linesPerPage);
            printOp.setNPages(numPages);
        });

        printOp.connect("draw-page", (_self: Gtk.PrintOperation, context: Gtk.PrintContext, pageNr: number) => {
            const cr = context.getCairoContext();
            const width = context.getWidth();

            cr.rectangle(0, 0, width, HEADER_HEIGHT).setSourceRgb(0.8, 0.8, 0.8).fillPreserve();
            cr.setSourceRgb(0, 0, 0).setLineWidth(1).stroke();

            const headerLayout = PangoCairo.createLayout(cr);
            headerLayout.setFontDescription(Pango.FontDescription.fromString("sans 14"));
            headerLayout.setText("printing.tsx", -1);

            const logicalRect = new Pango.Rectangle();
            headerLayout.getPixelExtents(undefined, logicalRect);
            const textWidth = logicalRect.getWidth();
            const textHeight = logicalRect.getHeight();

            cr.moveTo((width - textWidth) / 2, (HEADER_HEIGHT - textHeight) / 2);
            PangoCairo.showLayout(cr, headerLayout);

            const pageStr = `${pageNr + 1}/${numPages}`;
            headerLayout.setText(pageStr, -1);
            headerLayout.getPixelExtents(undefined, logicalRect);
            cr.moveTo(width - logicalRect.getWidth() - 4, (HEADER_HEIGHT - logicalRect.getHeight()) / 2);
            PangoCairo.showLayout(cr, headerLayout);

            const bodyLayout = PangoCairo.createLayout(cr);
            const bodyDesc = Pango.FontDescription.fromString("monospace");
            bodyDesc.setSize(FONT_SIZE * Pango.SCALE);
            bodyLayout.setFontDescription(bodyDesc);

            cr.moveTo(0, HEADER_HEIGHT + HEADER_GAP);

            const startLine = pageNr * linesPerPage;
            for (let i = 0; i < linesPerPage && startLine + i < numLines; i++) {
                bodyLayout.setText(lines[startLine + i] ?? "", -1);
                PangoCairo.showLayout(cr, bodyLayout);
                cr.relMoveTo(0, FONT_SIZE);
            }
        });

        try {
            printOp.run(Gtk.PrintOperationAction.PRINT_DIALOG, app.getActiveWindow() ?? undefined);
        } catch (error) {
            const dialog = new Gtk.AlertDialog();
            dialog.setMessage(`${error}`);
            dialog.show(app.getActiveWindow() ?? undefined);
        }
    }, [app]);

    return null;
};

export const printingDemo: Demo = {
    id: "printing",
    title: "Printing/Printing",
    description: "GtkPrintOperation offers a simple API to support printing in a cross-platform way.",
    keywords: ["print", "printing", "dialog", "GtkPrintOperation"],
    component: PrintingDemo,
    sourceCode,
};
