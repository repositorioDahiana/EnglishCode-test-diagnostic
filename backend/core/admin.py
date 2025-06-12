from django.contrib import admin
from core.models.sections.user_profile import UserProfile
from .admin.sections.user_profile_admin import UserProfileAdmin
from core.models.sections.listening import (
    ListeningTest,
    ListeningBlock,
    ListeningQuestion,
    ListeningOption
)
from .admin.sections.listening_admin import (
    ListeningTestAdmin,
    ListeningBlockInline,
    ListeningQuestionInline,
    ListeningOptionInline
)

# Registering the models
admin.site.register(ListeningTest, ListeningTestAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
