from rest_framework import serializers
from .models import Parliamentarian, ImpactScore, MPVote

class ImpactScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactScore
        fields = '__all__'

class MPVoteSerializer(serializers.ModelSerializer):
    bill_title = serializers.CharField(source='vote_session.bill.title', read_only=True)
    bill_number = serializers.CharField(source='vote_session.bill.bill_number', read_only=True)
    
    class Meta:
        model = MPVote
        fields = ('id', 'vote_session', 'party', 'vote', 'bill_title', 'bill_number')

class ParliamentarianListSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)
    
    class Meta:
        model = Parliamentarian
        fields = ('mp_slug', 'mp_name', 'party', 'county', 'impact_score')

class ParliamentarianDetailSerializer(serializers.ModelSerializer):
    impact_score = ImpactScoreSerializer(read_only=True)
    votes = MPVoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = Parliamentarian
        fields = '__all__'
