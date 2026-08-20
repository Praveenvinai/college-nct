"""PDF text extraction and figure extraction helpers."""

from __future__ import annotations

import base64
import io

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image


def extract_pdf_text(pdf_path: str) -> tuple[str, int]:
    """Extract text from every page of a PDF.

    Returns:
        (extracted_text, page_count)

    Raises:
        Exception: if the PDF cannot be opened or processed.
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            page_texts: list[str] = []
            for page in pdf.pages:
                text = page.extract_text()
                page_texts.append(text if text is not None else "")
            extracted_text = "\n\n".join(page_texts)
            page_count = len(pdf.pages)
        return extracted_text, page_count
    except Exception as exc:
        raise RuntimeError(f"unable to extract text from PDF: {exc}") from exc


# ---------------------------------------------------------------------------
# Figure extraction
# ---------------------------------------------------------------------------

# Maximum width (pixels) for the extracted figure image.
_MAX_FIGURE_WIDTH_PX = 900


def extract_pdf_figure(pdf_path: str) -> dict | None:
    """Extract a representative figure/image from a PDF.

    Uses pdfplumber to detect which pages contain embedded images, then
    renders the best candidate page with pypdfium2 and encodes it as a
    base64 PNG string.

    Returns a dict with keys:
        page (int), image_base64 (str), mime_type (str), caption (str)

    Returns None if no images are found or if any error occurs so that
    image extraction never blocks a successful upload.
    """
    try:
        # --- Step 1: Detect image-containing pages with pdfplumber ----------
        best_page_number: int | None = None
        best_image_count: int = 0
        best_image_area: float = 0.0

        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                images = page.images or []
                if not images:
                    continue
                count = len(images)
                # Prefer the page with the largest total image area.
                area = sum(
                    (img.get("width", 0) or 0) * (img.get("height", 0) or 0)
                    for img in images
                )
                if count > best_image_count or (
                    count == best_image_count and area > best_image_area
                ):
                    best_image_count = count
                    best_image_area = area
                    best_page_number = i

        if best_page_number is None:
            return None  # PDF has no embedded images.

        # --- Step 2: Render the selected page with pypdfium2 ----------------
        doc = pdfium.PdfDocument(pdf_path)
        try:
            page = doc[best_page_number - 1]  # pypdfium2 is 0-indexed
            # Render at 96 DPI (scale = 96/72 ≈ 1.33).
            scale = 96 / 72
            bitmap = page.render(scale=scale, rotation=0)
            pil_image: Image.Image = bitmap.to_pil()
        finally:
            doc.close()

        # --- Step 3: Resize if wider than the cap ---------------------------
        if pil_image.width > _MAX_FIGURE_WIDTH_PX:
            ratio = _MAX_FIGURE_WIDTH_PX / pil_image.width
            new_height = max(1, int(pil_image.height * ratio))
            pil_image = pil_image.resize(
                (_MAX_FIGURE_WIDTH_PX, new_height), Image.LANCZOS
            )

        # --- Step 4: Encode as base64 PNG -----------------------------------
        buffer = io.BytesIO()
        pil_image.save(buffer, format="PNG", optimize=True)
        image_bytes = buffer.getvalue()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return {
            "page": best_page_number,
            "image_base64": image_base64,
            "mime_type": "image/png",
            "caption": f"Figure extracted from page {best_page_number}",
        }

    except Exception:
        # Image extraction is best-effort — never block the upload.
        return None


# ---------------------------------------------------------------------------
# Per-page slide extraction (PDF → unified slide records)
# ---------------------------------------------------------------------------

# Maximum pages rendered to images.  Text is still extracted from all pages.
_MAX_RENDERED_PAGES = 30

# JPEG quality for page images (matches pptx_extractor).
_JPEG_QUALITY = 72


def extract_pdf_slides(pdf_path: str) -> list[dict]:
    """Extract per-page text and a rendered image for every PDF page.

    Images are JPEG (smaller than PNG) and limited to _MAX_RENDERED_PAGES.
    Text is extracted from all pages via pdfplumber.
    Image rendering failures never abort text extraction.

    Returns
    -------
    list of dicts:
        {
            "slide_num":    int,   # 1-indexed page number
            "text":         str,
            "image_base64": str | None   # base64 JPEG
        }
    """
    # --- Text extraction (all pages) ---
    page_texts: list[str] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                page_texts.append(text if text is not None else "")
            page_count = len(pdf.pages)
    except Exception as exc:
        raise RuntimeError(f"unable to extract PDF text: {exc}") from exc

    # --- Image rendering (limited pages) ---
    rendered: dict[int, str | None] = {}
    doc = pdfium.PdfDocument(pdf_path)
    try:
        n_render = min(page_count, _MAX_RENDERED_PAGES)
        for idx in range(n_render):
            try:
                page = doc[idx]
                # 96 DPI rendering (scale = 96/72)
                scale = 96 / 72
                bitmap = page.render(scale=scale, rotation=0)
                pil_img: Image.Image = bitmap.to_pil()

                # Resize to at most _MAX_FIGURE_WIDTH_PX wide
                if pil_img.width > _MAX_FIGURE_WIDTH_PX:
                    ratio = _MAX_FIGURE_WIDTH_PX / pil_img.width
                    new_h = max(1, int(pil_img.height * ratio))
                    pil_img = pil_img.resize((_MAX_FIGURE_WIDTH_PX, new_h), Image.LANCZOS)

                # Encode as JPEG
                if pil_img.mode not in ("RGB", "L"):
                    pil_img = pil_img.convert("RGB")
                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
                rendered[idx + 1] = base64.b64encode(buf.getvalue()).decode("utf-8")
            except Exception:
                rendered[idx + 1] = None  # Rendering failure → no image for this page
    finally:
        doc.close()

    # --- Build unified slide records ---
    results: list[dict] = []
    for i, text in enumerate(page_texts, start=1):
        results.append({
            "slide_num": i,
            "text": text,
            "image_base64": rendered.get(i),
        })
    return results
