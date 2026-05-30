from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Profile
from allauth.socialaccount.signals import pre_social_login

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)

@receiver(pre_social_login)
def populate_profile_from_social(sender, request, sociallogin, **kwargs):
    """
    Capture avatar URL from social provider (Google) and save to Profile.
    """
    user = sociallogin.user
    if not user:
        return

    # Ensure profile exists
    profile, _ = Profile.objects.get_or_create(user=user)
    
    # Extract extra data from social login
    extra_data = sociallogin.account.extra_data
    
    # Google specific
    picture_url = extra_data.get('picture')
    
    if picture_url and profile.avatar_url != picture_url:
        profile.avatar_url = picture_url
        profile.save()
