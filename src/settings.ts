"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

const orientationItems: powerbi.IEnumMember[] = [
    { value: "vertical", displayName: "Vertical (columns)" },
    { value: "horizontal", displayName: "Horizontal (bars)" }
];

const stackModeItems: powerbi.IEnumMember[] = [
    { value: "stacked", displayName: "Stacked" },
    { value: "percent", displayName: "100% stacked" }
];

const legendPositionItems: powerbi.IEnumMember[] = [
    { value: "top", displayName: "Top" },
    { value: "bottom", displayName: "Bottom" }
];

const displayUnitItems: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Auto" },
    { value: "none", displayName: "None" },
    { value: "thousands", displayName: "Thousands" },
    { value: "millions", displayName: "Millions" },
    { value: "billions", displayName: "Billions" }
];

class GeneralCard extends FormattingSettingsCard {
    orientation = new formattingSettings.ItemDropdown({
        name: "orientation",
        displayName: "Orientation",
        items: orientationItems,
        value: orientationItems[0]
    });

    stackMode = new formattingSettings.ItemDropdown({
        name: "stackMode",
        displayName: "Stack mode",
        items: stackModeItems,
        value: stackModeItems[0]
    });

    name: string = "general";
    displayName: string = "Chart type";
    slices: Array<FormattingSettingsSlice> = [this.orientation, this.stackMode];
}

/** Per-series colours. Slices are generated at runtime, one per stack series. */
export class DataPointCard extends FormattingSettingsCard {
    name: string = "dataPoint";
    displayName: string = "Series colors";
    slices: Array<FormattingSettingsSlice> = [];
}

class LayoutCard extends FormattingSettingsCard {
    categoryPadding = new formattingSettings.Slider({
        name: "categoryPadding",
        displayName: "Space between categories (%)",
        value: 20,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 80 }
        }
    });

    groupPadding = new formattingSettings.Slider({
        name: "groupPadding",
        displayName: "Space between bars (%)",
        value: 8,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 80 }
        }
    });

    cornerRadius = new formattingSettings.NumUpDown({
        name: "cornerRadius",
        displayName: "Bar corner radius (px)",
        value: 0,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 20 }
        }
    });

    name: string = "layout";
    displayName: string = "Spacing";
    slices: Array<FormattingSettingsSlice> = [this.categoryPadding, this.groupPadding, this.cornerRadius];
}

class LegendCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });

    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Position",
        items: legendPositionItems,
        value: legendPositionItems[0]
    });

    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Text size", value: 10 });

    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Text color", value: { value: "#605E5C" } });

    topLevelSlice = this.show;
    name: string = "legend";
    displayName: string = "Legend";
    slices: Array<FormattingSettingsSlice> = [this.position, this.fontSize, this.color];
}

class CategoryAxisCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });

    showGroupLabels = new formattingSettings.ToggleSwitch({
        name: "showGroupLabels",
        displayName: "Show group labels",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Text size", value: 10 });

    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Text color", value: { value: "#605E5C" } });

    topLevelSlice = this.show;
    name: string = "categoryAxis";
    displayName: string = "Category axis";
    slices: Array<FormattingSettingsSlice> = [this.showGroupLabels, this.fontSize, this.color];
}

class ValueAxisCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });

    gridlines = new formattingSettings.ToggleSwitch({ name: "gridlines", displayName: "Gridlines", value: true });

    displayUnits = new formattingSettings.ItemDropdown({
        name: "displayUnits",
        displayName: "Display units",
        items: displayUnitItems,
        value: displayUnitItems[0]
    });

    decimals = new formattingSettings.NumUpDown({
        name: "decimals",
        displayName: "Decimal places",
        value: 1,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 6 }
        }
    });

    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Text size", value: 10 });

    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Text color", value: { value: "#605E5C" } });

    topLevelSlice = this.show;
    name: string = "valueAxis";
    displayName: string = "Value axis";
    slices: Array<FormattingSettingsSlice> = [this.gridlines, this.displayUnits, this.decimals, this.fontSize, this.color];
}

class DataLabelsCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show segment labels", value: false });

    showTotals = new formattingSettings.ToggleSwitch({
        name: "showTotals",
        displayName: "Show bar totals",
        value: false
    });

    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Text size", value: 9 });

    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Segment label color", value: { value: "#FFFFFF" } });

    totalColor = new formattingSettings.ColorPicker({ name: "totalColor", displayName: "Total label color", value: { value: "#252423" } });

    name: string = "dataLabels";
    displayName: string = "Data labels";
    slices: Array<FormattingSettingsSlice> = [this.show, this.showTotals, this.fontSize, this.color, this.totalColor];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    general = new GeneralCard();
    dataPoint = new DataPointCard();
    layout = new LayoutCard();
    legend = new LegendCard();
    categoryAxis = new CategoryAxisCard();
    valueAxis = new ValueAxisCard();
    dataLabels = new DataLabelsCard();

    cards = [this.general, this.dataPoint, this.layout, this.legend, this.categoryAxis, this.valueAxis, this.dataLabels];
}
