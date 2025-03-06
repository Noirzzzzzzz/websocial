from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import os
from django.utils.timezone import now

def profile_picture_upload(instance, filename):
    ext = filename.split('.')[-1]  # ดึงนามสกุลไฟล์ เช่น jpg, png
    filename = f"{instance.username}_{now().strftime('%Y%m%d%H%M%S')}.{ext}"  # ตั้งชื่อไฟล์ใหม่
    return os.path.join('profile_pictures/', filename)

class CustomUser(AbstractUser):
    first_name = models.CharField(_('first name'), max_length=150)
    last_name = models.CharField(_('last name'), max_length=150)
    profile_picture = models.ImageField(upload_to=profile_picture_upload, blank=True, null=True)  # ✅ ใช้ฟังก์ชันเปลี่ยนชื่อไฟล์
    description = models.TextField(blank=True, null=True)  # ✅ เพิ่มฟิลด์ description

    def __str__(self):
        return self.username

User = get_user_model()


class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(blank=True, null=True)  # ✅ อนุญาตให้ไม่มีข้อความ
    image = models.ImageField(upload_to='post_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # ✅ ลบโพสต์ต้นฉบับ → ลบโพสต์ที่แชร์ด้วย
    shared_from = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='shared_posts'
    )

    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    shares = models.ManyToManyField(User, related_name='shared_posts', blank=True)

    def __str__(self):
        if self.shared_from:
            return f'Shared Post by {self.author.username} (from {self.shared_from.author.username})'
        return f'Post by {self.author.username}'

class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'followed')  # ป้องกันการติดตามซ้ำ

    def __str__(self):
        return f'{self.follower.username} follows {self.followed.username}'

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.author.username} on {self.post.id}'
