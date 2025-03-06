import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaHome, FaAddressBook, FaSignOutAlt, FaThumbsUp, FaShare, FaTrash, FaComment, FaPaperPlane, FaTrashAlt,
    FaImage, FaFileAlt, FaRegPlusSquare  } from 'react-icons/fa'; 
import "../styles/Home.css";  

const Home = () => {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImage, setNewPostImage] = useState(null);
    const [comments, setComments] = useState({}); 
    const [commentTexts, setCommentTexts] = useState({});
    const [openComments, setOpenComments] = useState({});
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem("is_admin") === "true";

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
    
            try {
                const userResponse = await axios.get('http://127.0.0.1:8000/api/user/', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUser(userResponse.data);
    
                const postsResponse = await axios.get('http://127.0.0.1:8000/api/posts/following/', {
                    headers: { Authorization: `Bearer ${token}` },
                });
    
                // ✅ ดึงคอมเมนต์ของทุกโพสต์
                const postsWithComments = await Promise.all(
                    postsResponse.data.map(async (post) => {
                        const commentsResponse = await axios.get(
                            `http://127.0.0.1:8000/api/posts/${post.id}/comments/`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        return { ...post, comments: commentsResponse.data };
                    })
                );
    
                setPosts(postsWithComments);
                console.log("Posts data:", postsResponse.data);
            } catch (error) {
                console.error('Error fetching data', error);
                localStorage.removeItem('token');
                navigate('/login');
            }
        };
    
        fetchData();
    }, [navigate]);
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !newPostImage) {
            alert('Please enter some text or upload an image.');
            return;
        }

        const formData = new FormData();
        formData.append('content', newPostContent.trim() || "");
        if (newPostImage) {
            formData.append('image', newPostImage);
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://127.0.0.1:8000/api/posts/', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            const newPost = { ...response.data, comments: [] };
            setPosts([newPost, ...posts]);
            setNewPostContent('');
            setNewPostImage(null);
        } catch (error) {
            console.error('Error creating post', error);
        }
    };

    const handleDeletePost = async (postId, sharedFromId) => {
        try {
            const token = localStorage.getItem("token");
    
            const url = isAdmin
                ? `http://127.0.0.1:8000/api/admin/posts/${postId}/delete/`
                : `http://127.0.0.1:8000/api/posts/${postId}/delete/`;
    
            await axios.delete(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            // ✅ ลบโพสต์ออกจาก state
            setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    
            // ✅ ถ้าโพสต์ที่ลบเป็นโพสต์ที่แชร์ → ลดจำนวน `shares_count` ของโพสต์ต้นฉบับ
            if (sharedFromId) {
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.id === sharedFromId
                            ? { ...post, shares_count: Math.max(post.shares_count - 1, 0) }
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
            const token = localStorage.getItem('token');
            await axios.post(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            likes_count: post.likes.includes(user.id) ? post.likes_count - 1 : post.likes_count + 1,
                            likes: post.likes.includes(user.id)
                                ? post.likes.filter(id => id !== user.id)
                                : [...post.likes, user.id]
                        }
                        : post
                )
            );
        } catch (error) {
            console.error('Error liking post', error);
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
        if (!commentText.trim()) return; // ✅ ป้องกันคอมเมนต์ว่างเปล่า
    
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `http://127.0.0.1:8000/api/posts/${postId}/comments/`,
                { content: commentText },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
    
            if (response.data) {
                // ✅ ตรวจสอบว่ามี comments อยู่แล้วหรือไม่ ถ้าไม่มีให้สร้าง array ใหม่
                setPosts((prevPosts) =>
                    prevPosts.map((post) =>
                        post.id === postId
                            ? { 
                                ...post, 
                                comments: post.comments 
                                    ? [...post.comments, response.data] 
                                    : [response.data]  // ✅ กรณีไม่มีคอมเมนต์มาก่อน
                            }
                            : post
                    )
                );
    
                // ✅ เคลียร์ช่องกรอกคอมเม้นหลังจากส่งสำเร็จ
                setCommentTexts((prevTexts) => ({ ...prevTexts, [postId]: "" }));
            }
        } catch (error) {
            console.error("Error adding comment", error);
        }
    };
    
    const handleDeleteComment = async (commentId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://127.0.0.1:8000/api/comments/${commentId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            // ✅ อัปเดตโพสต์ให้คอมเมนต์หายไป
            setPosts((prevPosts) =>
                prevPosts.map((post) => ({
                    ...post,
                    comments: post.comments.filter(comment => comment.id !== commentId),
                }))
            );
        } catch (error) {
            console.error('Error deleting comment', error);
        }
    };
    
    
    
    const toggleCommentSection = (postId) => {
        setOpenComments(prevState => ({
            ...prevState,
            [postId]: !prevState[postId]  // ✅ สลับค่า true/false
        }));
    };

    

    return (
        <div id="Home-page">
            {/* ✅ Header เมนูด้านบน */}
            <div className="header">
                <div className="header-left">
                    {user && (
                        <>
                            {/* ✅ ปุ่ม Profile */}
                            <Link to={`/profile/${user.id}`} className="nav-button">
                            <img src={user.profile_picture || 'https://via.placeholder.com/40'} alt="Profile" className="profile-picture" />
                            
                            <span className="user-name">{user.first_name} {user.last_name}</span>
                            </Link>
                            {/* ✅ ขีดคั่นหลังชื่อ */}
                            <span className="divider">|</span>

                            {/* ✅ ปุ่ม Timeline */}
                            <Link to="/home" className="nav-button">
                                <FaHome className="icon" />
                            </Link>

                            {/* ✅ ปุ่ม Contact */}
                            <Link to="/contact" className="nav-button">
                                <FaAddressBook className="icon" />
                            </Link>
                        </>
                    )}
                </div>
                
                {/* ✅ ปุ่ม Logout */}
                <button onClick={handleLogout} className="logout-button">
                    <FaSignOutAlt className="icon" /> Logout
                </button>
            </div>

            {/* ✅ เนื้อหาหลักของหน้า Home */}
            <div className="content">
                <div className="new-post">
                {/* ✅ แสดงโปรไฟล์ผู้ใช้ และชื่อชิดซ้าย */}
                {user && (
                    <div className="post-user-info">
                        <img src={user.profile_picture || 'https://via.placeholder.com/40'} 
                            alt="Profile" className="post-profile-picture" />
                        <span className="post-user-name">{user.first_name} {user.last_name}</span>
                    </div>
                )}

                {/* ✅ ช่องกรอกข้อความ */}
                <textarea 
                    value={newPostContent} 
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?" 
                    className="post-input" 
                />

                {/* ✅ กล่องใส่ไฟล์ + แสดงชื่อไฟล์ */}
                <div className="file-upload-container">
                    <label htmlFor="file-upload" className="file-label">
                        <FaImage className="file-icon" /> Choose Image
                    </label>
                    <input 
                        id="file-upload"
                        type="file"
                        onChange={(e) => {
                            setNewPostImage(e.target.files[0]);
                        }} 
                        className="file-input-hidden"
                    />

                    {/* ✅ แสดงชื่อไฟล์ ถ้าเลือกแล้ว */}
                    {newPostImage && (
                        <div className="file-info">
                            <FaFileAlt className="file-preview-icon" />
                            <span className="file-name">{newPostImage.name}</span>
                        </div>
                    )}
                </div>

                    {/* ✅ ปุ่มโพสต์ พร้อมไอคอน */}
                    <button onClick={handleCreatePost} className="post-button">
                        <FaRegPlusSquare  className="post-icon" /> Post
                    </button>
                 </div>

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

                        {/* ✅ ปุ่ม Like, Share, Comment, Delete */}
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
                            {(post.author.id === user?.id || post.shared_by?.id === user?.id || isAdmin) && (
                                <button onClick={() => handleDeletePost(post.id)} className="action-button delete-button">
                                    <FaTrash className="icon" />
                                </button>
                            )}
                            </div>
                        </div>

                        {/* ย้าย comment-wrapper ให้อยู่ใต้โพสต์* */}
                        {openComments[post.id] && (
                            <div className="comment-wrapper">
                                <div className="comment-section">
                                    <div className="comment-form">
                                        <img src={user.profile_picture || 'https://via.placeholder.com/30'} alt="Profile" className="comment-profile-picture" />
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
                                                {user && (comment.author === user.id || isAdmin) && (
                                                    <button onClick={() => handleDeleteComment(comment.id)} 
                                                        className="comment-delete-button">
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

export default Home;

