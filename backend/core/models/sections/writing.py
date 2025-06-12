from django.db import models
from core.constants import VERTICAL_CHOICES

class WritingTest(models.Model):
    title = models.CharField(max_length=200)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)
    description = models.TextField()

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Writing Test"
        verbose_name_plural = "Writing Tests"

class WritingBlock(models.Model):
    writing_test = models.ForeignKey(
        WritingTest,
        on_delete=models.CASCADE,
        related_name='writing_blocks'
    )
    text = models.TextField()
    instruction = models.TextField()
    example = models.TextField()

    def __str__(self):
        return f"Block for {self.writing_test.title}"

    class Meta:
        verbose_name = "Writing Block"
        verbose_name_plural = "Writing Blocks"
