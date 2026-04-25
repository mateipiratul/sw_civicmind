from rest_framework import serializers
from .models import Parliamentarian, ImpactScore, MPVote


class ImpactScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactScore
        fields = (
            'score', 'total_votes', 'for_count', 'against_count',
            'abstain_count', 'absent_count', 'categories_voted',
            'narrative', 'calculated_at',
        )


class MPVoteSerializer(serializers.ModelSerializer):
    """A single MP vote, enriched with the bill context for the Consistency Feed."""

    # Bill info — traversed via vote_session → bill
    bill_idp = serializers.IntegerField(source='vote_session.bill.idp', read_only=True)
    bill_number = serializers.CharField(source='vote_session.bill.bill_number', read_only=True)
    bill_title = serializers.CharField(source='vote_session.bill.title', read_only=True)
    bill_status = serializers.CharField(source='vote_session.bill.status', read_only=True)

    # AI analysis fields — gives the frontend the categories & short title
    impact_categories = serializers.JSONField(
        source='vote_session.bill.ai_analysis.impact_categories',
        read_only=True,
        default=list,
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
        fields = (
            'vote',
            'party',
            'vote_date',
            'vote_type',
            'bill_idp',
            'bill_number',
            'bill_title',
            'bill_status',
            'title_short',
            'impact_categories',
            'controversy_score',
        )


class ParliamentarianListSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)

    class Meta:
        model = Parliamentarian
        fields = ('mp_slug', 'mp_name', 'party', 'county', 'chamber', 'email', 'impact_score')


class ParliamentarianDetailSerializer(serializers.ModelSerializer):
    """
    Full MP profile including their voting history (Consistency Feed) and ImpactScore.
    Recent votes are capped at 50 to keep the payload manageable.
    """
    impact_score = ImpactScoreSerializer(read_only=True)
    recent_votes = serializers.SerializerMethodField()

    class Meta:
        model = Parliamentarian
        fields = (
            'mp_slug', 'mp_name', 'party', 'county', 'chamber',
            'email', 'impact_score', 'recent_votes',
        )

    def get_recent_votes(self, obj: Parliamentarian):
        # Fetch the 50 most recent votes for this MP, ordered by vote date desc.
        # Using select_related to avoid N+1 on the bill and ai_analysis traversal.
        qs = (
            obj.votes
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')[:50]
        )
        return MPVoteSerializer(qs, many=True).data


class ParliamentarianVoteMapSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)
    votes = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Parliamentarian
        fields = (
            'mp_slug',
            'mp_name',
            'party',
            'county',
            'chamber',
            'email',
            'impact_score',
            'total_votes',
            'votes',
        )

    def get_votes(self, obj: Parliamentarian):
        vote_limit = self.context.get('vote_limit')
        votes = self._get_votes_queryset(obj)
        if vote_limit is not None:
            votes = votes[:vote_limit]
        return MPVoteSerializer(votes, many=True).data

    def get_total_votes(self, obj: Parliamentarian):
        votes = getattr(obj, 'prefetched_votes', None)
        if votes is not None:
            return len(votes)
        return obj.votes.count()

    @staticmethod
    def _get_votes_queryset(obj: Parliamentarian):
        prefetched_votes = getattr(obj, 'prefetched_votes', None)
        if prefetched_votes is not None:
            return prefetched_votes
        return list(
            obj.votes
            .select_related(
                'vote_session',
                'vote_session__bill',
                'vote_session__bill__ai_analysis',
            )
            .order_by('-vote_session__date')
        )
