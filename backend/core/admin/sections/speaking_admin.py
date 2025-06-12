from django.contrib import admin
import nested_admin
from core.models.sections.speaking import (
    SpeakingTest,
    SpeakingBlock,
)

class SpeakingBlockInline(nested_admin.NestedStackedInline):
    model = SpeakingBlock
    extra = 0
    fields = ['text', 'instruction', 'example']
    classes = ['collapse']
    verbose_name = "Speaking block"
    verbose_name_plural = "Speaking blocks"

@admin.register(SpeakingTest)
class SpeakingTestAdmin(nested_admin.NestedModelAdmin):
    list_display = ['title', 'vertical', 'description']
    list_filter = ['vertical']
    search_fields = ['title', 'description']
    inlines = [SpeakingBlockInline]
    fields = ['title', 'vertical', 'description'] 