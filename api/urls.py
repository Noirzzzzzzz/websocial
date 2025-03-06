from django.urls import path
from .views import (
    RegisterView, CustomTokenObtainPairView, UserDetailView, UserProfileView,
    PostListCreateView, PostLikeView, PostShareView, PostDeleteView,
    FollowUserView, UnfollowUserView, UserListView, FollowingPostsView,
    UserPostsView, UserFollowersView, UserFollowingView, AdminDeletePostView, AdminDeleteUserView, CommentViewSet  
)

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('admin/posts/<int:id>/delete/', AdminDeletePostView.as_view(), name='admin-delete-post'),  
    path('admin/users/<int:id>/delete/', AdminDeleteUserView.as_view(), name='admin-delete-user'), 



    # User Management
    path('user/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/', UserProfileView.as_view(), name='user-profile'), 
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/follow/', FollowUserView.as_view(), name='follow-user'),
    path('users/<int:user_id>/unfollow/', UnfollowUserView.as_view(), name='unfollow-user'),
    path('users/<int:user_id>/posts/', UserPostsView.as_view(), name='user-posts'),
    path('users/<int:user_id>/followers/', UserFollowersView.as_view(), name='user-followers'),
    path('users/<int:user_id>/following/', UserFollowingView.as_view(), name='user-following'),

    # Posts
    path('posts/', PostListCreateView.as_view(), name='post-list-create'),
    path('posts/following/', FollowingPostsView.as_view(), name='following-posts'),
    path('posts/<int:post_id>/like/', PostLikeView.as_view(), name='post-like'),
    path('posts/<int:post_id>/share/', PostShareView.as_view(), name='post-share'),
    path('posts/<int:pk>/delete/', PostDeleteView.as_view(), name='post-delete'),

    # ✅ Comments
    path('posts/<int:post_id>/comments/', CommentViewSet.as_view({'get': 'list', 'post': 'create'}), name='post-comments'),
    path('comments/<int:pk>/', CommentViewSet.as_view({'delete': 'destroy'}), name='comment-delete'),

]
