"""PDF text extraction helper."""

from __future__ import annotations

import pdfplumber


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
