# Generated by Django 5.1.4 on 2025-02-28 05:24

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_follow'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='shared_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='shared_posts_by', to=settings.AUTH_USER_MODEL),
        ),
    ]
