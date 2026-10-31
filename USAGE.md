# Quick start: Grouped & Stacked Bar Chart

How to add the visual to a Power BI report and set it up. For build steps, see [README.md](README.md).

## 1. Get the visual file

You need the packaged file `groupedStackedBarChart….pbiviz`.

- If someone sent it to you, skip to step 2.
- To build it yourself: run `npm install` and then `npm run package`. The file is written to the `dist/` folder.

## 2. Import it into your report

**Power BI Desktop**
1. Open your report.
2. In the **Visualizations** pane, click **…** (Get more visuals) and choose **Import a visual from a file**.
3. Pick the `.pbiviz` file and confirm the prompt.
4. A new icon appears at the bottom of the Visualizations pane. Click it to add the chart to the page.

**Power BI Service (browser)**
1. Open the report in **Edit** mode.
2. In the **Visualizations** pane, click **…**, then **Import a visual from a file**, and pick the `.pbiviz` file.

The visual is saved with the report, so anyone who opens the report can see it without importing it.
To use it in another report, import it there too, or ask your Power BI admin to add it to the
organizational visuals.

## 3. Add your data

Drag fields into the four wells:

| Well | Put here | Example |
| ---- | -------- | ------- |
| **Axis** | The main category along the axis | Fiscal year |
| **Group (clustered)** | What should sit **side by side** | Scenario: Budget / Actual / Forecast |
| **Stack (legend)** | What should be **stacked** inside each bar | Region |
| **Values** | A number or measure | Revenue |

The example gives one cluster per year. Each cluster has three bars (Budget, Actual and Forecast), and each bar is split by region.

Only **Values** is required:
- Leave **Group** empty to get a normal stacked chart.
- Leave **Stack** empty to get a normal clustered chart.

## 4. Format it

Select the visual and open **Format visual** (the paintbrush icon).

| Card | What you can change |
| ---- | ------------------- |
| **Chart type** | Orientation (vertical columns or horizontal bars); Stacked or 100% stacked |
| **Series colors** | Colour for each stack value. The defaults follow the report theme. |
| **Spacing** | Space between categories, space between bars, corner radius |
| **Legend** | On or off, top or bottom, text size and colour |
| **Category axis** | On or off, group labels under the bars, text size and colour |
| **Value axis** | On or off, gridlines, display units (K / M / bn), decimal places, text |
| **Data labels** | Segment labels (shown only where they fit), bar totals, colours, text size |

## 5. Interact with it

- **Click** a segment to select it and filter the rest of the page. **Ctrl+click** adds to the selection.
- **Click a legend item** to select that whole series.
- **Click empty space** to clear the selection.
- **Hover** over a segment to see its tooltip: category, group, series, value and bar total.
- **Right-click** a segment for the usual Power BI menu (Drill through, Include or Exclude, and so on).

### Keyboard

Press **Tab** to move into the chart, or **Ctrl+→** in Power BI.

| Key | Action |
| --- | ------ |
| Arrow keys | Move between bars and up or down a stack |
| Home / End | Jump to the first or last bar |
| Enter / Space | Select the focused segment (hold Ctrl to add to the selection) |
| Esc | Clear the selection |

## Language

The visual follows the language set in Power BI. It is available in English and French; any other language falls back to English.

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| The chart only shows a help message | Add a measure to **Values**. |
| Bars are too thin or labels are cut off with "…" | Make the visual larger, turn on horizontal orientation, or reduce **Spacing**. |
| Data labels are missing on some segments | Labels hide when they don't fit. Make the visual larger or the text smaller. |
| The legend is cut off with many series | The legend shows up to three rows. Move it to the bottom or make the visual wider. |
| "Can't display this visual" in the Service | Your tenant may block custom visuals that aren't certified. Ask your Power BI admin. |
