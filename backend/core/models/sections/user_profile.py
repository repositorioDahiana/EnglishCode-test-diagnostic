from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from core.constants import VERTICAL_CHOICES

class UserProfile(models.Model):
    email = models.EmailField(unique=True)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)

    resultado_listening = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True
    )
    resultado_speaking = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True
    )
    resultado_writing = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True
    )
    resultado_reading = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True
    )

    resultado_general = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, blank=True
    )

    NIVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('basic', 'Basic'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    nivel = models.CharField(
        max_length=20,
        choices=NIVEL_CHOICES,
        null=True,
        blank=True
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def calcular_resultado_general(self):
        pesos = {
            'resultado_listening': 0.35,
            'resultado_speaking': 0.40,
            'resultado_reading': 0.15,
            'resultado_writing': 0.10,
        }

        total = 0
        peso_total = 0

        for campo, peso in pesos.items():
            valor = getattr(self, campo)
            if valor is not None:
                total += valor * peso
                peso_total += peso

        if peso_total > 0:
            self.resultado_general = total / peso_total
            self.actualizar_nivel()
        else:
            self.resultado_general = None
            self.nivel = None

    def actualizar_nivel(self):
        if self.resultado_general is None:
            self.nivel = None
        elif self.resultado_general >= 80:
            self.nivel = 'advanced'
        elif self.resultado_general >= 50:
            self.nivel = 'intermediate'
        elif self.resultado_general >= 0:
            self.nivel = 'basic'
        else:
            self.nivel = 'beginner'

    def save(self, *args, **kwargs):
        self.calcular_resultado_general()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} - {self.get_vertical_display()}"

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
