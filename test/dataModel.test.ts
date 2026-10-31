import { test } from "node:test";
import * as assert from "node:assert/strict";
import { buildModel, formatNumber, ModelInput, resolveUnits } from "../src/dataModel";

// Rows: (Axis, Group) pairs; series = stack values.
const input = (): ModelInput<string> => ({
    rowCount: 4,
    categoryValues: ["2024", "2024", "2025", "2025"],
    groupValues: ["Plan", "Actual", "Plan", "Actual"],
    hasStacks: true,
    measureName: "Sales",
    series: [
        { key: "A", name: "North", color: "#111", selectionId: "s:A", values: [10, 12, 20, null], pointId: r => `A${r}` },
        { key: "B", name: "South", color: "#222", selectionId: "s:B", values: [5, -3, 10, 8], pointId: r => `B${r}` }
    ]
});

test("groups rows into categories > bars > stacked segments", () => {
    const m = buildModel(input(), "stacked");
    assert.deepEqual(m.categories.map(c => c.label), ["2024", "2025"]);
    assert.deepEqual(m.groups, ["Plan", "Actual"]);
    const plan2024 = m.categories[0].bars[0];
    assert.equal(plan2024.groupLabel, "Plan");
    assert.deepEqual(plan2024.segments.map(s => [s.start, s.end]), [[0, 10], [10, 15]]);
    assert.equal(plan2024.total, 15);
    assert.equal(m.maxValue, 30);
});

test("negative values stack below zero", () => {
    const m = buildModel(input(), "stacked");
    const actual2024 = m.categories[0].bars[1];
    assert.deepEqual(actual2024.segments.map(s => [s.start, s.end]), [[0, 12], [0, -3]]);
    assert.equal(m.minValue, -3);
    assert.equal(actual2024.total, 9);
});

test("null values are skipped", () => {
    const m = buildModel(input(), "stacked");
    const actual2025 = m.categories[1].bars[1];
    assert.equal(actual2025.segments.length, 1);
    assert.equal(actual2025.segments[0].seriesName, "South");
    assert.equal(actual2025.segments[0].selectionId, "B3");
});

test("percent mode normalises each bar to 1", () => {
    const m = buildModel(input(), "percent");
    const plan2025 = m.categories[1].bars[0];
    assert.ok(Math.abs(plan2025.positiveExtent - 1) < 1e-9);
    assert.ok(Math.abs(plan2025.segments[0].displayValue - 2 / 3) < 1e-9);
});

test("highlights dim non-highlighted segments", () => {
    const i = input();
    i.series[0].highlights = [10, null, null, null];
    i.series[1].highlights = [null, null, null, null];
    const m = buildModel(i, "stacked");
    assert.equal(m.hasHighlights, true);
    assert.equal(m.categories[0].bars[0].segments[0].highlighted, true);
    assert.equal(m.categories[0].bars[0].segments[1].highlighted, false);
});

test("works without group or category fields", () => {
    const m = buildModel({ rowCount: 1, hasStacks: false, measureName: "Sales",
        series: [{ key: "q", name: "Sales", color: "#000", selectionId: "q", values: [42], pointId: () => "p" }] }, "stacked");
    assert.equal(m.categories.length, 1);
    assert.equal(m.categories[0].bars.length, 1);
    assert.equal(m.hasGroups, false);
});

test("number formatting", () => {
    assert.equal(resolveUnits("auto", 2_500_000), "millions");
    assert.equal(resolveUnits("auto", 500), "none");
    assert.equal(formatNumber(2_500_000, "millions", 1), "2.5M");
});
