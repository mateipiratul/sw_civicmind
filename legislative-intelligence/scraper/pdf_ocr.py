"""
PDF text extraction via Mistral OCR 3 (mistral-ocr-latest).

Supports two input modes:
  - URL: pass the direct cdep.ro PDF URL (no download needed)
  - Bytes: pass raw PDF bytes (for PDFs behind auth or redirects)

Returns plain markdown text — ready to feed into LangGraph agents.
"""
import os
import time
import logging
from typing import Optional

from mistralai.client import Mistral

from .http_client import _SESSION, _HEADERS

logger = logging.getLogger(__name__)

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
                logger.error(f"[OCR FAIL] {pdf_url}: {exc}", exc_info=True)
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
        file_id = None
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
                logger.error(f"[OCR FAIL] {filename}: {exc}", exc_info=True)
                return None
            time.sleep(2)
        finally:
            if file_id:
                try:
                    client.files.delete(file_id=file_id)
                    logger.info(f"Deleted temporary OCR file: {file_id}")
                except Exception as clean_exc:
                    logger.warning(f"Failed to delete temporary OCR file {file_id}: {clean_exc}")
    return None


def _download_pdf(url: str) -> Optional[bytes]:
    """Download a PDF using the same SSL-bypassing session as the scraper."""
    try:
        resp = _SESSION.get(url, headers=_HEADERS, timeout=30)
        if resp.status_code == 200 and resp.content:
            return resp.content
    except Exception as exc:
        logger.warning(f"[DL FAIL] {url}: {exc}")
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

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        logger.warning("MISTRAL_API_KEY not set in environment. Skipping OCR extraction.")
        return {doc_type: None for doc_type in priority if doc_type in documents}

    for doc_type in priority:
        url = documents.get(doc_type)
        if not url:
            continue
        logger.info(f"[OCR] {doc_type}: downloading...")
        pdf_bytes = _download_pdf(url)
        if not pdf_bytes:
            results[doc_type] = None
            continue

        filename = url.split("/")[-1]
        logger.info(f"  -> {len(pdf_bytes)} bytes, sending to Mistral OCR...")
        try:
            text = ocr_pdf_bytes(pdf_bytes, filename=filename)
            results[doc_type] = text
            if text:
                logger.info(f"  -> {len(text)} chars extracted")
        except Exception as exc:
            logger.error(f"[OCR ERROR] {doc_type} failed: {exc}", exc_info=True)
            results[doc_type] = None
        time.sleep(0.5)

    return results
