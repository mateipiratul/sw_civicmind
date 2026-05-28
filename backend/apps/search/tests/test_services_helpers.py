import unittest

from apps.search.services import SearchService


class SearchServiceHelpersTest(unittest.TestCase):
    def test_normalize_text(self):
        self.assertEqual(SearchService.normalize_text("  foo   bar\nbaz "), "foo bar baz")

    def test_strip_diacritics(self):
        self.assertEqual(SearchService.strip_diacritics("café"), "cafe")

    def test_normalize_for_search(self):
        self.assertEqual(SearchService.normalize_for_search("  câȚa "), SearchService.strip_diacritics(SearchService.normalize_text("  câȚa ")).lower())

    def test_tokenize_query(self):
        self.assertEqual(SearchService.tokenize_query("foo, bar baz"), ["foo", "bar", "baz"])

    def test_extract_legal_id(self):
        self.assertEqual(SearchService.extract_legal_id("PL X 123/2020"), ("PL-x", "123", "2020"))

    def test_get_legal_id_candidates(self):
        self.assertEqual(SearchService.get_legal_id_candidates("PL-x", "123", "2020"), ["PL-x 123/2020", "PL-x123/2020"]) 


if __name__ == '__main__':
    unittest.main()
