import type * as Gdk from "@gtkx/ffi/gdk";
import {
    GL_ARRAY_BUFFER,
    GL_COLOR_BUFFER_BIT,
    GL_DEPTH_BUFFER_BIT,
    GL_FLOAT,
    GL_FRAGMENT_SHADER,
    GL_STATIC_DRAW,
    GL_TRIANGLES,
    GL_VERTEX_SHADER,
    glAttachShader,
    glBindBuffer,
    glBindVertexArray,
    glBufferData,
    glClear,
    glClearColor,
    glClearDepth,
    glCompileShader,
    glCreateProgram,
    glCreateShader,
    glDeleteBuffer,
    glDeleteProgram,
    glDeleteShader,
    glDeleteVertexArray,
    glDrawArrays,
    glEnableVertexAttribArray,
    glGenBuffer,
    glGenVertexArray,
    glGetUniformLocation,
    glLinkProgram,
    glShaderSource,
    glUniform4f,
    glUseProgram,
    glVertexAttribPointer,
    glViewport,
} from "@gtkx/ffi/gl";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkGLArea, GtkLabel } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./glarea.tsx?raw";

// Vertex shader - transforms vertices and passes color to fragment shader
const VERTEX_SHADER = `#version 330 core
layout (location = 0) in vec3 aPos;
uniform vec4 uColor;
out vec4 vertexColor;
void main() {
    gl_Position = vec4(aPos, 1.0);
    vertexColor = uColor;
}`;

// Fragment shader - outputs the interpolated color
const FRAGMENT_SHADER = `#version 330 core
in vec4 vertexColor;
out vec4 FragColor;
void main() {
    FragColor = vertexColor;
}`;

// Triangle vertices (x, y, z)
const TRIANGLE_VERTICES = [
    0.0,
    0.5,
    0.0, // top
    -0.5,
    -0.5,
    0.0, // bottom left
    0.5,
    -0.5,
    0.0, // bottom right
];

// GL state stored between renders
interface GLState {
    program: number;
    vao: number;
    vbo: number;
    colorLocation: number;
    initialized: boolean;
}

const GLAreaDemo = () => {
    const glAreaRef = useRef<Gtk.GLArea | null>(null);
    const glStateRef = useRef<GLState>({
        program: 0,
        vao: 0,
        vbo: 0,
        colorLocation: -1,
        initialized: false,
    });
    const [clearColor, setClearColor] = useState({ r: 0.2, g: 0.2, b: 0.3, a: 1.0 });
    const [triangleColor, setTriangleColor] = useState({ r: 0.9, g: 0.3, b: 0.3, a: 1.0 });
    const [error, setError] = useState<string | null>(null);

    // Initialize GL resources when the area is realized
    const handleRealize = useCallback((self: Gtk.Widget) => {
        const glArea = self as Gtk.GLArea;
        glArea.makeCurrent();

        const glError = glArea.getError();
        if (glError) {
            setError(`GL context error: ${glError.message}`);
            return;
        }

        try {
            // Create and compile vertex shader
            const vertexShader = glCreateShader(GL_VERTEX_SHADER);
            glShaderSource(vertexShader, VERTEX_SHADER);
            glCompileShader(vertexShader);

            // Create and compile fragment shader
            const fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
            glShaderSource(fragmentShader, FRAGMENT_SHADER);
            glCompileShader(fragmentShader);

            // Create shader program
            const program = glCreateProgram();
            glAttachShader(program, vertexShader);
            glAttachShader(program, fragmentShader);
            glLinkProgram(program);

            // Clean up shaders (they're now linked into the program)
            glDeleteShader(vertexShader);
            glDeleteShader(fragmentShader);

            // Create VAO and VBO
            const vao = glGenVertexArray();
            glBindVertexArray(vao);

            const vbo = glGenBuffer();
            glBindBuffer(GL_ARRAY_BUFFER, vbo);
            glBufferData(GL_ARRAY_BUFFER, TRIANGLE_VERTICES, GL_STATIC_DRAW);

            // Set up vertex attributes
            glVertexAttribPointer(0, 3, GL_FLOAT, false, 3 * 4, 0);
            glEnableVertexAttribArray(0);

            // Get uniform location
            const colorLocation = glGetUniformLocation(program, "uColor");

            // Store GL state
            glStateRef.current = {
                program,
                vao,
                vbo,
                colorLocation,
                initialized: true,
            };

            glBindVertexArray(0);
        } catch (e) {
            setError(`GL initialization error: ${e}`);
        }
    }, []);

    // Clean up GL resources when the area is unrealized
    const handleUnrealize = useCallback((self: Gtk.Widget) => {
        const glArea = self as Gtk.GLArea;
        glArea.makeCurrent();

        const state = glStateRef.current;
        if (state.initialized) {
            glDeleteBuffer(state.vbo);
            glDeleteVertexArray(state.vao);
            glDeleteProgram(state.program);
            glStateRef.current.initialized = false;
        }
    }, []);

    // Render callback
    const handleRender = useCallback(
        (_self: Gtk.GLArea, _context: Gdk.GLContext) => {
            const state = glStateRef.current;
            if (!state.initialized) {
                return true;
            }

            // Clear the framebuffer
            glClearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
            glClearDepth(1.0);
            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

            // Draw the triangle
            glUseProgram(state.program);
            glUniform4f(state.colorLocation, triangleColor.r, triangleColor.g, triangleColor.b, triangleColor.a);

            glBindVertexArray(state.vao);
            glDrawArrays(GL_TRIANGLES, 0, 3);
            glBindVertexArray(0);

            glUseProgram(0);

            return true;
        },
        [clearColor, triangleColor],
    );

    // Handle resize
    const handleResize = useCallback((_self: Gtk.GLArea, width: number, height: number) => {
        glViewport(0, 0, width, height);
    }, []);

    // Queue redraw when colors change
    useEffect(() => {
        if (glAreaRef.current) {
            glAreaRef.current.queueRender();
        }
    }, []);

    const cycleTriangleColor = () => {
        const colors = [
            { r: 0.9, g: 0.3, b: 0.3, a: 1.0 }, // Red
            { r: 0.3, g: 0.9, b: 0.3, a: 1.0 }, // Green
            { r: 0.3, g: 0.3, b: 0.9, a: 1.0 }, // Blue
            { r: 0.9, g: 0.9, b: 0.3, a: 1.0 }, // Yellow
            { r: 0.9, g: 0.3, b: 0.9, a: 1.0 }, // Magenta
            { r: 0.3, g: 0.9, b: 0.9, a: 1.0 }, // Cyan
        ];
        const currentIndex = colors.findIndex(
            (c) => c.r === triangleColor.r && c.g === triangleColor.g && c.b === triangleColor.b,
        );
        const nextIndex = (currentIndex + 1) % colors.length;
        const nextColor = colors[nextIndex];
        if (nextColor) setTriangleColor(nextColor);
    };

    const cycleClearColor = () => {
        const colors = [
            { r: 0.2, g: 0.2, b: 0.3, a: 1.0 }, // Dark blue
            { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Almost black
            { r: 0.3, g: 0.2, b: 0.2, a: 1.0 }, // Dark red
            { r: 0.2, g: 0.3, b: 0.2, a: 1.0 }, // Dark green
            { r: 0.15, g: 0.15, b: 0.2, a: 1.0 }, // Slate
        ];
        const currentIndex = colors.findIndex(
            (c) => c.r === clearColor.r && c.g === clearColor.g && c.b === clearColor.b,
        );
        const nextIndex = (currentIndex + 1) % colors.length;
        const nextColor = colors[nextIndex];
        if (nextColor) setClearColor(nextColor);
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="GL Area" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkGLArea provides an OpenGL rendering context embedded in a GTK widget. Connect to the 'render' signal to draw with OpenGL, and use 'realize'/'unrealize' signals to initialize and clean up GL resources."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {error && (
                <GtkFrame>
                    <GtkLabel
                        label={error}
                        cssClasses={["error"]}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    />
                </GtkFrame>
            )}

            <GtkFrame label="OpenGL Triangle">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkGLArea
                        ref={glAreaRef}
                        hasDepthBuffer
                        onRealize={handleRealize}
                        onUnrealize={handleUnrealize}
                        onRender={handleRender}
                        onResize={handleResize}
                        widthRequest={400}
                        heightRequest={300}
                        cssClasses={["card"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton label="Change Triangle Color" onClicked={cycleTriangleColor} />
                        <GtkButton label="Change Background" onClicked={cycleClearColor} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="How It Works">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="GtkGLArea Signals:" cssClasses={["heading"]} halign={Gtk.Align.START} />
                    <GtkLabel
                        label={`onRealize: Initialize shaders, buffers, and GL state
onUnrealize: Clean up GL resources
onRender: Called each frame to draw content
onResize: Handle viewport changes`}
                        halign={Gtk.Align.START}
                        cssClasses={["monospace"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const glareaDemo: Demo = {
    id: "glarea",
    title: "GL Area",
    description: "Basic OpenGL rendering with GtkGLArea",
    keywords: ["opengl", "gl", "glarea", "GtkGLArea", "3d", "graphics", "shader", "triangle", "rendering"],
    component: GLAreaDemo,
    sourceCode,
};
