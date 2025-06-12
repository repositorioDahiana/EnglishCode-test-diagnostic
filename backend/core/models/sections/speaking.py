from django.db import models
from core.constants import VERTICAL_CHOICES

class SpeakingTest(models.Model):
    title = models.CharField(max_length=200)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)
    description = models.TextField()

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Speaking Test"
        verbose_name_plural = "Speaking Tests"

class SpeakingBlock(models.Model):
    speaking_test = models.ForeignKey(
        SpeakingTest,
        on_delete=models.CASCADE,
        related_name='speaking_blocks'
    )
    text = models.TextField()
    instruction = models.TextField()
    example = models.TextField()

    def __str__(self):
        return f"Block for {self.speaking_test.title}"

    class Meta:
        verbose_name = "Speaking Block"
        verbose_name_plural = "Speaking Blocks"
