import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    FaUser, FaHome, FaAddressBook, FaSignOutAlt, FaThumbsUp,
    FaShare, FaTrash, FaComment, FaPaperPlane, FaTrashAlt, FaEdit, FaUserCheck
} from "react-icons/fa";
import "../styles/Profile.css";

const Profile = () => {
    const { user_id } = useParams();
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false); 
    const [currentUser, setCurrentUser] = useState(null);
    const [commentTexts, setCommentTexts] = useState({});
    const [openComments, setOpenComments] = useState({});
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("is_admin") === "true";
    const currentUserId = localStorage.getItem("user_id");
    const isOwnProfile = parseInt(currentUserId) === parseInt(user_id);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }
    
            try {
                // ✅ ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่
                const userResponse = await axios.get("http://127.0.0.1:8000/api/user/", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCurrentUser(userResponse.data); // ✅ เซ็ตค่า currentUser
    
                // ✅ ดึงข้อมูลโปรไฟล์ที่กำลังเข้าชม
                const profileResponse = await axios.get(`http://127.0.0.1:8000/api/users/${user_id}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUser(profileResponse.data); // ✅ เซ็ตค่า user
    
                // ✅ อัปเดตสถานะติดตามของ user นี้
                setIsFollowing(profileResponse.data.is_following);
    
                // ✅ ดึงโพสต์ของ user ที่เข้าชม
                const postsResponse = await axios.get(`http://127.0.0.1:8000/api/users/${user_id}/posts/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
    
                // ✅ โหลดคอมเมนต์ของแต่ละโพสต์แบบขนาน
                const postsWithComments = await Promise.all(
                    postsResponse.data.map(async (post) => {
                        try {
                            const commentsResponse = await axios.get(
                                `http://127.0.0.1:8000/api/posts/${post.id}/comments/`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            return { ...post, comments: commentsResponse.data };
                        } catch (error) {
                            console.error(`Error fetching comments for post ${post.id}`, error);
                            return { ...post, comments: [] }; // ถ้ามี error ให้ return ค่าคอมเมนต์เป็น [] (ป้องกัน error)
                        }
                    })
                );
    
                setPosts(postsWithComments); // ✅ อัปเดตโพสต์พร้อมคอมเมนต์
            } catch (error) {
                console.error("Error fetching profile data", error);
                localStorage.removeItem("token");
                navigate("/login");
            }
        };
    
        fetchData();
    }, [navigate, user_id]); // ✅ รันทุกครั้งที่ user_id เปลี่ยน
    
    
    const handleFollowToggle = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://127.0.0.1:8000/api/users/${user_id}/${isFollowing ? 'unfollow' : 'follow'}/`;
    
            await axios.post(url, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            // ✅ อัปเดตค่า isFollowing และ followers_count ทันที
            setIsFollowing(!isFollowing);
            setUser((prevUser) => ({
                ...prevUser,
                is_following: !prevUser.is_following,
                followers_count: isFollowing ? prevUser.followers_count - 1 : prevUser.followers_count + 1
            }));
        } catch (error) {
            console.error('Error toggling follow status', error);
        }
    };
    
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleDeletePost = async (postId, sharedFromId = null) => {
        try {
            const token = localStorage.getItem("token");
    
            // ✅ กำหนด URL สำหรับการลบโพสต์
            const url = isAdmin
                ? `http://127.0.0.1:8000/api/admin/posts/${postId}/delete/`
                : `http://127.0.0.1:8000/api/posts/${postId}/delete/`;
    
            await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            // ✅ อัปเดต state ลบโพสต์ออกจาก UI
            setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    
            // ✅ ถ้าโพสต์ที่ถูกลบเป็นโพสต์ที่แชร์มา → ลดจำนวน `shares_count` ของต้นฉบับ
            if (sharedFromId) {
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.id === sharedFromId
                            ? { ...post, shares_count: Math.max((post.shares_count || 0) - 1, 0) }
                            : post
                    )
                );
            }
        } catch (error) {
            console.error("Error deleting post", error);
        }
    };
    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            likes_count: post.likes.includes(currentUser.id) ? post.likes_count - 1 : post.likes_count + 1,
                            likes: post.likes.includes(currentUser.id)
                                ? post.likes.filter((id) => id !== currentUser.id)
                                : [...post.likes, currentUser.id],
                        }
                        : post
                )
            );
        } catch (error) {
            console.error("Error liking post", error);
        }
    };

    const handleShare = async (postId) => {
        try {
            const token = localStorage.getItem("token");
    
            // ✅ เรียก API แชร์โพสต์
            const response = await axios.post(
                `http://127.0.0.1:8000/api/posts/${postId}/share/`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
    
            if (response.data) {
                // ✅ อัปเดต state ของ posts ทันที
                setPosts((prevPosts) => [{ ...response.data, comments: [] }, ...prevPosts]);
    
                // ✅ อัปเดตจำนวนแชร์ในโพสต์ต้นฉบับ
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.id === postId
                            ? { ...post, shares_count: post.shares_count + 1 }
                            : post
                    )
                );
            }
        } catch (error) {
            console.error("Error sharing post", error);
        }
    };

    const handleComment = async (postId, commentText) => {
        if (!commentText.trim() || !currentUser) return;  // ✅ ป้องกันคอมเม้นต์ว่างเปล่า และต้องมี currentUser ด้วย
    
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `http://127.0.0.1:8000/api/posts/${postId}/comments/`,
                { 
                    content: commentText,  
                    author_name: currentUser.first_name + " " + currentUser.last_name,  // ✅ ใช้ชื่อของ currentUser
                    author_picture: currentUser.profile_picture  // ✅ ใช้รูปโปรไฟล์ของ currentUser
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
    
            if (response.data) {
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.id === postId
                            ? { 
                                ...post, 
                                comments: post.comments ? [...post.comments, response.data] : [response.data]  
                            }
                            : post
                    )
                );
    
                // ✅ รีเซ็ตกล่องคอมเม้นต์
                setCommentTexts((prevTexts) => ({ ...prevTexts, [postId]: "" }));
            }
        } catch (error) {
            console.error("Error adding comment", error);
        }
    };
    
    
    const handleDeleteComment = async (commentId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://127.0.0.1:8000/api/comments/${commentId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            setPosts((prevPosts) =>
                prevPosts.map((post) => ({
                    ...post,
                    comments: post.comments.filter((comment) => comment.id !== commentId),
                }))
            );
        } catch (error) {
            console.error("Error deleting comment", error);
        }
    };
    
    const toggleCommentSection = (postId) => {
        setOpenComments(prevState => ({
            ...prevState,
            [postId]: !prevState[postId]  // ✅ สลับค่า true/false
        }));
    };

    return (
        <div id="Profile-page">
            <div className="header">
                <div className="header-left">
                    {currentUser && (
                        <>
                            <Link to={`/profile/${currentUser.id}`} className="nav-button">
                                <img src={currentUser.profile_picture || 'https://via.placeholder.com/40'} alt="Profile" className="profile-picture" />
                                <span className="user-name">{currentUser.first_name} {currentUser.last_name}</span>
                            </Link>
                            {/* ✅ ขีดคั่นหลังชื่อ */}
                            <span className="divider">|</span>
                            <Link to="/home" className="nav-button">
                                <FaHome className="icon" />
                            </Link>
                            <Link to="/contact" className="nav-button">
                                <FaAddressBook className="icon" />
                            </Link>
                        </>
                    )}
                </div>
                <button onClick={handleLogout} className="logout-button">
                    <FaSignOutAlt className="icon" /> Logout
                </button>
            </div>

            <div className="profile-header">
                {user && (
                    <div className="profile-container">
                        {/* ✅ รูปโปรไฟล์ใหญ่ขึ้น */}
                        <img 
                            src={user.profile_picture || "https://via.placeholder.com/120"} 
                            alt="Profile" 
                            className="profile-picture-large" 
                        />

                        {/* ✅ รายละเอียดโปรไฟล์ทางขวา */}
                        <div className="profile-info">
                            <div className="profile-name-follow">
                            <h2>{user.first_name} {user.last_name}</h2>
                            {/* ✅ ปุ่มติดตาม/เลิกติดตาม */}
                            {user && currentUser?.id !== user.id && (
                                <button onClick={handleFollowToggle} className="follow-button">
                                    {isFollowing ? <FaUserCheck className="follow-icon" /> : "[ Follow ]"}
                                </button>
                            )}
                             </div>
                            <p className="username">@{user.username}</p>

                            {/* ✅ จำนวน Followers, Following, Posts */}
                            <div className="profile-stats">
                                <Link to={`/profile/${user.id}/followers`} className="stat-link">
                                    <strong>{user.followers_count}</strong> Followers
                                </Link>
                                <Link to={`/profile/${user.id}/following`} className="stat-link">
                                    <strong>{user.following_count}</strong> Following
                                </Link>
                                <span><strong>{user.posts_count}</strong> Posts</span>
                            </div>

                            {/* ✅ Description ของโปรไฟล์ */}
                            {user.description ? (
                                <p className="profile-description">{user.description}</p>
                            ) : (
                                <p className="profile-description no-description">No bio available.</p>
                            )}
                        </div>
                            {/* ✅ ปุ่มแก้ไขโปรไฟล์ (เฉพาะเจ้าของเท่านั้น) */}
                            {currentUser && user && currentUser.id === user.id && (
                            <Link to={`/profile/${user.id}/edit`} className="edit-profile-button">
                                <FaEdit className="edit-icon" />
                            </Link>
                        )}
                    </div>
                )}
            </div>


            <div className="content">
                {posts.map((post) => (
                    <div key={post.id} className="post">
                        <div className="post-header">
                            <img src={post.author.profile_picture || 'https://via.placeholder.com/40'} alt="Author" className="post-author-picture" />
                            <span className="post-author-name">
                                <Link to={`/profile/${post.author.id}`} className="profile-link">{post.author.first_name} {post.author.last_name}</Link>
                            </span>
                        </div>

                        {/* ✅ แสดงโพสต์ที่แชร์ */}
                        {post.shared_from?.author && (
                            <div className="shared-from-container">
                                <span className="shared-by">Shared from</span>
                                <img src={post.shared_from.author.profile_picture || 'https://via.placeholder.com/30'} alt="Shared Author" className="shared-from-profile-picture" />
                                <Link to={`/profile/${post.shared_from.author.id}`} className="shared-from-name">
                                    {post.shared_from.author.first_name} {post.shared_from.author.last_name}
                                </Link>
                            </div>
                        )}

                        {/* ✅ แสดงเนื้อหาโพสต์ */}
                        <p className="post-content">{post.content}</p>
                        {post.image && <img src={post.image} alt="Post" className="post-image" />}
                        <small className="post-date">{new Date(post.created_at).toLocaleString()}</small>


                        <div className="post-actions">
                        <div className="post-actions-left">
                            <button onClick={() => handleLike(post.id)} className={`action-button like-button ${post.likes.includes(user?.id) ? "liked" : ""}`}>
                                <FaThumbsUp className="icon" /> {post.likes_count}
                            </button>
                            <button onClick={() => handleShare(post.id)} className="action-button share-button">
                                <FaShare className="icon" /> {post.shares_count}
                            </button>
                            <button onClick={() => toggleCommentSection(post.id)} className="action-button comment-button">
                                <FaComment className="icon" /> {post.comments.length}
                            </button>
                            </div>

                            <div className="post-actions-right">
                            {/* ✅ ปุ่ม Delete (เฉพาะเจ้าของโพสต์หรือแอดมิน) */}
                            {(post.author.id === currentUser?.id || post.shared_by?.id === currentUser?.id || isAdmin) && (
                                <button onClick={() => handleDeletePost(post.id)} className="action-button delete-button">
                                    <FaTrash className="icon" />
                                </button>
                            )}
                            </div>
                        </div>

                        {openComments[post.id] && (
                            <div className="comment-wrapper">
                                <div className="comment-section">
                                    <div className="comment-form">
                                    <img src={currentUser.profile_picture || 'https://via.placeholder.com/30'} alt="Profile" className="comment-profile-picture" />

                                        <input
                                            type="text"
                                            value={commentTexts[post.id] || ""}
                                            onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                                            placeholder="Write a comment..."
                                            className="comment-input"
                                        />
                                        <button onClick={() => handleComment(post.id, commentTexts[post.id] || "")} className="comment-submit-button">
                                            <FaPaperPlane />
                                        </button>
                                    </div>

                                    {/* แสดงคอมเมนต์ */}
                                    <div className="comment-list">
                                    
                                    {(post.comments || []).length > 0 ? (
                                         (post.comments || []).map((comment) => (
                                            <div key={comment.id} className="comment">
                                                <div className="comment-actions-left">
                                                <img src={comment.author_picture || 'https://via.placeholder.com/30'} 
                                                    alt="Author" className="comment-author-picture" />

                                                <div className="comment-content">
                                                    <div className="comment-header">
                                                        <span className="comment-author">{comment.author_name}</span>
                                                        <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="comment-text">{comment.content}</p>
                                                </div>
                                                </div>
                                                {/*  แสดงปุ่มลบเฉพาะเจ้าของคอมเมนต์ หรือแอดมิน */}
                                                {currentUser && (comment.author === currentUser.id || isAdmin) && (
                                                    <button onClick={() => handleDeleteComment(comment.id)} className="comment-delete-button">
                                                        <FaTrashAlt />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                        ) : (
                                            <p className="no-comments">No comments yet.</p>  // เพิ่มข้อความถ้าไม่มีคอมเมนต์
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Profile;

