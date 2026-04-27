# Dashboard Grid Layout Builder

Build a visual dashboard builder where users drag, drop, and configure widgets on a responsive grid — no backend, no login. Everything persists in `localStorage` and the UI feels alive through smooth GSAP animations.

## Stack

- **Frontend**: Pure React, port **3000**
- **Animations**: GSAP for all transitions (widget placement, movement, resize, error snap-back)
- **Persistence**: `localStorage` only — no backend or database

## The Grid

A **12-column grid** (`data-testid="grid"`) that grows vertically as needed. Row height is fixed; the number of rows expands automatically to fit whatever widgets exist. Grid cells are visually outlined with subtle borders so users can orient their placements.

The grid operates in three preview modes that simulate different screen widths — see the Preview section below.

## Widget Palette

A sidebar (`data-testid="palette"`) lists the available widget types. Clicking any entry adds a new instance of that widget to the grid.

| Widget | Palette `data-testid` | What it displays |
|---|---|---|
| Counter | `palette-counter` | A numeric value with a text label |
| Bar Chart | `palette-bar-chart` | An SVG bar chart from configurable data points |
| Text Block | `palette-text` | Formatted text content (bold/italic via simple markdown) |
| Table | `palette-table` | A data table with configurable headers and rows |
| Progress Ring | `palette-progress` | A circular progress indicator with percentage |

## Adding Widgets

Clicking a palette entry immediately places a new widget on the grid. The placement algorithm scans top-to-bottom, left-to-right and puts the widget at the first open position that fits. Default size is **4 columns × 2 rows**. If no space is available in the current rows, new rows are appended.

Each placed widget receives an incrementing integer ID (starting at 1). Its outer element carries `data-testid="widget-{id}"`.

## Moving Widgets

Drag a widget by its **header bar** to reposition it on the grid. While dragging, the widget moves freely with the cursor. On release, it snaps to the nearest grid cell. The move is animated with GSAP.

Widgets do **not** auto-rearrange when something is moved — every other widget stays exactly where it is. The user is wholly responsible for layout organization.

If the drop target would cause the widget to overlap another widget, the move is **rejected**: the widget animates back to its original position (GSAP spring-back) and an overlap error indicator (`data-testid="overlap-error"`) briefly appears.

## Resizing Widgets

A drag handle sits at the **bottom-right corner** of every widget (`data-testid="resize-{id}"`). Dragging it changes the widget's column span and row span. Resizing animates smoothly with GSAP.

Constraints:
- **Minimum**: 2 columns × 1 row
- **Maximum width**: 12 columns
- If the resize would cause overlap, it is rejected and the widget springs back to its previous size. The overlap error indicator appears.

## Widget Configuration

Clicking a widget selects it and opens a configuration panel (`data-testid="config-panel"`). Changes apply immediately and are reflected live in the widget preview.

**Counter**
- Label field — sets the descriptive text shown before the number
- Value field — sets the numeric display value
- Rendered as: `{label}: {value}`

**Bar Chart**
- Data field — comma-separated `label:value` pairs, e.g. `Jan:10,Feb:20,Mar:15`
- Renders each pair as an SVG bar, scaled relative to the maximum value

**Text Block**
- Content field — plain text with minimal markdown: `**bold**` and `_italic_`
- Rendered as formatted HTML inside the widget

**Table**
- Data field — CSV; the first row is treated as column headers, subsequent rows as data
- Rendered as an HTML table

**Progress Ring**
- Percentage field — integer from 0 to 100
- Label field — short descriptor shown below or inside the ring
- Rendered as an SVG circular arc indicating the given percentage

## Deleting Widgets

When a widget is selected, a delete button (`data-testid="delete-btn"`) appears (typically in the config panel or widget header). Clicking it removes the widget and frees its grid cells.

## Preview Modes

A preview panel (`data-testid="preview-panel"`) offers three layout simulations. Switching modes animates widget repositioning with GSAP.

| Button | `data-testid` | Column count | Behavior |
|---|---|---|---|
| Desktop | `preview-desktop` | 12 | Default; no constraints |
| Tablet | `preview-tablet` | 8 | Widgets wider than 8 columns shrink to 8 |
| Mobile | `preview-mobile` | 4 | Widgets wider than 4 columns shrink to 4; widgets stack vertically when they cannot fit side-by-side |

Preview mode does **not** permanently alter widget configuration — switching back to Desktop restores original sizes.

## Export / Import

- **Export** (`data-testid="export-btn"`): serializes the current layout (all widget types, positions, sizes, and configured content) to a JSON string and displays it in a read-only output area (`data-testid="layout-output"`).
- **Import** (`data-testid="import-btn"`): accepts a JSON string (from the same output area or pasted externally) and reconstructs the layout from it, replacing whatever is currently on the grid.

## Clear Layout

A **Clear Layout** button (`data-testid="clear-all-btn"`) removes all widgets from the grid, resets any preview mode back to Desktop, and leaves the grid in an empty initial state.

## Persistence

On every meaningful state change (widget added, moved, resized, configured, deleted), the full layout is written to `localStorage`. On page load, the saved layout is read back and the grid is restored exactly — same widget types, IDs, positions, sizes, and content.

## `data-testid` Reference

### Layout

| Element | `data-testid` |
|---|---|
| Grid container | `grid` |
| Widget palette sidebar | `palette` |
| Config panel | `config-panel` |
| Preview panel | `preview-panel` |
| Overlap error flash | `overlap-error` |

### Palette Entries

| Widget type | `data-testid` |
|---|---|
| Counter | `palette-counter` |
| Bar Chart | `palette-bar-chart` |
| Text Block | `palette-text` |
| Table | `palette-table` |
| Progress Ring | `palette-progress` |

### Per-Widget (replace `{id}` with the widget's integer ID)

| Element | `data-testid` |
|---|---|
| Widget container | `widget-{id}` |
| Resize handle | `resize-{id}` |

### Controls

| Element | `data-testid` |
|---|---|
| Delete selected widget | `delete-btn` |
| Clear all widgets | `clear-all-btn` |
| Export layout | `export-btn` |
| Import layout | `import-btn` |
| Layout JSON output/input | `layout-output` |
| Desktop preview button | `preview-desktop` |
| Tablet preview button | `preview-tablet` |
| Mobile preview button | `preview-mobile` |
