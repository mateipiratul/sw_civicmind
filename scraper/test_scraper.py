"""Unit tests for the Chamber of Deputies email scraper."""

import unittest

from scrape_deputati_emails_v2 import CDEPDeputiesScraper


class CDEPDeputiesScraperTests(unittest.TestCase):
    def setUp(self):
        self.scraper = CDEPDeputiesScraper()

    def tearDown(self):
        self.scraper.close()

    def test_parse_active_table_only(self):
        html = """
        <html>
          <body>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Nume si prenume</th>
                  <th>Circumscriptia electorala</th>
                  <th>Grupul parlamentar</th>
                  <th>Membru din</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1.</td>
                  <td><a href="/pls/parlam/structura2015.mp?idm=10&cam=2&leg=2024">Popescu Ana</a></td>
                  <td>42 / BUCURESTI</td>
                  <td>USR</td>
                  <td>afiliat</td>
                </tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Nume si prenume</th>
                  <th>Circumscriptia electorala</th>
                  <th>Grupul parlamentar</th>
                  <th>Membru pana</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1.</td>
                  <td><a href="/pls/parlam/structura2015.mp?idm=11&cam=2&leg=2024">Ionescu Mihai</a></td>
                  <td>35 / SUCEAVA</td>
                  <td>PSD</td>
                  <td>31.12.2025</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
        """

        deputies = self.scraper._parse_active_deputies_list(html)

        self.assertEqual(len(deputies), 1)
        self.assertEqual(deputies[0]["idm"], "10")
        self.assertEqual(deputies[0]["name"], "Popescu Ana")
        self.assertEqual(deputies[0]["party"], "USR")
        self.assertEqual(deputies[0]["member_since_note"], "afiliat")

    def test_extract_profile_email_ignores_footer_comment(self):
        html = """
        <html>
          <body>
            <div class="boxInfo-wrapper">
              <div class="boxInfo">
                <span class="mailInfo innerText">deputat.test@cdep.ro</span>
              </div>
            </div>
            <!-- <a class="footer-mail" href="mailto:webmaster@cdep.ro">webmaster@cdep.ro</a> -->
          </body>
        </html>
        """

        email = self.scraper._extract_email_from_profile_html(html)

        self.assertEqual(email, "deputat.test@cdep.ro")

    def test_extract_profile_email_returns_none_for_generic_template_only(self):
        html = """
        <html>
          <body>
            <script>
              function emailCurrentPage(){
                window.location.href="mailto:?subject="+document.title;
              }
            </script>
            <!-- <a class="footer-mail" href="mailto:webmaster@cdep.ro">webmaster@cdep.ro</a> -->
          </body>
        </html>
        """

        email = self.scraper._extract_email_from_profile_html(html)

        self.assertIsNone(email)


if __name__ == "__main__":
    unittest.main()
