from __future__ import annotations
from rest_framework import serializers
from .models import (
    Bill, AIAnalysis, VoteSession, ImpactCategory, AffectedProfile, 
    KeyIdea, BillArgument, PartyVoteResult
)
from apps.parliamentarians.models import MPVote

class MPVoteInBillSerializer(serializers.ModelSerializer):
    """A single MP vote record within a bill's vote breakdown."""
    mp_slug = serializers.CharField(source='parliamentarian.mp_slug', read_only=True)
    mp_name = serializers.CharField(source='parliamentarian.mp_name', read_only=True)

    class Meta:
        model = MPVote
        fields = ['mp_slug', 'mp_name', 'party', 'vote']

class ImpactCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactCategory
        fields = ['name', 'slug', 'description']

class AffectedProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffectedProfile
        fields = ['name', 'slug', 'description']

class AIAnalysisSerializer(serializers.ModelSerializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)
    
    # Relational replacements for JSON fields
    impact_categories = serializers.SerializerMethodField()
    affected_profiles = serializers.SerializerMethodField()
    key_ideas = serializers.SerializerMethodField()
    arguments = serializers.SerializerMethodField()
    pro_arguments = serializers.SerializerMethodField()
    con_arguments = serializers.SerializerMethodField()

    class Meta:
        model = AIAnalysis
        fields = [
            'bill_idp', 'processed_at', 'model', 'title_short', 'impact_categories', 
            'affected_profiles', 'key_ideas', 'arguments', 'pro_arguments', 
            'con_arguments', 'controversy_score', 'passed_by', 'dominant_party', 
            'vote_date', 'ocr_quality', 'confidence'
        ]
        read_only_fields = fields

    def get_impact_categories(self, obj):
        return list(obj.rel_impact_categories.values_list('name', flat=True))

    def get_affected_profiles(self, obj):
        return list(obj.rel_affected_profiles.values_list('name', flat=True))

    def get_key_ideas(self, obj):
        return list(obj.rel_key_ideas.values_list('text', flat=True))

    def get_arguments(self, obj):
        args = {}
        for arg in obj.rel_arguments.filter(type='general'):
            args[f"arg_{arg.order}"] = arg.text
        return args

    def get_pro_arguments(self, obj):
        return list(obj.rel_arguments.filter(type='pro').values_list('text', flat=True))

    def get_con_arguments(self, obj):
        return list(obj.rel_arguments.filter(type='con').values_list('text', flat=True))

class PartyVoteResultSerializer(serializers.ModelSerializer):
    # Use 'for' as the output key by defining it with a different variable name
    for_count = serializers.IntegerField(source='for_votes')
    
    class Meta:
        model = PartyVoteResult
        fields = ['party', 'for_count', 'against', 'abstain', 'absent']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Rename 'for_count' to 'for' in the output JSON
        ret['for'] = ret.pop('for_count')
        return ret

class VoteSessionSerializer(serializers.ModelSerializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)
    by_party = serializers.SerializerMethodField()

    class Meta:
        model = VoteSession
        fields = [
            'idv', 'bill_idp', 'type', 'date', 'time', 'description',
            'present', 'for_votes', 'against', 'abstain', 'absent', 'by_party'
        ]
        read_only_fields = fields

    def get_by_party(self, obj):
        return PartyVoteResultSerializer(obj.rel_party_results.all(), many=True).data

class BillListSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)

    class Meta:
        model = Bill
        fields = [
            'idp', 'bill_number', 'title', 'initiator_name', 'status',
            'registered_at', 'ai_analysis'
        ]
        read_only_fields = fields

class BillDetailSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)
    vote_sessions = VoteSessionSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = [
            'idp', 'bill_number', 'title', 'initiator_name', 'initiator_type',
            'status', 'procedure', 'law_type', 'decision_chamber', 'registered_at',
            'adopted_at', 'source_url', 'scraped_at', 'doc_expunere_url',
            'doc_forma_url', 'doc_aviz_ces_url', 'doc_aviz_cl_url',
            'doc_adoptata_url', 'ocr_expunere', 'ocr_aviz_ces', 'ocr_aviz_cl',
            'ai_analysis', 'vote_sessions'
        ]
        read_only_fields = fields
