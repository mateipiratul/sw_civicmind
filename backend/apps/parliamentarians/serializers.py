from __future__ import annotations
from typing import List, Optional
from django.db.models.query import QuerySet
from rest_framework import serializers
from .models import Parliamentarian, MPVote


class ImpactScoreSerializer(serializers.Serializer):
    score = serializers.FloatField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    for_count = serializers.IntegerField(read_only=True)
    against_count = serializers.IntegerField(read_only=True)
    abstain_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    categories_voted = serializers.ListField(child=serializers.CharField(), read_only=True)
    narrative = serializers.CharField(read_only=True)
    calculated_at = serializers.DateTimeField(read_only=True)


class MPVoteSerializer(serializers.Serializer):
    """A single MP vote, enriched with the bill context for the Consistency Feed."""

    vote = serializers.CharField(read_only=True)
    party = serializers.CharField(read_only=True)
    
    # Bill info — traversed via vote_session → bill
    bill_idp = serializers.IntegerField(source='vote_session.bill.idp', read_only=True)
    bill_number = serializers.CharField(source='vote_session.bill.bill_number', read_only=True)
    bill_title = serializers.CharField(source='vote_session.bill.title', read_only=True)
    bill_status = serializers.CharField(source='vote_session.bill.status', read_only=True)

    # AI analysis fields — gives the frontend the categories & short title
    impact_categories = serializers.ListField(
        child=serializers.CharField(),
        source='vote_session.bill.ai_analysis.impact_categories',
        read_only=True,
        default=[],
    )
    title_short = serializers.CharField(
        source='vote_session.bill.ai_analysis.title_short',
        read_only=True,
        default=None,
    )
    controversy_score = serializers.FloatField(
        source='vote_session.bill.ai_analysis.controversy_score',
        read_only=True,
        default=None,
    )

    # Vote session metadata
    vote_date = serializers.DateField(source='vote_session.date', read_only=True)
    vote_type = serializers.CharField(source='vote_session.type', read_only=True)


class ParliamentarianListSerializer(serializers.Serializer):
    mp_slug = serializers.CharField(read_only=True)
    mp_name = serializers.CharField(read_only=True)
    party = serializers.CharField(read_only=True)
    county = serializers.CharField(read_only=True)
    chamber = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    impact_score = ImpactScoreSerializer(read_only=True)


class ParliamentarianDetailSerializer(serializers.Serializer):
    """
    Full MP profile including their voting history (Consistency Feed) and ImpactScore.
    Recent votes are capped at 50 to keep the payload manageable.
    """
    mp_slug = serializers.CharField(read_only=True)
    mp_name = serializers.CharField(read_only=True)
    party = serializers.CharField(read_only=True)
    county = serializers.CharField(read_only=True)
    chamber = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    impact_score = ImpactScoreSerializer(read_only=True)
    recent_votes = serializers.SerializerMethodField()

    def get_recent_votes(self, obj: Parliamentarian):
        # Using getattr to access the dynamic 'votes' manager safely
        votes_manager = getattr(obj, 'votes', None)
        if votes_manager is None:
            return []
            
        qs: QuerySet[MPVote] = (
            votes_manager
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')[:50]
        )
        return MPVoteSerializer(qs, many=True).data


class ParliamentarianVoteMapSerializer(serializers.Serializer):
    mp_slug = serializers.CharField(read_only=True)
    mp_name = serializers.CharField(read_only=True)
    party = serializers.CharField(read_only=True)
    county = serializers.CharField(read_only=True)
    chamber = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    impact_score = ImpactScoreSerializer(read_only=True)
    votes = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    def get_votes(self, obj: Parliamentarian):
        vote_limit = self.context.get('vote_limit')
        votes = self._get_votes_queryset(obj)
        if vote_limit is not None:
            votes = votes[:vote_limit]
        return MPVoteSerializer(votes, many=True).data

    def get_total_votes(self, obj: Parliamentarian):
        pre_votes: Optional[List[MPVote]] = getattr(obj, 'prefetched_votes', None)
        if pre_votes is not None:
            return len(pre_votes)
        
        votes_manager = getattr(obj, 'votes', None)
        return votes_manager.count() if votes_manager else 0

    @staticmethod
    def _get_votes_queryset(obj: Parliamentarian):
        prefetched_votes: Optional[List[MPVote]] = getattr(obj, 'prefetched_votes', None)
        if prefetched_votes is not None:
            return prefetched_votes
            
        votes_manager = getattr(obj, 'votes', None)
        if votes_manager is None:
            return []
            
        return list(
            votes_manager
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')
        )
