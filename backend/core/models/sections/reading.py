from django.db import models
from core.constants import VERTICAL_CHOICES

class ReadingTest(models.Model):
    title = models.CharField(max_length=200)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)
    description = models.TextField()

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Reading Test"
        verbose_name_plural = "Reading Tests"

class ReadingBlock(models.Model):
    reading_test = models.ForeignKey(
        ReadingTest,
        on_delete=models.CASCADE,
        related_name='reading_blocks'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Reading Block"
        verbose_name_plural = "Reading Blocks"

class ReadingQuestion(models.Model):
    reading_block = models.ForeignKey(
        ReadingBlock,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_text = models.TextField()

    def __str__(self):
        return self.question_text

    class Meta:
        verbose_name = "Reading Question"
        verbose_name_plural = "Reading Questions"

class ReadingOption(models.Model):
    question = models.ForeignKey(
        ReadingQuestion,
        on_delete=models.CASCADE,
        related_name='options'
    )
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.option_text

    class Meta:
        verbose_name = "Reading Option"
        verbose_name_plural = "Reading Options"
