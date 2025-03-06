from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Post, Follow, Comment

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'first_name', 'last_name', 'profile_picture']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            profile_picture=validated_data.get('profile_picture', None)
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

# Serializer สำหรับการเข้าสู่ระบบ
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

class UserSerializer(serializers.ModelSerializer):
    is_following = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()  
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_picture', 'is_following', 'is_superuser','description']
        read_only_fields = ['username']

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, followed=obj).exists()
        return False

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            return request.build_absolute_uri(obj.profile_picture.url)  # ✅ เปลี่ยนให้ส่ง URL เต็ม
        return None

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    shared_from = serializers.SerializerMethodField()  # ✅ เปลี่ยนจาก PrimaryKeyRelatedField เป็น SerializerMethodField
    likes_count = serializers.SerializerMethodField()
    shares_count = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False)

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'image', 'created_at', 'likes', 'shares', 'likes_count', 'shares_count', 'shared_from']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_shares_count(self, obj):
        return obj.shares.count()
    
    def get_shared_from(self, obj):
        if obj.shared_from:
            shared_post = PostSerializer(obj.shared_from, context=self.context).data
            shared_post['author'] = UserSerializer(obj.shared_from.author, context=self.context).data  # ✅ ใช้ author ของต้นฉบับ
            return shared_post
        return None




class FollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'followed', 'created_at']


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.first_name", read_only=True)
    author_picture = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'author_name', 'author_picture', 'content', 'created_at']
        read_only_fields = ['id', 'post', 'author', 'author_name', 'author_picture', 'created_at']

    def get_author_picture(self, obj):
        request = self.context.get("request")
        if obj.author.profile_picture:
            return request.build_absolute_uri(obj.author.profile_picture.url)
        return None
