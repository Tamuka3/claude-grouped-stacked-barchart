"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService, formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { axisBottom, axisLeft, scaleBand, scaleLinear, ScaleBand, ScaleLinear, select, Selection } from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;

import { localizeEnumItems, VisualFormattingSettingsModel } from "./settings";
import {
    buildModel, ChartModel, DisplayUnits, formatNumber, formatPercent, ModelInput,
    resolveUnits, Segment, StackMode, toLabel
} from "./dataModel";

type SvgSel<T extends SVGElement = SVGGElement> = Selection<T, unknown, null, undefined>;

interface Margins { top: number; right: number; bottom: number; left: number; }

interface LaidOutSegment {
    segment: Segment<ISelectionId>;
    categoryLabel: string;
    groupLabel: string;
    barTotal: number;
    /** Position in keyboard navigation: bar ordinal across the chart, segment ordinal within the bar. */
    barOrdinal: number;
    segOrdinal: number;
    x: number; y: number; width: number; height: number;
}

const FONT_FAMILY = "\"Segoe UI\", wf_segoe-ui_normal, helvetica, arial, sans-serif";
const LEGEND_SWATCH = 10;

let measureCanvas: HTMLCanvasElement | null = null;
function measureText(text: string, fontSize: number): number {
    if (!measureCanvas) {
        measureCanvas = document.createElement("canvas");
    }
    const ctx = measureCanvas.getContext("2d");
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    return ctx.measureText(text).width;
}

function truncate(text: string, maxWidth: number, fontSize: number): string {
    if (maxWidth <= 0) {
        return "";
    }
    if (measureText(text, fontSize) <= maxWidth) {
        return text;
    }
    const ellipsis = "…";
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (measureText(text.slice(0, mid) + ellipsis, fontSize) <= maxWidth) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    return lo === 0 ? "" : text.slice(0, lo) + ellipsis;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private tooltipService: ITooltipService;
    private localization: ILocalizationManager;
    /** Keyboard focus position, kept across re-renders. */
    private focusBar = 0;
    private focusSeg = 0;
    private laidOut: LaidOutSegment[] = [];
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private root: HTMLElement;
    private svg: SvgSel<SVGSVGElement>;
    private legendG: SvgSel;
    private plotG: SvgSel;
    private gridG: SvgSel;
    private barsG: SvgSel;
    private labelsG: SvgSel;
    private valueAxisG: SvgSel;
    private categoryAxisG: SvgSel;
    private landing: Selection<HTMLDivElement, unknown, null, undefined>;

    private model: ChartModel<ISelectionId> | null = null;
    private categoryDisplayName = "Axis";
    private groupDisplayName = "Group";
    private stackDisplayName = "Stack";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.tooltipService = options.host.tooltipService;
        this.localization = options.host.createLocalizationManager();
        localizeEnumItems(this.localization);
        this.formattingSettingsService = new FormattingSettingsService(this.localization);
        this.root = options.element;

        this.svg = select(this.root).append("svg").classed("gsb-chart", true)
            .attr("role", "group")
            .attr("aria-label", this.t("Aria_Chart", "Grouped and stacked bar chart"));
        this.legendG = this.svg.append("g").classed("gsb-legend", true)
            .attr("role", "group")
            .attr("aria-label", this.t("Aria_Legend", "Legend"));
        this.plotG = this.svg.append("g").classed("gsb-plot", true);
        this.gridG = this.plotG.append("g").classed("gsb-grid", true);
        this.valueAxisG = this.plotG.append("g").classed("gsb-value-axis", true);
        this.barsG = this.plotG.append("g").classed("gsb-bars", true);
        this.labelsG = this.plotG.append("g").classed("gsb-labels", true);
        this.categoryAxisG = this.plotG.append("g").classed("gsb-category-axis", true);

        this.landing = select(this.root).append("div").classed("gsb-landing", true);
        this.landing.append("div").classed("gsb-landing-title", true)
            .text(this.t("Visual_Name", "Grouped & Stacked Bar Chart"));
        const body = this.landing.append("div").classed("gsb-landing-body", true);
        const steps: [string, string][] = [
            [this.t("Role_Axis", "Axis"), this.t("Landing_Axis", "outer category")],
            [this.t("Role_Group", "Group (clustered)"), this.t("Landing_Group", "bars side by side")],
            [this.t("Role_Stack", "Stack (legend)"), this.t("Landing_Stack", "segments in each bar")],
            [this.t("Role_Values", "Values"), this.t("Landing_Values", "a measure")]
        ];
        steps.forEach(([role, hint]) => {
            const line = body.append("div");
            line.append("b").text(role);
            line.append("span").text(` – ${hint}`);
        });

        // Clicking empty space clears selection.
        this.svg.on("click", (event: MouseEvent) => {
            if (event.target === this.svg.node()) {
                this.clearSelection();
            }
        });
        this.svg.on("contextmenu", (event: MouseEvent) => {
            if (event.target === this.svg.node()) {
                this.selectionManager.showContextMenu({} as ISelectionId, { x: event.clientX, y: event.clientY });
                event.preventDefault();
            }
        });

        this.selectionManager.registerOnSelectCallback(() => this.applySelectionStyles());
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dataView = options.dataViews && options.dataViews[0];
            this.formattingSettings = this.formattingSettingsService
                .populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

            const mode = this.formattingSettings.general.stackMode.value.value as StackMode;
            this.model = dataView ? this.buildModelFromDataView(dataView, mode) : null;

            const width = options.viewport.width;
            const height = options.viewport.height;
            this.svg.attr("width", width).attr("height", height);

            const hasData = !!this.model && this.model.categories.some(c => c.bars.length > 0);
            this.landing.style("display", hasData ? null : "flex");
            this.svg.style("display", hasData ? null : "none");

            if (hasData) {
                this.render(width, height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            console.error("Grouped stacked bar chart update failed", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    // ---------------------------------------------------------------- data

    private buildModelFromDataView(dataView: DataView, mode: StackMode): ChartModel<ISelectionId> | null {
        const categorical = dataView.categorical;
        if (!categorical || !categorical.values || categorical.values.length === 0) {
            return null;
        }

        const categories = categorical.categories || [];
        const catCol: DataViewCategoryColumn | undefined = categories.find(c => c.source.roles && c.source.roles["category"]);
        const grpCol: DataViewCategoryColumn | undefined = categories.find(c => c.source.roles && c.source.roles["group"]);
        const valueColumns = categorical.values;
        const stackSource = valueColumns.source;
        const hasStacks = !!stackSource && !!stackSource.roles && !!stackSource.roles["stack"];

        this.categoryDisplayName = catCol ? catCol.source.displayName : this.t("Role_Axis", "Axis");
        this.groupDisplayName = grpCol ? grpCol.source.displayName : this.t("Role_Group", "Group");
        this.stackDisplayName = hasStacks ? stackSource.displayName : this.t("Default_Series", "Series");

        const rowCount = categories.length > 0 ? categories[0].values.length : 1;
        const groupedValues: DataViewValueColumnGroup[] = valueColumns.grouped();
        const palette = this.host.colorPalette;
        const measureName = valueColumns[0].source.displayName;

        const series: ModelInput<ISelectionId>["series"] = [];
        groupedValues.forEach((group, index) => {
            const column = group.values.find(v => v.source.roles && v.source.roles["values"]);
            if (!column) {
                return;
            }
            const name = hasStacks ? toLabel(group.name) : column.source.displayName;
            const objects = hasStacks ? group.objects : column.source.objects;
            const fill = objects && objects["dataPoint"] && objects["dataPoint"]["fill"] as powerbi.Fill;
            const color = palette.isHighContrast
                ? palette.foreground.value
                : (fill && fill.solid && fill.solid.color) || palette.getColor(name + "#" + index).value;

            const seriesId = hasStacks
                ? this.host.createSelectionIdBuilder().withSeries(valueColumns, group).createSelectionId()
                : this.host.createSelectionIdBuilder().withMeasure(column.source.queryName).createSelectionId();

            series.push({
                key: hasStacks ? `${index}:${name}` : column.source.queryName,
                name,
                color,
                selectionId: seriesId,
                values: column.values,
                highlights: column.highlights,
                pointId: (row: number) => {
                    let builder = this.host.createSelectionIdBuilder();
                    if (catCol) { builder = builder.withCategory(catCol, row); }
                    if (grpCol) { builder = builder.withCategory(grpCol, row); }
                    builder = hasStacks
                        ? builder.withSeries(valueColumns, group)
                        : builder.withMeasure(column.source.queryName);
                    return builder.createSelectionId();
                }
            });
        });

        // Build the per-series colour slices for the formatting pane.
        this.formattingSettings.dataPoint.slices = series.map(s => new formattingSettings.ColorPicker({
            name: "fill",
            displayName: s.name,
            value: { value: s.color },
            selector: hasStacks
                ? s.selectionId.getSelector()
                : { metadata: s.key }
        }));

        return buildModel<ISelectionId>({
            rowCount,
            categoryValues: catCol ? catCol.values : undefined,
            groupValues: grpCol ? grpCol.values : undefined,
            series,
            hasStacks,
            measureName
        }, mode);
    }

    // ----------------------------------------------------------- rendering

    private render(width: number, height: number): void {
        const model = this.model;
        const s = this.formattingSettings;
        const palette = this.host.colorPalette;
        const hc = palette.isHighContrast;
        const fg = hc ? palette.foreground.value : null;

        const horizontal = s.general.orientation.value.value === "horizontal";
        const percent = model.mode === "percent";

        // ---- legend
        const legendShow = s.legend.show.value && model.series.length > 0 && (model.hasStacks || model.series.length > 1);
        const legendFs = s.legend.fontSize.value;
        const legendHeight = legendShow ? this.renderLegend(width, legendFs, fg || s.legend.color.value.value) : 0;
        const legendAtTop = s.legend.position.value.value !== "bottom";
        this.legendG.attr("transform", `translate(0, ${legendAtTop ? 0 : height - legendHeight})`);
        this.legendG.style("display", legendShow ? null : "none");

        // ---- value formatting
        const vaFs = s.valueAxis.fontSize.value;
        const decimals = Math.max(0, Math.min(6, s.valueAxis.decimals.value));
        const maxAbs = Math.max(Math.abs(model.minValue), Math.abs(model.maxValue));
        const units = resolveUnits(s.valueAxis.displayUnits.value.value as DisplayUnits, maxAbs);
        const fmtAxis = (v: number) => percent ? formatPercent(v, 0) : formatNumber(v, units, decimals);
        const fmtLabel = (v: number) => formatNumber(v, units, decimals);

        const valueDomain: [number, number] = percent
            ? [model.minValue < 0 ? -1 : 0, model.maxValue > 0 ? 1 : 0]
            : [model.minValue, model.maxValue === model.minValue ? model.minValue + 1 : model.maxValue];

        // ---- margins
        const caFs = s.categoryAxis.fontSize.value;
        const showCatAxis = s.categoryAxis.show.value;
        const showGroupLabels = showCatAxis && s.categoryAxis.showGroupLabels.value && model.hasGroups;
        const showValueAxis = s.valueAxis.show.value;
        const totalsFs = s.dataLabels.fontSize.value;
        const showTotals = s.dataLabels.showTotals.value;

        const margin: Margins = { top: 8, right: 12, bottom: 8, left: 8 };
        if (legendAtTop) { margin.top += legendHeight; } else { margin.bottom += legendHeight; }

        const probeScale = scaleLinear().domain(valueDomain).nice();
        const tickCount = Math.max(2, Math.floor((horizontal ? width : height) / 70));
        const probeTicks = probeScale.ticks(tickCount).map(fmtAxis);
        const maxTickWidth = probeTicks.reduce((m, t) => Math.max(m, measureText(t, vaFs)), 0);

        let groupColWidth = 0;
        let categoryColWidth = 0;
        if (horizontal) {
            if (showCatAxis) {
                const maxCat = model.categories.reduce((m, c) => Math.max(m, measureText(c.label, caFs)), 0);
                categoryColWidth = Math.min(maxCat, width * 0.25);
                if (showGroupLabels) {
                    const maxGrp = model.groups.reduce((m, g) => Math.max(m, measureText(g, caFs - 1)), 0);
                    groupColWidth = Math.min(maxGrp, width * 0.2) + 8;
                }
                margin.left += categoryColWidth + groupColWidth + 8;
            }
            if (showValueAxis) {
                margin.bottom += vaFs + 10;
                margin.right += maxTickWidth / 2;
            }
            if (showTotals) {
                margin.right += probeTicks.reduce((m, t) => Math.max(m, measureText(t, totalsFs)), 0) + 6;
            }
        } else {
            if (showValueAxis) {
                margin.left += maxTickWidth + 8;
            }
            if (showCatAxis) {
                margin.bottom += caFs + 8 + (showGroupLabels ? caFs + 6 : 0);
            }
            if (showTotals) {
                margin.top += totalsFs + 4;
            }
        }

        const plotW = Math.max(10, width - margin.left - margin.right);
        const plotH = Math.max(10, height - margin.top - margin.bottom);
        this.plotG.attr("transform", `translate(${margin.left}, ${margin.top})`);

        // ---- scales
        const bandLength = horizontal ? plotH : plotW;
        const valueLength = horizontal ? plotW : plotH;

        const categoryScale: ScaleBand<string> = scaleBand<string>()
            .domain(model.categories.map(c => c.key))
            .range([0, bandLength])
            .paddingInner(Math.min(0.8, s.layout.categoryPadding.value / 100))
            .paddingOuter(Math.min(0.4, s.layout.categoryPadding.value / 200));

        const groupScale: ScaleBand<string> = scaleBand<string>()
            .domain(model.groups)
            .range([0, categoryScale.bandwidth()])
            .paddingInner(Math.min(0.8, s.layout.groupPadding.value / 100));

        const valueScale: ScaleLinear<number, number> = scaleLinear()
            .domain(valueDomain)
            .range(horizontal ? [0, valueLength] : [valueLength, 0])
            .nice(tickCount);

        // ---- gridlines & value axis
        const axisColor = fg || s.valueAxis.color.value.value;
        this.gridG.selectAll("*").remove();
        this.valueAxisG.selectAll("*").remove();
        const ticks = valueScale.ticks(tickCount);

        if (s.valueAxis.gridlines.value) {
            this.gridG.selectAll("line")
                .data(ticks)
                .join("line")
                .attr("class", d => d === 0 ? "gsb-zero" : null)
                .attr("x1", d => horizontal ? valueScale(d) : 0)
                .attr("x2", d => horizontal ? valueScale(d) : plotW)
                .attr("y1", d => horizontal ? 0 : valueScale(d))
                .attr("y2", d => horizontal ? plotH : valueScale(d))
                .attr("stroke", hc ? fg : "#E1DFDD")
                .attr("stroke-width", 1)
                .attr("shape-rendering", "crispEdges");
        }

        if (showValueAxis) {
            const axis = (horizontal ? axisBottom(valueScale) : axisLeft(valueScale))
                .tickValues(ticks)
                .tickFormat(d => fmtAxis(Number(d)))
                .tickSize(0)
                .tickPadding(6);
            this.valueAxisG
                .attr("transform", horizontal ? `translate(0, ${plotH})` : null)
                .call(axis);
            this.valueAxisG.select(".domain").remove();
            this.valueAxisG.selectAll("text")
                .attr("fill", axisColor)
                .style("font-size", `${vaFs}px`)
                .style("font-family", FONT_FAMILY);
        }

        // ---- zero baseline
        this.gridG.append("line")
            .attr("x1", horizontal ? valueScale(0) : 0)
            .attr("x2", horizontal ? valueScale(0) : plotW)
            .attr("y1", horizontal ? 0 : valueScale(0))
            .attr("y2", horizontal ? plotH : valueScale(0))
            .attr("stroke", hc ? fg : "#A19F9D")
            .attr("stroke-width", 1)
            .attr("shape-rendering", "crispEdges");

        // ---- lay out segments
        const toRect = (bandPos: number, bandSize: number, v0: number, v1: number) => {
            const a = valueScale(v0);
            const b = valueScale(v1);
            return horizontal
                ? { x: Math.min(a, b), y: bandPos, width: Math.abs(b - a), height: bandSize }
                : { x: bandPos, y: Math.min(a, b), width: bandSize, height: Math.abs(b - a) };
        };

        const laid: LaidOutSegment[] = [];
        const totals: { x: number; y: number; text: string; anchor: string; baseline: string }[] = [];
        const groupLabels: { pos: number; size: number; text: string }[] = [];

        let barOrdinal = 0;
        for (const cat of model.categories) {
            const catPos = categoryScale(cat.key);
            for (const bar of cat.bars) {
                const ordinal = barOrdinal++;
                const barPos = catPos + groupScale(bar.groupKey);
                const barSize = groupScale.bandwidth();
                bar.segments.forEach((seg, segOrdinal) => {
                    laid.push({
                        segment: seg,
                        barOrdinal: ordinal,
                        segOrdinal,
                        categoryLabel: cat.label,
                        groupLabel: bar.groupLabel,
                        barTotal: bar.total,
                        ...toRect(barPos, barSize, seg.start, seg.end)
                    });
                });
                if (showGroupLabels) {
                    groupLabels.push({ pos: barPos, size: barSize, text: bar.groupLabel });
                }
                if (showTotals && bar.segments.length > 0) {
                    const text = fmtLabel(bar.total);
                    const negative = bar.total < 0 && bar.positiveExtent === 0;
                    const end = negative ? bar.negativeExtent : bar.positiveExtent;
                    const v = valueScale(end);
                    if (horizontal) {
                        totals.push({
                            x: v + (negative ? -4 : 4), y: barPos + barSize / 2,
                            text, anchor: negative ? "end" : "start", baseline: "central"
                        });
                    } else {
                        totals.push({
                            x: barPos + barSize / 2, y: v + (negative ? 4 : -4),
                            text, anchor: "middle", baseline: negative ? "hanging" : "auto"
                        });
                    }
                }
            }
        }

        // ---- bars
        const radius = Math.max(0, s.layout.cornerRadius.value);
        this.barsG.selectAll<SVGRectElement, LaidOutSegment>("rect.gsb-segment")
            .data(laid)
            .join("rect")
            .classed("gsb-segment", true)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("width", d => Math.max(0, d.width))
            .attr("height", d => Math.max(0, d.height))
            .attr("rx", Math.min(radius, groupScale.bandwidth() / 2))
            .attr("fill", d => hc ? palette.background.value : d.segment.color)
            .attr("stroke", hc ? fg : (d => d.width > 3 && d.height > 3 ? "rgba(255,255,255,0.6)" : null))
            .attr("stroke-width", hc ? 2 : 0.5)
            .attr("role", "option")
            .attr("aria-label", d => this.segmentAriaLabel(d, percent))
            .on("click", (event: MouseEvent, d) => {
                event.stopPropagation();
                this.focusBar = d.barOrdinal;
                this.focusSeg = d.segOrdinal;
                this.updateTabStops();
                this.selectSegment(d, event.ctrlKey || event.metaKey || event.shiftKey);
            })
            .on("keydown", (event: KeyboardEvent, d) => this.onSegmentKeyDown(event, d, horizontal))
            .on("focus", (event: FocusEvent, d) => {
                const r = (event.target as Element).getBoundingClientRect();
                this.tooltipService.show({
                    coordinates: [r.left + r.width / 2, r.top + r.height / 2],
                    isTouchEvent: false,
                    dataItems: this.tooltipItems(d, percent),
                    identities: [d.segment.selectionId]
                });
            })
            .on("blur", () => this.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("contextmenu", (event: MouseEvent, d) => {
                this.selectionManager.showContextMenu(d.segment.selectionId, { x: event.clientX, y: event.clientY });
                event.preventDefault();
                event.stopPropagation();
            })
            .on("mouseover mousemove", (event: MouseEvent, d) => {
                this.tooltipService.show({
                    coordinates: [event.clientX, event.clientY],
                    isTouchEvent: false,
                    dataItems: this.tooltipItems(d, percent),
                    identities: [d.segment.selectionId]
                });
            })
            .on("mouseout", () => this.tooltipService.hide({ immediately: false, isTouchEvent: false }));

        this.laidOut = laid;
        this.barsG.attr("role", "listbox").attr("aria-multiselectable", "true");
        this.updateTabStops();

        // ---- data labels
        this.labelsG.selectAll("*").remove();
        const dlFs = s.dataLabels.fontSize.value;
        if (s.dataLabels.show.value) {
            const segmentLabels = laid
                .map(d => {
                    const text = percent ? formatPercent(d.segment.displayValue, decimals) : fmtLabel(d.segment.value);
                    const fits = measureText(text, dlFs) + 4 <= d.width && dlFs + 2 <= d.height;
                    return fits ? { d, text } : null;
                })
                .filter(x => x !== null);
            this.labelsG.selectAll("text.gsb-seg-label")
                .data(segmentLabels)
                .join("text")
                .classed("gsb-seg-label", true)
                .attr("x", l => l.d.x + l.d.width / 2)
                .attr("y", l => l.d.y + l.d.height / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("fill", fg || s.dataLabels.color.value.value)
                .style("font-size", `${dlFs}px`)
                .text(l => l.text);
        }
        if (showTotals) {
            this.labelsG.selectAll("text.gsb-total")
                .data(totals)
                .join("text")
                .classed("gsb-total", true)
                .attr("x", t => t.x)
                .attr("y", t => t.y)
                .attr("text-anchor", t => t.anchor)
                .attr("dominant-baseline", t => t.baseline)
                .attr("fill", fg || s.dataLabels.totalColor.value.value)
                .style("font-size", `${totalsFs}px`)
                .style("font-weight", "600")
                .text(t => t.text);
        }

        // ---- category axis (two-level: group labels + category labels)
        this.categoryAxisG.selectAll("*").remove();
        if (showCatAxis) {
            const catColor = fg || s.categoryAxis.color.value.value;
            const grpFs = Math.max(6, caFs - 1);
            const ca = this.categoryAxisG;

            if (horizontal) {
                ca.selectAll("text.gsb-group-label")
                    .data(groupLabels)
                    .join("text")
                    .classed("gsb-group-label", true)
                    .attr("x", -6)
                    .attr("y", g => g.pos + g.size / 2)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("fill", catColor)
                    .style("font-size", `${grpFs}px`)
                    .text(g => g.size >= grpFs * 0.8 ? truncate(g.text, groupColWidth - 8, grpFs) : "");

                ca.selectAll("text.gsb-category-label")
                    .data(model.categories)
                    .join("text")
                    .classed("gsb-category-label", true)
                    .attr("x", -6 - groupColWidth - (showGroupLabels ? 4 : 0))
                    .attr("y", c => categoryScale(c.key) + categoryScale.bandwidth() / 2)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("fill", catColor)
                    .style("font-size", `${caFs}px`)
                    .style("font-weight", showGroupLabels ? "600" : null)
                    .text(c => truncate(c.label, categoryColWidth, caFs))
                    .append("title").text(c => c.label);
            } else {
                const groupRow = showGroupLabels ? grpFs + 6 : 0;
                ca.attr("transform", `translate(0, ${plotH})`);

                ca.selectAll("text.gsb-group-label")
                    .data(groupLabels)
                    .join("text")
                    .classed("gsb-group-label", true)
                    .attr("x", g => g.pos + g.size / 2)
                    .attr("y", 4)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "hanging")
                    .attr("fill", catColor)
                    .style("font-size", `${grpFs}px`)
                    .text(g => truncate(g.text, g.size + groupScale.step() * groupScale.paddingInner(), grpFs))
                    .append("title").text(g => g.text);

                ca.selectAll("text.gsb-category-label")
                    .data(model.categories)
                    .join("text")
                    .classed("gsb-category-label", true)
                    .attr("x", c => categoryScale(c.key) + categoryScale.bandwidth() / 2)
                    .attr("y", 4 + groupRow)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "hanging")
                    .attr("fill", catColor)
                    .style("font-size", `${caFs}px`)
                    .style("font-weight", showGroupLabels ? "600" : null)
                    .text(c => truncate(c.label, categoryScale.step(), caFs))
                    .append("title").text(c => c.label);
            }

            // Separators between categories when bars are clustered.
            if (model.hasGroups && model.categories.length > 1) {
                const step = categoryScale.step();
                const gap = step - categoryScale.bandwidth();
                const seps = model.categories.slice(1).map(c => categoryScale(c.key) - gap / 2);
                const extent = horizontal
                    ? { a: -(groupColWidth + categoryColWidth + 12), b: 0 }
                    : { a: 0, b: caFs + 8 + (showGroupLabels ? grpFs + 6 : 0) };
                ca.selectAll("line.gsb-sep")
                    .data(seps)
                    .join("line")
                    .classed("gsb-sep", true)
                    .attr("x1", p => horizontal ? extent.a : p)
                    .attr("x2", p => horizontal ? extent.b : p)
                    .attr("y1", p => horizontal ? p : extent.a)
                    .attr("y2", p => horizontal ? p : extent.b)
                    .attr("stroke", hc ? fg : "#E1DFDD")
                    .attr("shape-rendering", "crispEdges");
            }
        }

        this.applySelectionStyles();
    }

    private renderLegend(width: number, fontSize: number, color: string): number {
        const model = this.model;
        const rowHeight = Math.max(LEGEND_SWATCH, fontSize) + 8;
        const padX = 8;
        const gap = 16;

        // Lay out items, wrapping onto multiple rows (max 3 rows).
        const items: { name: string; color: string; x: number; row: number; label: string; index: number }[] = [];
        let x = padX;
        let row = 0;
        const titleText = model.hasStacks ? this.stackDisplayName : "";
        const titleWidth = titleText ? measureText(titleText, fontSize) + 10 : 0;
        x += titleWidth;
        model.series.forEach((s, index) => {
            const label = truncate(s.name, Math.max(40, width / 3), fontSize);
            const w = LEGEND_SWATCH + 5 + measureText(label, fontSize);
            if (x + w > width - padX && x > padX + titleWidth) {
                row += 1;
                x = padX + titleWidth;
            }
            items.push({ name: s.name, color: s.color, x, row, label, index });
            x += w + gap;
        });
        const visible = items.filter(i => i.row < 3);
        const rows = visible.length ? visible[visible.length - 1].row + 1 : 0;

        this.legendG.selectAll("*").remove();
        if (titleText) {
            this.legendG.append("text")
                .attr("x", padX)
                .attr("y", 4 + rowHeight / 2)
                .attr("dominant-baseline", "central")
                .attr("fill", color)
                .style("font-size", `${fontSize}px`)
                .style("font-weight", "600")
                .text(titleText);
        }
        const hc = this.host.colorPalette.isHighContrast;
        const g = this.legendG.selectAll<SVGGElement, typeof visible[number]>("g.gsb-legend-item")
            .data(visible)
            .join("g")
            .classed("gsb-legend-item", true)
            .attr("transform", d => `translate(${d.x}, ${4 + d.row * rowHeight})`)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", d => d.name)
            .on("click", (event: MouseEvent, d) => {
                event.stopPropagation();
                this.selectSeries(d.index, event.ctrlKey || event.metaKey || event.shiftKey);
            })
            .on("keydown", (event: KeyboardEvent, d) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.selectSeries(d.index, event.ctrlKey || event.metaKey || event.shiftKey);
                } else if (event.key === "Escape") {
                    this.clearSelection();
                }
            });
        g.append("rect")
            .attr("y", (rowHeight - LEGEND_SWATCH) / 2)
            .attr("width", LEGEND_SWATCH)
            .attr("height", LEGEND_SWATCH)
            .attr("rx", 2)
            .attr("fill", d => hc ? this.host.colorPalette.background.value : d.color)
            .attr("stroke", hc ? this.host.colorPalette.foreground.value : null);
        g.append("text")
            .attr("x", LEGEND_SWATCH + 5)
            .attr("y", rowHeight / 2)
            .attr("dominant-baseline", "central")
            .attr("fill", color)
            .style("font-size", `${fontSize}px`)
            .text(d => d.label)
            .append("title").text(d => d.name);

        return rows * rowHeight + 8;
    }

    private tooltipItems(d: LaidOutSegment, percent: boolean): VisualTooltipDataItem[] {
        const model = this.model;
        const items: VisualTooltipDataItem[] = [];
        if (d.categoryLabel) {
            items.push({ displayName: this.categoryDisplayName, value: d.categoryLabel });
        }
        if (model.hasGroups) {
            items.push({ displayName: this.groupDisplayName, value: d.groupLabel });
        }
        if (model.hasStacks) {
            items.push({ displayName: this.stackDisplayName, value: d.segment.seriesName, color: d.segment.color });
        }
        items.push({
            displayName: model.measureName,
            value: d.segment.value.toLocaleString(),
            color: model.hasStacks ? undefined : d.segment.color
        });
        if (percent) {
            items.push({ displayName: this.t("Tooltip_PercentOfBar", "% of bar"), value: formatPercent(d.segment.displayValue, 1) });
        }
        if (model.hasStacks) {
            items.push({ displayName: this.t("Tooltip_BarTotal", "Bar total"), value: d.barTotal.toLocaleString() });
        }
        return items;
    }

    private t(key: string, fallback: string): string {
        const text = this.localization ? this.localization.getDisplayName(key) : null;
        return text && text !== key ? text : fallback;
    }

    private segmentAriaLabel(d: LaidOutSegment, percent: boolean): string {
        const model = this.model;
        const parts: string[] = [];
        if (d.categoryLabel) { parts.push(d.categoryLabel); }
        if (model.hasGroups) { parts.push(d.groupLabel); }
        if (model.hasStacks) { parts.push(d.segment.seriesName); }
        let value = `${model.measureName} ${d.segment.value.toLocaleString()}`;
        if (percent) {
            value += ` (${formatPercent(d.segment.displayValue, 1)})`;
        }
        return `${parts.join(", ")}: ${value}`;
    }

    // ------------------------------------------------------------ keyboard

    /** Roving tab index: only the focused segment is in the tab order. */
    private updateTabStops(): void {
        const target = this.findSegment(this.focusBar, this.focusSeg) || this.laidOut[0];
        if (target) {
            this.focusBar = target.barOrdinal;
            this.focusSeg = target.segOrdinal;
        }
        this.barsG.selectAll<SVGRectElement, LaidOutSegment>("rect.gsb-segment")
            .attr("tabindex", d => d === target ? 0 : -1);
    }

    private findSegment(bar: number, seg: number): LaidOutSegment | undefined {
        const inBar = this.laidOut.filter(d => d.barOrdinal === bar);
        if (inBar.length === 0) {
            return undefined;
        }
        return inBar[Math.max(0, Math.min(seg, inBar.length - 1))];
    }

    private onSegmentKeyDown(event: KeyboardEvent, d: LaidOutSegment, horizontal: boolean): void {
        const lastBar = this.laidOut.length ? this.laidOut[this.laidOut.length - 1].barOrdinal : 0;
        // Arrows along the category axis move between bars, arrows along the value axis move within a stack.
        const nextBar = horizontal ? "ArrowDown" : "ArrowRight";
        const prevBar = horizontal ? "ArrowUp" : "ArrowLeft";
        const nextSeg = horizontal ? "ArrowRight" : "ArrowUp";
        const prevSeg = horizontal ? "ArrowLeft" : "ArrowDown";

        let bar = d.barOrdinal;
        let seg = d.segOrdinal;
        switch (event.key) {
            case nextBar: bar = Math.min(lastBar, bar + 1); break;
            case prevBar: bar = Math.max(0, bar - 1); break;
            case nextSeg: seg = seg + 1; break;
            case prevSeg: seg = Math.max(0, seg - 1); break;
            case "Home": bar = 0; seg = 0; break;
            case "End": bar = lastBar; seg = 0; break;
            case "Enter":
            case " ":
                event.preventDefault();
                this.selectSegment(d, event.ctrlKey || event.metaKey || event.shiftKey);
                return;
            case "Escape":
                this.clearSelection();
                return;
            default:
                return;
        }
        event.preventDefault();
        const target = this.findSegment(bar, seg);
        if (!target) {
            return;
        }
        this.focusBar = target.barOrdinal;
        this.focusSeg = target.segOrdinal;
        this.updateTabStops();
        const node = this.barsG.selectAll<SVGRectElement, LaidOutSegment>("rect.gsb-segment")
            .filter(x => x === target).node();
        if (node) {
            node.focus();
        }
    }

    // ----------------------------------------------------------- selection

    private selectSegment(d: LaidOutSegment, multi: boolean): void {
        if (!this.allowInteractions()) { return; }
        this.selectionManager.select(d.segment.selectionId, multi).then(() => this.applySelectionStyles());
    }

    private selectSeries(index: number, multi: boolean): void {
        if (!this.allowInteractions() || !this.model) { return; }
        this.selectionManager.select(this.model.series[index].selectionId, multi)
            .then(() => this.applySelectionStyles());
    }

    private clearSelection(): void {
        if (!this.allowInteractions()) { return; }
        this.selectionManager.clear().then(() => this.applySelectionStyles());
    }

    private allowInteractions(): boolean {
        const caps = this.host.hostCapabilities;
        return !caps || caps.allowInteractions !== false;
    }

    private applySelectionStyles(): void {
        const model = this.model;
        if (!model) {
            return;
        }
        const selected = this.selectionManager.getSelectionIds() as ISelectionId[];
        const hasSelection = selected.length > 0;
        const isSelected = (seg: Segment<ISelectionId>) =>
            selected.some(id => id.equals(seg.selectionId) || id.equals(model.series[seg.seriesIndex].selectionId));

        this.barsG.selectAll<SVGRectElement, LaidOutSegment>("rect.gsb-segment")
            .attr("aria-selected", d => hasSelection && isSelected(d.segment) ? "true" : "false")
            .style("fill-opacity", d => {
                if (hasSelection) {
                    return isSelected(d.segment) ? 1 : 0.35;
                }
                return d.segment.highlighted ? 1 : 0.35;
            });

        this.legendG.selectAll<SVGGElement, { index: number }>("g.gsb-legend-item")
            .attr("aria-pressed", d => hasSelection && selected.some(id => id.equals(model.series[d.index].selectionId))
                ? "true" : "false")
            .style("opacity", d => {
                if (!hasSelection) {
                    return 1;
                }
                const sid = model.series[d.index].selectionId;
                return selected.some(id => id.equals(sid)) ? 1 : 0.5;
            });
    }
}
