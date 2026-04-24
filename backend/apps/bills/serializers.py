from rest_framework import serializers
from .models import Bill, AIAnalysis, VoteSession

class AIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAnalysis
        fields = '__all__'

class VoteSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoteSession
        fields = '__all__'

class BillListSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)
    
    class Meta:
        model = Bill
        fields = (
            'idp', 'bill_number', 'title', 'initiator_name', 
            'status', 'registered_at', 'ai_analysis'
        )

class BillDetailSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)
    vote_sessions = VoteSessionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Bill
        fields = '__all__'
