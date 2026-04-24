"""
PDF text extraction via Mistral OCR 3 (mistral-ocr-latest).

Supports two input modes:
  - URL: pass the direct cdep.ro PDF URL (no download needed)
  - Bytes: pass raw PDF bytes (for PDFs behind auth or redirects)

Returns plain markdown text — ready to feed into LangGraph agents.
"""
import os
import time
from typing import Optional

from mistralai.client import Mistral
from dotenv import load_dotenv

load_dotenv()

_client: Optional[Mistral] = None


def _get_client() -> Mistral:
    global _client
    if _client is None:
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise RuntimeError("MISTRAL_API_KEY not set in environment")
        _client = Mistral(api_key=api_key)
    return _client


def ocr_pdf_url(pdf_url: str, retries: int = 2) -> Optional[str]:
    """
    Run Mistral OCR on a PDF at a public URL.
    Returns extracted text as markdown, or None on failure.
    """
    client = _get_client()
    for attempt in range(retries):
        try:
            response = client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": pdf_url,
                },
            )
            pages = [page.markdown for page in response.pages if page.markdown]
            return "\n\n---\n\n".join(pages)
        except Exception as exc:
            if attempt == retries - 1:
                print(f"  [OCR FAIL] {pdf_url}: {exc}")
                return None
            time.sleep(2)
    return None


def ocr_pdf_bytes(pdf_bytes: bytes, filename: str = "document.pdf", retries: int = 2) -> Optional[str]:
    """
    Upload raw PDF bytes to Mistral Files API, then run OCR.
    Use this when the PDF URL requires cookies or redirects.
    """
    client = _get_client()
    for attempt in range(retries):
        try:
            # Upload file
            upload_resp = client.files.upload(
                file={"file_name": filename, "content": pdf_bytes},
                purpose="ocr",
            )
            file_id = upload_resp.id

            # Get signed URL
            signed = client.files.get_signed_url(file_id=file_id)

            # Run OCR
            response = client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": signed.url,
                },
            )
            pages = [page.markdown for page in response.pages if page.markdown]
            return "\n\n---\n\n".join(pages)
        except Exception as exc:
            if attempt == retries - 1:
                print(f"  [OCR FAIL] {filename}: {exc}")
                return None
            time.sleep(2)
    return None


def _download_pdf(url: str) -> Optional[bytes]:
    """Download a PDF using the same SSL-bypassing session as the scraper."""
    from scraper.cdep import _SESSION, _HEADERS
    try:
        resp = _SESSION.get(url, headers=_HEADERS, timeout=30)
        if resp.status_code == 200 and resp.content:
            return resp.content
    except Exception as exc:
        print(f"  [DL FAIL] {url}: {exc}")
    return None


def extract_bill_documents(documents: dict) -> dict[str, Optional[str]]:
    """
    Run OCR on all available PDF documents for a bill.
    Downloads each PDF first (to bypass cdep.ro SSL issues),
    then sends bytes to Mistral OCR.

    Priority: expunere_de_motive > aviz_ces > aviz_cl > forma_initiatorului
    Returns dict mapping doc type -> extracted markdown text.
    """
    results: dict[str, Optional[str]] = {}
    priority = ["expunere_de_motive", "aviz_ces", "aviz_cl", "forma_initiatorului"]

    for doc_type in priority:
        url = documents.get(doc_type)
        if not url:
            continue
        print(f"  [OCR] {doc_type}: downloading...")
        pdf_bytes = _download_pdf(url)
        if not pdf_bytes:
            results[doc_type] = None
            continue

        filename = url.split("/")[-1]
        print(f"    -> {len(pdf_bytes)} bytes, sending to Mistral OCR...")
        text = ocr_pdf_bytes(pdf_bytes, filename=filename)
        results[doc_type] = text
        if text:
            print(f"    -> {len(text)} chars extracted")
        time.sleep(0.5)

    return results
