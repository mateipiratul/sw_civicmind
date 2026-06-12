from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100
    results_key = 'results'

    def get_paginated_response(self, data):
        page_number = self.page.number if getattr(self, 'page', None) else 1
        per_page = self.page.paginator.per_page if getattr(self, 'page', None) else self.page_size
        total_count = self.page.paginator.count if getattr(self, 'page', None) else len(data)
        num_pages = self.page.paginator.num_pages if getattr(self, 'page', None) else 1

        return Response({
            'page': page_number,
            'limit': per_page,
            'total': total_count,
            'totalPages': num_pages,
            self.results_key: data
        })

class BillPagination(StandardPagination):
    page_size = 20
    results_key = 'bills'

class ParliamentarianPagination(StandardPagination):
    page_size = 25
    results_key = 'parliamentarians'

class StandardCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100
    ordering = '-registered_at' # Default ordering


