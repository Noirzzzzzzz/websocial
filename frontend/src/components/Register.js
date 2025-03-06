import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Register.css";  

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!username || !password || !password2 || !firstName || !lastName) {
            setErrorMessage('Please fill in all fields');
            return;
        }
        if (password !== password2) {
            setErrorMessage('Passwords do not match');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('password2', password2);
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        if (profilePicture && profilePicture.size > 0) {  
            formData.append('profile_picture', profilePicture);
        }

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/register/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Registration successful', response.data);
            setSuccessMessage('Registration successful! Redirecting to login...');

            const user_id = response.data.id;
            localStorage.setItem('user_id', user_id);

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            if (error.response) {
                setErrorMessage('Registration failed: ' + JSON.stringify(error.response.data));
            } else if (error.request) {
                setErrorMessage('No response received from the server');
            } else {
                setErrorMessage('Error: ' + error.message);
            }
        }
    };

    return (
        <div className="register-container">
            <h2>Register</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label className="form-label">Username:</label>
                    <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Password:</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Confirm Password:</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="form-label">First Name:</label>
                    <input
                        type="text"
                        className="form-control"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Last Name:</label>
                    <input
                        type="text"
                        className="form-control"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Profile Picture:</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={(e) => setProfilePicture(e.target.files[0])}
                    />
                </div>
                <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={!username || !password || !password2 || !firstName || !lastName}
                >
                    Register
                </button>
            </form>
        </div>
    );
};

export default Register;
