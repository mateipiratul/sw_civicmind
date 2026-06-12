import ssl
import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

# cdep.ro has a self-signed cert in its chain — suppress the noise
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class _LegacySSLAdapter(HTTPAdapter):
    """
    cdep.ro uses a self-signed cert chain and an old TLS stack.
    We disable verification and relax ciphers inside the adapter so that
    verify=False doesn't conflict with a custom context's check_hostname.
    """
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        kwargs["ssl_context"] = ctx
        super().init_poolmanager(*args, **kwargs)

    def send(self, request, **kwargs):
        kwargs["verify"] = False
        return super().send(request, **kwargs)


_SESSION = requests.Session()
_SESSION.mount("https://", _LegacySSLAdapter())

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
