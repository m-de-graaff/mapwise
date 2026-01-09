# UI Guidelines

This document outlines the styling, theming, and accessibility standards for `@mapwise/ui`.

## Design Tokens

We use a semantic token system based on Shadcn UI. Do not use hardcoded hex values; use the following customized Tailwind classes.

### Colors

| Token Class | Description | Use Case |
| :--- | :--- | :--- |
| `bg-background` | App background | Main page background, dialog backgrounds |
| `text-foreground` | Primary text | Body text, headings |
| `bg-muted` | Muted background | Secondary backgrounds, inactive items |
| `text-muted-foreground` | Muted text | Secondary text, captions, placeholders |
| `bg-primary` | Primary action | Main buttons, active states, branding |
| `text-primary-foreground` | Text on primary | Text inside primary buttons |
| `bg-accent` | Accent/Hover | Hover states for list items, subtle highlights |
| `text-accent-foreground` | Text on accent | Text inside accent elements |
| `border-border` | Default border | Card borders, dividers |
| `border-input` | Input border | Text inputs, select triggers |
| `ring-ring` | Focus ring | Focus outline color |

### Spacing & Layout

- **Grid System**: 4px base grid.
- **Padding**:
  - `p-2` (8px): Dense UI (toolbars, list items).
  - `p-4` (16px): Standard containers (panels, cards).
  - `p-6` (24px): Dialogs, large sections.
- **Radius**: `rounded-md` (0.5rem) is the default for buttons and inputs.

## Theming

To customize the look of `@mapwise/ui` in your application, override the CSS variables in your `global.css` or `index.css`.

### Default Theme (Light)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

### Dark Mode
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

## Accessibility (A11y) Standards

We strive for WCAG 2.1 AA compliance.

### Checklist for new components:

1.  **Keyboard Navigation**:
    - [ ] All interactive elements (buttons, inputs, sliders) must be focusable via `Tab`.
    - [ ] Focus order must be logical (top-left to bottom-right).
    - [ ] Focus indicators (`ring`) must be visible in both light and dark modes.

2.  **Screen Readers**:
    - [ ] Icon-only buttons MUST have `aria-label` or `sr-only` text.
    - [ ] Dialogs must trap focus and announce titles.
    - [ ] Status messages (toasts, loading states) should use `role="status"` or `aria-live`.

3.  **Contrast**:
    - [ ] Text must meet 4.5:1 contrast against its background.
    - [ ] Muted text must meet 3:1 contrast for large text or 4.5:1 for normal text used meaningfully.

4.  **Drag and Drop**:
    - [ ] Sortable lists (like LayerPanel) must provide keyboard alternatives (Space to lift, Arrows to move, Space to drop) - *Handled by @dnd-kit/core*.

## Component Best Practices

- **Composition**: Prefer passing children or slots (`topBar`, `sidebar`) over configuration objects for layout.
- **Client-Only**: Map-related components that depend on `window` or WebGL should be wrapped or dynamic imported if using Next.js App Router (though `MapViewport` handles this internally for the map instance itself).
- **Icons**: Use `lucide-react` for consistency. `size={16}` is standard for small button icons.

---
*Reference this guide during code review and implementation.*
