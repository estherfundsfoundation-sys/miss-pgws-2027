from __future__ import annotations

import math
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps
from qrcode.constants import ERROR_CORRECT_H


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
URL = "https://misspgws.estherfundsfoundation.org/road-to-the-crown"

INK = "#181416"
WHITE = "#FFFDFC"
PAPER = "#FFF9F5"
PINK = "#E9A5BE"
BLUSH = "#F4CEDB"
LIPSTICK = "#B82F52"
RUBY = "#721235"
GOLD = "#C9A46A"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


DISPLAY = "C:/Windows/Fonts/times.ttf"
DISPLAY_ITALIC = "C:/Windows/Fonts/timesi.ttf"
SANS = "C:/Windows/Fonts/segoeui.ttf"
SANS_BOLD = "C:/Windows/Fonts/segoeuib.ttf"


def cubic(p0, p1, p2, p3, count=110):
    points = []
    for i in range(count + 1):
        t = i / count
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        points.append((round(x), round(y)))
    return points


qr = qrcode.QRCode(
    version=None,
    error_correction=ERROR_CORRECT_H,
    box_size=18,
    border=4,
)
qr.add_data(URL)
qr.make(fit=True)
qr_image = qr.make_image(fill_color=RUBY, back_color=WHITE).convert("RGB")
qr_path = PUBLIC / "road-to-the-crown-qr.png"
qr_image.save(qr_path, optimize=True)


width, height = 1600, 900
slide = Image.new("RGB", (width, height), PAPER)
draw = ImageDraw.Draw(slide)

# Editorial background blocks.
draw.rectangle((0, 0, 990, height), fill=BLUSH)
draw.ellipse((-330, 545, 360, 1235), outline="#FFFFFF", width=2)
draw.ellipse((-270, 605, 300, 1175), outline="#F7E6EC", width=30)
draw.rectangle((990, 0, width, height), fill=WHITE)
draw.line((990, 0, 990, height), fill="#D9A3B5", width=2)
draw.rounded_rectangle((30, 30, width - 30, height - 30), radius=28, outline="#FFFFFF", width=2)

# Magazine masthead.
draw.text((92, 72), "MISS PGWS 2027", font=font(SANS_BOLD, 22), fill=RUBY)
draw.text((92, 107), "THE NEW BEAUTY ISSUE", font=font(SANS, 14), fill="#7D5060")
draw.line((92, 143, 902, 143), fill="#CF8EA5", width=2)

draw.text((92, 184), "THE ROAD", font=font(DISPLAY, 118), fill=INK)
draw.text((92, 281), "TO THE", font=font(DISPLAY, 118), fill=INK)
draw.text((300, 376), "CROWN", font=font(DISPLAY_ITALIC, 132), fill=LIPSTICK)
draw.text((98, 526), "EVERY DATE. EVERY STEP. ONE PURPOSE.", font=font(SANS_BOLD, 18), fill=RUBY)
draw.text((98, 562), "Scan, tap through the journey, and check off each milestone", font=font(SANS, 20), fill="#5E4550")
draw.text((98, 592), "from Queen Training to the verified winner announcement.", font=font(SANS, 20), fill="#5E4550")

# A real winding road moving toward a crown.
road_points = cubic((115, 805), (345, 670), (525, 835), (675, 670), 70)
road_points += cubic((675, 670), (790, 560), (705, 525), (855, 485), 55)[1:]
draw.line(road_points, fill=LIPSTICK, width=84, joint="curve")
draw.line(road_points, fill="#302931", width=60, joint="curve")
for idx in range(0, len(road_points), 8):
    if idx + 3 < len(road_points):
        draw.line((road_points[idx], road_points[idx + 3]), fill="#F5D68E", width=5)
draw.text((813, 397), "♛", font=font("C:/Windows/Fonts/seguisym.ttf", 82), fill=GOLD, anchor="mm")

# QR panel.
panel = (1055, 84, 1538, 816)
draw.rounded_rectangle(panel, radius=32, fill=WHITE, outline="#E2B5C4", width=2)
draw.text((1296, 144), "SCAN TO BEGIN", font=font(SANS_BOLD, 18), fill=RUBY, anchor="mm")
draw.text((1296, 187), "YOUR INTERACTIVE JOURNEY", font=font(SANS, 13), fill="#756169", anchor="mm")

qr_display = qr_image.resize((388, 388), Image.Resampling.NEAREST)
slide.paste(qr_display, (1102, 236))
draw.rounded_rectangle((1088, 222, 1504, 638), radius=18, outline="#F1CED9", width=2)

draw.text((1296, 683), "POINT YOUR CAMERA HERE", font=font(SANS_BOLD, 14), fill=INK, anchor="mm")
draw.text((1296, 722), "misspgws.estherfundsfoundation.org", font=font(SANS, 12), fill=RUBY, anchor="mm")
draw.text((1296, 744), "/road-to-the-crown", font=font(SANS_BOLD, 12), fill=RUBY, anchor="mm")

public_slide_path = PUBLIC / "downloads" / "miss-pgws-road-to-the-crown-qr-slide.png"
public_slide_path.parent.mkdir(exist_ok=True)
slide.save(public_slide_path, quality=96, optimize=True)

print(qr_path)
print(public_slide_path)
