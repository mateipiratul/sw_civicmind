from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Count, Q
from .models import MPVote, ImpactScore, Parliamentarian
from django.utils import timezone
from apps.core.services import CacheService
from .score_utils import compute_score

@receiver([post_save, post_delete], sender=MPVote)
def update_impact_score_on_vote(sender, instance, **kwargs):
    if not instance.parliamentarian_id:
        return
        
    mp_slug = instance.parliamentarian_id
    
    # Calculate counts
    vote_stats = MPVote.objects.filter(parliamentarian_id=mp_slug).aggregate(
        total=Count('id'),
        for_count=Count('id', filter=Q(vote__iexact='pentru') | Q(vote__iexact='for')),
        against_count=Count('id', filter=Q(vote__iexact='contra') | Q(vote__iexact='against')),
        abstain_count=Count('id', filter=Q(vote__iexact='abtinere') | Q(vote__iexact='abținere') | Q(vote__iexact='abstain')),
        absent_count=Count('id', filter=Q(vote__iexact='absent') | Q(vote__iexact='absentat')),
    )

    # Get distinct categories voted on
    # We trace from MPVote -> VoteSession -> Bill -> AIAnalysis -> ImpactCategory
    categories_queryset = MPVote.objects.filter(
        parliamentarian_id=mp_slug,
        vote_session__bill__ai_analysis__isnull=False
    ).values_list(
        'vote_session__bill__ai_analysis__rel_impact_categories__name', 
        flat=True
    ).distinct()
    
    categories_voted = [cat for cat in categories_queryset if cat]

    ImpactScore.objects.update_or_create(
        parliamentarian_id=mp_slug,
        defaults={
            'score': compute_score(
                vote_stats['total'] or 0,
                vote_stats['absent_count'] or 0,
                (vote_stats['for_count'] or 0) + (vote_stats['against_count'] or 0),
            ),
            'total_votes': vote_stats['total'] or 0,
            'for_count': vote_stats['for_count'] or 0,
            'against_count': vote_stats['against_count'] or 0,
            'abstain_count': vote_stats['abstain_count'] or 0,
            'absent_count': vote_stats['absent_count'] or 0,
            'categories_voted': categories_voted,
            'calculated_at': timezone.now()
        }
    )

@receiver([post_save, post_delete], sender=Parliamentarian)
def invalidate_parliamentarian_caches(sender, instance, **kwargs):
    """
    Invalidates cached metadata and search entities when a parliamentarian is modified.
    """
    CacheService.delete("parliamentarian_metadata_v1")
    CacheService.delete("search_entities_v2")
