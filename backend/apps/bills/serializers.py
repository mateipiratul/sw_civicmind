from __future__ import annotations
from rest_framework import serializers
from .models import (
    Bill, AIAnalysis, VoteSession, ImpactCategory, AffectedProfile, 
    KeyIdea, BillArgument, PartyVoteResult
)
from apps.parliamentarians.models import MPVote

class MPVoteInBillSerializer(serializers.ModelSerializer):
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
        return [cat.name for cat in obj.rel_impact_categories.all()]

    def get_affected_profiles(self, obj):
        return [prof.name for prof in obj.rel_affected_profiles.all()]

    def get_key_ideas(self, obj):
        return [idea.text for idea in obj.rel_key_ideas.all()]

    def _get_categorized_arguments(self, obj):
        if not hasattr(obj, '_categorized_arguments'):
            categorized = {'general': {}, 'pro': [], 'con': []}
            for arg in obj.rel_arguments.all():
                if arg.type == 'general':
                    categorized['general'][f"arg_{arg.order}"] = arg.text
                elif arg.type == 'pro':
                    categorized['pro'].append(arg.text)
                elif arg.type == 'con':
                    categorized['con'].append(arg.text)
            obj._categorized_arguments = categorized
        return obj._categorized_arguments

    def get_arguments(self, obj):
        return self._get_categorized_arguments(obj)['general']

    def get_pro_arguments(self, obj):
        return self._get_categorized_arguments(obj)['pro']

    def get_con_arguments(self, obj):
        return self._get_categorized_arguments(obj)['con']

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

class AIAnalysisListSerializer(serializers.ModelSerializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)
    
    # Reduced relational replacements for list view (no key_ideas or arguments)
    impact_categories = serializers.SerializerMethodField()
    affected_profiles = serializers.SerializerMethodField()

    class Meta:
        model = AIAnalysis
        fields = [
            'bill_idp', 'processed_at', 'model', 'title_short', 'impact_categories', 
            'affected_profiles', 'controversy_score', 'passed_by', 'dominant_party', 
            'vote_date', 'ocr_quality', 'confidence'
        ]
        read_only_fields = fields

    def get_impact_categories(self, obj):
        return [cat.name for cat in obj.rel_impact_categories.all()]

    def get_affected_profiles(self, obj):
        return [prof.name for prof in obj.rel_affected_profiles.all()]

class BillListSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisListSerializer(read_only=True)

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
