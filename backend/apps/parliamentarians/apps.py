from django.apps import AppConfig


class ParliamentariansConfig(AppConfig):
    name = 'apps.parliamentarians'

    def ready(self):
        import apps.parliamentarians.signals
