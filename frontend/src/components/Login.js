import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Login.css";  

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/home');
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login/', { username, password });

            localStorage.setItem('token', response.data.access);

            const userResponse = await axios.get('http://127.0.0.1:8000/api/user/', {
                headers: { Authorization: `Bearer ${response.data.access}` },
            });

            const user_id = userResponse.data.id;
            const isAdmin = userResponse.data.is_superuser || false;
            localStorage.setItem('is_admin', isAdmin.toString());
            localStorage.setItem('user_id', user_id);

            setTimeout(() => {
                navigate('/home');
                window.location.reload();
            }, 100);
        } catch (error) {
            console.log("Login Error:", error.response);
            setErrorMessage(error.response?.data?.detail || 'Login failed. Please try again.');
        }
    };

 return (
        <div className="login-container">
            <h2 className="login-title">Login</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label className="form-label">Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="form-control"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="form-control"
                    />
                </div>
                <button type="submit" disabled={!username || !password} className="btn-primary">
                    Login
                </button>
            </form>
            <p className="register-link">
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
};

export default Login;

