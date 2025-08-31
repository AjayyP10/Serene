from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'  # Corrected to the app's name

    def ready(self):
        import core.signals  # Keep this if signals are implemented