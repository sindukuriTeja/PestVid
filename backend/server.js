// --- Main Backend Server File: server.js ---

// Import necessary Node.js modules and installed packages
const express = require('express');        // Web framework for building APIs
const mongoose = require('mongoose');      // Mongoose for interacting with MongoDB
const cors = require('cors');              // Middleware to enable Cross-Origin Resource Sharing
const dotenv = require('dotenv');          // To load environment variables from .env file
const path = require('path');              // Node.js built-in module for working with file paths

// Load environment variables from the .env file into process.env
// This should be done as early as possible.
dotenv.config();

// Create an instance of the Express application
const app = express();

// --- Middleware Setup ---

// CORS (Cross-Origin Resource Sharing) Middleware
// This allows your frontend running on one origin (e.g., http://localhost:8080 or a file:// URL)
// to make requests to your backend running on a different origin (e.g., http://localhost:3000).
// For development, '*' is used to allow requests from any origin.
// In production, you should replace '*' with your actual frontend domain(s) for security.
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Built-in Express middleware to parse incoming requests with JSON payloads.
// This makes the JSON data sent from your frontend available on req.body.
// The { limit: '10mb' } increases the maximum request body size, useful if sending base64 image data for AI analysis.
app.use(express.json({ limit: '10mb' }));


// Optional: Serve static files (like your index.html, CSS, JS bundles) from this backend.
// If you put your frontend index.html in a public folder at the same level as the backend folder,
// uncommenting the line below will make it accessible directly from this server (e.g., at http://localhost:3000).
app.use(express.static(path.join(__dirname, '../public')));


// --- Database Connection ---

// Connect to the MongoDB database using the connection string from the .env file.
// Mongoose options like useNewUrlParser and useUnifiedTopology are recommended for connecting.
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,    // Deprecated in Mongoose 6.x and later, remove if using recent Mongoose
    // useFindAndModify: false, // Deprecated in Mongoose 6.x and later, remove if using recent Mongoose
})
.then(() => console.log('MongoDB Connected Successfully')) // Log success message if connection is established
.catch(err => {
    console.error('MongoDB connection error:', err); // Log error message if connection fails
    process.exit(1); // Exit the Node.js process with a failure code (1) if DB connection fails
});


// --- Mongoose Models ---
// Require all your Mongoose model files. This registers the schemas and models with Mongoose.
// It's important to require these after the Mongoose connection is initiated but before
// you define your routes that will use these models.
require('./models/User');
require('./models/Video');
require('./models/Listing');
require('./models/FundingRequest');
require('./models/Investment');
require('./models/Purchase');
require('./models/Transaction');
require('./models/Conversation');
require('./models/Message');
require('./models/Notification');
require('./models/AvatarMessage'); // Require the optional AvatarMessage model


// --- API Routes ---
// Import your route modules and use them with app.use().
// Each app.use() mounts the specified router middleware at a specific path prefix.
// Requests starting with that path will be handled by the routes defined in that module.

// Import the authentication router and the authentication middleware from the auth route file
const { router: authRoutes, authenticateToken } = require('./routes/auth');
const avatarmessagesRoutes = require('./routes/avatarmessages');
const conversationsRoutes = require('./routes/conversations');

app.use('/api/auth', authRoutes);                     // Mount authentication routes under /api/auth
app.use('/api/users', require('./routes/users'));     // Mount user-related routes under /api/users
app.use('/api/videos', require('./routes/videos'));   // Mount video routes under /api/videos
app.use('/api/listings', require('./routes/listings')); // Mount listing routes under /api/listings
app.use('/api/funding-requests', require('./routes/fundingRequests')); // Mount funding request routes under /api/funding-requests
app.use('/api/investments', require('./routes/investments')); // Mount investment routes under /api/investments
app.use('/api/purchases', require('./routes/purchases')); // Mount purchase routes under /api/purchases
app.use('/api/transactions', require('./routes/transactions')); // Mount transaction routes under /api/transactions
app.use('/api/messaging', require('./routes/messaging')); // Mount messaging routes under /api/messaging
app.use('/api/notifications', require('./routes/notifications')); // Mount notification routes under /api/notifications
app.use('/api/ai', require('./routes/ai'));           // Mount AI proxy routes under /api/ai
app.use('/api/avatarmessages', avatarmessagesRoutes);
app.use('/api/conversations', conversationsRoutes);


// Basic test route for the root path
app.get('/', (req, res) => {
    res.send('PestiVid Backend API is running!');
});


// Optional: Serve the frontend index.html for any route not matched by the API routes above.
// This is useful if you are serving your frontend build files from the backend server.
// Make sure this comes after all your API routes.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html')); // Adjust path as needed
// });


// --- Error Handling Middleware ---

// Catch 404 errors (requests that didn't match any route) and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err); // Pass the error to the next middleware (which will be one of the error handlers below)
});

// General Error Handler Middleware
// This middleware catches errors passed via next(err) or thrown in synchronous code.
// It sends a JSON response with the error details.

// Development error handler (will print stacktrace for debugging)
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
        console.error("Development Error:", err.stack); // Log the error stack in development
        res.status(err.status || 500); // Set status code from error, or default to 500
        res.json({
            message: err.message, // Send error message
            error: err // Send the error object itself (includes stack in dev)
        });
    });
}

// Production error handler (should not leak sensitive error details to the user)
app.use((err, req, res, next) => {
    console.error("Production Error:", err.message); // Log message in production
    res.status(err.status || 500); // Set status code
    res.json({
        message: err.message, // Send only the message in production
        error: {} // Send an empty error object or exclude it
    });
});


// --- Server Start ---

// Start the Express server and make it listen for incoming connections on the specified PORT.
// The PORT is read from the .env file, defaulting to 3000 if not set.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Mask a portion of the MongoDB URI in the console log for basic security
    const maskedUri = process.env.MONGODB_URI.substring(0, process.env.MONGODB_URI.indexOf('@') > -1 ? process.env.MONGODB_URI.indexOf('@') + 1 : 30);
    console.log(`Attempting to connect to MongoDB at: ${maskedUri}...`);
});

// Note: The authenticateToken middleware is defined in auth.js and exported from there.
// It is then required and used in this server.js file, and subsequently in other route files
// where it's imported from auth.js.