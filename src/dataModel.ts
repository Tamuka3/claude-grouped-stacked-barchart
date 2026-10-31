"use strict";

/**
 * Pure data model for the grouped + stacked bar chart.
 *
 * The categorical data view arrives as:
 *   categories[]  -> "Axis" column and (optionally) "Group" column, one row per (axis, group) pair
 *   values.grouped() -> one value-column group per "Stack" series
 *
 * We turn that into   Category -> Bar (one per group) -> Segment (one per stack series).
 */

export type StackMode = "stacked" | "percent";

export interface SeriesInfo<TId> {
    key: string;
    name: string;
    color: string;
    selectionId: TId;
}

export interface Segment<TId> {
    seriesIndex: number;
    seriesName: string;
    /** Raw measure value. */
    value: number;
    /** Value shown in chart units (raw, or fraction of bar total in percent mode). */
    displayValue: number;
    /** Start / end of the segment along the value axis, in chart units. */
    start: number;
    end: number;
    color: string;
    highlighted: boolean;
    selectionId: TId;
}

export interface Bar<TId> {
    groupKey: string;
    groupLabel: string;
    segments: Segment<TId>[];
    /** Sum of positive raw values. */
    positiveTotal: number;
    /** Sum of negative raw values. */
    negativeTotal: number;
    /** Net raw total. */
    total: number;
    /** Positive / negative extent along the value axis in chart units. */
    positiveExtent: number;
    negativeExtent: number;
}

export interface Category<TId> {
    key: string;
    label: string;
    bars: Bar<TId>[];
}

export interface ChartModel<TId> {
    categories: Category<TId>[];
    groups: string[];
    series: SeriesInfo<TId>[];
    hasGroups: boolean;
    hasStacks: boolean;
    hasHighlights: boolean;
    minValue: number;
    maxValue: number;
    mode: StackMode;
    measureName: string;
}

/** A flattened, data-view-independent input row set (easy to unit test). */
export interface ModelInput<TId> {
    rowCount: number;
    categoryValues?: unknown[];
    groupValues?: unknown[];
    series: {
        key: string;
        name: string;
        color: string;
        selectionId: TId;
        values: unknown[];
        highlights?: unknown[];
        /** Selection id for a single data point (row index). */
        pointId: (rowIndex: number) => TId;
    }[];
    hasStacks: boolean;
    measureName: string;
}

export function toLabel(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "(Blank)";
    }
    if (value instanceof Date) {
        return value.toLocaleDateString();
    }
    return String(value);
}

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const n = typeof value === "number" ? value : Number(value);
    return isFinite(n) ? n : null;
}

export function buildModel<TId>(input: ModelInput<TId>, mode: StackMode): ChartModel<TId> {
    const hasGroups = !!input.groupValues;
    const hasHighlights = input.series.some(s => !!s.highlights);

    const categoryOrder: string[] = [];
    const categoryLabels = new Map<string, string>();
    const groupOrder: string[] = [];
    const groupSeen = new Set<string>();
    // categoryKey -> groupKey -> segments
    const cells = new Map<string, Map<string, Segment<TId>[]>>();

    for (let row = 0; row < input.rowCount; row++) {
        const catLabel = input.categoryValues ? toLabel(input.categoryValues[row]) : "";
        const catKey = catLabel;
        const grpLabel = input.groupValues ? toLabel(input.groupValues[row]) : "";

        if (!cells.has(catKey)) {
            cells.set(catKey, new Map());
            categoryOrder.push(catKey);
            categoryLabels.set(catKey, catLabel);
        }
        if (!groupSeen.has(grpLabel)) {
            groupSeen.add(grpLabel);
            groupOrder.push(grpLabel);
        }

        const groupMap = cells.get(catKey);
        if (!groupMap.has(grpLabel)) {
            groupMap.set(grpLabel, []);
        }
        const segments = groupMap.get(grpLabel);

        input.series.forEach((s, seriesIndex) => {
            const value = toNumber(s.values[row]);
            if (value === null) {
                return;
            }
            const hl = s.highlights ? toNumber(s.highlights[row]) : null;
            segments.push({
                seriesIndex,
                seriesName: s.name,
                value,
                displayValue: value,
                start: 0,
                end: 0,
                color: s.color,
                highlighted: !hasHighlights || (hl !== null && hl !== 0),
                selectionId: s.pointId(row)
            });
        });
    }

    let minValue = 0;
    let maxValue = 0;

    const categories: Category<TId>[] = categoryOrder.map(catKey => {
        const groupMap = cells.get(catKey);
        const bars: Bar<TId>[] = groupOrder
            .filter(g => groupMap.has(g))
            .map(groupKey => {
                const segments = groupMap.get(groupKey).sort((a, b) => a.seriesIndex - b.seriesIndex);
                const bar = stackBar(groupKey, segments, mode);
                minValue = Math.min(minValue, bar.negativeExtent);
                maxValue = Math.max(maxValue, bar.positiveExtent);
                return bar;
            });
        return { key: catKey, label: categoryLabels.get(catKey), bars };
    });

    return {
        categories,
        groups: groupOrder,
        series: input.series.map(s => ({ key: s.key, name: s.name, color: s.color, selectionId: s.selectionId })),
        hasGroups,
        hasStacks: input.hasStacks,
        hasHighlights,
        minValue,
        maxValue,
        mode,
        measureName: input.measureName
    };
}

/** Stacks positives upward from zero and negatives downward from zero. */
export function stackBar<TId>(groupKey: string, segments: Segment<TId>[], mode: StackMode): Bar<TId> {
    let positiveTotal = 0;
    let negativeTotal = 0;
    for (const s of segments) {
        if (s.value >= 0) {
            positiveTotal += s.value;
        } else {
            negativeTotal += s.value;
        }
    }
    const absTotal = positiveTotal - negativeTotal;
    const scale = mode === "percent" ? (absTotal === 0 ? 0 : 1 / absTotal) : 1;

    let pos = 0;
    let neg = 0;
    for (const s of segments) {
        s.displayValue = s.value * scale;
        if (s.displayValue >= 0) {
            s.start = pos;
            pos += s.displayValue;
            s.end = pos;
        } else {
            s.start = neg;
            neg += s.displayValue;
            s.end = neg;
        }
    }

    return {
        groupKey,
        groupLabel: groupKey,
        segments,
        positiveTotal,
        negativeTotal,
        total: positiveTotal + negativeTotal,
        positiveExtent: pos,
        negativeExtent: neg
    };
}

export type DisplayUnits = "auto" | "none" | "thousands" | "millions" | "billions";

const unitDefs: { [k in Exclude<DisplayUnits, "auto" | "none">]: { div: number; suffix: string } } = {
    thousands: { div: 1e3, suffix: "K" },
    millions: { div: 1e6, suffix: "M" },
    billions: { div: 1e9, suffix: "bn" }
};

/** Picks a display unit from the largest absolute value on the axis. */
export function resolveUnits(units: DisplayUnits, maxAbs: number): Exclude<DisplayUnits, "auto"> {
    if (units !== "auto") {
        return units;
    }
    if (maxAbs >= 1e9) { return "billions"; }
    if (maxAbs >= 1e6) { return "millions"; }
    if (maxAbs >= 1e4) { return "thousands"; }
    return "none";
}

export function formatNumber(value: number, units: Exclude<DisplayUnits, "auto">, decimals: number): string {
    if (units === "none" || value === 0) {
        return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    }
    const def = unitDefs[units];
    return (value / def.div).toLocaleString(undefined, { maximumFractionDigits: decimals }) + def.suffix;
}

export function formatPercent(fraction: number, decimals: number): string {
    return (fraction * 100).toLocaleString(undefined, { maximumFractionDigits: decimals }) + "%";
}
