from django.contrib import admin
import nested_admin
from core.models.sections.listening import (
    ListeningTest,
    ListeningBlock,
    ListeningQuestion,
    ListeningOption,
)

class ListeningOptionInline(nested_admin.NestedTabularInline):
    model = ListeningOption
    extra = 0
    max_num = 4
    fields = ['option_text', 'is_correct']

class ListeningQuestionInline(nested_admin.NestedStackedInline):
    model = ListeningQuestion
    inlines = [ListeningOptionInline]
    extra = 0
    fields = ['question_text', 'question_type']

class ListeningBlockInline(nested_admin.NestedStackedInline):
    model = ListeningBlock
    inlines = [ListeningQuestionInline]
    extra = 0
    fields = ['video_file', 'instructions']
    verbose_name = "Listening block"
    verbose_name_plural = "Listening blocks"
    classes = ['collapse']

@admin.register(ListeningTest)
class ListeningTestAdmin(nested_admin.NestedModelAdmin):
    list_display = ['title', 'vertical', 'description']
    list_filter = ['vertical']
    search_fields = ['title', 'description']
    inlines = [ListeningBlockInline]
    fields = ['title', 'vertical', 'description']
