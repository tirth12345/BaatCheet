# Authentication System Documentation

## Overview
A complete authentication system with user registration, login, profile management, and dashboard functionality.

## Features Implemented

### 1. Authentication
- **Login/Signup Modal**: Clean modal interface for user authentication
- **Form Validation**: Email validation, password requirements (min 6 characters)
- **Session Management**: Uses localStorage to persist user sessions

### 2. Profile Management
- **Profile Picture Upload**: Click to upload or change profile picture (max 5MB)
- **Editable Fields**:
  - Username
  - Email
  - Phone number
- **Real-time Preview**: See profile picture changes before saving

### 3. User Dashboard
- **Profile Information Section**: View and edit user details
- **Discussions & Comments History**: View all comments/discussions made on news articles
- **Delete Comments**: Users can delete their own comments
- **Navigation**: Quick links to view original news articles

### 4. Navbar Integration
- **Profile Dropdown**:
  - **Not Logged In**: Shows Login/Signup options
  - **Logged In**: Shows user profile with username, email, and Dashboard link
- **Profile Picture Display**: Shows user's profile picture in navbar when logged in

## Data Storage (Current Implementation)

All data is currently stored in **text files** for easy development:

### Backend Files
- `/backend/data/users.txt` - Stores user accounts (one JSON object per line)
- `/backend/data/comments.txt` - Stores user comments/discussions
- `/backend/uploads/` - Stores uploaded profile pictures

### User Data Format (users.txt)
```json
{"id":"1738178234567","username":"johndoe","email":"john@example.com","password":"123456","phone":"+1234567890","profilePicture":"/uploads/1738178234567-123456789.jpg","createdAt":"2026-01-29T10:30:34.567Z"}
```

### Comment Data Format (comments.txt)
```json
{"id":1738178345678,"userId":"1738178234567","newsId":5,"newsTitle":"Breaking News Title","comment":"Great article!","timestamp":"1/29/2026, 10:32:25 AM"}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `PUT /api/auth/update-profile` - Update user profile (supports file upload)

### User Data
- `GET /api/user/comments/:userId` - Get all comments by user
- `POST /api/user/comments` - Add new comment
- `DELETE /api/user/comments/:commentId` - Delete comment

## Security Notes

⚠️ **Important**: This is a development implementation using text files.

### Current State
- Passwords are stored in **plain text**
- No encryption or hashing
- No JWT tokens
- Basic authentication

### Before Production
When migrating to a database, implement:
1. **Password Hashing**: Use bcrypt or similar
2. **JWT Tokens**: For secure session management
3. **Input Sanitization**: Prevent injection attacks
4. **HTTPS**: Encrypt data in transit
5. **Database**: Replace text files with MongoDB/PostgreSQL/MySQL

## Migration to Database

The current text file structure makes it easy to migrate to a database:

### Suggested Schema (MongoDB Example)

```javascript
// Users Collection
{
  _id: ObjectId,
  username: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  profilePicture: String,
  createdAt: Date
}

// Comments Collection
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  newsId: Number,
  newsTitle: String,
  comment: String,
  timestamp: Date
}
```

## Usage Instructions

### 1. Start the Backend
```bash
cd backend
npm install  # If not already done
npm start
```

### 2. Start the Frontend
```bash
cd frontend/Terminal
npm install  # If not already done
npm run dev
```

### 3. Using the System

#### Sign Up
1. Click profile button in navbar
2. Select "Sign Up"
3. Fill in username, email, password (optional: phone)
4. Click "Sign Up"

#### Login
1. Click profile button in navbar
2. Select "Login"
3. Enter email and password
4. Click "Login"

#### Access Dashboard
1. After logging in, click profile button
2. Click "Dashboard"

#### Update Profile
1. Go to Dashboard
2. Click "Edit Profile"
3. Update information
4. Click profile picture to upload new photo
5. Click "Save Changes"

#### View/Delete Comments
1. Go to Dashboard
2. Scroll to "My Discussions & Comments"
3. Click trash icon to delete
4. Click "View News" to go to the article

## Files Created

### Frontend
- `/frontend/Terminal/src/context/AuthContext.tsx` - Authentication state management
- `/frontend/Terminal/src/Components/AuthModal.tsx` - Login/Signup modal
- `/frontend/Terminal/src/Components/AuthModal.css` - Modal styling
- `/frontend/Terminal/src/pages/Dashboard.tsx` - User dashboard
- `/frontend/Terminal/src/pages/Dashboard.css` - Dashboard styling
- `/frontend/Terminal/src/Components/Navbar.tsx` - Updated with profile dropdown
- `/frontend/Terminal/src/Components/Navbar.css` - Updated with dropdown styles
- `/frontend/Terminal/src/App.tsx` - Updated with AuthProvider and routes

### Backend
- `/backend/server.js` - Updated with auth endpoints
- `/backend/package.json` - Added multer dependency
- `/backend/data/` - Directory for text file storage
- `/backend/uploads/` - Directory for profile pictures

## Future Enhancements

### Recommended Next Steps
1. **Database Integration**: Migrate to MongoDB/PostgreSQL
2. **Password Security**: Implement bcrypt hashing
3. **JWT Authentication**: Add token-based auth
4. **Email Verification**: Send verification emails
5. **Password Reset**: Forgot password functionality
6. **Two-Factor Authentication**: Enhanced security
7. **Social Login**: Google/Facebook/GitHub OAuth
8. **Comment Editing**: Allow users to edit comments
9. **Real-time Updates**: WebSocket for live comment updates
10. **Admin Panel**: Moderate users and comments

## Notes
- All user data persists in text files until server restart
- Profile pictures are stored in `/backend/uploads/`
- Frontend caches user data in localStorage
- Clear localStorage to logout manually if needed
