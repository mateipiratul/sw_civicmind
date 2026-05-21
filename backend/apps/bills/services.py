from django.db.models import Q, Case, When, Value, IntegerField, Prefetch
from .models import Bill
from apps.parliamentarians.models import Parliamentarian, MPVote
from apps.search.services import VOTE_BUCKETS

class FeedService:
    @staticmethod
    def get_personalized_bills(user_interests: list[str], persona_tags: list[str], queryset=None):
        if queryset is None:
            queryset = Bill.objects.all()

        query = Q()
        for interest in user_interests:
            query |= Q(ai_analysis__rel_impact_categories__name__iexact=interest)
        for persona in persona_tags:
            query |= Q(ai_analysis__rel_affected_profiles__name__iexact=persona)

        if query.children:
            return queryset.annotate(
                is_match=Case(
                    When(query, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )
            ).order_by('-is_match', '-registered_at').distinct()
        
        return queryset.order_by('-registered_at')

    @staticmethod
    def get_representatives(county: str | None = None, preferred_party: str | None = None, limit: int = 6):
        vote_queryset = (
            MPVote.objects
            .select_related('vote_session', 'vote_session__bill', 'vote_session__bill__ai_analysis')
            .only(
                'id', 'vote_session_id', 'parliamentarian_id', 'vote', 'party',
                'vote_session__date', 'vote_session__type',
                'vote_session__bill__idp', 'vote_session__bill__bill_number', 
                'vote_session__bill__title', 'vote_session__bill__status',
                'vote_session__bill__ai_analysis__title_short',
                'vote_session__bill__ai_analysis__controversy_score',
            )
            .order_by('-vote_session__date')
        )

        queryset = (
            Parliamentarian.objects
            .filter(chamber__icontains='deput')
            .select_related('impact_score')
            .prefetch_related(Prefetch('votes', queryset=vote_queryset, to_attr='prefetched_votes'))
            .order_by('mp_name')
        )

        if county:
            queryset = queryset.filter(county__icontains=county)
        if preferred_party:
            queryset = queryset.filter(party__iexact=preferred_party)
            
        return queryset[:limit]

class VoteAnalyticsService:
    @staticmethod
    def get_bill_vote_buckets(vote_session):
        from .serializers import MPVoteInBillSerializer

        mp_votes = (
            MPVote.objects
            .filter(vote_session=vote_session)
            .select_related('parliamentarian')
            .order_by('parliamentarian__mp_name')
        )
        
        buckets = {'for': [], 'against': [], 'abstain': [], 'absent': []}
        serialized = MPVoteInBillSerializer(mp_votes, many=True).data
        
        for row in serialized:
            bucket_key = VOTE_BUCKETS.get((row['vote'] or "").casefold(), 'abstain')
            buckets[bucket_key].append(row)
            
        return buckets
