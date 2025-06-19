// --- Backend Routes: auth.js ---

const express = require('express');         // Import Express
const router = express.Router();            // Create a new router instance
const mongoose = require('mongoose');       // Import Mongoose (needed to access models)
const User = mongoose.model('User');        // Get the User Mongoose model (requires models/User.js to have been required in server.js)
const bcrypt = require('bcrypt');           // Import bcrypt for password comparison
const jwt = require('jsonwebtoken');        // Import jsonwebtoken for creating and verifying tokens
// const dotenv = require('dotenv');         // Usually configured in server.js, but can be here if running routes standalone
// const path = require('path');             // Usually configured in server.js

// dotenv.config(); // Uncomment this line if you ever need to run this route file in isolation


// --- Authentication Middleware ---
// This middleware is used to protect routes that require a user to be logged in.
const authenticateToken = (req, res, next) => {
    // Get the authorization header from the request (usually 'Bearer TOKEN')
    const authHeader = req.headers['authorization'];
    // Extract the token from the 'Bearer ' scheme
    const token = authHeader && authHeader.split(' ')[1]; // Check if header exists and split

    // If no token is provided, return 401 Unauthorized
    if (token == null) {
        console.warn("Authentication failed: No token provided.");
        return res.sendStatus(401); // 401 Unauthorized
    }

    // Verify the token using the JWT secret from environment variables
    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
        // If verification fails (e.g., token is invalid, expired, wrong secret)
        if (err) {
            console.warn("Authentication failed: JWT verification failed.", err.message);
             // You could check err.name for specific errors like 'TokenExpiredError'
            return res.sendStatus(403); // 403 Forbidden (Invalid token)
        }

        // If verification succeeds, the userPayload contains the data we embedded
        // when signing the token (e.g., { _id: user._id, role: user.role }).
        // Attach this payload to the request object so subsequent route handlers can access it.
        req.user = userPayload;

        // Proceed to the next middleware function or the route handler
        next();
    });
};


// --- Authentication Routes ---

// @route POST /api/auth/register
// @desc Register a new user
// @access Public
router.post('/register', async (req, res) => {
    // Extract user data from the request body
    const { name, email, role, password, phone, memberSince } = req.body; // Added phone, memberSince (optional)

    // Basic input validation
    if (!name || !email || !role || !password) {
        return res.status(400).json({ message: 'Please enter all required fields (name, email, role, password).' });
    }
    if (password.length < 6) { // Minimum password length validation (matches schema)
         return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
     // Validate role against enum
     if (!['farmer', 'buyer', 'investor'].includes(role)) {
          return res.status(400).json({ message: 'Invalid role specified. Must be farmer, buyer, or investor.' });
     }
    // Basic email format check (schema also validates, but frontend/early check is good)
    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: 'Please use a valid email address.' });
    }


    try {
        // Check if a user with the given email already exists
        let user = await User.findOne({ email });
        if (user) {
            // If email exists, return a conflict error
            return res.status(409).json({ message: 'Email already registered.' }); // 409 Conflict
        }

        // Create a new user instance using the Mongoose model
        user = new User({
            name,
            email,
            role,
            password, // The password will be hashed by the pre-save hook in the User model
             phone,       // Include optional fields
             memberSince: memberSince ? new Date(memberSince) : undefined, // Convert to Date if provided
            // createdAt will default in the schema
            // authMethod will default in the schema
        });

        // Save the new user document to the database
        const savedUser = await user.save();

        // Generate a JSON Web Token (JWT) for the newly registered user
        // The payload includes essential user info (_id and role) for subsequent authentication checks
         const token = jwt.sign(
             { _id: savedUser._id.toString(), role: savedUser.role }, // Payload: Convert ObjectId to string for token consistency
             process.env.JWT_SECRET, // The secret key for signing (from .env)
             { expiresIn: '24h' } // Token expiration time (e.g., 24 hours)
         );


        // Send a success response back to the frontend
        res.status(201).json({ // 201 Created
            message: 'User registered successfully',
            user: savedUser.getPublicProfile(), // Send back the user's public profile data
            token // Send the generated token
        });

    } catch (err) {
        console.error('Signup error:', err);
        // Handle Mongoose validation errors or other database errors
         if (err.name === 'ValidationError') {
              return res.status(400).json({ message: err.message }); // Send validation error message
         }
         if (err.code === 11000) { // Duplicate key error (e.g., if email unique index fails for some reason)
              return res.status(409).json({ message: 'Email already registered.' });
         }
        res.status(500).json({ message: 'Server error during registration' }); // 500 Internal Server Error
    }
});

// @route POST /api/auth/login
// @desc Authenticate user & get token
// @access Public
router.post('/login', async (req, res) => {
    // Extract login credentials from the request body
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter email and password.' });
    }

    try {
        // Find the user by email in the database
        const user = await User.findOne({ email });

        // If user is not found, return an error
        if (!user) {
            // Use a generic error message for security (don't reveal if email exists but password is wrong)
            return res.status(400).json({ message: 'Invalid credentials.' }); // 400 Bad Request
        }

        // Compare the provided password with the hashed password stored in the database
        // The comparePassword method is defined on the User schema (models/User.js)
        const isMatch = await user.comparePassword(password);

        // If passwords do not match, return an error
        if (!isMatch) {
            // Use a generic error message for security
            return res.status(400).json({ message: 'Invalid credentials.' }); // 400 Bad Request
        }

        // If email and password match, generate a JWT token for the authenticated user
         const token = jwt.sign(
             { _id: user._id.toString(), role: user.role }, // Payload: user's _id and role
             process.env.JWT_SECRET, // The secret key for signing (from .env)
             { expiresIn: '24h' } // Token expiration time
         );

        // Send a success response back to the frontend with user data and token
        res.json({ // Default status is 200 OK
            message: 'Logged in successfully',
            user: user.getPublicProfile(), // Send back the user's public profile data
            token // Send the generated token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' }); // 500 Internal Server Error
    }
});

// @route GET /api/auth/me
// @desc Get the currently logged-in user's profile
// @access Private (Requires a valid JWT token)
router.get('/me', authenticateToken, async (req, res) => {
    // This route uses the authenticateToken middleware.
    // If the middleware successfully verified the token, req.user will contain the payload.

    try {
        // Find the user in the database using the _id from the token payload (req.user._id).
        // Select out the password field to avoid sending it.
        const user = await User.findById(req.user._id).select('-password');

        // If the user is not found (e.g., user deleted after token issued - rare), return 404.
        if (!user) {
            return res.status(404).json({ message: 'User not found.' }); // 404 Not Found
        }

        // Return the user's public profile data
        res.json(user.getPublicProfile()); // Default status is 200 OK

    } catch (err) {
        console.error('GET /api/auth/me error:', err);
         // Handle potential errors (e.g., invalid _id format if payload was somehow tampered)
         if (err.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid User ID format in token.' });
         }
        res.status(500).json({ message: 'Server error fetching user data.' }); // 500 Internal Server Error
    }
});


// --- Export the router and middleware ---

// Export the configured router so it can be used by server.js
// Export the authenticateToken middleware so it can be used by other route files
module.exports = { router, authenticateToken }; 
