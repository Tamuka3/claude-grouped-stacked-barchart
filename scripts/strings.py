# Source of truth for translations. Run `python3 scripts/strings.py` to regenerate stringResources/.
import json, os
S = {
 # key: (en-US, fr-FR)
 "Visual_Name": ("Grouped & Stacked Bar Chart", "Graphique à barres groupées et empilées"),
 "Role_Axis": ("Axis", "Axe"),
 "Role_Axis_Desc": ("Outer category on the axis. Each category holds one cluster of bars.", "Catégorie principale de l'axe. Chaque catégorie contient un groupe de barres."),
 "Role_Group": ("Group (clustered)", "Groupe (côte à côte)"),
 "Role_Group_Desc": ("Bars placed side by side inside each axis category.", "Barres placées côte à côte dans chaque catégorie de l'axe."),
 "Role_Stack": ("Stack (legend)", "Empilement (légende)"),
 "Role_Stack_Desc": ("Series stacked on top of each other inside every bar.", "Séries empilées les unes sur les autres dans chaque barre."),
 "Role_Values": ("Values", "Valeurs"),
 "Landing_Axis": ("outer category", "catégorie principale"),
 "Landing_Group": ("bars side by side", "barres côte à côte"),
 "Landing_Stack": ("segments in each bar", "segments de chaque barre"),
 "Landing_Values": ("a measure", "une mesure"),
 "Tooltip_PercentOfBar": ("% of bar", "% de la barre"),
 "Tooltip_BarTotal": ("Bar total", "Total de la barre"),
 "Default_Series": ("Series", "Série"),
 "Card_General": ("Chart type", "Type de graphique"),
 "Orientation": ("Orientation", "Orientation"),
 "Orientation_Vertical": ("Vertical (columns)", "Verticale (colonnes)"),
 "Orientation_Horizontal": ("Horizontal (bars)", "Horizontale (barres)"),
 "StackMode": ("Stack mode", "Mode d'empilement"),
 "StackMode_Stacked": ("Stacked", "Empilé"),
 "StackMode_Percent": ("100% stacked", "Empilé 100 %"),
 "Card_Colors": ("Series colors", "Couleurs des séries"),
 "Card_Layout": ("Spacing", "Espacement"),
 "CategoryPadding": ("Space between categories (%)", "Espace entre les catégories (%)"),
 "GroupPadding": ("Space between bars (%)", "Espace entre les barres (%)"),
 "CornerRadius": ("Bar corner radius (px)", "Rayon des coins (px)"),
 "Card_Legend": ("Legend", "Légende"),
 "Show": ("Show", "Afficher"),
 "Position": ("Position", "Position"),
 "Position_Top": ("Top", "Haut"),
 "Position_Bottom": ("Bottom", "Bas"),
 "TextSize": ("Text size", "Taille du texte"),
 "TextColor": ("Text color", "Couleur du texte"),
 "Card_CategoryAxis": ("Category axis", "Axe des catégories"),
 "ShowGroupLabels": ("Show group labels", "Afficher les étiquettes de groupe"),
 "Card_ValueAxis": ("Value axis", "Axe des valeurs"),
 "Gridlines": ("Gridlines", "Quadrillage"),
 "DisplayUnits": ("Display units", "Unités d'affichage"),
 "Units_Auto": ("Auto", "Auto"),
 "Units_None": ("None", "Aucune"),
 "Units_Thousands": ("Thousands", "Milliers"),
 "Units_Millions": ("Millions", "Millions"),
 "Units_Billions": ("Billions", "Milliards"),
 "Decimals": ("Decimal places", "Décimales"),
 "Card_DataLabels": ("Data labels", "Étiquettes de données"),
 "ShowSegmentLabels": ("Show segment labels", "Afficher les étiquettes de segment"),
 "ShowTotals": ("Show bar totals", "Afficher les totaux des barres"),
 "SegmentLabelColor": ("Segment label color", "Couleur des étiquettes de segment"),
 "TotalLabelColor": ("Total label color", "Couleur des étiquettes de total"),
 "Aria_Chart": ("Grouped and stacked bar chart. Use arrow keys to move between bars and segments, Enter or Space to select, Escape to clear.", "Graphique à barres groupées et empilées. Utilisez les flèches pour vous déplacer, Entrée ou Espace pour sélectionner, Échap pour effacer."),
 "Aria_Legend": ("Legend", "Légende"),
}
LOCALES = ["en-US", "fr-FR"]
root = os.path.join(os.path.dirname(__file__), "..", "stringResources")
for i, loc in enumerate(LOCALES):
    os.makedirs(os.path.join(root, loc), exist_ok=True)
    with open(os.path.join(root, loc, "resources.resjson"), "w", encoding="utf-8") as f:
        json.dump({k: v[i] for k, v in S.items()}, f, ensure_ascii=False, indent=4)
        f.write("\n")
