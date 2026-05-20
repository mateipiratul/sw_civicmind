from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bills.serializers import BillListSerializer
from apps.parliamentarians.serializers import ParliamentarianListSerializer
from .services import SearchService

class GlobalSearchView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        raw_query = request.query_params.get('q', '')
        search_results = SearchService.execute_global_search(raw_query)
        
        if not search_results['query']:
            return Response(search_results)

        bill_list = search_results['laws']
        mp_list = search_results['mps']
        relation_map = search_results['relation_map']
        
        bill_data = BillListSerializer(bill_list, many=True).data
        
        mp_data = []
        for row in ParliamentarianListSerializer(mp_list, many=True).data:
            rel = relation_map.get(row['mp_slug'], {
                'keyword': search_results['query'], 
                'billIds': [], 'billNumbers': [], 'relatedBills': 0, 'totalMatchedBills': 0,
                'forVotes': 0, 'againstVotes': 0, 'abstainVotes': 0, 'absentVotes': 0
            })
            row['relation'] = rel
            mp_data.append(row)
        
        # Sort MPs: Prioritize those with related bills, then by activity (votes), then by name
        mp_data = sorted(mp_data, key=lambda x: (
            -x['relation']['relatedBills'], 
            -(x['relation']['forVotes'] + x['relation']['againstVotes'] + x['relation']['abstainVotes'] + x['relation']['absentVotes']), 
            x['mp_name'] or ''
        ))

        # Extract categories efficiently from prefetched data
        categories_set = set()
        for b in bill_list:
            if hasattr(b, 'ai_analysis') and b.ai_analysis:
                for cat in b.ai_analysis.rel_impact_categories.all():
                    categories_set.add(cat.name)

        return Response({
            'query': search_results['query'],
            'exactMatch': BillListSerializer(search_results['exactMatch']).data if search_results['exactMatch'] else None,
            'laws': bill_data,
            'mps': mp_data,
            'filters': {
                'laws': {
                    'statuses': sorted({b.status for b in bill_list if b.status}),
                    'initiators': sorted({b.initiator_name for b in bill_list if b.initiator_name})[:40],
                    'categories': sorted(categories_set)[:20],
                },
                'mps': {
                    'parties': sorted({m.party for m in mp_list if m.party}),
                    'counties': sorted({m.county for m in mp_list if m.county}),
                    'chambers': sorted({m.chamber for m in mp_list if m.chamber}),
                },
            },
            'counts': {
                'laws': search_results['total_laws'],
                'mps': len(mp_data),
            },
        })
