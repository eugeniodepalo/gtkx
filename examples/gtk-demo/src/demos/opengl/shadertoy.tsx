import type * as Gdk from "@gtkx/ffi/gdk";
import {
    GL_ARRAY_BUFFER,
    GL_COLOR_BUFFER_BIT,
    GL_COMPILE_STATUS,
    GL_FLOAT,
    GL_FRAGMENT_SHADER,
    GL_LINK_STATUS,
    GL_STATIC_DRAW,
    GL_TRIANGLE_STRIP,
    GL_VERTEX_SHADER,
    glAttachShader,
    glBindBuffer,
    glBindVertexArray,
    glBufferData,
    glClear,
    glClearColor,
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
    glGetProgramiv,
    glGetShaderiv,
    glGetUniformLocation,
    glLinkProgram,
    glShaderSource,
    glUniform1f,
    glUniform2f,
    glUseProgram,
    glVertexAttribPointer,
    glViewport,
} from "@gtkx/ffi/gl";
import * as Gtk from "@gtkx/ffi/gtk";
import * as GtkSource from "@gtkx/ffi/gtksource";
import {
    GtkBox,
    GtkButton,
    GtkFrame,
    GtkGLArea,
    GtkLabel,
    GtkPaned,
    GtkScrolledWindow,
    GtkSourceView,
} from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./shadertoy.tsx?raw";

// Minimal vertex shader - just passes through a fullscreen quad
const VERTEX_SHADER = `#version 330 core
layout (location = 0) in vec2 aPos;
out vec2 fragCoord;
uniform vec2 iResolution;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
    fragCoord = (aPos * 0.5 + 0.5) * iResolution;
}`;

// Default fragment shader - a simple plasma effect
const DEFAULT_SHADER = `// Shadertoy-compatible uniforms:
// iTime - elapsed time in seconds
// iResolution - viewport resolution in pixels
// iMouse - mouse position (x,y = current, z,w = click)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Create a simple plasma effect
    float t = iTime * 0.5;

    float v = 0.0;
    v += sin((uv.x * 10.0) + t);
    v += sin((uv.y * 10.0) + t);
    v += sin((uv.x * 10.0 + uv.y * 10.0) + t);

    float cx = uv.x + 0.5 * sin(t / 5.0);
    float cy = uv.y + 0.5 * cos(t / 3.0);
    v += sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);

    v = v / 2.0;

    vec3 col = vec3(
        sin(v * 3.14159) * 0.5 + 0.5,
        sin(v * 3.14159 + 2.094) * 0.5 + 0.5,
        sin(v * 3.14159 + 4.188) * 0.5 + 0.5
    );

    fragColor = vec4(col, 1.0);
}`;

// Preset shaders
const SHADER_PRESETS: { name: string; code: string }[] = [
    { name: "Plasma", code: DEFAULT_SHADER },
    {
        name: "Tunnel",
        code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy - 0.5;
    uv.x *= iResolution.x / iResolution.y;

    float a = atan(uv.y, uv.x);
    float r = length(uv);

    float t = iTime;

    vec2 tc = vec2(a / 3.14159, 1.0 / r + t * 0.5);

    float c = mod(floor(tc.x * 8.0) + floor(tc.y * 8.0), 2.0);
    c = mix(0.2, 0.8, c);

    c *= r * 2.0; // Fade towards center

    fragColor = vec4(vec3(c), 1.0);
}`,
    },
    {
        name: "Waves",
        code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float wave = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        wave += sin(uv.x * 10.0 * (fi + 1.0) + iTime * (fi + 1.0) * 0.5) * 0.1;
        wave += sin(uv.y * 8.0 * (fi + 1.0) + iTime * (fi + 1.5) * 0.3) * 0.1;
    }

    float d = abs(uv.y - 0.5 - wave);
    float intensity = smoothstep(0.1, 0.0, d);

    vec3 col = mix(
        vec3(0.1, 0.1, 0.2),
        vec3(0.2, 0.5, 0.9),
        intensity
    );

    fragColor = vec4(col, 1.0);
}`,
    },
    {
        name: "Mandelbrot",
        code: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Zoom and pan with time
    float zoom = 2.0 + sin(iTime * 0.1) * 1.5;
    vec2 c = uv * zoom + vec2(-0.5, 0.0);

    vec2 z = vec2(0.0);
    float iter = 0.0;
    const float maxIter = 100.0;

    for (float i = 0.0; i < maxIter; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) break;
        iter++;
    }

    float t = iter / maxIter;
    vec3 col = vec3(
        0.5 + 0.5 * cos(3.0 + t * 15.0),
        0.5 + 0.5 * cos(3.0 + t * 15.0 + 0.6),
        0.5 + 0.5 * cos(3.0 + t * 15.0 + 1.0)
    );

    if (iter >= maxIter - 1.0) col = vec3(0.0);

    fragColor = vec4(col, 1.0);
}`,
    },
];

// Wrap user shader with uniforms and main
function wrapShaderCode(userCode: string): string {
    return `#version 330 core
in vec2 fragCoord;
out vec4 FragColor;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

${userCode}

void main() {
    mainImage(FragColor, fragCoord);
}`;
}

// Fullscreen quad vertices
const QUAD_VERTICES = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];

interface GLState {
    program: number;
    vao: number;
    vbo: number;
    uniforms: {
        time: number;
        resolution: number;
        mouse: number;
    };
    initialized: boolean;
}

const ShadertoyDemo = () => {
    const glAreaRef = useRef<Gtk.GLArea | null>(null);
    const glStateRef = useRef<GLState>({
        program: 0,
        vao: 0,
        vbo: 0,
        uniforms: { time: -1, resolution: -1, mouse: -1 },
        initialized: false,
    });

    const [shaderCode, setShaderCode] = useState(DEFAULT_SHADER);
    const [compiledCode, setCompiledCode] = useState(DEFAULT_SHADER);
    const [compileError, setCompileError] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(true);
    const [time, setTime] = useState(0);
    const [resolution, setResolution] = useState({ x: 400, y: 300 });
    const [mouse] = useState({ x: 0, y: 0, z: 0, w: 0 });

    const startTimeRef = useRef(Date.now());

    // Create GtkSourceBuffer for the shader editor
    const buffer = useMemo(() => {
        const buf = new GtkSource.Buffer();
        const langManager = GtkSource.LanguageManager.getDefault();
        const language = langManager.getLanguage("glsl");
        if (language) {
            buf.setLanguage(language);
        }
        const schemeManager = GtkSource.StyleSchemeManager.getDefault();
        const scheme = schemeManager.getScheme("Adwaita-dark");
        if (scheme) {
            buf.setStyleScheme(scheme);
        }
        buf.setHighlightSyntax(true);
        buf.setText(shaderCode, -1);
        return buf;
    }, [shaderCode]);

    // Animation loop
    useEffect(() => {
        if (!isAnimating) return;

        const intervalId = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setTime(elapsed);
        }, 16);

        return () => clearInterval(intervalId);
    }, [isAnimating]);

    // Queue render when time changes
    useEffect(() => {
        if (glAreaRef.current) {
            glAreaRef.current.queueRender();
        }
    }, []);

    // Compile shader when compiledCode changes
    useEffect(() => {
        const area = glAreaRef.current;
        if (!area || !glStateRef.current.initialized) return;

        area.makeCurrent();

        try {
            const fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
            glShaderSource(fragmentShader, wrapShaderCode(compiledCode));
            glCompileShader(fragmentShader);

            const compileStatus = glGetShaderiv(fragmentShader, GL_COMPILE_STATUS);
            if (compileStatus === 0) {
                setCompileError("Shader compilation failed. Check your GLSL syntax.");
                glDeleteShader(fragmentShader);
                return;
            }

            const vertexShader = glCreateShader(GL_VERTEX_SHADER);
            glShaderSource(vertexShader, VERTEX_SHADER);
            glCompileShader(vertexShader);

            const program = glCreateProgram();
            glAttachShader(program, vertexShader);
            glAttachShader(program, fragmentShader);
            glLinkProgram(program);

            const linkStatus = glGetProgramiv(program, GL_LINK_STATUS);
            if (linkStatus === 0) {
                setCompileError("Shader linking failed.");
                glDeleteShader(vertexShader);
                glDeleteShader(fragmentShader);
                glDeleteProgram(program);
                return;
            }

            // Clean up old program
            if (glStateRef.current.program) {
                glDeleteProgram(glStateRef.current.program);
            }

            glDeleteShader(vertexShader);
            glDeleteShader(fragmentShader);

            // Update state with new program
            glStateRef.current.program = program;
            glStateRef.current.uniforms = {
                time: glGetUniformLocation(program, "iTime"),
                resolution: glGetUniformLocation(program, "iResolution"),
                mouse: glGetUniformLocation(program, "iMouse"),
            };

            setCompileError(null);
        } catch (e) {
            setCompileError(`Error: ${e}`);
        }
    }, [compiledCode]);

    const handleRealize = useCallback((self: Gtk.Widget) => {
        const glArea = self as Gtk.GLArea;
        glArea.makeCurrent();

        try {
            // Create initial shaders
            const vertexShader = glCreateShader(GL_VERTEX_SHADER);
            glShaderSource(vertexShader, VERTEX_SHADER);
            glCompileShader(vertexShader);

            const fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
            glShaderSource(fragmentShader, wrapShaderCode(DEFAULT_SHADER));
            glCompileShader(fragmentShader);

            const program = glCreateProgram();
            glAttachShader(program, vertexShader);
            glAttachShader(program, fragmentShader);
            glLinkProgram(program);

            glDeleteShader(vertexShader);
            glDeleteShader(fragmentShader);

            // Create VAO and VBO for fullscreen quad
            const vao = glGenVertexArray();
            glBindVertexArray(vao);

            const vbo = glGenBuffer();
            glBindBuffer(GL_ARRAY_BUFFER, vbo);
            glBufferData(GL_ARRAY_BUFFER, QUAD_VERTICES, GL_STATIC_DRAW);

            glVertexAttribPointer(0, 2, GL_FLOAT, false, 0, 0);
            glEnableVertexAttribArray(0);

            glBindVertexArray(0);

            glStateRef.current = {
                program,
                vao,
                vbo,
                uniforms: {
                    time: glGetUniformLocation(program, "iTime"),
                    resolution: glGetUniformLocation(program, "iResolution"),
                    mouse: glGetUniformLocation(program, "iMouse"),
                },
                initialized: true,
            };
        } catch (e) {
            setCompileError(`Initialization error: ${e}`);
        }
    }, []);

    const handleUnrealize = useCallback((self: Gtk.Widget) => {
        const glArea = self as Gtk.GLArea;
        glArea.makeCurrent();

        const state = glStateRef.current;
        if (state.initialized) {
            glDeleteBuffer(state.vbo);
            glDeleteVertexArray(state.vao);
            glDeleteProgram(state.program);
            state.initialized = false;
        }
    }, []);

    const handleRender = useCallback(
        (_self: Gtk.GLArea, _context: Gdk.GLContext) => {
            const state = glStateRef.current;
            if (!state.initialized) return true;

            glClearColor(0, 0, 0, 1);
            glClear(GL_COLOR_BUFFER_BIT);

            glUseProgram(state.program);

            // Set uniforms
            if (state.uniforms.time >= 0) {
                glUniform1f(state.uniforms.time, time);
            }
            if (state.uniforms.resolution >= 0) {
                glUniform2f(state.uniforms.resolution, resolution.x, resolution.y);
            }
            if (state.uniforms.mouse >= 0) {
                glUniform2f(state.uniforms.mouse, mouse.x, mouse.y);
            }

            glBindVertexArray(state.vao);
            glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
            glBindVertexArray(0);

            glUseProgram(0);

            return true;
        },
        [time, resolution, mouse],
    );

    const handleResize = useCallback((_self: Gtk.GLArea, width: number, height: number) => {
        setResolution({ x: width, y: height });
        glViewport(0, 0, width, height);
    }, []);

    const handleCompile = useCallback(() => {
        const start = new Gtk.TextIter();
        const end = new Gtk.TextIter();
        buffer.getStartIter(start);
        buffer.getEndIter(end);
        const text = buffer.getText(start, end, false);
        setShaderCode(text);
        setCompiledCode(text);
    }, [buffer]);

    const loadPreset = useCallback(
        (preset: (typeof SHADER_PRESETS)[0]) => {
            buffer.setText(preset.code, -1);
            setShaderCode(preset.code);
            setCompiledCode(preset.code);
            startTimeRef.current = Date.now();
            setTime(0);
        },
        [buffer],
    );

    const handleReset = useCallback(() => {
        startTimeRef.current = Date.now();
        setTime(0);
    }, []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Shadertoy" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="A GLSL shader playground inspired by Shadertoy. Write fragment shaders using Shadertoy-compatible uniforms (iTime, iResolution, iMouse) and see them render in real-time."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Shader Playground">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    {/* Preset buttons */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkLabel label="Presets:" cssClasses={["dim-label"]} />
                        {SHADER_PRESETS.map((preset) => (
                            <GtkButton
                                key={preset.name}
                                label={preset.name}
                                onClicked={() => loadPreset(preset)}
                                cssClasses={["flat"]}
                            />
                        ))}
                    </GtkBox>

                    <GtkPaned orientation={Gtk.Orientation.HORIZONTAL} shrinkStartChild={false} shrinkEndChild={false}>
                        {/* Editor */}
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} widthRequest={400}>
                            <GtkScrolledWindow vexpand hexpand heightRequest={300}>
                                <GtkSourceView
                                    buffer={buffer}
                                    showLineNumbers
                                    highlightCurrentLine
                                    tabWidth={4}
                                    leftMargin={8}
                                    rightMargin={8}
                                    topMargin={8}
                                    bottomMargin={8}
                                    monospace
                                />
                            </GtkScrolledWindow>

                            {compileError && (
                                <GtkLabel label={compileError} cssClasses={["error"]} halign={Gtk.Align.START} wrap />
                            )}

                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                <GtkButton
                                    label="Compile"
                                    onClicked={handleCompile}
                                    cssClasses={["suggested-action"]}
                                />
                                <GtkButton
                                    label={isAnimating ? "Pause" : "Play"}
                                    onClicked={() => setIsAnimating(!isAnimating)}
                                />
                                <GtkButton label="Reset Time" onClicked={handleReset} />
                            </GtkBox>
                        </GtkBox>

                        {/* Preview */}
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand>
                            <GtkGLArea
                                ref={glAreaRef}
                                onRealize={handleRealize}
                                onUnrealize={handleUnrealize}
                                onRender={handleRender}
                                onResize={handleResize}
                                hexpand
                                vexpand
                                widthRequest={400}
                                heightRequest={300}
                                cssClasses={["card"]}
                            />
                            <GtkLabel
                                label={`Time: ${time.toFixed(2)}s | Resolution: ${resolution.x}x${resolution.y}`}
                                cssClasses={["dim-label", "caption"]}
                                halign={Gtk.Align.CENTER}
                            />
                        </GtkBox>
                    </GtkPaned>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Available Uniforms">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label={`float iTime        - Elapsed time in seconds
vec2 iResolution   - Viewport resolution in pixels
vec4 iMouse        - Mouse position (x,y = current, z,w = click)

Define your shader in a mainImage function:
void mainImage(out vec4 fragColor, in vec2 fragCoord)`}
                        halign={Gtk.Align.START}
                        cssClasses={["monospace"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const shadertoyDemo: Demo = {
    id: "shadertoy",
    title: "Shadertoy",
    description: "GLSL shader playground with live editing",
    keywords: ["opengl", "gl", "shader", "glsl", "shadertoy", "fragment", "live", "editor", "creative"],
    component: ShadertoyDemo,
    sourceCode,
};
