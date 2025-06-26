from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from core.constants import VERTICAL_CHOICES
from django.utils import timezone
from datetime import timedelta

class UserProfile(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    vertical = models.IntegerField(choices=VERTICAL_CHOICES)
    intentos_realizados = models.IntegerField(default=0)
    fecha_bloqueo = models.DateTimeField(null=True, blank=True)

    def puede_intentar_test(self):
        if self.intentos_realizados < 3:
            return True
        if self.fecha_bloqueo:
            return timezone.now() >= self.fecha_bloqueo + timedelta(days=2)
        return False

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
        if (
            self.resultado_listening is None or
            self.resultado_speaking is None or
            self.resultado_reading is None or
            self.resultado_writing is None
        ):
            self.resultado_general = None
            self.nivel = None
            return  
        pesos = {
            'resultado_listening': 0.4,
            'resultado_speaking': 0.4,
            'resultado_reading': 0.1,
            'resultado_writing': 0.1,
        }

        total = 0
        for campo, peso in pesos.items():
            total += getattr(self, campo) * peso

        self.resultado_general = total
        self.actualizar_nivel()

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
