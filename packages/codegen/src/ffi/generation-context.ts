import type { ExternalTypeUsage, TypeMapper } from "@gtkx/gir";

export class GenerationContext {
    usesRef = false;
    usesCall = false;
    usesInstantiating = false;
    addGioImport = false;
    usesType = false;
    usesRead = false;
    usesWrite = false;
    usesAlloc = false;
    usesNativeError = false;
    usesNativeObject = false;
    usesGetNativeObject = false;
    usesRegisterNativeClass = false;
    usesGetClassByTypeName = false;
    usesSignalMeta = false;

    usedEnums = new Set<string>();
    usedRecords = new Set<string>();
    usedExternalTypes = new Map<string, ExternalTypeUsage>();
    usedSameNamespaceClasses = new Map<string, string>();
    usedInterfaces = new Map<string, string>();
    signalClasses = new Map<string, string>();
    recordNameToFile = new Map<string, string>();
    interfaceNameToFile = new Map<string, string>();
    cyclicReturnTypes = new Set<string>();
    methodRenames = new Map<string, string>();

    currentSharedLibrary = "";

    reset(typeMapper: TypeMapper): void {
        this.usesRef = false;
        this.usesCall = false;
        this.usesInstantiating = false;
        this.addGioImport = false;
        this.usesType = false;
        this.usesRead = false;
        this.usesWrite = false;
        this.usesAlloc = false;
        this.usesNativeError = false;
        this.usesNativeObject = false;
        this.usesGetNativeObject = false;
        this.usesRegisterNativeClass = false;
        this.usesGetClassByTypeName = false;
        this.usesSignalMeta = false;

        this.usedEnums.clear();
        this.usedRecords.clear();
        this.usedExternalTypes.clear();
        this.usedSameNamespaceClasses.clear();
        this.usedInterfaces.clear();
        this.signalClasses.clear();
        this.cyclicReturnTypes.clear();
        this.methodRenames.clear();

        typeMapper.setEnumUsageCallback((enumName) => this.usedEnums.add(enumName));
        typeMapper.setRecordUsageCallback((recordName) => this.usedRecords.add(recordName));
        typeMapper.setExternalTypeUsageCallback((usage) => {
            const key = `${usage.namespace}.${usage.transformedName}`;
            this.usedExternalTypes.set(key, usage);
        });
        typeMapper.setSameNamespaceClassUsageCallback((className, originalName) => {
            this.usedSameNamespaceClasses.set(className, originalName);
        });
    }
}
