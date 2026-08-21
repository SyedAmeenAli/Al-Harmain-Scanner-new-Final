"""Al Haramain — store QR code generator (Phase K).

Generates a high-error-correction QR code (PNG, and SVG if the installed
`qrcode` build supports the factory) pointing at a URL you provide. No
default/hardcoded address — you must pass --url explicitly, because the real
store LAN address is only known once the machine is deployed in-store.

Usage:
    python backend/scripts/generate_store_qr.py --url http://192.168.1.50:8000/
    python backend/scripts/generate_store_qr.py --url http://localhost:8000/ --out deployment/qr/_test
"""
from __future__ import annotations

import argparse
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DEFAULT_OUT_DIR = (BACKEND_DIR.parent / "deployment" / "qr").resolve()


def generate(url: str, out_dir: Path, basename: str = "store-qr") -> tuple[Path, Path | None]:
    out_dir.mkdir(parents=True, exist_ok=True)

    qr = qrcode.QRCode(
        error_correction=ERROR_CORRECT_H,  # ~30% damage-tolerant — printed signage gets scuffed
        box_size=10,
        border=4,  # quiet zone, in modules — required for reliable phone-camera scans
    )
    qr.add_data(url)
    qr.make(fit=True)

    png_path = out_dir / f"{basename}.png"
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(png_path)

    svg_path = None
    try:
        import qrcode.image.svg as svg_factory

        svg_qr = qrcode.QRCode(
            error_correction=ERROR_CORRECT_H,
            box_size=10,
            border=4,
            image_factory=svg_factory.SvgPathImage,
        )
        svg_qr.add_data(url)
        svg_qr.make(fit=True)
        svg_path = out_dir / f"{basename}.svg"
        svg_qr.make_image().save(str(svg_path))
    except Exception as exc:  # pragma: no cover - SVG is a nice-to-have
        print(f"(SVG output skipped: {exc})")

    return png_path, svg_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the in-store catalogue QR code")
    parser.add_argument("--url", required=True, help="Full URL the QR should point to, e.g. http://<STORE-IP>:8000/")
    parser.add_argument("--out", default=str(DEFAULT_OUT_DIR), help="Output directory (default: deployment/qr/)")
    parser.add_argument("--name", default="store-qr", help="Output file basename (default: store-qr)")
    args = parser.parse_args()

    if not (args.url.startswith("http://") or args.url.startswith("https://")):
        raise SystemExit("--url must start with http:// or https://")

    png_path, svg_path = generate(args.url, Path(args.out), args.name)
    print(f"URL encoded : {args.url}")
    print(f"PNG written : {png_path}")
    if svg_path:
        print(f"SVG written : {svg_path}")


if __name__ == "__main__":
    main()
