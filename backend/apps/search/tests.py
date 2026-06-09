from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.bills.models import Bill, AIAnalysis, ImpactCategory
from apps.parliamentarians.models import Parliamentarian, MPVote, VoteSession
from .services import SearchService

class GlobalSearchTests(APITestCase):
    def setUp(self):
        # Create a bill
        self.bill = Bill.objects.create(
            idp=123, bill_number="PL-x 123/2026", title="Lege despre Sanatate"
        )
        self.analysis = AIAnalysis.objects.create(bill=self.bill, title_short="Sanatate Publica")
        self.cat_health = ImpactCategory.objects.create(name="Sanatate", slug="sanatate")
        self.analysis.rel_impact_categories.add(self.cat_health)

        # Create an MP
        self.mp = Parliamentarian.objects.create(
            mp_slug="popescu-ion", mp_name="Popescu Ion", party="PSD", county="București"
        )
        
        # Create a vote session and a vote
        self.session = VoteSession.objects.create(idv=1, bill=self.bill, type="final")
        self.vote = MPVote.objects.create(
            parliamentarian=self.mp, vote_session=self.session, vote="PENTRU", party="PSD"
        )

    @patch("apps.search.services.SearchService.get_query_embedding")
    @patch("apps.search.services.SearchService.semantic_bill_search")
    def test_search_by_exact_bill_number(self, mock_semantic, mock_embed):
        mock_embed.return_value = [0.1] * 1024
        mock_semantic.return_value = []
        
        url = reverse("global-search")
        response = self.client.get(url, {"q": "PL-x 123/2026"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["exactMatch"]["idp"], self.bill.idp)
        self.assertEqual(len(response.data["laws"]), 0)

    @patch("apps.search.services.SearchService.get_query_embedding")
    @patch("apps.search.services.SearchService.semantic_bill_search")
    def test_search_by_keyword_in_title(self, mock_semantic, mock_embed):
        mock_embed.return_value = [0.1] * 1024
        mock_semantic.return_value = []

        url = reverse("global-search")
        response = self.client.get(url, {"q": "sanatate"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(b["idp"] == self.bill.idp for b in response.data["laws"]))

    @patch("apps.search.services.SearchService.get_query_embedding")
    @patch("apps.search.services.SearchService.semantic_bill_search")
    def test_search_semantic_match(self, mock_semantic, mock_embed):
        mock_embed.return_value = [0.1] * 1024
        mock_semantic.return_value = [{"bill_idp": 123, "similarity": 0.85}] # Mocking a semantic match for bill 123

        url = reverse("global-search")
        response = self.client.get(url, {"q": "something obscure but semantically related"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(b["idp"] == self.bill.idp for b in response.data["laws"]))

    def test_search_by_mp_name(self):
        url = reverse("global-search")
        response = self.client.get(url, {"q": "Popescu"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(m["mp_slug"] == self.mp.mp_slug for m in response.data["mps"]))
