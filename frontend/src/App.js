import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Contact from './components/Contact';
import Profile from './components/Profile';
import FollowList from './components/FollowList';
import EditProfile from './components/EditProfile';

const isAuthenticated = localStorage.getItem("token") !== null;

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route path="/home" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
                <Route path="/profile/:user_id" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
                <Route path="/profile/:user_id/follow" element={isAuthenticated ? <FollowList /> : <Navigate to="/login" />} />
                <Route path="/profile/:user_id/edit" element={isAuthenticated ? <EditProfile /> : <Navigate to="/login" />} />
                <Route path="/profile/:user_id/followers" element={<FollowList />} />
                <Route path="/profile/:user_id/following" element={<FollowList />} />   
                
                {/* Public Routes */}
                <Route path="/contact" element={<Contact />} />

                {/* Redirect Root Path */}
                <Route path="/" element={isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} />
            </Routes>
        </Router>
    );
};

export default App;

