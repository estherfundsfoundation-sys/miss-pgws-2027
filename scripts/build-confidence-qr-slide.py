from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = Path(r"C:\Users\Shayna\.codex\generated_images\019fe12b-44a9-7e22-90a3-54d2c1ae3687\exec-15755adc-b19e-463e-9bbf-662df39d664d.png")
OUTPUT = ROOT / "public" / "downloads" / "miss-pgws-confidence-experience-qr-slide.png"
URL = "https://misspgws.estherfundsfoundation.org/road-to-the-crown#confidence-walkthrough"

BURGUNDY = "#741333"
ROSE = "#C72F61"
GOLD = "#B8893A"
INK = "#25191F"
MUTED = "#6F5A63"
IVORY = "#FFFDF9"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


GEORGIA = r"C:\Windows\Fonts\georgia.ttf"
GEORGIA_ITALIC = r"C:\Windows\Fonts\georgiai.ttf"
GEORGIA_BOLD = r"C:\Windows\Fonts\georgiab.ttf"
ARIAL = r"C:\Windows\Fonts\arial.ttf"
ARIAL_BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def tracked_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, text_font, fill: str, spacing: int) -> None:
    x, y = xy
    for character in value:
        draw.text((x, y), character, font=text_font, fill=fill)
        box = draw.textbbox((x, y), character, font=text_font)
        x += box[2] - box[0] + spacing


def main() -> None:
    background = Image.open(BACKGROUND).convert("RGB")
    slide = ImageOps.fit(background, (1920, 1080), method=Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(slide)

    # Left editorial copy block.
    tracked_text(draw, (150, 142), "MISS PRETTY GIRLS WHO SERVE 2027", font(ARIAL_BOLD, 24), BURGUNDY, 4)
    draw.line((150, 192, 1020, 192), fill=GOLD, width=2)
    tracked_text(draw, (150, 220), "THE NEW BEAUTY ISSUE", font(ARIAL_BOLD, 20), GOLD, 5)

    draw.text((145, 285), "CONFIDENCE", font=font(GEORGIA, 112), fill=INK)
    draw.text((145, 405), "& PLATFORM", font=font(GEORGIA, 104), fill=BURGUNDY)
    draw.text((315, 520), "experience.", font=font(GEORGIA_ITALIC, 106), fill=ROSE)

    tracked_text(draw, (152, 672), "ROOTED BEFORE SHE IS CROWNED", font(ARIAL_BOLD, 23), BURGUNDY, 3)
    draw.text((152, 725), "Scan to open the 12-part interactive confidence journey—", font=font(ARIAL, 27), fill=MUTED)
    draw.text((152, 766), "with private reflection, platform building, and live sister practice.", font=font(ARIAL, 27), fill=MUTED)

    draw.rounded_rectangle((150, 847, 970, 920), radius=34, fill="#F8DFE7", outline="#D69AAE", width=2)
    tracked_text(draw, (196, 870), "REFLECT  •  BUILD  •  PRACTICE  •  BECOME", font(ARIAL_BOLD, 20), BURGUNDY, 2)
    draw.text((152, 958), "Keep Zoom open—the website guides the experience and Zoom holds the breakout rooms.", font=font(ARIAL, 20), fill=MUTED)

    # High-contrast, error-corrected QR code in the reserved right panel.
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color=BURGUNDY, back_color=IVORY).convert("RGB")
    qr_image = qr_image.resize((484, 484), Image.Resampling.NEAREST)
    qr_x, qr_y = 1258, 312
    slide.paste(qr_image, (qr_x, qr_y))

    panel_center = 1500
    scan_text = "SCAN TO BEGIN"
    scan_font = font(ARIAL_BOLD, 27)
    scan_box = draw.textbbox((0, 0), scan_text, font=scan_font)
    draw.text((panel_center - (scan_box[2] - scan_box[0]) / 2, 168), scan_text, font=scan_font, fill=BURGUNDY)
    sub_text = "OPEN THE CONFIDENCE LAB"
    sub_font = font(ARIAL_BOLD, 19)
    sub_box = draw.textbbox((0, 0), sub_text, font=sub_font)
    draw.text((panel_center - (sub_box[2] - sub_box[0]) / 2, 220), sub_text, font=sub_font, fill=GOLD)

    pointer = "POINT YOUR CAMERA HERE"
    pointer_font = font(ARIAL_BOLD, 21)
    pointer_box = draw.textbbox((0, 0), pointer, font=pointer_font)
    draw.text((panel_center - (pointer_box[2] - pointer_box[0]) / 2, 842), pointer, font=pointer_font, fill=INK)

    direct = "DIRECT TO: CONFIDENCE & PLATFORM EXPERIENCE"
    direct_font = font(ARIAL_BOLD, 14)
    direct_box = draw.textbbox((0, 0), direct, font=direct_font)
    draw.text((panel_center - (direct_box[2] - direct_box[0]) / 2, 890), direct, font=direct_font, fill=BURGUNDY)
    draw.text((1255, 925), "misspgws.estherfundsfoundation.org", font=font(ARIAL, 17), fill=MUTED)
    draw.text((1302, 956), "/road-to-the-crown", font=font(ARIAL_BOLD, 17), fill=BURGUNDY)
    draw.text((1307, 986), "#confidence-walkthrough", font=font(ARIAL_BOLD, 17), fill=ROSE)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    slide.save(OUTPUT, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
