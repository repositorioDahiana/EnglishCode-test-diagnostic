from django.contrib import admin
import nested_admin
from core.models.sections.reading import (
    ReadingTest,
    ReadingBlock,
    ReadingQuestion,
    ReadingOption,
)

class ReadingOptionInline(nested_admin.NestedTabularInline):
    model = ReadingOption
    extra = 0
    max_num = 4
    fields = ['option_text', 'is_correct']

class ReadingQuestionInline(nested_admin.NestedStackedInline):
    model = ReadingQuestion
    inlines = [ReadingOptionInline]
    extra = 0
    fields = ['question_text']
    classes = ['collapse']

class ReadingBlockInline(nested_admin.NestedStackedInline):
    model = ReadingBlock
    inlines = [ReadingQuestionInline]
    extra = 0
    fields = ['title', 'content']
    classes = ['collapse']
    verbose_name = "Reading block"
    verbose_name_plural = "Reading blocks"

@admin.register(ReadingTest)
class ReadingTestAdmin(nested_admin.NestedModelAdmin):
    list_display = ['title', 'vertical', 'description']
    list_filter = ['vertical']
    search_fields = ['title', 'description']
    inlines = [ReadingBlockInline]
    fields = ['title', 'vertical', 'description'] 