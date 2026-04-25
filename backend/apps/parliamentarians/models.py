from django.db import models
from apps.bills.models import VoteSession

class Parliamentarian(models.Model):
    mp_slug = models.CharField(primary_key=True, max_length=255)
    mp_name = models.CharField(max_length=255, blank=True, null=True)
    party = models.CharField(max_length=100, blank=True, null=True)
    chamber = models.CharField(max_length=100, blank=True, null=True)
    
    # Enriched fields
    email = models.EmailField(blank=True, null=True)
    county = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'parliamentarians'
        managed = False
        verbose_name = "Parliamentarian"
        verbose_name_plural = "Parliamentarians"

    def __str__(self):
        return f"{self.mp_name} ({self.party})"

class MPVote(models.Model):
    vote_session = models.ForeignKey(
        VoteSession, 
        on_delete=models.CASCADE, 
        db_column='idv',
        related_name='mp_votes'
    )
    parliamentarian = models.ForeignKey(
        Parliamentarian, 
        on_delete=models.CASCADE, 
        db_column='mp_slug',
        related_name='votes'
    )
    party = models.CharField(max_length=100, blank=True, null=True)
    vote = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'mp_votes'
        managed = False
        unique_together = (('vote_session', 'parliamentarian'),)
        verbose_name = "MP Vote"
        verbose_name_plural = "MP Votes"

class ImpactScore(models.Model):
    parliamentarian = models.OneToOneField(
        Parliamentarian,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column='mp_slug',
        related_name='impact_score'
    )
    score = models.FloatField(blank=True, null=True)
    total_votes = models.IntegerField(default=0)
    for_count = models.IntegerField(default=0)
    against_count = models.IntegerField(default=0)
    abstain_count = models.IntegerField(default=0)
    absent_count = models.IntegerField(default=0)
    mp_name = models.TextField(blank=True, null=True)
    party = models.CharField(max_length=100, blank=True, null=True)
    categories_voted = models.JSONField(default=list)
    narrative = models.TextField(blank=True, null=True)
    calculated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'impact_scores'
        managed = False
        verbose_name = "Impact Score"
        verbose_name_plural = "Impact Scores"
