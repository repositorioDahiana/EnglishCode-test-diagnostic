# Generated by Django 5.2.1 on 2025-06-26 19:29

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_userprofile_first_name_userprofile_last_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='first_name',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='last_name',
        ),
    ]
