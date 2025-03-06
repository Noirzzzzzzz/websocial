import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    FaUser, FaHome, FaAddressBook, FaSignOutAlt, FaArrowLeft
} from "react-icons/fa";
import '../styles/FollowList.css'; 

const FollowList = () => {
    const { user_id } = useParams();
    const navigate = useNavigate();
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    const currentUserId = localStorage.getItem("user_id");

    useEffect(() => {
        fetchCurrentUser();
        fetchFollowData();
    }, [user_id]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get('http://127.0.0.1:8000/api/user/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Error fetching current user', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const fetchFollowData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const [followersResponse, followingResponse] = await Promise.all([
                axios.get(`http://127.0.0.1:8000/api/users/${user_id}/followers/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`http://127.0.0.1:8000/api/users/${user_id}/following/`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            setFollowers(followersResponse.data);
            setFollowing(followingResponse.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching follow data', error);
            setLoading(false);
        }
    };

    const handleFollowToggle = async (targetUserId, isFollowing) => {
        try {
            const token = localStorage.getItem('token');
            const url = `http://127.0.0.1:8000/api/users/${targetUserId}/${isFollowing ? 'unfollow' : 'follow'}/`;

            await axios.post(url, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // ✅ อัปเดตสถานะ follow/unfollow โดยไม่ต้องรีเฟรชหน้า
            setFollowers((prev) =>
                prev.map((f) => (f.id === targetUserId ? { ...f, is_following: !isFollowing } : f))
            );
            setFollowing((prev) =>
                prev.map((f) => (f.id === targetUserId ? { ...f, is_following: !isFollowing } : f))
            );
        } catch (error) {
            console.error('Error toggling follow status', error);
        }
    };

    if (loading || !currentUser) {
        return <div>Loading...</div>;
    }

    return (
        <div id="List-page">
                    <div className="header">
                        <div className="header-left">
                            {currentUser && (
                                <>
                                    <Link to={`/profile/${currentUser.id}`} className="nav-button">
                                    <img src={currentUser.profile_picture || 'https://via.placeholder.com/40'} alt="Profile" className="profile-picture" />
                                    <span className="user-name">{currentUser.first_name} {currentUser.last_name}</span>
                                    </Link>
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
        
        <div className="followlist-container">
                {/* ✅ ปุ่มย้อนกลับไปหน้าโปรไฟล์ */}
                <div className="back-to-profile">
                    <Link to={`/profile/${user_id}`} className="back-button">
                        <FaArrowLeft /> Back to Profile
                    </Link>
                </div>
            {/* ✅ รายชื่อ Followers */}
            <h2>Followers</h2>
            <div className="follow-list">
                {followers.length === 0 ? <p>No followers yet.</p> : followers.map((follower) => (
                    <div key={follower.id} className="user-card">
                        <img src={follower.profile_picture || 'https://via.placeholder.com/50'} alt="Profile" className="profile-picture-small" />
                        <Link to={`/profile/${follower.id}`} className="user-name-card">
                            {follower.first_name} {follower.last_name}
                        </Link>
                        <span >@{follower.username}</span>
                        {follower.id.toString() === currentUserId ? (
                            <span className="self-text">You</span>
                        ) : (
                            <button className="follow-button" onClick={() => handleFollowToggle(follower.id, follower.is_following)}>
                                {follower.is_following ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* ✅ รายชื่อ Following */}
            <h2>Following</h2>
            <div className="follow-list">
                {following.length === 0 ? <p>Not following anyone yet.</p> : following.map((followed) => (
                    <div key={followed.id} className="user-card">
                        <img src={followed.profile_picture || 'https://via.placeholder.com/50'} alt="Profile" className="profile-picture-small" />
                        <Link to={`/profile/${followed.id}`} className="user-name-card">
                            {followed.first_name} {followed.last_name}
                        </Link>
                            <span >@{followed.username}</span>
                        {followed.id.toString() === currentUserId ? (
                            <span className="self-text">You</span>
                        ) : (
                            <button className="follow-button" onClick={() => handleFollowToggle(followed.id, followed.is_following)}>
                                {followed.is_following ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
     </div>
    );
};

export default FollowList;

