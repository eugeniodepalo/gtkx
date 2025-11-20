import type { ReactNode } from "react";

// Common widget props that all GTK widgets share
interface WidgetProps {
  // Layout properties
  halign?: "fill" | "start" | "end" | "center" | "baseline";
  valign?: "fill" | "start" | "end" | "center" | "baseline";
  hexpand?: boolean;
  vexpand?: boolean;
  marginStart?: number;
  marginEnd?: number;
  marginTop?: number;
  marginBottom?: number;
  widthRequest?: number;
  heightRequest?: number;
  
  // Visual properties
  visible?: boolean;
  sensitive?: boolean;
  canFocus?: boolean;
  canTarget?: boolean;
  focusOnClick?: boolean;
  opacity?: number;
  
  // CSS
  cssClasses?: string[];
  
  // Tooltip
  tooltipText?: string;
  tooltipMarkup?: string;
  
  // Common signals
  onDestroy?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  onMap?: () => void;
  onUnmap?: () => void;
  
  children?: ReactNode;
}

interface WindowProps extends WidgetProps {
  title?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  modal?: boolean;
  resizable?: boolean;
  decorated?: boolean;
  
  // Signals
  onCloseRequest?: () => boolean;
  onActivateFocus?: () => void;
  onActivateDefault?: () => void;
  onKeysChanged?: () => void;
}

interface ApplicationWindowProps extends WindowProps {
  application?: any;
}

interface BoxProps extends WidgetProps {
  orientation?: any; // GtkOrientation enum
  spacing?: number;
  homogeneous?: boolean;
  baselinePosition?: any; // GtkBaselinePosition enum
}

interface ButtonProps extends WidgetProps {
  label?: string;
  iconName?: string;
  hasFrame?: boolean;
  useUnderline?: boolean;
  
  // Signals
  onClick?: () => void;
  onClicked?: () => void;
  onActivate?: () => void;
}

interface LabelProps extends WidgetProps {
  label?: string;
  text?: string;
  useMarkup?: boolean;
  useUnderline?: boolean;
  wrap?: boolean;
  wrapMode?: any; // PangoWrapMode
  selectable?: boolean;
  ellipsize?: any; // PangoEllipsizeMode
  widthChars?: number;
  maxWidthChars?: number;
  lines?: number;
  justify?: any; // GtkJustification
  xalign?: number;
  yalign?: number;
}

interface EntryProps extends WidgetProps {
  text?: string;
  placeholder?: string;
  placeholderText?: string;
  maxLength?: number;
  visibility?: boolean;
  invisibleChar?: string;
  activatesDefault?: boolean;
  alignment?: number;
  
  // Signals
  onActivate?: () => void;
  onChange?: () => void;
  onChanged?: () => void;
}

interface CheckButtonProps extends WidgetProps {
  label?: string;
  active?: boolean;
  inconsistent?: boolean;
  useUnderline?: boolean;
  
  // Signals
  onToggled?: () => void;
  onActivate?: () => void;
}

interface SwitchProps extends WidgetProps {
  active?: boolean;
  state?: boolean;
  
  // Signals
  onActivate?: () => void;
  onStateSet?: (state: boolean) => boolean;
}

interface ScrolledWindowProps extends WidgetProps {
  hscrollbarPolicy?: any; // GtkPolicyType
  vscrollbarPolicy?: any; // GtkPolicyType
  minContentWidth?: number;
  minContentHeight?: number;
  maxContentWidth?: number;
  maxContentHeight?: number;
  kineticScrolling?: boolean;
  overlayScrolling?: boolean;
  propagateNaturalWidth?: boolean;
  propagateNaturalHeight?: boolean;
}

interface SeparatorProps extends WidgetProps {
  orientation?: any; // GtkOrientation
}

interface FrameProps extends WidgetProps {
  label?: string;
  labelXalign?: number;
  labelYalign?: number;
}

interface GridProps extends WidgetProps {
  rowSpacing?: number;
  columnSpacing?: number;
  rowHomogeneous?: boolean;
  columnHomogeneous?: boolean;
}

interface PanedProps extends WidgetProps {
  orientation?: any; // GtkOrientation
  position?: number;
  wideHandle?: boolean;
  shrinkStartChild?: boolean;
  shrinkEndChild?: boolean;
  resizeStartChild?: boolean;
  resizeEndChild?: boolean;
}

interface StackProps extends WidgetProps {
  hhomogeneous?: boolean;
  vhomogeneous?: boolean;
  visibleChild?: any;
  visibleChildName?: string;
  transitionType?: any; // GtkStackTransitionType
  transitionDuration?: number;
}

interface HeaderBarProps extends WidgetProps {
  title?: string;
  subtitle?: string;
  showTitleButtons?: boolean;
  decorationLayout?: string;
}

interface ProgressBarProps extends WidgetProps {
  fraction?: number;
  text?: string;
  showText?: boolean;
  ellipsize?: any; // PangoEllipsizeMode
  inverted?: boolean;
  pulseStep?: number;
}

interface SpinnerProps extends WidgetProps {
  spinning?: boolean;
}

interface ImageProps extends WidgetProps {
  file?: string;
  iconName?: string;
  pixelSize?: number;
  iconSize?: any; // GtkIconSize
}

interface PictureProps extends WidgetProps {
  file?: string;
  alternativeText?: string;
  canShrink?: boolean;
  contentFit?: any; // GtkContentFit
  keepAspectRatio?: boolean;
}

interface DrawingAreaProps extends WidgetProps {
  contentWidth?: number;
  contentHeight?: number;
  
  // Signals
  onDraw?: (cr: any, width: number, height: number) => void;
  onResize?: (width: number, height: number) => void;
}

interface TextViewProps extends WidgetProps {
  buffer?: any;
  editable?: boolean;
  cursorVisible?: boolean;
  wrapMode?: any; // GtkWrapMode
  justification?: any; // GtkJustification
  leftMargin?: number;
  rightMargin?: number;
  topMargin?: number;
  bottomMargin?: number;
  indent?: number;
  pixelsAboveLines?: number;
  pixelsBelowLines?: number;
  pixelsInsideWrap?: number;
  monospace?: boolean;
  acceptsTab?: boolean;
}

interface NotebookProps extends WidgetProps {
  page?: number;
  tabPos?: any; // GtkPositionType
  showTabs?: boolean;
  showBorder?: boolean;
  scrollable?: boolean;
  enablePopup?: boolean;
  
  // Signals
  onSwitchPage?: (page: any, pageNum: number) => void;
  onPageAdded?: (child: any, pageNum: number) => void;
  onPageRemoved?: (child: any, pageNum: number) => void;
}

interface ExpanderProps extends WidgetProps {
  label?: string;
  expanded?: boolean;
  useUnderline?: boolean;
  useMarkup?: boolean;
  resizeToplevel?: boolean;
  
  // Signals
  onActivate?: () => void;
}

interface OverlayProps extends WidgetProps {
  // Overlay has specific methods for adding overlays
}

interface RevealerProps extends WidgetProps {
  revealChild?: boolean;
  transitionType?: any; // GtkRevealerTransitionType
  transitionDuration?: number;
}

interface ListBoxProps extends WidgetProps {
  selectionMode?: any; // GtkSelectionMode
  activateOnSingleClick?: boolean;
  showSeparators?: boolean;
  
  // Signals
  onRowActivated?: (row: any) => void;
  onRowSelected?: (row: any) => void;
}

interface FlowBoxProps extends WidgetProps {
  selectionMode?: any; // GtkSelectionMode
  activateOnSingleClick?: boolean;
  homogeneous?: boolean;
  columnSpacing?: number;
  rowSpacing?: number;
  minChildrenPerLine?: number;
  maxChildrenPerLine?: number;
  
  // Signals
  onChildActivated?: (child: any) => void;
  onSelectedChildrenChanged?: () => void;
}

interface MenuButtonProps extends WidgetProps {
  label?: string;
  iconName?: string;
  direction?: any; // GtkArrowType
  hasFrame?: boolean;
  useUnderline?: boolean;
  popover?: any;
  menuModel?: any;
}

interface ToggleButtonProps extends WidgetProps {
  label?: string;
  active?: boolean;
  useUnderline?: boolean;
  hasFrame?: boolean;
  
  // Signals
  onToggled?: () => void;
}

interface LinkButtonProps extends WidgetProps {
  label?: string;
  uri?: string;
  visited?: boolean;
  
  // Signals
  onActivateLink?: () => boolean;
}

interface SpinButtonProps extends WidgetProps {
  adjustment?: any;
  value?: number;
  digits?: number;
  snapToTicks?: boolean;
  numeric?: boolean;
  wrap?: boolean;
  updatePolicy?: any; // GtkSpinButtonUpdatePolicy
  climbRate?: number;
  
  // Signals
  onValueChanged?: () => void;
  onChange?: () => void;
}

interface ComboBoxProps extends WidgetProps {
  model?: any;
  active?: number;
  hasEntry?: boolean;
  
  // Signals
  onChange?: () => void;
  onChanged?: () => void;
}

interface ComboBoxTextProps extends ComboBoxProps {
  // Inherits from ComboBox
}

interface ScaleProps extends WidgetProps {
  orientation?: any; // GtkOrientation
  adjustment?: any;
  digits?: number;
  drawValue?: boolean;
  hasOrigin?: boolean;
  valuePos?: any; // GtkPositionType
  
  // Signals
  onValueChanged?: () => void;
}

interface LevelBarProps extends WidgetProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  mode?: any; // GtkLevelBarMode
  inverted?: boolean;
  
  // Signals
  onOffsetChanged?: (name: string) => void;
}

interface SearchEntryProps extends WidgetProps {
  placeholderText?: string;
  activatesDefault?: boolean;
  
  // Signals
  onActivate?: () => void;
  onSearchChanged?: () => void;
  onNextMatch?: () => void;
  onPreviousMatch?: () => void;
  onStopSearch?: () => void;
}

interface PasswordEntryProps extends WidgetProps {
  placeholderText?: string;
  activatesDefault?: boolean;
  showPeekIcon?: boolean;
  
  // Signals
  onActivate?: () => void;
}

interface ColorButtonProps extends WidgetProps {
  title?: string;
  showEditor?: boolean;
  
  // Signals
  onColorSet?: () => void;
}

interface FontButtonProps extends WidgetProps {
  title?: string;
  showStyle?: boolean;
  showSize?: boolean;
  useFont?: boolean;
  useSize?: boolean;
  
  // Signals
  onFontSet?: () => void;
}

interface CalendarProps extends WidgetProps {
  year?: number;
  month?: number;
  day?: number;
  showHeading?: boolean;
  showDayNames?: boolean;
  showWeekNumbers?: boolean;
  
  // Signals
  onDaySelected?: () => void;
  onNextMonth?: () => void;
  onNextYear?: () => void;
  onPrevMonth?: () => void;
  onPrevYear?: () => void;
}

interface PopoverProps extends WidgetProps {
  position?: any; // GtkPositionType
  autohide?: boolean;
  hasArrow?: boolean;
  mnemonicsVisible?: boolean;
  
  // Signals
  onClosed?: () => void;
}

interface PopoverMenuProps extends PopoverProps {
  menuModel?: any;
}

interface DialogProps extends WindowProps {
  useHeaderBar?: boolean;
  
  // Signals
  onResponse?: (responseId: number) => void;
}

interface AboutDialogProps extends DialogProps {
  programName?: string;
  version?: string;
  copyright?: string;
  comments?: string;
  license?: string;
  websiteLabel?: string;
  website?: string;
  authors?: string[];
  artists?: string[];
  documenters?: string[];
  translatorCredits?: string;
  logoIconName?: string;
  wrapLicense?: boolean;
}

interface MessageDialogProps extends DialogProps {
  messageType?: any; // GtkMessageType
  text?: string;
  secondaryText?: string;
  secondaryUseMarkup?: boolean;
}

interface CenterBoxProps extends WidgetProps {
  orientation?: any; // GtkOrientation
}

interface SearchBarProps extends WidgetProps {
  searchModeEnabled?: boolean;
  showCloseButton?: boolean;
}

interface ActionBarProps extends WidgetProps {
  revealed?: boolean;
}

interface InfoBarProps extends WidgetProps {
  messageType?: any; // GtkMessageType
  showCloseButton?: boolean;
  revealed?: boolean;
  
  // Signals
  onResponse?: (responseId: number) => void;
  onClose?: () => void;
}

interface WindowHandleProps extends WidgetProps {
  // Window handle for creating draggable areas
}

interface StatusbarProps extends WidgetProps {
  // Statusbar props
}

interface ScrollbarProps extends WidgetProps {
  orientation?: any; // GtkOrientation
  adjustment?: any;
}

interface ViewportProps extends WidgetProps {
  scrollToFocus?: boolean;
}

interface AspectFrameProps extends WidgetProps {
  xalign?: number;
  yalign?: number;
  ratio?: number;
  obeyChild?: boolean;
}

interface StackSwitcherProps extends WidgetProps {
  stack?: any;
}

interface GLAreaProps extends WidgetProps {
  hasDepthBuffer?: boolean;
  hasStencilBuffer?: boolean;
  autoRender?: boolean;
  useEs?: boolean;
  
  // Signals
  onRender?: (context: any) => boolean;
  onCreate?: (context: any) => void;
  onResize?: (width: number, height: number) => void;
}

interface IconViewProps extends WidgetProps {
  model?: any;
  textColumn?: number;
  markupColumn?: number;
  pixbufColumn?: number;
  itemOrientation?: any; // GtkOrientation
  columns?: number;
  itemWidth?: number;
  spacing?: number;
  rowSpacing?: number;
  columnSpacing?: number;
  margin?: number;
  itemPadding?: number;
  activateOnSingleClick?: boolean;
  selectionMode?: any; // GtkSelectionMode
  
  // Signals
  onItemActivated?: (path: any) => void;
  onSelectionChanged?: () => void;
}

interface TreeViewProps extends WidgetProps {
  model?: any;
  headersVisible?: boolean;
  headersClickable?: boolean;
  expanderColumn?: any;
  reorderable?: boolean;
  enableSearch?: boolean;
  searchColumn?: number;
  fixedHeightMode?: boolean;
  hoverSelection?: boolean;
  hoverExpand?: boolean;
  showExpanders?: boolean;
  levelIndentation?: number;
  activateOnSingleClick?: boolean;
  
  // Signals
  onRowActivated?: (path: any, column: any) => void;
  onRowExpanded?: (iter: any, path: any) => void;
  onRowCollapsed?: (iter: any, path: any) => void;
}

interface ColumnViewProps extends WidgetProps {
  model?: any;
  showRowSeparators?: boolean;
  showColumnSeparators?: boolean;
  enableRubberband?: boolean;
  singleClickActivate?: boolean;
  reorderable?: boolean;
  
  // Signals
  onActivate?: (position: number) => void;
}

interface ListViewProps extends WidgetProps {
  model?: any;
  showSeparators?: boolean;
  singleClickActivate?: boolean;
  enableRubberband?: boolean;
  
  // Signals
  onActivate?: (position: number) => void;
}

interface GridViewProps extends WidgetProps {
  model?: any;
  minColumns?: number;
  maxColumns?: number;
  singleClickActivate?: boolean;
  enableRubberband?: boolean;
  
  // Signals
  onActivate?: (position: number) => void;
}

interface DropDownProps extends WidgetProps {
  model?: any;
  selected?: number;
  enableSearch?: boolean;
  searchMatchMode?: any;
  
  // Signals
  onActivate?: () => void;
}


// Declare JSX intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ApplicationWindow: ApplicationWindowProps;
      Box: BoxProps;
      Button: ButtonProps;
      Label: LabelProps;
      Entry: EntryProps;
      CheckButton: CheckButtonProps;
      Switch: SwitchProps;
      ScrolledWindow: ScrolledWindowProps;
      Separator: SeparatorProps;
      Frame: FrameProps;
      Grid: GridProps;
      Paned: PanedProps;
      Stack: StackProps;
      StackSwitcher: StackSwitcherProps;
      HeaderBar: HeaderBarProps;
      SearchBar: SearchBarProps;
      ActionBar: ActionBarProps;
      InfoBar: InfoBarProps;
      ProgressBar: ProgressBarProps;
      Spinner: SpinnerProps;
      Image: ImageProps;
      Picture: PictureProps;
      DrawingArea: DrawingAreaProps;
      GLArea: GLAreaProps;
      TextView: TextViewProps;
      Notebook: NotebookProps;
      Expander: ExpanderProps;
      AspectFrame: AspectFrameProps;
      Overlay: OverlayProps;
      Revealer: RevealerProps;
      ListBox: ListBoxProps;
      FlowBox: FlowBoxProps;
      MenuButton: MenuButtonProps;
      ToggleButton: ToggleButtonProps;
      LinkButton: LinkButtonProps;
      SpinButton: SpinButtonProps;
      ComboBox: ComboBoxProps;
      ComboBoxText: ComboBoxTextProps;
      Scale: ScaleProps;
      LevelBar: LevelBarProps;
      SearchEntry: SearchEntryProps;
      PasswordEntry: PasswordEntryProps;
      ColorButton: ColorButtonProps;
      FontButton: FontButtonProps;
      Calendar: CalendarProps;
      IconView: IconViewProps;
      TreeView: TreeViewProps;
      ColumnView: ColumnViewProps;
      ListView: ListViewProps;
      GridView: GridViewProps;
      DropDown: DropDownProps;
      Popover: PopoverProps;
      PopoverMenu: PopoverMenuProps;
      Window: WindowProps;
      Dialog: DialogProps;
      AboutDialog: AboutDialogProps;
      MessageDialog: MessageDialogProps;
      CenterBox: CenterBoxProps;
      WindowHandle: WindowHandleProps;
      Statusbar: StatusbarProps;
      Scrollbar: ScrollbarProps;
      Viewport: ViewportProps;
    }
  }
}

export {};
