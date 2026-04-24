from django.contrib import admin
from .models import Bill, AIAnalysis, VoteSession

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('bill_number', 'title_excerpt', 'status', 'registered_at')
    search_fields = ('bill_number', 'title', 'initiator_name')
    list_filter = ('status', 'law_type', 'decision_chamber')

    @admin.display(description='Title')
    def title_excerpt(self, obj):
        return obj.title[:100] + '...' if obj.title and len(obj.title) > 100 else obj.title

@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ('bill', 'title_short', 'controversy_score', 'processed_at')
    search_fields = ('bill__bill_number', 'title_short')

@admin.register(VoteSession)
class VoteSessionAdmin(admin.ModelAdmin):
    list_display = ('idv', 'bill', 'date', 'type', 'for_votes', 'against')
    list_filter = ('type', 'date')
    search_fields = ('bill__bill_number', 'description')
