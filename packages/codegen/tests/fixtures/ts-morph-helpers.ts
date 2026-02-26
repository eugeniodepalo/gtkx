import { ModuleKind, Project, ScriptTarget, type SourceFile } from "ts-morph";

export function createTestProject(): Project {
    return new Project({
        compilerOptions: {
            strict: true,
            target: ScriptTarget.ESNext,
            module: ModuleKind.ESNext,
        },
        useInMemoryFileSystem: true,
    });
}

export function createTestSourceFile(project: Project, name = "test.ts"): SourceFile {
    return project.createSourceFile(name, "", { overwrite: true });
}

export function getGeneratedCode(sourceFile: SourceFile): string {
    return sourceFile.getFullText();
}
