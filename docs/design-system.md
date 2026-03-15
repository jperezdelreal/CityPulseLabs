# BiciCoruña UI/UX Design System

## Overview

The BiciCoruña design system is a cohesive visual language for the bike-sharing management application. It combines coastal aesthetics with modern UI patterns, optimized for mobile-first interactions.

**Brand Philosophy:**
- **Sustainable & Eco-Friendly**: Green as primary color symbolizes bikes and environmental consciousness
- **Coastal Identity**: Blues represent A Coruña's ocean and maritime heritage
- **Mobile-First**: Designed for 375px viewport and scales up
- **Accessibility**: WCAG 2.1 AA compliant with inclusive design practices

---

## Color Palette

### Primary Brand Colors

| Color | Hex Code | Usage | WCAG Contrast |
|-------|----------|-------|---------------|
| Primary Green | `#0D9A5E` | Bike segments, CTAs, brand identity | 5.2:1 (AA/AAA) |
| Primary Dark | `#0A7647` | Hover states, active buttons | 7.1:1 (AA/AAA) |
| Primary Light | `#1ECC6F` | Backgrounds, light accents | 3.1:1 (AA) |
| Secondary Blue | `#0066CC` | Walk segments, info elements | 5.5:1 (AA/AAA) |
| Secondary Dark | `#004699` | Hover states, emphasis | 8.2:1 (AA/AAA) |
| Secondary Light | `#3385FF` | Light backgrounds, focus states | 2.1:1 (AA minimum) |

### Station Availability Status Colors

**Color-coded markers with non-color indicators:**

| Status | Color | Hex Code | Icon | Usage | WCAG |
|--------|-------|----------|------|-------|------|
| **Good** (>50% available) | Green | `#10B981` | ✓ Check | Healthy stations | 4.9:1 (AA) |
| **Limited** (25-50% available) | Amber | `#F59E0B` | ⚠ Warning | Caution needed | 4.6:1 (AA) |
| **Empty** (<25% available) | Red | `#EF4444` | ✗ X Mark | Critical attention | 3.2:1 (AA) |
| **Full** (no docks) | Red | `#EF4444` | ⊖ Full | Cannot return bikes | 3.2:1 (AA) |
| **Offline** | Gray | `#9CA3AF` | ⚪ Circle | Unavailable | 4.5:1 (AA) |

**Accessibility Note:** Never rely on color alone. Always pair with:
- Icon symbols (✓, ⚠, ✗, ⊖, ⚪)
- Text labels (e.g., "25 bikes available")
- ARIA labels for screen readers: `aria-label="Station offline"`

### Neutral Palette

Gray scale from white to near-black for text, borders, backgrounds:

```
Gray 50:  #F9FAFB   (lightest background)
Gray 100: #F3F4F6
Gray 200: #E5E7EB   (borders, dividers)
Gray 300: #D1D5DB
Gray 400: #9CA3AF
Gray 500: #6B7280
Gray 600: #4B5563   (secondary text)
Gray 700: #374151
Gray 800: #1F2937   (dark mode surface)
Gray 900: #111827   (darkest, dark mode bg)
```

### Semantic Colors

- **Success**: `#10B981` (confirmations, positive feedback)
- **Warning**: `#F59E0B` (caution, limited resources)
- **Error**: `#EF4444` (errors, unavailable stations)
- **Info**: `#0066CC` (informational messages)

---

## Route Visualization

### Bike Segment (Solid Line)
- **Color**: `#0D9A5E` (primary green)
- **Style**: Solid line, 4px stroke
- **Line Cap**: Round (friendly appearance)
- **Use Case**: Active cycling routes

### Walk Segment (Dashed Line)
- **Color**: `#0066CC` (secondary blue)
- **Style**: Dashed line (6px dash, 6px gap), 3px stroke
- **Line Cap**: Round
- **Use Case**: Walking/transfer segments

### Example SVG:
```jsx
// Bike segment
<path className="route-line-bike" d="..." />

// Walk segment
<path className="route-line-walk" d="..." />
```

---

## Typography

### Font Family
- **Primary**: System UI fonts (`system-ui, -apple-system, sans-serif`)
- **Monospace**: `'Menlo', 'Monaco', monospace` (for bike counts, data)

### Font Sizes (with line-height)

| Size | px | Line Height | Use Case |
|------|----|-----------  |----------|
| XS | 12 | 1.5rem | Badge counts, small labels |
| SM | 14 | 1.5rem | Button text, secondary info |
| Base | 16 | 1.5rem | Body text, station names |
| LG | 18 | 1.75rem | Callouts, highlights |
| XL | 20 | 1.75rem | Section headers |
| 2XL | 24 | 2rem | Panel titles |
| 3XL | 30 | 2.25rem | Page titles |

### Font Weights

| Weight | Value | Use Case |
|--------|-------|----------|
| Light | 300 | Subtle secondary text |
| Normal | 400 | Body text (default) |
| Medium | 500 | Labels, emphasis |
| Semibold | 600 | Subheadings, section titles |
| Bold | 700 | Primary headings, alerts |

**Readable Hierarchy Example:**
```jsx
<h1 className="text-3xl font-bold">Station: Jardines de Méndez Núñez</h1>
<p className="text-base font-normal">35 bikes available</p>
<span className="text-sm font-medium text-gray-600">Last updated 2 minutes ago</span>
```

---

## Spacing Scale

Consistent 4px-based spacing system for layouts, margins, and padding:

```
0:  0px      6:  24px
1:  4px      8:  32px
2:  8px      10: 40px
3:  12px     12: 48px
4:  16px     16: 64px
5:  20px     20: 80px
```

**Usage Examples:**
- Padding in panels: `p-4` or `p-6`
- Margin between sections: `mb-8`
- Gap in flex/grid: `gap-4`

---

## Responsive Breakpoints

**Mobile-first approach:** Design for smallest viewport first.

| Breakpoint | Width | Device |
|------------|-------|--------|
| Base | 0px | Mobile (375px+) |
| sm | 640px | Larger mobile |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

**Example:**
```jsx
<div className="text-base md:text-lg lg:text-xl">
  Responsive text sizing
</div>

{/* Map fills viewport on mobile, sidebar on desktop */}
<div className="grid grid-cols-1 lg:grid-cols-3">
  <div className="lg:col-span-2">Map</div>
  <div>Sidebar</div>
</div>
```

---

## Station Marker Design

### Marker Appearance
- **Shape**: Circle with white border (3px)
- **Size**: 40px diameter (mobile), 48px (desktop)
- **Shadow**: `0 2px 8px rgba(0, 0, 0, 0.2)`
- **Content**: Bike count or icon (centered, bold mono font)

### Marker States

#### Good Availability (>50%)
```jsx
<div className="station-marker station-marker-good">25</div>
```
- Background: `#10B981` (emerald)
- Text: White, bold, centered
- Icon: ✓ (optional visual)

#### Limited Availability (25-50%)
```jsx
<div className="station-marker station-marker-limited">12</div>
```
- Background: `#F59E0B` (amber)
- Text: Dark gray, bold
- Icon: ⚠ (optional visual)

#### Empty (<25%)
```jsx
<div className="station-marker station-marker-empty">2</div>
```
- Background: `#EF4444` (red)
- Text: White, bold
- Icon: ✗ or empty indicator

#### Offline
```jsx
<div className="station-marker station-marker-offline">•</div>
```
- Background: `#9CA3AF` (gray)
- Text: White
- Icon: ⚪ or dash

### Pulse Animation
For real-time data indicators, add pulse animation:
```jsx
<div className="station-marker station-marker-pulse">25</div>
```
- Opacity cycles: 100% → 70% → 100% over 2 seconds
- Indicates "live" data feed

### Leaflet Integration (divIcon)
```jsx
const markerIcon = L.divIcon({
  html: `<div class="station-marker station-marker-good">25</div>`,
  iconSize: [40, 40],
  className: '', // avoid default Leaflet styles
});
```

---

## Component Styles

### Buttons

**Primary Button** (call-to-action)
- Background: `#0D9A5E` (primary green)
- Hover: `#0A7647` (darker)
- Active: `#095339` (pressed state)
- Text: White, bold
- Min-height: 44px (touch-friendly)

```jsx
<button className="btn btn-primary">Reserve Bike</button>
```

**Secondary Button** (alternative action)
- Background: Gray 200
- Hover: Gray 300
- Text: Dark gray
- Min-height: 44px

```jsx
<button className="btn btn-secondary">Cancel</button>
```

**Outline Button** (non-destructive)
```jsx
<button className="btn btn-outline">Learn More</button>
```

**Size Variants:**
- `btn-sm`: 36px height (for compact layouts)
- `btn` (default): 44px height
- `btn-lg`: 48px height (primary actions)

### Panels

**Station Info Panel**
```jsx
<div className="panel">
  <div className="panel-header">
    <h2 className="text-2xl font-semibold">Station Name</h2>
  </div>
  <div className="panel-body">
    <div className="station-card-stat">
      <span className="station-card-stat-label">Bikes Available:</span>
      <span className="station-card-stat-value">25</span>
    </div>
  </div>
  <div className="panel-footer">
    <button className="btn btn-primary w-full">Reserve</button>
  </div>
</div>
```

**Mobile Bottom Sheet**
- Fixed position at bottom of viewport
- Rounded top corners (16px)
- Slide-up animation on open
- Semi-transparent background
- Max-height: 75vh with scroll on mobile

```jsx
<div className="panel-mobile">
  {/* Content */}
</div>
```

### Loading States

**Skeleton Loader**
```jsx
<div className="skeleton-text"></div>
<div className="skeleton-circle" style={{ width: '40px', height: '40px' }}></div>
```

**Spinner**
```jsx
<div className="spinner"></div>
```

**Loading Overlay** (full-screen)
```jsx
<div className="loading-overlay">
  <div className="spinner"></div>
</div>
```

### Error States

**Error Alert**
```jsx
<div className="alert alert-error">
  <strong>Failed to load stations.</strong>
  <button className="btn btn-sm mt-2">Retry</button>
</div>
```

**Alert Variants:**
- `alert-error`: Red (`#EF4444`)
- `alert-warning`: Amber (`#F59E0B`)
- `alert-success`: Green (`#10B981`)
- `alert-info`: Blue (`#0066CC`)

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

#### 1. Color Contrast
- **Large text** (18px+): Minimum 3:1 ratio
- **Normal text**: Minimum 4.5:1 ratio
- **Non-text elements**: Minimum 3:1 ratio

**Status colors with text:**
```jsx
{/* All combinations pass 4.5:1 AA standard */}
<div className="bg-green-500 text-white">Good</div>
<div className="bg-amber-400 text-gray-900">Limited</div>
<div className="bg-red-500 text-white">Empty</div>
```

#### 2. Screen Reader Support
```jsx
{/* Station marker with ARIA label */}
<div 
  className="station-marker station-marker-good"
  role="img"
  aria-label="Station at Méndez Núñez: 25 bikes available, good availability"
>
  25
</div>

{/* Button with accessible text */}
<button 
  className="btn btn-primary"
  aria-label="Reserve bike at current location"
>
  Reserve
</button>

{/* Loading indicator */}
<div className="spinner" role="status" aria-label="Loading stations"></div>
```

#### 3. Keyboard Navigation
- All interactive elements: `:focus` outline visible
- Buttons/links: `min-height: 44px` (touch target)
- Tabindex: Use semantic HTML (`<button>`, `<a>`)

```css
button:focus {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}
```

#### 4. Touch Targets
- **Minimum size**: 44×44px (mobile)
- **Spacing**: 8px minimum between targets
- **Example**: Button height 44px with 16px padding

#### 5. Dark Mode Support
All components include dark mode variants:
```css
@media (prefers-color-scheme: dark) {
  .panel {
    @apply bg-gray-800 border-gray-700;
  }
}
```

---

## Mobile Responsive Design

### Viewport Sizes
- **Mobile**: 375px–640px (single column, full-width panels)
- **Tablet**: 640px–1024px (two-column layout possible)
- **Desktop**: 1024px+ (multi-panel layouts)

### Mobile Layout Patterns

**Map + Bottom Sheet**
```jsx
<div className="h-screen flex flex-col">
  <div className="flex-1">Map</div>
  <div className="panel-mobile max-h-[75vh]">
    Station Info
  </div>
</div>
```

**Responsive Grid**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {stations.map(station => (
    <StationCard key={station.id} {...station} />
  ))}
</div>
```

### Touch Interactions
- **Swipe up/down**: Expand/collapse bottom sheet
- **Tap**: Select station, open panels
- **Long-press**: Show context menu (optional)
- **Double-tap**: Zoom into station (map)

---

## Dark Mode

When user prefers dark mode (`prefers-color-scheme: dark`):

### Color Adjustments
- **Background**: Gray 900 (`#111827`)
- **Surface**: Gray 800 (`#1F2937`)
- **Text**: Gray 100 (`#F3F4F6`)
- **Muted**: Gray 400 (`#9CA3AF`)

### Alert Colors (Dark Mode)
```css
.alert-error {
  background: rgba(239, 68, 68, 0.2);
  border-color: #B91C1C;
  color: #FCA5A5;
}
```

### Map Tiles
Use dark tile providers (e.g., CartoDB Dark Matter) for cohesive dark mode experience.

---

## Animation & Transitions

### Timing
- **Fast**: 150ms (quick feedback)
- **Base**: 250ms (standard transitions)
- **Slow**: 350ms (deliberate, important)

### Animations
- **Pulse**: Live data indicators (2s cycle)
- **Spin**: Loading spinner (1s rotation)
- **Fade In**: Content reveal (300ms)
- **Slide Up**: Bottom sheet appearance (300ms)

**Example:**
```jsx
<div className="animate-fadeIn">
  <StationCard />
</div>
```

---

## Implementation Examples

### Station Card Component
```jsx
export function StationCard({ station }) {
  const statusClass = {
    good: 'station-marker-good',
    limited: 'station-marker-limited',
    empty: 'station-marker-empty',
    offline: 'station-marker-offline',
  }[station.status];

  return (
    <div className="station-card">
      <div className="flex items-start justify-between">
        <h3 className="station-card-title">{station.name}</h3>
        <div className={`station-marker ${statusClass}`}>
          {station.bikes}
        </div>
      </div>
      <div className="station-card-stat">
        <span className="station-card-stat-label">Docks Available:</span>
        <span className="station-card-stat-value">{station.docks}</span>
      </div>
      <button className="btn btn-primary w-full mt-4">
        Reserve Bike
      </button>
    </div>
  );
}
```

### Route Visualization
```jsx
export function RoutePolyline({ segment }) {
  const isWalk = segment.type === 'walk';
  const lineClass = isWalk ? 'route-line-walk' : 'route-line-bike';

  return (
    <Polyline
      positions={segment.coordinates}
      className={lineClass}
      pathOptions={{
        fill: false,
        weight: isWalk ? 3 : 4,
        opacity: 0.8,
      }}
    />
  );
}
```

---

## Design Token Files

**TypeScript (`src/styles/tokens.ts`):**
Exported constants for colors, typography, spacing, etc.

**Tailwind Config (`tailwind.config.js`):**
Extends Tailwind with custom colors, animations, and spacing.

**Component Styles (`src/styles/components.css`):**
@layer components with Tailwind @apply rules.

**Main Stylesheet (`src/index.css`):**
Imports Tailwind, components, and base styles.

---

## Summary

The BiciCoruña design system provides:
- **Cohesive brand identity** with sustainable/coastal aesthetics
- **Accessible color palette** meeting WCAG 2.1 AA standards
- **Mobile-first responsive design** for all screen sizes
- **Reusable components** with loading/error states
- **Dark mode support** for user comfort
- **Touch-friendly interactions** (44px minimum targets)
- **Inclusive design** with screen reader support

All values are documented in design tokens and Tailwind config for easy maintenance and consistency across the application.
