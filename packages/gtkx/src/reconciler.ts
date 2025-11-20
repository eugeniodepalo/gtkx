import Reconciler from "react-reconciler";
import * as gtk from "@gtkx/ffi/gtk";

type Type = string;
type Props = Record<string, any>;
type Container = any;
type Instance = any;
type TextInstance = never;
type SuspenseInstance = never;
type HydratableInstance = never;
type PublicInstance = Instance;
type HostContext = {};
type UpdatePayload = Record<string, any>;
type ChildSet = never;
type TimeoutHandle = number;
type NoTimeout = -1;

// Dynamically build widget classes map from all exports in gtk module
// Only include classes that inherit from Widget
const widgetClasses: Record<string, any> = {};

for (const [name, value] of Object.entries(gtk)) {
  // Check if it's a class constructor with Widget in its prototype chain
  if (
    typeof value === "function" &&
    value.prototype &&
    gtk.Widget &&
    (value.prototype instanceof gtk.Widget || value === gtk.Widget)
  ) {
    widgetClasses[name] = value;
  }
}

// Store app reference globally for ApplicationWindow creation
let currentApp: any = null;

export function setAppForRendering(app: any): void {
  currentApp = app;
}

function createInstance(
  type: Type,
  props: Props,
  rootContainer: Container
): Instance {
  const WidgetClass = widgetClasses[type];
  if (!WidgetClass) {
    throw new Error(`Unknown widget type: ${type}`);
  }

  // Create the widget instance with appropriate constructor arguments
  let instance: any;

  if (type === "ApplicationWindow") {
    instance = new WidgetClass(currentApp);
  } else if (type === "Box") {
    // Box requires orientation and spacing - use defaults if not provided
    // Don't pass undefined orientation, let GTK use its default
    const spacing = props.spacing ?? 0;
    instance = new WidgetClass(props.orientation, spacing);
  } else if (type === "Separator") {
    // Separator requires orientation
    instance = new WidgetClass(props.orientation);
  } else if (type === "Button" && typeof props.label === "string") {
    instance = WidgetClass.newWithLabel(String(props.label));
  } else if (type === "Label" && typeof props.label === "string") {
    // Use the constructor which calls gtk_label_new
    instance = new WidgetClass(String(props.label));
  } else {
    // For most widgets, call constructor with no arguments
    instance = new WidgetClass();
  }

  // Apply initial props (except those already handled by constructor)
  const propsToApply = { ...props };
  if (type === "Button" && props.label) delete propsToApply.label;
  if (type === "Label" && props.label) delete propsToApply.label;

  updateInstanceProps(instance, {}, propsToApply);

  return instance;
}

function updateInstanceProps(
  instance: Instance,
  oldProps: Props,
  newProps: Props
) {
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allKeys) {
    if (
      key === "children" ||
      key === "orientation" ||
      key === "spacing" ||
      key === "application"
    ) {
      continue; // Skip special props
    }

    const oldValue = oldProps[key];
    const newValue = newProps[key];

    if (oldValue === newValue) {
      continue;
    }

    // Handle event handlers (on* props)
    if (key.startsWith("on") && typeof newValue === "function") {
      // Convert onCloseRequest -> close-request (camelCase to kebab-case)
      const eventName = key
        .slice(2) // Remove "on" prefix
        .replace(/([A-Z])/g, "-$1") // Insert hyphen before capitals
        .toLowerCase() // Convert to lowercase
        .replace(/^-/, ""); // Remove leading hyphen if present
      // Connect signal handler
      instance.connect(eventName, newValue);
      continue;
    }

    // Handle property setters
    const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    if (typeof instance[setterName] === "function") {
      instance[setterName](newValue);
    }
  }
}

function appendChild(parent: Instance, child: Instance): void {
  // Extract the GTK widget pointer from the instance
  // GTK methods expect the raw pointer, not the wrapper instance
  const childPtr = child.ptr;

  // Determine the appropriate method to add child based on parent type
  if (typeof parent.setChild === "function") {
    // For Window, ApplicationWindow, etc.
    parent.setChild(childPtr);
  } else if (typeof parent.append === "function") {
    // For Box and similar containers
    parent.append(childPtr);
  } else if (typeof parent.add === "function") {
    // Legacy GTK3 style
    parent.add(childPtr);
  } else {
    console.warn(`Cannot append child to ${parent.constructor.name}`);
  }
}

function removeChild(parent: Instance, child: Instance): void {
  const childPtr = child.ptr;

  if (typeof parent.remove === "function") {
    parent.remove(childPtr);
  } else if (typeof parent.setChild === "function") {
    parent.setChild(null);
  }
}

function insertBefore(
  parent: Instance,
  child: Instance,
  beforeChild: Instance
): void {
  const childPtr = child.ptr;
  const beforePtr = beforeChild.ptr;

  if (typeof parent.insertChildAfter === "function") {
    // For Box, insert before the specified child
    parent.insertChildAfter(childPtr, beforePtr);
  } else {
    // Fallback to append
    appendChild(parent, child);
  }
}

const hostConfig: Reconciler.HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  ChildSet,
  TimeoutHandle,
  NoTimeout
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,

  noTimeout: -1 as NoTimeout,

  getRootHostContext: (rootContainer: Container): HostContext => {
    return {};
  },

  getChildHostContext: (
    parentHostContext: HostContext,
    type: Type
  ): HostContext => {
    return parentHostContext;
  },

  shouldSetTextContent: (type: Type, props: Props): boolean => {
    return false;
  },

  createInstance,

  createTextInstance: (
    text: string,
    rootContainer: Container
  ): TextInstance => {
    throw new Error("Text nodes are not supported. Use Label widget instead.");
  },

  appendInitialChild: appendChild,

  finalizeInitialChildren: (
    instance: Instance,
    type: Type,
    props: Props
  ): boolean => {
    return false;
  },

  prepareUpdate: (
    instance: Instance,
    type: Type,
    oldProps: Props,
    newProps: Props
  ): UpdatePayload | null => {
    // Always return an update payload if props changed
    return newProps;
  },

  commitUpdate: (
    instance: Instance,
    updatePayload: UpdatePayload,
    type: Type,
    oldProps: Props,
    newProps: Props
  ): void => {
    updateInstanceProps(instance, oldProps, newProps);
  },

  commitMount: (instance: Instance, type: Type, props: Props): void => {
    // Nothing to do here
  },

  appendChild,
  removeChild,
  insertBefore,

  removeChildFromContainer: (container: Container, child: Instance): void => {
    // Root container doesn't need special handling
  },

  appendChildToContainer: (container: Container, child: Instance): void => {
    // The container is the app ID, the child should be presented
    if (typeof child.present === "function") {
      child.present();
    }
  },

  insertInContainerBefore: (
    container: Container,
    child: Instance,
    beforeChild: Instance
  ): void => {
    // Not applicable for GTK
  },

  prepareForCommit: (): null => {
    return null;
  },

  resetAfterCommit: (): void => {
    // Nothing to do
  },

  commitTextUpdate: (
    textInstance: TextInstance,
    oldText: string,
    newText: string
  ): void => {
    throw new Error("Text nodes are not supported");
  },

  clearContainer: (container: Container): void => {
    // Nothing to do
  },

  preparePortalMount: (container: Container): void => {
    // Not implemented
  },

  scheduleTimeout: (
    fn: (...args: unknown[]) => unknown,
    delay?: number
  ): TimeoutHandle => {
    return setTimeout(fn, delay) as any;
  },

  cancelTimeout: (id: TimeoutHandle): void => {
    clearTimeout(id);
  },

  getPublicInstance: (instance: Instance): PublicInstance => {
    return instance;
  },

  getCurrentEventPriority: () => 2 as any, // DefaultEventPriority

  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  detachDeletedInstance: () => {},
};

export const reconciler = Reconciler(hostConfig);
