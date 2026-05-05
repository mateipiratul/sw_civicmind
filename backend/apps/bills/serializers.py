from __future__ import annotations
from rest_framework import serializers

class MPVoteInBillSerializer(serializers.Serializer):
    """A single MP vote record within a bill's vote breakdown."""
    mp_slug = serializers.CharField(source='parliamentarian.mp_slug')
    mp_name = serializers.CharField(source='parliamentarian.mp_name')
    party = serializers.CharField()
    vote = serializers.CharField()

class AIAnalysisSerializer(serializers.Serializer):
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)
    processed_at = serializers.DateTimeField(read_only=True)
    model = serializers.CharField(read_only=True)
    title_short = serializers.CharField(read_only=True)
    key_ideas = serializers.ListField(child=serializers.CharField(), read_only=True)
    impact_categories = serializers.ListField(child=serializers.CharField(), read_only=True)
    affected_profiles = serializers.ListField(child=serializers.CharField(), read_only=True)
    arguments = serializers.DictField(read_only=True)
    pro_arguments = serializers.ListField(child=serializers.CharField(), read_only=True)
    con_arguments = serializers.ListField(child=serializers.CharField(), read_only=True)
    controversy_score = serializers.FloatField(read_only=True)
    passed_by = serializers.CharField(read_only=True)
    dominant_party = serializers.CharField(read_only=True)
    vote_date = serializers.DateField(read_only=True)
    ocr_quality = serializers.CharField(read_only=True)
    confidence = serializers.FloatField(read_only=True)

class VoteSessionSerializer(serializers.Serializer):
    idv = serializers.IntegerField(read_only=True)
    bill_idp = serializers.IntegerField(source='bill.idp', read_only=True)
    type = serializers.CharField(read_only=True)
    date = serializers.DateField(read_only=True)
    time = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    present = serializers.IntegerField(read_only=True)
    for_votes = serializers.IntegerField(read_only=True)
    against = serializers.IntegerField(read_only=True)
    abstain = serializers.IntegerField(read_only=True)
    absent = serializers.IntegerField(read_only=True)
    by_party = serializers.ListField(child=serializers.DictField(), read_only=True)

class BillListSerializer(serializers.Serializer):
    idp = serializers.IntegerField(read_only=True)
    bill_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    initiator_name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    registered_at = serializers.DateField(read_only=True)
    ai_analysis = AIAnalysisSerializer(read_only=True)

class BillDetailSerializer(serializers.Serializer):
    idp = serializers.IntegerField(read_only=True)
    bill_number = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    initiator_name = serializers.CharField(read_only=True)
    initiator_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    procedure = serializers.CharField(read_only=True)
    law_type = serializers.CharField(read_only=True)
    decision_chamber = serializers.CharField(read_only=True)
    registered_at = serializers.DateField(read_only=True)
    adopted_at = serializers.DateField(read_only=True)
    source_url = serializers.URLField(read_only=True)
    scraped_at = serializers.DateTimeField(read_only=True)
    
    doc_expunere_url = serializers.URLField(read_only=True)
    doc_forma_url = serializers.URLField(read_only=True)
    doc_aviz_ces_url = serializers.URLField(read_only=True)
    doc_aviz_cl_url = serializers.URLField(read_only=True)
    doc_adoptata_url = serializers.URLField(read_only=True)
    
    ocr_expunere = serializers.CharField(read_only=True)
    ocr_aviz_ces = serializers.CharField(read_only=True)
    ocr_aviz_cl = serializers.CharField(read_only=True)
    
    ai_analysis = AIAnalysisSerializer(read_only=True)
    vote_sessions = VoteSessionSerializer(many=True, read_only=True)
