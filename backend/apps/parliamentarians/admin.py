from django.contrib import admin
from .models import Parliamentarian, MPVote, ImpactScore

@admin.register(Parliamentarian)
class ParliamentarianAdmin(admin.ModelAdmin):
    list_display = ('mp_name', 'party', 'county', 'email')
    search_fields = ('mp_name', 'party', 'county', 'email')
    list_filter = ('party', 'county')

@admin.register(MPVote)
class MPVoteAdmin(admin.ModelAdmin):
    list_display = ('parliamentarian', 'vote_session', 'vote', 'party')
    list_filter = ('vote', 'party')
    search_fields = ('parliamentarian__mp_name', 'vote_session__idv')

@admin.register(ImpactScore)
class ImpactScoreAdmin(admin.ModelAdmin):
    list_display = ('parliamentarian', 'score', 'total_votes', 'calculated_at')
    search_fields = ('parliamentarian__mp_name',)
