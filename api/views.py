from rest_framework import generics, permissions, status, viewsets
from rest_framework.generics import DestroyAPIView
from .serializers import (RegisterSerializer, CustomTokenObtainPairSerializer, PostSerializer, FollowSerializer
                          , UserSerializer,CommentSerializer)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Post,Follow,User, Comment
from django.db.models import Q

# View สำหรับการสมัครสมาชิก
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

# View สำหรับการเข้าสู่ระบบ
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

User = get_user_model()


class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data.copy()

        # ✅ Debug เช็คค่าที่ส่งมา
        print("Request Data:", data)

        # ✅ อัปเดต `description`
        if "description" in data:
            description = data.get("description", "").strip()
            if len(description) > 150:
                return Response({"error": "Description must be 150 characters or less."}, status=status.HTTP_400_BAD_REQUEST)
            user.description = description

        # ✅ อัปเดต `profile_picture`
        profile_picture = request.FILES.get("profile_picture")
        if profile_picture:
            user.profile_picture = profile_picture  # ✅ บันทึกไฟล์รูปภาพใหม่

        # ✅ ใช้ Serializer เพื่ออัปเดตข้อมูล
        serializer = self.get_serializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)  # บันทึกผู้เขียนโพสต์

class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(Q(author=self.request.user) | Q(shared_from__author=self.request.user))

    def perform_destroy(self, instance):
        # ✅ ถ้าเป็นโพสต์ที่แชร์ → ลดจำนวน `shares_count` ของโพสต์ต้นฉบับ
        if instance.shared_from:
            original_post = instance.shared_from
            original_post.shares.remove(instance.author)  # ✅ ลบคนแชร์ออกจาก shares
            original_post.save()

        # ✅ ลบโพสต์
        instance.delete()


class PostLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            if request.user in post.likes.all():
                post.likes.remove(request.user)  # ยกเลิก Like
            else:
                post.likes.add(request.user)  # กด Like
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


class PostShareView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = get_object_or_404(Post, id=post_id)

            # ✅ ตรวจสอบว่าโพสต์ต้นฉบับยังคงอยู่
            if post.shared_from:
                shared_from = post.shared_from
            else:
                shared_from = post

            # ✅ สร้างโพสต์ใหม่ที่แชร์ โดยไม่คัดลอกคอมเมนต์
            shared_post = Post.objects.create(
                author=request.user,
                content=shared_from.content,
                image=shared_from.image,
                shared_from=shared_from
            )

            # ✅ อัปเดตจำนวนครั้งที่แชร์
            shared_from.shares.add(request.user)

            # ✅ ส่งข้อมูลโพสต์ที่แชร์กลับไป
            serializer = PostSerializer(shared_post, context={"request": request})
            response_data = serializer.data
            response_data["comments"] = []  # ✅ ตั้งค่าให้ comments เป็นอาร์เรย์ว่าง
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    

class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):  # เปลี่ยนจาก userId เป็น user_id
        try:
            followed_user = User.objects.get(id=user_id)
            if request.user == followed_user:
                return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
            
            follow, created = Follow.objects.get_or_create(
                follower=request.user,
                followed=followed_user
            )
            if not created:
                return Response({'error': 'You are already following this user.'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'status': 'success', 'message': 'You are now following this user.'}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):  # เปลี่ยนจาก userId เป็น user_id
        try:
            followed_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        follow = Follow.objects.filter(follower=request.user, followed=followed_user)

        if follow.exists():
            follow.delete()
            return Response({'status': 'success', 'message': 'You have unfollowed this user.'}, status=status.HTTP_200_OK)
        return Response({'error': 'You are not following this user.'}, status=status.HTTP_400_BAD_REQUEST)

        

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ดึงข้อมูลผู้ใช้ทั้งหมด ยกเว้นผู้ใช้ที่ล็อกอินอยู่
        return User.objects.exclude(id=self.request.user.id)

    def get_serializer_context(self):
        # ส่ง request ไปยัง Serializer
        return {'request': self.request}

class FollowingPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ดึงโพสต์จากผู้ใช้ที่ติดตามและผู้ใช้เอง
        following_users = Follow.objects.filter(follower=self.request.user).values_list('followed', flat=True)
        following_users = list(following_users) + [self.request.user.id]  # เพิ่มผู้ใช้เอง
        return Post.objects.filter(author__in=following_users).order_by('-created_at')  

class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Post.objects.filter(
            Q(author_id=user_id) |  # ✅ โพสต์ที่ user สร้างเอง
            Q(shared_from__isnull=False, author_id=user_id)  # ✅ โพสต์ที่ user แชร์เอง
        ).order_by('-created_at')

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):  
        print("Requested user_id:", user_id)  # ✅ Debug ว่า user_id ถูกส่งมาถูกต้องหรือไม่
        user = get_object_or_404(User, id=user_id)  # ✅ ใช้ get_object_or_404 ป้องกัน DoesNotExist
        serializer = UserSerializer(user, context={'request': request})

        # ✅ ดึงข้อมูลผู้ติดตาม, ผู้ที่กำลังติดตาม, และจำนวนโพสต์
        followers_count = Follow.objects.filter(followed=user).count()
        following_count = Follow.objects.filter(follower=user).count()
        posts_count = Post.objects.filter(author=user).count()

        # ✅ เช็คว่าผู้ใช้ที่ล็อกอินอยู่กำลังติดตาม user_id นี้หรือไม่
        is_following = Follow.objects.filter(follower=request.user, followed=user).exists()

        response_data = serializer.data
        response_data.update({
            'followers_count': followers_count,
            'following_count': following_count,
            'posts_count': posts_count,
            'is_following': is_following  # ✅ เพิ่ม `is_following`
        })

        return Response(response_data, status=status.HTTP_200_OK)

class UserFollowersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            followers = Follow.objects.filter(followed=user).values_list('follower', flat=True)
            followers_list = User.objects.filter(id__in=followers)
            serializer = UserSerializer(followers_list, many=True, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class UserFollowingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            following = Follow.objects.filter(follower=user).values_list('followed', flat=True)
            following_list = User.objects.filter(id__in=following)
            serializer = UserSerializer(following_list, many=True, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
class AdminDeletePostView(DestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAdminUser]  # ✅ ให้เฉพาะ Admin ลบโพสต์ได้
    lookup_field = "id"

class AdminDeleteUserView(DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]  # ✅ ให้เฉพาะ Admin ลบผู้ใช้ได้
    lookup_field = "id"

class CommentViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request, post_id=None):
        post = get_object_or_404(Post, id=post_id)
        comments = post.comments.all().order_by("-created_at")  # ✅ เรียงใหม่ล่าสุดอยู่บน
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, post_id=None):
        post = get_object_or_404(Post, id=post_id)
        content = request.data.get("content", "").strip()

        if not content:
            return Response({"error": "Comment cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CommentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(author=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, pk=None):  # ✅ เพิ่มฟังก์ชันลบคอมเมนต์
        comment = get_object_or_404(Comment, id=pk)

        # ✅ ตรวจสอบว่าคนที่ลบ เป็นเจ้าของคอมเมนต์หรือเป็นแอดมิน
        if request.user == comment.author or request.user.is_superuser:
            comment.delete()
            return Response({"message": "Comment deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

        return Response({"error": "You don't have permission to delete this comment"}, status=status.HTTP_403_FORBIDDEN)

