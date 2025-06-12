from django.db import models
from core.constants import VERTICAL_CHOICES
import cloudinary.uploader
from cloudinary.models import CloudinaryField

class ListeningTest(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)

    def __str__(self):
        return self.title

class ListeningBlock(models.Model):
    test = models.ForeignKey(ListeningTest, related_name="blocks", on_delete=models.CASCADE)
    video_file = CloudinaryField(
        'video',
        resource_type='video',
        folder='listening_videos',
        format='mp4',
        blank=True,
        null=True
    )
    instructions = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                old_obj = ListeningBlock.objects.get(pk=self.pk)
                if (old_obj.video_file and 
                    hasattr(old_obj.video_file, 'public_id') and
                    old_obj.video_file.public_id and 
                    self.video_file and 
                    hasattr(self.video_file, 'public_id') and
                    old_obj.video_file.public_id != self.video_file.public_id):
                    cloudinary.uploader.destroy(old_obj.video_file.public_id, resource_type='video')
            except ListeningBlock.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.video_file and hasattr(self.video_file, 'public_id') and self.video_file.public_id:
            cloudinary.uploader.destroy(self.video_file.public_id, resource_type='video')
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Block for: {self.test.title}"

class ListeningQuestion(models.Model):
    block = models.ForeignKey(ListeningBlock, related_name="questions", on_delete=models.CASCADE)
    question_text = models.TextField()
    question_type = models.CharField(max_length=50, default='multiple_choice')  # Siempre selección múltiple

    def __str__(self):
        return self.question_text

class ListeningOption(models.Model):
    question = models.ForeignKey(ListeningQuestion, related_name="options", on_delete=models.CASCADE)
    option_text = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.option_text} (Correct: {self.is_correct})"
