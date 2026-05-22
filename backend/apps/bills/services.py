from django.db.models import Q, Case, When, Value, IntegerField, Prefetch, Exists, OuterRef
from .models import Bill, ImpactCategory, AffectedProfile
from apps.parliamentarians.models import Parliamentarian, MPVote
from apps.search.services import VOTE_BUCKETS

class BillService:
    @staticmethod
    def get_enriched_bills_queryset(bill_ids: list[int] | None = None):
        """
        Returns a queryset of bills with all AI-related data prefetched.
        If bill_ids is provided, filters the queryset to those IDs.
        """
        queryset = Bill.objects.select_related('ai_analysis').prefetch_related(
            'ai_analysis__rel_impact_categories',
            'ai_analysis__rel_affected_profiles',
            'ai_analysis__rel_key_ideas',
            'ai_analysis__rel_arguments',
            'vote_sessions',
            'vote_sessions__rel_party_results',
        )
        if bill_ids is not None:
            # Maintain order if needed, but usually caller handles ordering
            queryset = queryset.filter(pk__in=bill_ids)
        return queryset

class FeedService:
    @staticmethod
    def get_personalized_bills(user_interests: list[str], persona_tags: list[str], queryset=None):
        if queryset is None:
            queryset = BillService.get_enriched_bills_queryset()

        if not user_interests and not persona_tags:
            return queryset.order_by('-registered_at')

        # Use Exists subqueries to avoid joins and distinct()
        # This is significantly faster for ManyToMany relationships
        interest_q = Q()
        for interest in user_interests:
            interest_q |= Q(analyses__bill=OuterRef('pk'), name__iexact=interest)
        
        persona_q = Q()
        for persona in persona_tags:
            persona_q |= Q(analyses__bill=OuterRef('pk'), name__iexact=persona)

        has_interest = Exists(ImpactCategory.objects.filter(interest_q)) if user_interests else Value(False)
        has_persona = Exists(AffectedProfile.objects.filter(persona_q)) if persona_tags else Value(False)

        return queryset.annotate(
            is_match=Case(
                When(has_interest | has_persona, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('-is_match', '-registered_at')

    @staticmethod
    def get_representatives(county: str | None = None, preferred_party: str | None = None, limit: int = 6):
        # Limit prefetched votes to most recent ones to save memory and time
        # Note: Django doesn't support slicing in Prefetch queryset directly for all DBs, 
        # but we can at least optimize the query.
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
