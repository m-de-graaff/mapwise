# @mapwise/ui

Shared UI components for MapWise applications, built with [Shadcn UI](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/).

This package provides a cohesive set of specialized map UI components (panels, toolbars, dialogs) alongside standard specialized UI primitives.

## Installation

```bash
pnpm add @mapwise/ui @mapwise/core lucide-react
```

Ensure your project is configured with Tailwind CSS and the required fonts (Inter/Geist).

## Getting Started

### Minimal Map Example

A simple full-screen map setup.

```tsx
import { MapShell, MapViewport } from '@mapwise/ui';
import '@mapwise/ui/dist/style.css'; // Import styles

export default function SimpleMap() {
  return (
    <MapShell>
      <MapShell.Main>
        <MapViewport />
      </MapShell.Main>
    </MapShell>
  );
}
```

## Common Patterns

### Full GIS Application

A complete layout with Sidebar, Toolbar, Status Bar, and Panels.

```tsx
import { 
  MapShell, MapViewport, MapTopBar, MapStatusBar, MapToolbar,
  LayerPanel, LegendPanel 
} from '@mapwise/ui';
import { Layers, Map as MapIcon, Settings } from 'lucide-react';
import { useState } from 'react';

export default function GisApp() {
  const [activePanel, setActivePanel] = useState<'layers' | 'legend' | null>('layers');

  return (
    <MapShell
      // Sidebar implementation (collapsible)
      sidebar={
        <MapShell.Sidebar>
           <nav className="flex flex-col gap-2 p-2">
             <button onClick={() => setActivePanel('layers')}><Layers /></button>
             <button onClick={() => setActivePanel('legend')}><MapIcon /></button>
           </nav>
        </MapShell.Sidebar>
      }
      // Right-side Panel Area
      panel={
        activePanel === 'layers' ? (
          <MapShell.Panel title="Layers" onClose={() => setActivePanel(null)}>
            <LayerPanel />
          </MapShell.Panel>
        ) : activePanel === 'legend' ? (
            <MapShell.Panel title="Legend" onClose={() => setActivePanel(null)}>
            <LegendPanel />
          </MapShell.Panel>
        ) : null
      }
      // Top Bar
      topBar={
        <MapTopBar>
           <div className="font-bold">My GIS App</div>
        </MapTopBar>
      }
      // Status Bar
      statusBar={
        <MapStatusBar attribution="© OpenStreetMap" />
      }
    >
      {/* Main Map Area */}
      <MapShell.Main>
        <MapViewport />
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-4 z-10">
            <MapToolbar />
        </div>
      </MapShell.Main>
    </MapShell>
  );
}
```

### Mobile Layout

The `MapShell` allows the sidebar to become a drawer on mobile.

```tsx
<MapShell
  mobileSidebarOpen={isOpen}
  onMobileSidebarOpenChange={setIsOpen}
  sidebar={...} // Rendered as Sheet on mobile, Sidebar on desktop
>
 ...
</MapShell>
```

### Wiring Plugins (Inspect, Draw, Measure)

Integrate core plugins with UI tools.

```tsx
import { useMapToolbar } from '@mapwise/ui';
import { useDrawInteraction, useMeasureInteraction } from '@mapwise/plugins/react';

export function AppToolbar() {
  const { activeTool, setTool } = useMapToolbar();
  
  // Wire up plugin hooks
  useDrawInteraction({ enabled: activeTool === 'draw' });
  useMeasureInteraction({ enabled: activeTool === 'measure' });

  return (
    <MapToolbar 
        activeTool={activeTool} 
        onToolChange={setTool} 
    />
  );
}
```

### Adding Data (Dialogs)

Use the built-in `AddLayerDialog` to handle WMS, GeoJSON, etc.

```tsx
import { AddLayerDialog } from '@mapwise/ui';
import { useLayerActions } from '@mapwise/ui';

export function AddDataButton() {
    const [open, setOpen] = useState(false);
    const { addLayer } = useLayerActions();

    return (
        <>
            <Button onClick={() => setOpen(true)}>Add Data</Button>
            <AddLayerDialog 
                open={open} 
                onOpenChange={setOpen}
                onAddLayer={(layerConfig) => {
                    addLayer(layerConfig);
                    setOpen(false);
                }}
            />
        </>
    );
}
```

## Theming & Customization

The UI uses CSS variables for theming, fully compatible with Shadcn UI.

### Overriding Colors

Define these variables in your global CSS:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --primary: 262.1 83.3% 57.8%;
  --primary-foreground: 210 20% 98%;
  /* ... see UI_GUIDELINES.md for full list */
}

.dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
  /* ... */
}
```

### Swapping Icons

Most components accept `icon` props or children, but core internal icons (like in `LayerItem`) are standard `lucide-react` icons. To override globally, you may need to wrap components or use the `className` prop to hide/replace elements if provided by the specific component API.

## Component API

### `MapShell`
- `sidebar`: ReactNode (Sidebar content)
- `panel`: ReactNode (Right panel content)
- `topBar`: ReactNode (Top bar content)
- `statusBar`: ReactNode (Bottom status bar)
- `mobileSidebarOpen`: boolean
- `onMobileSidebarOpenChange`: (open: boolean) => void

### `LayerPanel`
- Requires `LayerProvider` or `useLayerList` context upstream (if not using Core directly).
- Supports Drag & Drop reordering.

### `MapToolbar`
- `activeTool`: string ('inspect', 'draw', 'measure', etc.)
- `onToolChange`: (tool: string) => void
- `tools`: Optional array of tool definitions to override defaults.

---
Built with ❤️ by MapWise.
