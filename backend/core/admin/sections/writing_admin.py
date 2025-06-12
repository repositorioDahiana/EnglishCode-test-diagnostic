from django.contrib import admin
import nested_admin
from core.models.sections.writing import (
    WritingTest,
    WritingBlock,
)

class WritingBlockInline(nested_admin.NestedStackedInline):
    model = WritingBlock
    extra = 0
    fields = ['text', 'instruction', 'example']
    classes = ['collapse']
    verbose_name = "Writing block"
    verbose_name_plural = "Writing blocks"

@admin.register(WritingTest)
class WritingTestAdmin(nested_admin.NestedModelAdmin):
    list_display = ['title', 'vertical', 'description']
    list_filter = ['vertical']
    search_fields = ['title', 'description']
    inlines = [WritingBlockInline]
    fields = ['title', 'vertical', 'description'] 