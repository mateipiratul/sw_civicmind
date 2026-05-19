from __future__ import annotations
from typing import List, Optional
from django.db.models.query import QuerySet
from rest_framework import serializers
from .models import Parliamentarian, MPVote, ImpactScore


class ImpactScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactScore
        fields = [
            'score', 'total_votes', 'for_count', 'against_count',
            'abstain_count', 'absent_count', 'categories_voted',
            'narrative', 'calculated_at'
        ]
        read_only_fields = fields


class MPVoteSerializer(serializers.ModelSerializer):
    """A single MP vote, enriched with the bill context for the Consistency Feed."""

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

    class Meta:
        model = MPVote
        fields = [
            'vote', 'party', 'bill_idp', 'bill_number', 'bill_title',
            'bill_status', 'impact_categories', 'title_short',
            'controversy_score', 'vote_date', 'vote_type'
        ]
        read_only_fields = fields


class ParliamentarianListSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)

    class Meta:
        model = Parliamentarian
        fields = [
            'mp_slug', 'mp_name', 'party', 'county', 'chamber', 'email', 'impact_score'
        ]
        read_only_fields = fields


class ParliamentarianDetailSerializer(serializers.ModelSerializer):
    """
    Full MP profile including their voting history (Consistency Feed) and ImpactScore.
    Recent votes are capped at 50 to keep the payload manageable.
    """
    impact_score = ImpactScoreSerializer(read_only=True)
    recent_votes = serializers.SerializerMethodField()

    class Meta:
        model = Parliamentarian
        fields = [
            'mp_slug', 'mp_name', 'party', 'county', 'chamber', 'email',
            'impact_score', 'recent_votes'
        ]
        read_only_fields = fields

    def get_recent_votes(self, obj: Parliamentarian):
        # We rely on prefetched data. If not prefetched, we fallback but this should be avoided in ViewSet.
        votes = getattr(obj, 'prefetched_votes', None)
        if votes is None:
            # Fallback to manager (might trigger query if not prefetched)
            votes_manager = getattr(obj, 'votes', None)
            if votes_manager is None:
                return []
            votes = votes_manager.all()
            
        bill_numbers = self.context.get('bill_numbers') or []
        bill_ids = self.context.get('bill_ids') or []
        
        # Apply filters in memory to avoid extra queries if already prefetched
        if bill_numbers:
            filtered_votes = [v for v in votes if v.vote_session.bill.bill_number in bill_numbers]
        elif bill_ids:
            filtered_votes = [v for v in votes if v.vote_session.bill.idp in bill_ids]
        else:
            filtered_votes = votes[:50]
            
        return MPVoteSerializer(filtered_votes, many=True).data


class ParliamentarianVoteMapSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)
    votes = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Parliamentarian
        fields = [
            'mp_slug', 'mp_name', 'party', 'county', 'chamber', 'email',
            'impact_score', 'votes', 'total_votes'
        ]
        read_only_fields = fields

    def get_votes(self, obj: Parliamentarian):
        vote_limit = self.context.get('vote_limit')
        votes = getattr(obj, 'prefetched_votes', None)
        if votes is None:
            votes_manager = getattr(obj, 'votes', None)
            votes = votes_manager.all() if votes_manager else []
            
        if vote_limit is not None:
            votes = votes[:vote_limit]
        return MPVoteSerializer(votes, many=True).data

    def get_total_votes(self, obj: Parliamentarian):
        pre_votes = getattr(obj, 'prefetched_votes', None)
        if pre_votes is not None:
            return len(pre_votes)
        
        votes_manager = getattr(obj, 'votes', None)
        return votes_manager.count() if votes_manager else 0
