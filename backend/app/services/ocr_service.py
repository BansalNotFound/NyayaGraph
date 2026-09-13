import os
import io
import re
import base64
import requests
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF


class OCRService:
    """
    Unlimited-OCR Vision Client for Multi-Page Scanned Legal & Police Documents.
    Communicates with local llama-server running Unlimited-OCR-Q4_K_M on port 8989.
    """

    def __init__(self, endpoint: str = "http://127.0.0.1:8989/v1/chat/completions"):
        self.endpoint = os.environ.get("UNLIMITED_OCR_ENDPOINT", endpoint)

    @staticmethod
    def clean_grounding_tokens(raw_output: str) -> str:
        """
        Cleans grounding coordinate tokens like 'text [47, 372, 487, 462]'
        while preserving the extracted text and markdown formatting.
        """
        # Remove coordinate bracket patterns
        cleaned = re.sub(r'(?:text|title|header|table)\s*\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]', '', raw_output)
        # Normalize whitespace
        return cleaned.strip()

    def ocr_image_bytes(self, img_bytes: bytes, timeout: int = 120) -> str:
        """Sends a single image to Unlimited-OCR and returns extracted text/markdown."""
        b64_img = base64.b64encode(img_bytes).decode("utf-8")
        payload = {
            "temperature": 0.0,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "<|grounding|>Convert the document to markdown."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
                    ]
                }
            ]
        }
        resp = requests.post(self.endpoint, json=payload, timeout=timeout)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return self.clean_grounding_tokens(content)

    def process_pdf(self, pdf_path: str, max_pages: Optional[int] = None, dpi: int = 200) -> str:
        """
        Renders PDF pages to images and processes each through Unlimited-OCR.
        Processes ALL pages when max_pages is None.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_process = min(total_pages, max_pages) if max_pages else total_pages
        page_transcripts = []

        print(f"[*] Processing {pages_to_process}/{total_pages} pages of {os.path.basename(pdf_path)} with Unlimited-OCR...")

        for page_num in range(pages_to_process):
            page = doc[page_num]
            # Render page at specified DPI (200 DPI gives optimal quality & fast transfer)
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("png")

            try:
                page_text = self.ocr_image_bytes(img_bytes)
                page_transcripts.append(f"--- [PAGE {page_num + 1} OF {total_pages}] ---\n{page_text}")
                print(f"    [+] Page {page_num + 1} processed ({len(page_text)} chars)")
            except Exception as e:
                print(f"    [!] Error on page {page_num + 1}: {e}")
                # Fallback to embedded text if available
                embedded = page.get_text()
                if embedded.strip():
                    page_transcripts.append(f"--- [PAGE {page_num + 1} (FALLBACK)] ---\n{embedded.strip()}")

        return "\n\n".join(page_transcripts)
