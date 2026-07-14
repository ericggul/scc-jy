export type MenuCommand = {
  id: string;
  kind: "command";
  label: string;
  shortcut?: string;
  disabled?: boolean;
  children?: readonly MenuEntry[];
};

export type MenuSeparator = {
  id: string;
  kind: "separator";
};

export type MenuEntry = MenuCommand | MenuSeparator;

export type MenuDefinition = {
  id: MenuId;
  label: string;
  entries: readonly MenuEntry[];
};

export type MenuId = string;

const recentItems: readonly MenuEntry[] = [
  { id: "recent-cursor", kind: "command", label: "Cursor" },
  { id: "recent-safari", kind: "command", label: "Safari" },
  { id: "recent-separator", kind: "separator" },
  { id: "recent-project", kind: "command", label: "Untitled Project" },
  { id: "recent-copy", kind: "command", label: "meaning.txt" },
];

const services: readonly MenuEntry[] = [
  { id: "service-search", kind: "command", label: "Search With Spotlight" },
  { id: "service-note", kind: "command", label: "Add to Notes" },
  { id: "service-reader", kind: "command", label: "Open in Reader" },
];

export const menuDefinitions: readonly MenuDefinition[] = [
  {
    id: "apple",
    label: "Apple",
    entries: [
      { id: "apple-about", kind: "command", label: "About This Mac" },
      { id: "apple-separator-1", kind: "separator" },
      { id: "apple-settings", kind: "command", label: "System Settings…" },
      { id: "apple-store", kind: "command", label: "App Store…" },
      { id: "apple-separator-2", kind: "separator" },
      {
        id: "apple-recent",
        kind: "command",
        label: "Recent Items",
        children: recentItems,
      },
      { id: "apple-separator-3", kind: "separator" },
      {
        id: "apple-force-quit",
        kind: "command",
        label: "Force Quit…",
        shortcut: "⌥⌘Esc",
      },
      { id: "apple-separator-4", kind: "separator" },
      { id: "apple-sleep", kind: "command", label: "Sleep" },
      { id: "apple-restart", kind: "command", label: "Restart…" },
      { id: "apple-shutdown", kind: "command", label: "Shut Down…" },
      { id: "apple-separator-5", kind: "separator" },
      {
        id: "apple-lock",
        kind: "command",
        label: "Lock Screen",
        shortcut: "⌃⌘Q",
      },
      {
        id: "apple-logout",
        kind: "command",
        label: "Log Out…",
        shortcut: "⇧⌘Q",
      },
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    entries: [
      { id: "cursor-about", kind: "command", label: "About Cursor" },
      { id: "cursor-update", kind: "command", label: "Check for Updates…" },
      { id: "cursor-separator-1", kind: "separator" },
      {
        id: "cursor-settings",
        kind: "command",
        label: "Settings…",
        shortcut: "⌘,",
      },
      {
        id: "cursor-services",
        kind: "command",
        label: "Services",
        children: services,
      },
      { id: "cursor-separator-2", kind: "separator" },
      {
        id: "cursor-hide",
        kind: "command",
        label: "Hide Cursor",
        shortcut: "⌘H",
      },
      {
        id: "cursor-hide-others",
        kind: "command",
        label: "Hide Others",
        shortcut: "⌥⌘H",
      },
      { id: "cursor-show-all", kind: "command", label: "Show All", disabled: true },
      { id: "cursor-separator-3", kind: "separator" },
      {
        id: "cursor-quit",
        kind: "command",
        label: "Quit Cursor",
        shortcut: "⌘Q",
      },
    ],
  },
  {
    id: "find",
    label: "Find",
    entries: [
      {
        id: "find-search",
        kind: "command",
        label: "Find Meaning…",
        shortcut: "⌘F",
      },
      {
        id: "find-next",
        kind: "command",
        label: "Find Next",
        shortcut: "⌘G",
      },
      {
        id: "find-previous",
        kind: "command",
        label: "Find Previous",
        shortcut: "⇧⌘G",
      },
      { id: "find-separator-1", kind: "separator" },
      { id: "find-selection", kind: "command", label: "Use Selection for Find", shortcut: "⌘E" },
      { id: "find-jump", kind: "command", label: "Jump to Selection", shortcut: "⌘J" },
      { id: "find-separator-2", kind: "separator" },
      { id: "find-everywhere", kind: "command", label: "Search Everywhere…", shortcut: "⇧⌘F" },
    ],
  },
  {
    id: "meaning",
    label: "Meaning",
    entries: [
      { id: "meaning-define", kind: "command", label: "Look Up Selection", shortcut: "⌃⌘D" },
      { id: "meaning-context", kind: "command", label: "Show Context" },
      {
        id: "meaning-interpret",
        kind: "command",
        label: "Interpret As",
        children: [
          { id: "meaning-literal", kind: "command", label: "Literal" },
          { id: "meaning-symbolic", kind: "command", label: "Symbolic" },
          { id: "meaning-marketing", kind: "command", label: "Marketing" },
          { id: "meaning-mythic", kind: "command", label: "Mythic" },
        ],
      },
      { id: "meaning-separator-1", kind: "separator" },
      { id: "meaning-auto", kind: "command", label: "Interpret Automatically" },
      { id: "meaning-clear", kind: "command", label: "Clear Interpretation", shortcut: "⌫", disabled: true },
    ],
  },
  {
    id: "choose",
    label: "Choose",
    entries: [
      { id: "choose-path", kind: "command", label: "Choose a Path…" },
      { id: "choose-all", kind: "command", label: "Select All", shortcut: "⌘A" },
      { id: "choose-none", kind: "command", label: "Deselect All", shortcut: "⇧⌘A" },
      { id: "choose-separator-1", kind: "separator" },
      { id: "choose-for-me", kind: "command", label: "Choose for Me" },
      { id: "choose-again", kind: "command", label: "Choose Again", shortcut: "⌘R" },
    ],
  },
  {
    id: "article",
    label: "a",
    entries: [
      { id: "article-life", kind: "command", label: "Life" },
      { id: "article-career", kind: "command", label: "Career" },
      { id: "article-purpose", kind: "command", label: "Purpose" },
      { id: "article-product", kind: "command", label: "Product" },
      { id: "article-separator-1", kind: "separator" },
      { id: "article-new-self", kind: "command", label: "Better Version of Yourself™" },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    entries: [
      { id: "plan-view", kind: "command", label: "View Plans…" },
      { id: "plan-trial", kind: "command", label: "Start Free Trial" },
      { id: "plan-separator-1", kind: "separator" },
      {
        id: "plan-cycle",
        kind: "command",
        label: "Billing Cycle",
        children: [
          { id: "plan-monthly", kind: "command", label: "Monthly" },
          { id: "plan-yearly", kind: "command", label: "Yearly" },
          { id: "plan-forever", kind: "command", label: "Forever" },
        ],
      },
      { id: "plan-billing", kind: "command", label: "Billing Information…" },
      { id: "plan-manage", kind: "command", label: "Manage Subscription…" },
      { id: "plan-separator-2", kind: "separator" },
      { id: "plan-cancel", kind: "command", label: "Cancel Plan…", disabled: true },
    ],
  },
];

export const appleMenuEntries = menuDefinitions[0].entries;

export function createBrandMenuEntries(
  rowId: string,
  brand: string,
): readonly MenuEntry[] {
  return [
    { id: `${rowId}-brand-about`, kind: "command", label: `About ${brand}` },
    {
      id: `${rowId}-brand-update`,
      kind: "command",
      label: "Check for Updates…",
    },
    { id: `${rowId}-brand-separator-1`, kind: "separator" },
    {
      id: `${rowId}-brand-settings`,
      kind: "command",
      label: "Settings…",
      shortcut: "⌘,",
    },
    {
      id: `${rowId}-brand-services`,
      kind: "command",
      label: "Services",
      children: services.map((entry) => ({
        ...entry,
        id: `${rowId}-${entry.id}`,
      })),
    },
    { id: `${rowId}-brand-separator-2`, kind: "separator" },
    {
      id: `${rowId}-brand-hide`,
      kind: "command",
      label: `Hide ${brand}`,
      shortcut: "⌘H",
    },
    {
      id: `${rowId}-brand-hide-others`,
      kind: "command",
      label: "Hide Others",
      shortcut: "⌥⌘H",
    },
    {
      id: `${rowId}-brand-show-all`,
      kind: "command",
      label: "Show All",
      disabled: true,
    },
    { id: `${rowId}-brand-separator-3`, kind: "separator" },
    {
      id: `${rowId}-brand-quit`,
      kind: "command",
      label: `Quit ${brand}`,
      shortcut: "⌘Q",
    },
  ];
}

export function createStandardMenuDefinitions(
  rowId: string,
): readonly MenuDefinition[] {
  return [
    {
      id: `${rowId}-file`,
      label: "File",
      entries: [
        { id: `${rowId}-file-new`, kind: "command", label: "New", shortcut: "⌘N" },
        { id: `${rowId}-file-open`, kind: "command", label: "Open…", shortcut: "⌘O" },
        { id: `${rowId}-file-recent`, kind: "command", label: "Open Recent", children: recentItems },
        { id: `${rowId}-file-separator-1`, kind: "separator" },
        { id: `${rowId}-file-close`, kind: "command", label: "Close", shortcut: "⌘W" },
        { id: `${rowId}-file-save`, kind: "command", label: "Save", shortcut: "⌘S" },
        { id: `${rowId}-file-save-as`, kind: "command", label: "Save As…", shortcut: "⇧⌘S" },
        { id: `${rowId}-file-separator-2`, kind: "separator" },
        { id: `${rowId}-file-print`, kind: "command", label: "Print…", shortcut: "⌘P" },
      ],
    },
    {
      id: `${rowId}-edit`,
      label: "Edit",
      entries: [
        { id: `${rowId}-edit-undo`, kind: "command", label: "Undo", shortcut: "⌘Z" },
        { id: `${rowId}-edit-redo`, kind: "command", label: "Redo", shortcut: "⇧⌘Z" },
        { id: `${rowId}-edit-separator-1`, kind: "separator" },
        { id: `${rowId}-edit-cut`, kind: "command", label: "Cut", shortcut: "⌘X" },
        { id: `${rowId}-edit-copy`, kind: "command", label: "Copy", shortcut: "⌘C" },
        { id: `${rowId}-edit-paste`, kind: "command", label: "Paste", shortcut: "⌘V" },
        { id: `${rowId}-edit-select-all`, kind: "command", label: "Select All", shortcut: "⌘A" },
        { id: `${rowId}-edit-separator-2`, kind: "separator" },
        { id: `${rowId}-edit-find`, kind: "command", label: "Find…", shortcut: "⌘F" },
      ],
    },
    {
      id: `${rowId}-view`,
      label: "View",
      entries: [
        { id: `${rowId}-view-toolbar`, kind: "command", label: "Show Toolbar" },
        { id: `${rowId}-view-sidebar`, kind: "command", label: "Show Sidebar", shortcut: "⌃⌘S" },
        { id: `${rowId}-view-separator`, kind: "separator" },
        { id: `${rowId}-view-zoom-in`, kind: "command", label: "Zoom In", shortcut: "⌘+" },
        { id: `${rowId}-view-zoom-out`, kind: "command", label: "Zoom Out", shortcut: "⌘−" },
        { id: `${rowId}-view-full-screen`, kind: "command", label: "Enter Full Screen", shortcut: "⌃⌘F" },
      ],
    },
    {
      id: `${rowId}-window`,
      label: "Window",
      entries: [
        { id: `${rowId}-window-minimize`, kind: "command", label: "Minimize", shortcut: "⌘M" },
        { id: `${rowId}-window-zoom`, kind: "command", label: "Zoom" },
        { id: `${rowId}-window-separator`, kind: "separator" },
        { id: `${rowId}-window-front`, kind: "command", label: "Bring All to Front" },
      ],
    },
    {
      id: `${rowId}-help`,
      label: "Help",
      entries: [
        { id: `${rowId}-help-search`, kind: "command", label: "Search" },
        { id: `${rowId}-help-guide`, kind: "command", label: "User Guide" },
        { id: `${rowId}-help-support`, kind: "command", label: "Support" },
      ],
    },
  ];
}

export function createWordMenuEntries(
  rowId: string,
  wordId: string,
  word: string,
): readonly MenuEntry[] {
  return [
    {
      id: `${rowId}-${wordId}-open`,
      kind: "command",
      label: `Open “${word}”`,
    },
    {
      id: `${rowId}-${wordId}-lookup`,
      kind: "command",
      label: `Look Up “${word}”`,
      shortcut: "⌃⌘D",
    },
    { id: `${rowId}-${wordId}-separator`, kind: "separator" },
    {
      id: `${rowId}-${wordId}-use`,
      kind: "command",
      label: "Use in This Slogan",
    },
    {
      id: `${rowId}-${wordId}-copy`,
      kind: "command",
      label: `Copy “${word}”`,
      shortcut: "⌘C",
    },
  ];
}
