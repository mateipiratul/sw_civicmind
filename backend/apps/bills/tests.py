from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

class FeedTests(APITestCase):
    
    @patch('apps.bills.views.BillViewSet.get_queryset')
    def test_feed_unauthenticated(self, mock_get_queryset):
        # We mock the queryset to return empty since the model is managed=False
        mock_get_queryset.return_value.filter.return_value.order_by.return_value = []
        
        url = reverse('bill-feed')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Assuming the response is a list or paginated response
        # Since it's paginated by default:
        self.assertIn('results', response.data)
