# Source of truth for translations. Run `python3 scripts/strings.py` to regenerate stringResources/.
import json, os
S = {
 # key: (en-US, fr-FR, es-ES, de-DE)
 "Visual_Name": ("Grouped & Stacked Bar Chart", "Graphique à barres groupées et empilées", "Gráfico de barras agrupadas y apiladas", "Gruppiertes und gestapeltes Balkendiagramm"),
 "Role_Axis": ("Axis", "Axe", "Eje", "Achse"),
 "Role_Axis_Desc": ("Outer category on the axis. Each category holds one cluster of bars.", "Catégorie principale de l'axe. Chaque catégorie contient un groupe de barres.", "Categoría principal del eje. Cada categoría contiene un grupo de barras.", "Äußere Kategorie auf der Achse. Jede Kategorie enthält eine Gruppe von Balken."),
 "Role_Group": ("Group (clustered)", "Groupe (côte à côte)", "Grupo (agrupado)", "Gruppe (gruppiert)"),
 "Role_Group_Desc": ("Bars placed side by side inside each axis category.", "Barres placées côte à côte dans chaque catégorie de l'axe.", "Barras colocadas una al lado de otra en cada categoría del eje.", "Balken nebeneinander innerhalb jeder Achsenkategorie."),
 "Role_Stack": ("Stack (legend)", "Empilement (légende)", "Apilado (leyenda)", "Stapel (Legende)"),
 "Role_Stack_Desc": ("Series stacked on top of each other inside every bar.", "Séries empilées les unes sur les autres dans chaque barre.", "Series apiladas unas sobre otras en cada barra.", "Reihen, die in jedem Balken übereinander gestapelt werden."),
 "Role_Values": ("Values", "Valeurs", "Valores", "Werte"),
 "Landing_Axis": ("outer category", "catégorie principale", "categoría principal", "äußere Kategorie"),
 "Landing_Group": ("bars side by side", "barres côte à côte", "barras una al lado de otra", "Balken nebeneinander"),
 "Landing_Stack": ("segments in each bar", "segments de chaque barre", "segmentos de cada barra", "Segmente in jedem Balken"),
 "Landing_Values": ("a measure", "une mesure", "una medida", "ein Measure"),
 "Tooltip_PercentOfBar": ("% of bar", "% de la barre", "% de la barra", "% des Balkens"),
 "Tooltip_BarTotal": ("Bar total", "Total de la barre", "Total de la barra", "Balkensumme"),
 "Default_Series": ("Series", "Série", "Serie", "Reihe"),
 "Card_General": ("Chart type", "Type de graphique", "Tipo de gráfico", "Diagrammtyp"),
 "Orientation": ("Orientation", "Orientation", "Orientación", "Ausrichtung"),
 "Orientation_Vertical": ("Vertical (columns)", "Verticale (colonnes)", "Vertical (columnas)", "Vertikal (Säulen)"),
 "Orientation_Horizontal": ("Horizontal (bars)", "Horizontale (barres)", "Horizontal (barras)", "Horizontal (Balken)"),
 "StackMode": ("Stack mode", "Mode d'empilement", "Modo de apilado", "Stapelmodus"),
 "StackMode_Stacked": ("Stacked", "Empilé", "Apilado", "Gestapelt"),
 "StackMode_Percent": ("100% stacked", "Empilé 100 %", "Apilado al 100 %", "100 % gestapelt"),
 "Card_Colors": ("Series colors", "Couleurs des séries", "Colores de las series", "Reihenfarben"),
 "Card_Layout": ("Spacing", "Espacement", "Espaciado", "Abstände"),
 "CategoryPadding": ("Space between categories (%)", "Espace entre les catégories (%)", "Espacio entre categorías (%)", "Abstand zwischen Kategorien (%)"),
 "GroupPadding": ("Space between bars (%)", "Espace entre les barres (%)", "Espacio entre barras (%)", "Abstand zwischen Balken (%)"),
 "CornerRadius": ("Bar corner radius (px)", "Rayon des coins (px)", "Radio de las esquinas (px)", "Eckenradius (px)"),
 "Card_Legend": ("Legend", "Légende", "Leyenda", "Legende"),
 "Show": ("Show", "Afficher", "Mostrar", "Anzeigen"),
 "Position": ("Position", "Position", "Posición", "Position"),
 "Position_Top": ("Top", "Haut", "Arriba", "Oben"),
 "Position_Bottom": ("Bottom", "Bas", "Abajo", "Unten"),
 "TextSize": ("Text size", "Taille du texte", "Tamaño del texto", "Textgröße"),
 "TextColor": ("Text color", "Couleur du texte", "Color del texto", "Textfarbe"),
 "Card_CategoryAxis": ("Category axis", "Axe des catégories", "Eje de categorías", "Kategorieachse"),
 "ShowGroupLabels": ("Show group labels", "Afficher les étiquettes de groupe", "Mostrar etiquetas de grupo", "Gruppenbeschriftungen anzeigen"),
 "Card_ValueAxis": ("Value axis", "Axe des valeurs", "Eje de valores", "Werteachse"),
 "Gridlines": ("Gridlines", "Quadrillage", "Líneas de cuadrícula", "Gitternetzlinien"),
 "DisplayUnits": ("Display units", "Unités d'affichage", "Unidades de visualización", "Anzeigeeinheiten"),
 "Units_Auto": ("Auto", "Auto", "Automático", "Automatisch"),
 "Units_None": ("None", "Aucune", "Ninguna", "Keine"),
 "Units_Thousands": ("Thousands", "Milliers", "Miles", "Tausend"),
 "Units_Millions": ("Millions", "Millions", "Millones", "Millionen"),
 "Units_Billions": ("Billions", "Milliards", "Miles de millones", "Milliarden"),
 "Decimals": ("Decimal places", "Décimales", "Posiciones decimales", "Dezimalstellen"),
 "Card_DataLabels": ("Data labels", "Étiquettes de données", "Etiquetas de datos", "Datenbeschriftungen"),
 "ShowSegmentLabels": ("Show segment labels", "Afficher les étiquettes de segment", "Mostrar etiquetas de segmento", "Segmentbeschriftungen anzeigen"),
 "ShowTotals": ("Show bar totals", "Afficher les totaux des barres", "Mostrar totales de barra", "Balkensummen anzeigen"),
 "SegmentLabelColor": ("Segment label color", "Couleur des étiquettes de segment", "Color de etiqueta de segmento", "Farbe der Segmentbeschriftung"),
 "TotalLabelColor": ("Total label color", "Couleur des étiquettes de total", "Color de etiqueta de total", "Farbe der Summenbeschriftung"),
 "Aria_Chart": ("Grouped and stacked bar chart. Use arrow keys to move between bars and segments, Enter or Space to select, Escape to clear.", "Graphique à barres groupées et empilées. Utilisez les flèches pour vous déplacer, Entrée ou Espace pour sélectionner, Échap pour effacer.", "Gráfico de barras agrupadas y apiladas. Use las flechas para moverse, Entrar o Espacio para seleccionar y Escape para borrar.", "Gruppiertes und gestapeltes Balkendiagramm. Mit den Pfeiltasten navigieren, mit Eingabe oder Leertaste auswählen, mit Esc aufheben."),
 "Aria_Legend": ("Legend", "Légende", "Leyenda", "Legende"),
}
LOCALES = ["en-US", "fr-FR", "es-ES", "de-DE"]
root = os.path.join(os.path.dirname(__file__), "..", "stringResources")
for i, loc in enumerate(LOCALES):
    os.makedirs(os.path.join(root, loc), exist_ok=True)
    with open(os.path.join(root, loc, "resources.resjson"), "w", encoding="utf-8") as f:
        json.dump({k: v[i] for k, v in S.items()}, f, ensure_ascii=False, indent=4)
        f.write("\n")
