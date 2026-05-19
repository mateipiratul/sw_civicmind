from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100
    results_key = 'results'

    def get_paginated_response(self, data):
        return Response({
            'page': self.page.number,
            'limit': self.page.paginator.per_page,
            'total': self.page.paginator.count,
            'totalPages': self.page.paginator.num_pages,
            self.results_key: data
        })

class BillPagination(StandardPagination):
    page_size = 20
    results_key = 'bills'

class ParliamentarianPagination(StandardPagination):
    page_size = 25
    results_key = 'parliamentarians'
