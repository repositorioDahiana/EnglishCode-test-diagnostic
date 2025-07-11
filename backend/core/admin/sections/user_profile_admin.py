from django.contrib import admin
from core.models.sections.user_profile import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'email',
        'name',
        'intentos_realizados',
        'get_vertical_display',
        'resultado_speaking',
        'resultado_listening',
        'resultado_writing',
        'resultado_reading',
        'resultado_general',
        'nivel',
        'fecha_creacion'
    )
    list_filter = ('nivel', 'vertical')
    search_fields = ('email', 'name')
    ordering = ('-fecha_creacion',)

    def get_vertical_display(self, obj):
        return obj.get_vertical_display()
    get_vertical_display.short_description = 'Vertical'
