import os
import pptx
from pptx.util import Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = pptx.Presentation()
    prs.slide_width = Pt(960)
    prs.slide_height = Pt(540)
    blank_layout = prs.slide_layouts[6]

    # Palette
    # Dark Obsidian Forest
    C_OBSIDIAN = RGBColor(10, 24, 16)         # #0A1810 Deepest Obsidian Green
    C_OBSIDIAN_CARD = RGBColor(18, 38, 27)    # #12261B
    C_OBSIDIAN_BORDER = RGBColor(32, 66, 46)  # #20422E
    C_OBSIDIAN_WATERMARK = RGBColor(18, 42, 28) # #122A1C Translucent Backdrop

    # Light Warm Beige
    C_WARM_BG = RGBColor(247, 245, 238)       # #F7F5EE Warm Beige
    C_BEIGE_WATERMARK = RGBColor(234, 230, 220) # #EAE6DC Subtle Backdrop Text
    C_WHITE = RGBColor(255, 255, 255)         # Pure White
    C_CARD_BORDER = RGBColor(226, 221, 209)   # #E2DDD1
    C_HAIRLINE = RGBColor(218, 212, 198)      # #DAD4C6
    
    # Text & Accents
    C_FOREST_PRIMARY = RGBColor(18, 44, 30)   # #122C1E
    C_FOREST_ACCENT = RGBColor(34, 88, 56)    # #225838
    C_EMERALD_GLOW = RGBColor(140, 222, 168)  # #8CDEA8 Bright Mint Accent
    C_MUTED_SAGE = RGBColor(92, 107, 96)      # #5C6B60
    C_LIGHT_CARD = RGBColor(241, 238, 230)    # #F1EEE6 Placeholder fill
    C_PLACEHOLDER_BORDER = RGBColor(196, 190, 175) # #C4BEAF
    C_CREAM_TEXT = RGBColor(248, 246, 240)    # #F8F6F0
    C_IVORY_MUTED = RGBColor(182, 208, 190)   # #B6D0BE
    C_PILL_BG = RGBColor(232, 240, 234)       # #E8F0EA
    C_PILL_TEXT = RGBColor(30, 78, 50)        # #1E4E32
    C_WARN_TEXT = RGBColor(184, 82, 48)       # #B85230 Warm Rust

    FONT_SANS = "Helvetica"

    def clean_shape(shape):
        spPr = shape._element.spPr
        style = shape._element.find('{http://schemas.openxmlformats.org/presentationml/2006/main}style')
        if style is not None:
            shape._element.remove(style)
        return shape

    def set_bg(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Pt(960), Pt(540))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        clean_shape(bg)
        return bg

    def add_watermark(slide, text, x=50, y=70, font_size=84, dark=False):
        # Monumental architectural background lettering
        tb = slide.shapes.add_textbox(Pt(x), Pt(y), Pt(860), Pt(font_size + 20))
        tf = tb.text_frame
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.text = text.upper()
        p.font.name = FONT_SANS
        p.font.size = Pt(font_size)
        p.font.bold = True
        p.font.color.rgb = C_OBSIDIAN_WATERMARK if dark else C_BEIGE_WATERMARK
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(font_size)
            r.font.bold = True
            r.font.color.rgb = C_OBSIDIAN_WATERMARK if dark else C_BEIGE_WATERMARK

    def add_p(tf, text, font_size=Pt(12), bold=False, color=C_FOREST_PRIMARY, align=PP_ALIGN.LEFT, space_after=Pt(0), space_before=Pt(0)):
        if len(tf.paragraphs) == 1 and tf.paragraphs[0].text == "":
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = text
        p.alignment = align
        p.space_after = space_after
        p.space_before = space_before
        p.font.name = FONT_SANS
        p.font.size = font_size
        p.font.bold = bold
        p.font.color.rgb = color
        for r in p.runs:
            r.font.name = FONT_SANS
            r.font.size = font_size
            r.font.bold = bold
            r.font.color.rgb = color
        return p

    def add_card(slide, x, y, w, h, fill_color=C_WHITE, border_color=C_CARD_BORDER, border_width=Pt(1), radius_pt=4.0):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
        card.fill.solid()
        card.fill.fore_color.rgb = fill_color
        if border_color:
            card.line.color.rgb = border_color
            card.line.width = border_width
        else:
            card.line.fill.background()
        clean_shape(card)
        card.adjustments[0] = radius_pt / min(w, h)
        return card

    def add_header(slide, tag_text, title_text, dark=False):
        # Category Tag Pill
        pill_w = max(130.0, len(tag_text) * 6.8 + 24)
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(50), Pt(36), Pt(pill_w), Pt(22))
        pill.fill.solid()
        pill.fill.fore_color.rgb = RGBColor(28, 58, 41) if dark else C_PILL_BG
        pill.line.fill.background()
        clean_shape(pill)
        pill.adjustments[0] = 0.5
        
        tf_pill = pill.text_frame
        tf_pill.margin_left = Pt(10)
        tf_pill.margin_right = Pt(10)
        tf_pill.margin_top = Pt(3)
        tf_pill.margin_bottom = Pt(0)
        tf_pill.word_wrap = False
        p_pill = tf_pill.paragraphs[0]
        p_pill.text = tag_text.upper()
        p_pill.font.name = FONT_SANS
        p_pill.font.size = Pt(9.5)
        p_pill.font.bold = True
        p_pill.font.color.rgb = C_EMERALD_GLOW if dark else C_PILL_TEXT
        p_pill.alignment = PP_ALIGN.CENTER
        for r in p_pill.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = C_EMERALD_GLOW if dark else C_PILL_TEXT

        # Slide Title
        tb = slide.shapes.add_textbox(Pt(50), Pt(64), Pt(860), Pt(46))
        tf = tb.text_frame
        tf.margin_left = Pt(0)
        tf.margin_right = Pt(0)
        tf.margin_top = Pt(0)
        tf.margin_bottom = Pt(0)
        tf.word_wrap = True
        p_title = tf.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = FONT_SANS
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = C_CREAM_TEXT if dark else C_FOREST_PRIMARY
        for r in p_title.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(26)
            r.font.bold = True
            r.font.color.rgb = C_CREAM_TEXT if dark else C_FOREST_PRIMARY

    def add_cad_viewport(slide, x, y, w, h, slot_title, slot_caption, telemetry_chip=None, dark=False):
        # CAD-style engineered viewport frame
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
        box.fill.solid()
        box.fill.fore_color.rgb = RGBColor(16, 34, 24) if dark else C_LIGHT_CARD
        box.line.color.rgb = RGBColor(40, 80, 56) if dark else C_PLACEHOLDER_BORDER
        box.line.width = Pt(1.25)
        clean_shape(box)
        box.adjustments[0] = 4.0 / min(w, h)

        # Top Telemetry Bar inside viewport
        if telemetry_chip:
            tb_chip = slide.shapes.add_textbox(Pt(x + 16), Pt(y + 12), Pt(w - 32), Pt(18))
            tf_chip = tb_chip.text_frame
            tf_chip.margin_left = tf_chip.margin_right = tf_chip.margin_top = tf_chip.margin_bottom = 0
            p_ch = tf_chip.paragraphs[0]
            p_ch.text = telemetry_chip
            p_ch.alignment = PP_ALIGN.LEFT
            p_ch.font.name = FONT_SANS
            p_ch.font.size = Pt(8.5)
            p_ch.font.bold = True
            p_ch.font.color.rgb = C_EMERALD_GLOW if dark else C_FOREST_ACCENT
            for r in p_ch.runs:
                r.font.name = FONT_SANS
                r.font.size = Pt(8.5)
                r.font.bold = True
                r.font.color.rgb = C_EMERALD_GLOW if dark else C_FOREST_ACCENT

        # Center indicator pill tag
        tag_w = 190.0
        tag_h = 24.0
        tag_x = x + (w - tag_w) / 2.0
        tag_y = y + (h / 2.0) - 34.0
        tag = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(tag_x), Pt(tag_y), Pt(tag_w), Pt(tag_h))
        tag.fill.solid()
        tag.fill.fore_color.rgb = RGBColor(26, 52, 38) if dark else RGBColor(226, 220, 208)
        tag.line.color.rgb = RGBColor(50, 96, 68) if dark else RGBColor(188, 182, 168)
        tag.line.width = Pt(0.75)
        clean_shape(tag)
        tag.adjustments[0] = 0.5
        
        tf_tag = tag.text_frame
        tf_tag.margin_top = Pt(4)
        tf_tag.margin_bottom = Pt(0)
        tf_tag.margin_left = Pt(0)
        tf_tag.margin_right = Pt(0)
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = "[ IMAGE PLACEHOLDER ]"
        p_tag.alignment = PP_ALIGN.CENTER
        p_tag.font.name = FONT_SANS
        p_tag.font.size = Pt(9.5)
        p_tag.font.bold = True
        p_tag.font.color.rgb = C_EMERALD_GLOW if dark else C_FOREST_PRIMARY
        for r in p_tag.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(9.5)
            r.font.bold = True
            r.font.color.rgb = C_EMERALD_GLOW if dark else C_FOREST_PRIMARY

        tb_desc = slide.shapes.add_textbox(Pt(x + 20), Pt(tag_y + 32), Pt(w - 40), Pt(56))
        tf_desc = tb_desc.text_frame
        tf_desc.margin_left = tf_desc.margin_right = tf_desc.margin_top = tf_desc.margin_bottom = 0
        tf_desc.word_wrap = True
        
        p1 = tf_desc.paragraphs[0]
        p1.text = slot_title
        p1.alignment = PP_ALIGN.CENTER
        p1.font.name = FONT_SANS
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = C_CREAM_TEXT if dark else C_FOREST_PRIMARY
        p1.space_after = Pt(3)
        for r in p1.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = C_CREAM_TEXT if dark else C_FOREST_PRIMARY

        p2 = tf_desc.add_paragraph()
        p2.text = slot_caption
        p2.alignment = PP_ALIGN.CENTER
        p2.font.name = FONT_SANS
        p2.font.size = Pt(10)
        p2.font.bold = False
        p2.font.color.rgb = C_IVORY_MUTED if dark else C_MUTED_SAGE
        for r in p2.runs:
            r.font.name = FONT_SANS
            r.font.size = Pt(10)
            r.font.bold = False
            r.font.color.rgb = C_IVORY_MUTED if dark else C_MUTED_SAGE

    # =========================================================================
    # SLIDE 1 — TITLE (Obsidian Hero + From Heart to Mars Hook)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_bg(s1, C_OBSIDIAN)
    add_watermark(s1, "AGRIVERTO", x=50, y=40, font_size=92, dark=True)

    # Mission Eyebrow
    eyebrow = s1.shapes.add_textbox(Pt(60), Pt(44), Pt(840), Pt(24))
    tf_eye = eyebrow.text_frame
    tf_eye.margin_left = tf_eye.margin_right = tf_eye.margin_top = tf_eye.margin_bottom = 0
    p_eye = tf_eye.paragraphs[0]
    p_eye.text = "NASA SPACE APPS CHALLENGE 2026  •  FROM HEART TO MARS  •  TASHKENT 41.3° N, 69.2° E"
    p_eye.font.name = FONT_SANS
    p_eye.font.size = Pt(10.5)
    p_eye.font.bold = True
    p_eye.font.color.rgb = C_EMERALD_GLOW
    for r in p_eye.runs:
        r.font.name = FONT_SANS
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = C_EMERALD_GLOW

    # Big Display Title
    title_box = s1.shapes.add_textbox(Pt(60), Pt(72), Pt(840), Pt(70))
    tf_title = title_box.text_frame
    tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
    p_t = tf_title.paragraphs[0]
    p_t.text = "Agriverto"
    p_t.font.name = FONT_SANS
    p_t.font.size = Pt(58)
    p_t.font.bold = True
    p_t.font.color.rgb = C_CREAM_TEXT
    for r in p_t.runs:
        r.font.name = FONT_SANS
        r.font.size = Pt(58)
        r.font.bold = True
        r.font.color.rgb = C_CREAM_TEXT

    # Subtitle
    sub_box = s1.shapes.add_textbox(Pt(60), Pt(148), Pt(840), Pt(28))
    tf_sub = sub_box.text_frame
    tf_sub.margin_left = tf_sub.margin_right = tf_sub.margin_top = tf_sub.margin_bottom = 0
    p_s = tf_sub.paragraphs[0]
    p_s.text = "Crop-rotation decision support from NASA Earth observation"
    p_s.font.name = FONT_SANS
    p_s.font.size = Pt(18)
    p_s.font.bold = False
    p_s.font.color.rgb = C_IVORY_MUTED
    for r in p_s.runs:
        r.font.name = FONT_SANS
        r.font.size = Pt(18)
        r.font.bold = False
        r.font.color.rgb = C_IVORY_MUTED

    # High-Concept Thesis Hook Pill
    hook_pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(60), Pt(186), Pt(840), Pt(30))
    hook_pill.fill.solid()
    hook_pill.fill.fore_color.rgb = RGBColor(20, 44, 30)
    hook_pill.line.color.rgb = RGBColor(34, 76, 52)
    hook_pill.line.width = Pt(0.75)
    clean_shape(hook_pill)
    hook_pill.adjustments[0] = 0.5
    tf_hk = hook_pill.text_frame
    tf_hk.margin_left = Pt(16)
    tf_hk.margin_top = Pt(5)
    tf_hk.margin_bottom = Pt(0)
    p_hk = tf_hk.paragraphs[0]
    p_hk.text = "PLANETARY PERSPECTIVE: Bridging interplanetary observation science with field-level soil and water survival on Earth."
    p_hk.font.name = FONT_SANS
    p_hk.font.size = Pt(11)
    p_hk.font.bold = True
    p_hk.font.color.rgb = C_EMERALD_GLOW
    for r in p_hk.runs:
        r.font.name = FONT_SANS
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = C_EMERALD_GLOW

    # Metadata Cards (Left: Challenge, Right: Team Members)
    add_card(s1, 60, 230, 410, 255, fill_color=C_OBSIDIAN_CARD, border_color=C_OBSIDIAN_BORDER, radius_pt=4.0)
    tb_c1 = s1.shapes.add_textbox(Pt(84), Pt(248), Pt(362), Pt(220))
    tf_c1 = tb_c1.text_frame
    tf_c1.margin_left = tf_c1.margin_right = tf_c1.margin_top = tf_c1.margin_bottom = 0
    tf_c1.word_wrap = True

    add_p(tf_c1, "CHALLENGE MISSION", font_size=Pt(10), bold=True, color=C_EMERALD_GLOW, space_after=Pt(6))
    add_p(tf_c1, "Field Shift: Adapting Farms with NASA Data", font_size=Pt(15), bold=True, color=C_CREAM_TEXT, space_after=Pt(12))
    add_p(tf_c1, "Translating multi-decade NASA Earth observations into actionable, field-level recommendations for resilient crop rotations, water conservation, and soil health restoration.", font_size=Pt(11.5), color=C_IVORY_MUTED)

    add_card(s1, 490, 230, 410, 255, fill_color=C_OBSIDIAN_CARD, border_color=C_OBSIDIAN_BORDER, radius_pt=4.0)
    tb_c2 = s1.shapes.add_textbox(Pt(514), Pt(248), Pt(362), Pt(220))
    tf_c2 = tb_c2.text_frame
    tf_c2.margin_left = tf_c2.margin_right = tf_c2.margin_top = tf_c2.margin_bottom = 0
    tf_c2.word_wrap = True

    add_p(tf_c2, "TEAM ORIGIN", font_size=Pt(10), bold=True, color=C_EMERALD_GLOW, space_after=Pt(6))
    add_p(tf_c2, "From heart to Mars — Tashkent, Uzbekistan", font_size=Pt(15), bold=True, color=C_CREAM_TEXT, space_after=Pt(12))
    add_p(tf_c2, "TEAM MEMBERS", font_size=Pt(10), bold=True, color=C_EMERALD_GLOW, space_after=Pt(6))
    add_p(tf_c2, "Ziyodulla Nosirov  •  Normuminova Munisa\nAtabek Raxmanov  •  Umid Akhmedov\nMuhammad", font_size=Pt(12), bold=False, color=C_CREAM_TEXT)

    # =========================================================================
    # SLIDE 2 — THE PROBLEM (Asymmetric 40/60 Hero Split)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_bg(s2, C_WARM_BG)
    add_watermark(s2, "FERGANA", x=50, y=70, font_size=88, dark=False)
    add_header(s2, "Scale 2: Regional Territory Stress", "The same rotation, less water every decade")

    # Left Hero Column (40% width): Monumental Atmospheric Thirst Stat
    hero_w = 330.0
    hero_h = 255.0
    hero_x = 50.0
    hero_y = 135.0
    add_card(s2, hero_x, hero_y, hero_w, hero_h, fill_color=C_WHITE, border_color=C_CARD_BORDER, radius_pt=4.0)

    # Top emerald indicator bar on hero card
    h_bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(hero_x), Pt(hero_y), Pt(hero_w), Pt(4))
    h_bar.fill.solid()
    h_bar.fill.fore_color.rgb = C_FOREST_ACCENT
    h_bar.line.fill.background()
    clean_shape(h_bar)

    tb_hero = s2.shapes.add_textbox(Pt(hero_x + 24), Pt(hero_y + 24), Pt(hero_w - 48), Pt(hero_h - 40))
    tf_hero = tb_hero.text_frame
    tf_hero.margin_left = tf_hero.margin_right = tf_hero.margin_top = tf_hero.margin_bottom = 0
    tf_hero.word_wrap = True

    add_p(tf_hero, "PRIMARY REGIONAL BOTTLENECK", font_size=Pt(9.5), bold=True, color=C_FOREST_ACCENT, space_after=Pt(8))
    add_p(tf_hero, "1,491 mm", font_size=Pt(54), bold=True, color=C_FOREST_PRIMARY, space_after=Pt(4))
    add_p(tf_hero, "water the air takes", font_size=Pt(15), bold=True, color=C_FOREST_ACCENT, space_after=Pt(12))
    add_p(tf_hero, "Annual atmospheric ET0 demand creates an acute deficit against minimal rainfall, leaving irrigated basins vulnerable.", font_size=Pt(11), color=C_MUTED_SAGE)

    # Right Open-Air Telemetry Track (60% width): 3 metrics with Swiss hairlines
    right_x = 410.0
    right_w = 500.0
    track_y = 135.0

    telemetry_items = [
        ("194 mm", "rain per year", "Annual precipitation baseline in Fergana Valley."),
        ("74 days", "above 35 °C", "Acute summer heat stress windows exceeding flowering thresholds."),
        ("155 days", "bare soil each year", "Fields sit fallow and exposed to accelerated wind erosion and moisture loss."),
    ]

    for idx, (val, title, desc) in enumerate(telemetry_items):
        iy = track_y + idx * 85.0
        
        # Numeral block
        tb_val = s2.shapes.add_textbox(Pt(right_x), Pt(iy + 2), Pt(140), Pt(44))
        tf_val = tb_val.text_frame
        tf_val.margin_left = tf_val.margin_right = tf_val.margin_top = tf_val.margin_bottom = 0
        add_p(tf_val, val, font_size=Pt(30), bold=True, color=C_FOREST_PRIMARY)

        # Text block
        tb_txt = s2.shapes.add_textbox(Pt(right_x + 145), Pt(iy + 4), Pt(right_w - 145), Pt(50))
        tf_txt = tb_txt.text_frame
        tf_txt.margin_left = tf_txt.margin_right = tf_txt.margin_top = tf_txt.margin_bottom = 0
        tf_txt.word_wrap = True
        add_p(tf_txt, title, font_size=Pt(13), bold=True, color=C_FOREST_PRIMARY, space_after=Pt(2))
        add_p(tf_txt, desc, font_size=Pt(10.5), color=C_MUTED_SAGE)

        # Hairline divider (except after last)
        if idx < 2:
            line = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(right_x), Pt(iy + 72), Pt(right_w), Pt(0.75))
            line.fill.solid()
            line.fill.fore_color.rgb = C_HAIRLINE
            line.line.fill.background()
            clean_shape(line)

    # Bottom Narrative Strip
    strip_y = 405.0
    strip_w = 860.0
    strip_h = 70.0
    add_card(s2, 50, strip_y, strip_w, strip_h, fill_color=C_WHITE, border_color=C_CARD_BORDER, radius_pt=4.0)

    left_bar = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(50), Pt(strip_y), Pt(5), Pt(strip_h))
    left_bar.fill.solid()
    left_bar.fill.fore_color.rgb = C_FOREST_ACCENT
    left_bar.line.fill.background()
    clean_shape(left_bar)
    left_bar.adjustments[0] = 0.5

    tb_strip = s2.shapes.add_textbox(Pt(72), Pt(strip_y + 15), Pt(strip_w - 40), Pt(40))
    tf_strip = tb_strip.text_frame
    tf_strip.margin_left = tf_strip.margin_right = tf_strip.margin_top = tf_strip.margin_bottom = 0
    tf_strip.word_wrap = True
    add_p(tf_strip, "REGIONAL AGRONOMIC REALITY  •  FERGANA BASIN, UZBEKISTAN (40.4° N, 71.8° E)", font_size=Pt(9.5), bold=True, color=C_FOREST_ACCENT, space_after=Pt(3))
    add_p(tf_strip, "Farmers in Uzbekistan's Fergana Valley have grown winter wheat then cotton for generations.", font_size=Pt(13.5), bold=True, color=C_FOREST_PRIMARY)

    # =========================================================================
    # SLIDE 3 — WHAT IT DOES (Connected Station Rail + CAD Viewport)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_bg(s3, C_WARM_BG)
    add_watermark(s3, "COORDINATES", x=50, y=70, font_size=76, dark=False)
    add_header(s3, "Scale 3: Field Decision Support", "Any field on Earth, from its coordinates")

    # Left Column: Connected Station Rail (Clean Swiss typography without heavy boxes)
    col3_x = 50.0
    col3_w = 370.0
    rail_y = 135.0

    stations = [
        ("01", "GLOBAL SATELLITE TELEMETRY", "Reads NASA climate and satellite data for that exact point."),
        ("02", "MULTI-STRATEGY COMPARISON", "Compares your rotation against four alternatives."),
        ("03", "AGRONOMIC GROUND TRUTH", "Answers in millimetres, days and kilograms — not scores."),
    ]

    # Vertical connective rail line
    c_rail = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(col3_x + 15), Pt(rail_y + 15), Pt(1.5), Pt(210))
    c_rail.fill.solid()
    c_rail.fill.fore_color.rgb = C_HAIRLINE
    c_rail.line.fill.background()
    clean_shape(c_rail)

    for idx, (num, tag, body) in enumerate(stations):
        sy = rail_y + idx * 88.0

        # Node indicator circle
        node = s3.shapes.add_shape(MSO_SHAPE.OVAL, Pt(col3_x + 7.5), Pt(sy + 4), Pt(17), Pt(17))
        node.fill.solid()
        node.fill.fore_color.rgb = C_FOREST_ACCENT
        node.line.fill.background()
        clean_shape(node)

        # Content block
        tb_st = s3.shapes.add_textbox(Pt(col3_x + 36), Pt(sy), Pt(col3_w - 36), Pt(76))
        tf_st = tb_st.text_frame
        tf_st.margin_left = tf_st.margin_right = tf_st.margin_top = tf_st.margin_bottom = 0
        tf_st.word_wrap = True

        add_p(tf_st, f"{num}  •  {tag}", font_size=Pt(9.5), bold=True, color=C_FOREST_ACCENT, space_after=Pt(4))
        add_p(tf_st, body, font_size=Pt(13.5), bold=True, color=C_FOREST_PRIMARY)

    # Right Column: CAD Viewport Placeholder
    add_cad_viewport(s3, 445, 135, 465, 320, 
                     "Interactive Map & Coordinates View", 
                     "Paste UI view showing lat/long input, field polygon, and climate profile",
                     telemetry_chip="COORDINATES: 40.4215° N, 71.7638° E  •  FERGANA SECTOR  •  213 HA")

    tb_note3 = s3.shapes.add_textbox(Pt(50), Pt(475), Pt(860), Pt(20))
    tf_note3 = tb_note3.text_frame
    tf_note3.margin_left = tf_note3.margin_right = tf_note3.margin_top = tf_note3.margin_bottom = 0
    add_p(tf_note3, "Designed around the core principle: Support, Never Replace farmer judgment.", font_size=Pt(10.5), color=C_MUTED_SAGE)

    # =========================================================================
    # SLIDE 4 — THE NASA DATA (Dark Orbital Constellation)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_bg(s4, C_OBSIDIAN)
    add_watermark(s4, "ORBIT", x=50, y=70, font_size=96, dark=True)
    add_header(s4, "Scale 1: Orbital Constellation", "Built on free, open NASA data", dark=True)

    # Left Column: 4 Glowing Sensor Lines in Dark Cards
    nasa_data_items = [
        ("NASA POWER", "25 years of daily climate", "0.5° GRID • DAILY CLIMATOLOGY"),
        ("MODIS NDVI", "how green the field gets, 250 m", "250 M PIXEL • CANOPY VIGOR"),
        ("SMAP", "soil moisture, 9 km", "9 KM RADAR • ROOT-ZONE WATER"),
        ("NASA GIBS", "live map layers with their observation dates", "DAILY TILES • SPATIAL IMAGERY"),
    ]

    d_y = 135.0
    d_h = 71.0
    d_gap = 12.0
    col_w = 370.0

    for i, (title, desc, badge) in enumerate(nasa_data_items):
        dy = d_y + i * (d_h + d_gap)
        add_card(s4, 50, dy, col_w, d_h, fill_color=C_OBSIDIAN_CARD, border_color=C_OBSIDIAN_BORDER, radius_pt=4.0)

        tb_d = s4.shapes.add_textbox(Pt(72), Pt(dy + 14), Pt(col_w - 44), Pt(d_h - 28))
        tf_d = tb_d.text_frame
        tf_d.margin_left = tf_d.margin_right = tf_d.margin_top = tf_d.margin_bottom = 0
        tf_d.word_wrap = True

        add_p(tf_d, badge, font_size=Pt(8.5), bold=True, color=C_EMERALD_GLOW, space_after=Pt(3))
        p_row = tf_d.add_paragraph()
        p_row.text = f"{title} — "
        p_row.font.name = FONT_SANS
        p_row.font.size = Pt(13)
        p_row.font.bold = True
        p_row.font.color.rgb = C_CREAM_TEXT
        r1 = p_row.runs[0]
        r1.font.bold = True
        r1.font.color.rgb = C_CREAM_TEXT

        r2 = p_row.add_run()
        r2.text = desc
        r2.font.name = FONT_SANS
        r2.font.size = Pt(12)
        r2.font.bold = False
        r2.font.color.rgb = C_IVORY_MUTED

    # Right Column: Dark Viewport Placeholder
    add_cad_viewport(s4, 445, 135, 465, 320, 
                     "NASA Satellite Data Feeds & Layers", 
                     "Paste screenshot of AppEEARS data, NDVI time-series, or GIBS satellite overlay",
                     telemetry_chip="SENSOR ORBITS: TERRA/AQUA (MODIS) • SMAP (L-BAND) • MERRA-2 POWER",
                     dark=True)

    tb_note4 = s4.shapes.add_textbox(Pt(50), Pt(475), Pt(860), Pt(20))
    tf_note4 = tb_note4.text_frame
    tf_note4.margin_left = tf_note4.margin_right = tf_note4.margin_top = tf_note4.margin_bottom = 0
    add_p(tf_note4, "Zero proprietary locks — completely accessible via NASA Open APIs and automated fallback caching.", font_size=Pt(10.5), color=C_IVORY_MUTED)

    # =========================================================================
    # SLIDE 5 — THE EVIDENCE (Wide Panoramic Convergence)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_bg(s5, C_WARM_BG)
    add_watermark(s5, "7 YEARS", x=50, y=70, font_size=96, dark=False)
    add_header(s5, "Ground Truth & Verification", "The satellite agrees with the recommendation")

    # Top Narrative Card
    top_y = 135.0
    top_h = 76.0
    top_w = 860.0
    add_card(s5, 50, top_y, top_w, top_h, fill_color=C_WHITE, border_color=C_CARD_BORDER, radius_pt=4.0)

    ev_bar = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(50), Pt(top_y), Pt(5), Pt(top_h))
    ev_bar.fill.solid()
    ev_bar.fill.fore_color.rgb = C_FOREST_ACCENT
    ev_bar.line.fill.background()
    clean_shape(ev_bar)
    ev_bar.adjustments[0] = 0.5

    tb_ev = s5.shapes.add_textbox(Pt(72), Pt(top_y + 14), Pt(top_w - 44), Pt(top_h - 28))
    tf_ev = tb_ev.text_frame
    tf_ev.margin_left = tf_ev.margin_right = tf_ev.margin_top = tf_ev.margin_bottom = 0
    tf_ev.word_wrap = True

    add_p(tf_ev, "OBSERVATION VS. MODEL CONVERGENCE", font_size=Pt(9.5), bold=True, color=C_FOREST_ACCENT, space_after=Pt(4))
    add_p(tf_ev, "This field turns green again after every wheat harvest, in all seven years since 2019 — farmers here already plant a second crop. Agriverto reaches the same answer from climate and crop science alone.", font_size=Pt(13), bold=False, color=C_FOREST_PRIMARY)

    # Wide Viewport Placeholder Below
    add_cad_viewport(s5, 50, 226, 860, 245, 
                     "7-Year Longitudinal MODIS NDVI Time-Series", 
                     "Paste NDVI chart showing yearly July-August secondary NDVI greenness peaks in Fergana",
                     telemetry_chip="MODIS MOD13Q1.061 250M • 2019–2026 UNBROKEN RECURRENCE • QA-FILTERED")

    tb_note5 = s5.shapes.add_textbox(Pt(50), Pt(485), Pt(860), Pt(20))
    tf_note5 = tb_note5.text_frame
    tf_note5.margin_left = tf_note5.margin_right = tf_note5.margin_top = tf_note5.margin_bottom = 0
    add_p(tf_note5, "Empirical satellite proof confirming that local double-cropping is ecologically viable.", font_size=Pt(10.5), color=C_MUTED_SAGE)

    # =========================================================================
    # SLIDE 6 — THE ANSWER (3-Pillar Horizon & Stress Breakpoint)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_bg(s6, C_WARM_BG)
    add_watermark(s6, "MUNG BEAN", x=50, y=70, font_size=84, dark=False)
    add_header(s6, "Recommended Adaptation Pathway", "Wheat, then mung bean")

    # Three Metric Pillars side by side
    col3_w = 274.0
    col3_gap = 19.0
    col3_y = 135.0
    col3_h = 105.0

    ans_figures = [
        ("155 → 55 days", "bare soil", "Reduced fallow exposure by 100 days", True),
        ("0 → 30 kg/ha", "nitrogen per year", "Biological fixation from mung bean legume", False),
        ("+18%", "water efficiency", "Higher agronomic value per m³ consumed", False),
    ]

    for i, (val, label, sub, is_hero) in enumerate(ans_figures):
        cx = 50.0 + i * (col3_w + col3_gap)
        add_card(s6, cx, col3_y, col3_w, col3_h, fill_color=C_WHITE, border_color=C_CARD_BORDER, radius_pt=4.0)

        if is_hero:
            bar = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(cx), Pt(col3_y), Pt(col3_w), Pt(3.5))
            bar.fill.solid()
            bar.fill.fore_color.rgb = C_FOREST_ACCENT
            bar.line.fill.background()
            clean_shape(bar)

        tb_a = s6.shapes.add_textbox(Pt(cx + 18), Pt(col3_y + 16), Pt(col3_w - 36), Pt(col3_h - 32))
        tf_a = tb_a.text_frame
        tf_a.margin_left = tf_a.margin_right = tf_a.margin_top = tf_a.margin_bottom = 0
        tf_a.word_wrap = True

        add_p(tf_a, val, font_size=Pt(28), bold=True, color=C_FOREST_PRIMARY, space_after=Pt(4))
        add_p(tf_a, label, font_size=Pt(12), bold=True, color=C_FOREST_ACCENT, space_after=Pt(3))
        add_p(tf_a, sub, font_size=Pt(10), color=C_MUTED_SAGE)

    # Wide Viewport in Middle
    add_cad_viewport(s6, 50, 255, 860, 160, 
                     "Rotation Comparison & Deficit Sensitivity Graph", 
                     "Paste screenshot of 3-strategy rotation timeline comparison and moisture deficit graphs",
                     telemetry_chip="STRATEGY COMPARISON: MONOCULTURE BASELINE VS. LEGUME-ENRICHED ROTATION")

    # Bottom Line Strip
    bot_y = 430.0
    bot_h = 50.0
    add_card(s6, 50, bot_y, 860, bot_h, fill_color=C_WHITE, border_color=C_CARD_BORDER, radius_pt=4.0)
    
    ind = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(50), Pt(bot_y), Pt(5), Pt(bot_h))
    ind.fill.solid()
    ind.fill.fore_color.rgb = C_FOREST_ACCENT
    ind.line.fill.background()
    clean_shape(ind)
    ind.adjustments[0] = 0.5

    tb_bot6 = s6.shapes.add_textbox(Pt(72), Pt(bot_y + 14), Pt(810), Pt(26))
    tf_bot6 = tb_bot6.text_frame
    tf_bot6.margin_left = tf_bot6.margin_right = tf_bot6.margin_top = tf_bot6.margin_bottom = 0
    add_p(tf_bot6, "And when irrigation runs short, it shows which option breaks first.", font_size=Pt(13.5), bold=True, color=C_FOREST_PRIMARY)

    # =========================================================================
    # SLIDE 7 — HONEST, AND NEXT (Dark Obsidian Finale)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_bg(s7, C_OBSIDIAN)
    add_watermark(s7, "TRANSPARENCY", x=50, y=70, font_size=80, dark=True)
    add_header(s7, "Transparency & Roadmap", "What it does not know", dark=True)

    # Two Main Dark Cards
    c7_w = 420.0
    c7_h = 285.0
    c7_y = 135.0

    # Left: Limitations
    add_card(s7, 50, c7_y, c7_w, c7_h, fill_color=C_OBSIDIAN_CARD, border_color=C_OBSIDIAN_BORDER, radius_pt=4.0)
    tb_lim = s7.shapes.add_textbox(Pt(72), Pt(c7_y + 20), Pt(c7_w - 44), Pt(c7_h - 40))
    tf_lim = tb_lim.text_frame
    tf_lim.margin_left = tf_lim.margin_right = tf_lim.margin_top = tf_lim.margin_bottom = 0
    tf_lim.word_wrap = True

    add_p(tf_lim, "HONEST LIMITATIONS & DATA GAPS", font_size=Pt(10), bold=True, color=C_WARN_TEXT, space_after=Pt(12))
    add_p(tf_lim, "• In winter, snow and cloud hide the ground for about 90 days a year — the app says it cannot confirm, rather than guessing.", font_size=Pt(12), color=C_CREAM_TEXT, space_after=Pt(10))
    add_p(tf_lim, "• Reanalysis runs hot over irrigated land, so water demand is likely overstated.", font_size=Pt(12), color=C_CREAM_TEXT, space_after=Pt(10))
    add_p(tf_lim, "• The tool does not know about planting contracts or obligations.", font_size=Pt(12), color=C_CREAM_TEXT)

    # Right: What's Next
    add_card(s7, 490, c7_y, c7_w, c7_h, fill_color=C_OBSIDIAN_CARD, border_color=C_OBSIDIAN_BORDER, radius_pt=4.0)
    tb_nxt = s7.shapes.add_textbox(Pt(512), Pt(c7_y + 20), Pt(c7_w - 44), Pt(c7_h - 40))
    tf_nxt = tb_nxt.text_frame
    tf_nxt.margin_left = tf_nxt.margin_right = tf_nxt.margin_top = tf_nxt.margin_bottom = 0
    tf_nxt.word_wrap = True

    add_p(tf_nxt, "ENGINEERING ROADMAP", font_size=Pt(10), bold=True, color=C_EMERALD_GLOW, space_after=Pt(12))
    add_p(tf_nxt, "Next — field boundaries instead of points", font_size=Pt(13.5), bold=True, color=C_CREAM_TEXT, space_after=Pt(4))
    add_p(tf_nxt, "Polygon field geometry and parcel-level soil stratification.", font_size=Pt(11), color=C_IVORY_MUTED, space_after=Pt(12))

    add_p(tf_nxt, "More crops in the agronomic catalog", font_size=Pt(13.5), bold=True, color=C_CREAM_TEXT, space_after=Pt(4))
    add_p(tf_nxt, "Expanding beyond grain/cotton to orchards, forage, and pulses.", font_size=Pt(11), color=C_IVORY_MUTED, space_after=Pt(12))

    add_p(tf_nxt, "Validation against local station data", font_size=Pt(13.5), bold=True, color=C_CREAM_TEXT, space_after=Pt(4))
    add_p(tf_nxt, "Calibrating satellite ET0 with ground-level agrometeorological towers.", font_size=Pt(11), color=C_IVORY_MUTED)

    # Bottom Full-Width Footer Bar
    foot_y = 436.0
    foot_h = 52.0
    foot_card = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(50), Pt(foot_y), Pt(860), Pt(foot_h))
    foot_card.fill.solid()
    foot_card.fill.fore_color.rgb = RGBColor(18, 44, 30)
    foot_card.line.color.rgb = RGBColor(34, 76, 52)
    foot_card.line.width = Pt(0.75)
    clean_shape(foot_card)
    foot_card.adjustments[0] = 6.0 / foot_h

    tb_foot = s7.shapes.add_textbox(Pt(72), Pt(foot_y + 16), Pt(816), Pt(26))
    tf_foot = tb_foot.text_frame
    tf_foot.margin_left = tf_foot.margin_right = tf_foot.margin_top = tf_foot.margin_bottom = 0
    tf_foot.word_wrap = False

    p_f = tf_foot.paragraphs[0]
    p_f.text = "Live now in English and Uzbek — "
    p_f.font.name = FONT_SANS
    p_f.font.size = Pt(13)
    p_f.font.bold = True
    p_f.font.color.rgb = C_CREAM_TEXT
    r_f1 = p_f.runs[0]
    r_f1.font.bold = True
    r_f1.font.color.rgb = C_CREAM_TEXT

    r_f2 = p_f.add_run()
    r_f2.text = "https://fromhearttomars.duckdns.org"
    r_f2.font.name = FONT_SANS
    r_f2.font.size = Pt(13)
    r_f2.font.bold = True
    r_f2.font.color.rgb = C_EMERALD_GLOW

    # Output path
    out_path = "Agriverto_NASA_Space_Apps.pptx"
    prs.save(out_path)
    print(f"Presentation saved successfully to {out_path}")

if __name__ == "__main__":
    create_deck()
