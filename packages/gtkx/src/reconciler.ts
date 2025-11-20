import * as gtk from "@gtkx/ffi/gtk";
import React from "react";
import Reconciler from "react-reconciler";

type Type = string;
type Props = Record<string, unknown>;
type Container = unknown;

interface GtkWidget {
  ptr: unknown;
  setChild?: (ptr: unknown) => void;
  append?: (ptr: unknown) => void;
  add?: (ptr: unknown) => void;
  remove?: (ptr: unknown) => void;
  insertChildAfter?: (childPtr: unknown, beforePtr: unknown) => void;
  connect?: (signal: string, handler: unknown) => void;
  present?: () => void;
  constructor: { name: string };
  [key: string]: unknown;
}

type Instance = GtkWidget;
type TextInstance = never;
type SuspenseInstance = never;
type HydratableInstance = never;
type PublicInstance = Instance;
type HostContext = Record<string, never>;
type ChildSet = never;
type TimeoutHandle = number;
type NoTimeout = -1;
type TransitionStatus = number;
type FormInstance = never;

// Dynamically build widget classes map from all exports in gtk module
// Only include classes that inherit from Widget
const widgetClasses: Record<string, unknown> = {};

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
let currentApp: unknown = null;

export function setAppForRendering(app: unknown): void {
  currentApp = app;
}

// Helper to convert React.Context to Reconciler.ReactContext
// These types are compatible at runtime but TypeScript sees them as different
function createReconcilerContext<T>(value: T): Reconciler.ReactContext<T> {
  const context = React.createContext<T>(value);
  // React.Context and Reconciler.ReactContext are compatible at runtime
  // but TypeScript treats them as different types
  // @ts-expect-error - React.Context and Reconciler.ReactContext are runtime-compatible
  return context;
}

function createInstance(
  type: Type,
  props: Props,
  _rootContainer: Container
): Instance {
  const WidgetClass = widgetClasses[type] as new (
    ...args: unknown[]
  ) => Instance;
  if (!WidgetClass) {
    throw new Error(`Unknown widget type: ${type}`);
  }

  // Create the widget instance with appropriate constructor arguments
  let instance: Instance;

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
    const buttonClass = WidgetClass as {
      newWithLabel?: (label: string) => Instance;
      new?: () => Instance;
    };
    if (typeof buttonClass.newWithLabel === "function") {
      instance = buttonClass.newWithLabel(String(props.label));
    } else {
      instance = new WidgetClass();
    }
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
      if (instance.connect) {
        instance.connect(eventName, newValue);
      }
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
  FormInstance,
  PublicInstance,
  HostContext,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
  TransitionStatus
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,

  noTimeout: -1 as NoTimeout,

  getRootHostContext: (_rootContainer: Container): HostContext => {
    return {};
  },

  getChildHostContext: (
    parentHostContext: HostContext,
    _type: Type
  ): HostContext => {
    return parentHostContext;
  },

  shouldSetTextContent: (_type: Type, _props: Props): boolean => {
    return false;
  },

  createInstance,

  createTextInstance: (
    _text: string,
    _rootContainer: Container
  ): TextInstance => {
    throw new Error("Text nodes are not supported. Use Label widget instead.");
  },

  appendInitialChild: appendChild,

  finalizeInitialChildren: (
    _instance: Instance,
    _type: Type,
    _props: Props
  ): boolean => {
    return false;
  },

  commitUpdate: (
    instance: Instance,
    _type: Type,
    oldProps: Props,
    newProps: Props,
    _internalHandle: unknown
  ): void => {
    updateInstanceProps(instance, oldProps, newProps);
  },

  commitMount: (_instance: Instance, _type: Type, _props: Props): void => {
    // Nothing to do here
  },

  appendChild,
  removeChild,
  insertBefore,

  removeChildFromContainer: (_container: Container, _child: Instance): void => {
    // Root container doesn't need special handling
  },

  appendChildToContainer: (_container: Container, child: Instance): void => {
    // The container is the app ID, the child should be presented
    if (typeof child.present === "function") {
      child.present();
    }
  },

  insertInContainerBefore: (
    _container: Container,
    _child: Instance,
    _beforeChild: Instance
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
    _textInstance: TextInstance,
    _oldText: string,
    _newText: string
  ): void => {
    throw new Error("Text nodes are not supported");
  },

  clearContainer: (_container: Container): void => {
    // Nothing to do
  },

  preparePortalMount: (_container: Container): void => {
    // Not implemented
  },

  scheduleTimeout: (
    fn: (...args: unknown[]) => unknown,
    delay?: number
  ): TimeoutHandle => {
    const timeoutId = setTimeout(fn, delay ?? 0);
    return typeof timeoutId === "number" ? timeoutId : Number(timeoutId);
  },

  cancelTimeout: (id: TimeoutHandle): void => {
    clearTimeout(id);
  },

  getPublicInstance: (instance: Instance | TextInstance): PublicInstance => {
    return instance as PublicInstance;
  },

  getCurrentUpdatePriority: () => 2, // DefaultEventPriority
  setCurrentUpdatePriority: (_newPriority: number): void => {
    // Not needed for GTK
  },
  resolveUpdatePriority: () => 2, // DefaultEventPriority
  NotPendingTransition: null,
  HostTransitionContext: createReconcilerContext<TransitionStatus>(0),

  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  detachDeletedInstance: () => {},

  resetFormInstance: (_instance: FormInstance): void => {
    // Not needed for GTK
  },
  requestPostPaintCallback: (_callback: (time: number) => void): void => {
    // Not needed for GTK
  },
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: (): void => {
    // Not needed for GTK
  },
  resolveEventType: (): null | string => null,
  resolveEventTimeStamp: (): number => Date.now(),
  maySuspendCommit: (_type: Type, _props: Props): boolean => false,
  preloadInstance: (_type: Type, _props: Props): boolean => false,
  startSuspendingCommit: (): void => {
    // Not needed for GTK
  },
  suspendInstance: (): void => {
    // Not needed for GTK
  },
  waitForCommitToBeReady: ():
    | ((
        initiateCommit: (...args: unknown[]) => unknown
      ) => (...args: unknown[]) => unknown)
    | null => null,
};

export const reconciler = Reconciler(hostConfig);
