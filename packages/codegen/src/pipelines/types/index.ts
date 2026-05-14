export { runTsForGir } from "./invoke-cli.js";
export { runTypesPipeline, type TypesPipelineResult } from "./pipeline.js";
export {
    injectClassStructRegistryShape,
    injectNativeObjectInheritance,
    loadAndRewrite,
    namespaceFromRawFilename,
    type RewriteResult,
    rewriteDefaultImportsToNamespace,
    rewriteEnumsToConstObjects,
    rewriteModuleKeywordToNamespace,
    rewriteNamespaceDeclarations,
    unwrapOuterNamespace,
} from "./rewrite.js";
