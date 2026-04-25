"""
Client for Ministerul Justitiei Portal Legislativ SOAP API.

The service is old WCF/SOAP, but it exposes exactly what the RAG indexer
needs: paginated legislation search plus full-text fields and canonical
detail links.
"""
from __future__ import annotations

import html
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Iterator, Optional

import requests

SOAP_URL = "http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP"
WSDL_URL = "http://legislatie.just.ro/apiws/FreeWebService.svc?singleWsdl"

_SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
_TEMPURI_NS = "http://tempuri.org/"
_DATA_NS = "http://schemas.datacontract.org/2004/07/FreeWebService"


@dataclass(frozen=True)
class LegislativeAct:
    data_vigoare: str
    emitent: str
    link_html: str
    numar: str
    publicatie: str
    text: str
    tip_act: str
    titlu: str

    @property
    def document_id(self) -> str:
        match = re.search(r"/DetaliiDocument/(\d+)", self.link_html or "")
        if match:
            return match.group(1)
        key = "|".join([self.tip_act, self.numar, self.data_vigoare, self.titlu])
        return re.sub(r"[^a-zA-Z0-9]+", "-", key).strip("-").lower()[:160]


class LegislatieJustClient:
    def __init__(
        self,
        soap_url: str = SOAP_URL,
        timeout: int = 30,
        delay_seconds: float = 0.4,
    ) -> None:
        self.soap_url = soap_url
        self.timeout = timeout
        self.delay_seconds = delay_seconds
        self.session = requests.Session()
        self._token: Optional[str] = None

    def get_token(self, force: bool = False) -> str:
        if self._token and not force:
            return self._token

        body = """
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <GetToken xmlns="http://tempuri.org/" />
  </s:Body>
</s:Envelope>
""".strip()
        xml = self._post(body, "http://tempuri.org/IFreeWebService/GetToken")
        token = _find_text(xml, "GetTokenResult")
        if not token:
            raise RuntimeError("Portal Legislativ SOAP GetToken returned no token")
        self._token = token
        return token

    def search(
        self,
        *,
        year: str = "",
        title: str = "",
        text: str = "",
        number: str = "",
        page: int = 1,
        page_size: int = 50,
    ) -> list[LegislativeAct]:
        token = self.get_token()
        body = f"""
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <Search xmlns="http://tempuri.org/">
      <SearchModel xmlns:a="http://schemas.datacontract.org/2004/07/FreeWebService" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <a:NumarPagina>{page}</a:NumarPagina>
        <a:RezultatePagina>{page_size}</a:RezultatePagina>
        <a:SearchAn>{html.escape(year or "")}</a:SearchAn>
        <a:SearchNumar>{html.escape(number or "")}</a:SearchNumar>
        <a:SearchText>{html.escape(text or "")}</a:SearchText>
        <a:SearchTitlu>{html.escape(title or "")}</a:SearchTitlu>
      </SearchModel>
      <tokenKey>{html.escape(token)}</tokenKey>
    </Search>
  </s:Body>
</s:Envelope>
""".strip()
        xml = self._post(body, "http://tempuri.org/IFreeWebService/Search")
        return _parse_search_results(xml)

    def iter_year(
        self,
        year: int,
        *,
        page_size: int = 50,
        max_pages: Optional[int] = None,
    ) -> Iterator[LegislativeAct]:
        page = 1
        while True:
            acts = self.search(year=str(year), page=page, page_size=page_size)
            if not acts:
                break
            yield from acts
            page += 1
            if max_pages and page > max_pages:
                break
            time.sleep(self.delay_seconds)

    def _post(self, body: str, soap_action: str) -> ET.Element:
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f'"{soap_action}"',
        }
        response = self.session.post(
            self.soap_url,
            data=body.encode("utf-8"),
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return ET.fromstring(response.content)


def _find_text(root: ET.Element, local_name: str) -> str:
    for elem in root.iter():
        if elem.tag.endswith("}" + local_name) or elem.tag == local_name:
            return (elem.text or "").strip()
    return ""


def _child_text(parent: ET.Element, local_name: str) -> str:
    for child in parent:
        if child.tag.endswith("}" + local_name) or child.tag == local_name:
            return (child.text or "").strip()
    return ""


def _parse_search_results(root: ET.Element) -> list[LegislativeAct]:
    acts: list[LegislativeAct] = []
    for elem in root.iter():
        if not (elem.tag.endswith("}Legi") or elem.tag == "Legi"):
            continue
        acts.append(
            LegislativeAct(
                data_vigoare=_child_text(elem, "DataVigoare"),
                emitent=_child_text(elem, "Emitent"),
                link_html=_child_text(elem, "LinkHtml"),
                numar=_child_text(elem, "Numar"),
                publicatie=_child_text(elem, "Publicatie"),
                text=_clean_api_text(_child_text(elem, "Text")),
                tip_act=_child_text(elem, "TipAct"),
                titlu=_clean_api_text(_child_text(elem, "Titlu")),
            )
        )
    return acts


def _clean_api_text(value: str) -> str:
    value = html.unescape(value or "")
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()
