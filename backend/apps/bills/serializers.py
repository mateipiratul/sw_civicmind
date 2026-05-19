from __future__ import annotations
from rest_framework import serializers
from .models import Bill, AIAnalysis, VoteSession
from apps.parliamentarians.models import MPVote

class MPVoteInBillSerializer(serializers.ModelSerializer):
    """A single MP vote record within a bill's vote breakdown."""
    mp_slug = serializers.CharField(source='parliamentarian.mp_slug', read_only=True)
    mp_name = serializers.CharField(source='parliamentarian.mp_name', read_only=True)

    class Meta:
        model = MPVote
        fields = ['mp_slug', 'mp_name', 'party', 'vote']

class AIAnalysisSerializer(serializers.ModelSerializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)

    class Meta:
        model = AIAnalysis
        fields = [
            'bill_idp', 'processed_at', 'model', 'title_short', 'key_ideas',
            'impact_categories', 'affected_profiles', 'arguments', 'pro_arguments',
            'con_arguments', 'controversy_score', 'passed_by', 'dominant_party',
            'vote_date', 'ocr_quality', 'confidence'
        ]
        read_only_fields = fields

class VoteSessionSerializer(serializers.ModelSerializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)

    class Meta:
        model = VoteSession
        fields = [
            'idv', 'bill_idp', 'type', 'date', 'time', 'description',
            'present', 'for_votes', 'against', 'abstain', 'absent', 'by_party'
        ]
        read_only_fields = fields

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
