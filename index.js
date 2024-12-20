const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); 
const multer = require('multer');
const User = require('./models/model'); 
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();
const generateToken = require('./generateToken'); 
const nodemailer = require('nodemailer');
const session = require('express-session') 

const connectDB = require('./db');

connectDB();
const app = express();
app.use(bodyParser.json());

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'view'));
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));



// POST Login credentials
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, existingUser.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(existingUser._id);
    req.session.user = existingUser;
    res.json({ message: 'User logged in successfully', token });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//POST Logout
// app.post('/logout', function(req, res){
//   req.session.destroy(function(){
//      console.log("user logged out.")
//   });
//   res.redirect('/login');
// });

// app.use('/protected_page', function(err, req, res, next){
// console.log(err);
//   res.redirect('/login');
// });
app.post('/logout', function(req, res){
  req.session.destroy(function(err) {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'User logged out successfully' });
  });
});



// POST Create User
app.post('/users', async (req, res) => {
  try {
    const { name, email , password} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword }); 
    await newUser.save();

    res.json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});



//GET all User
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});
  
  
//PUT Update User
app.get('/users/:id', async (req, res) => {
  const { id } = req.params; // Get ID from URL parameter

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body; 

  try {
    const updatedUser = await User.findByIdAndUpdate(id, { name, email }, { new: true }); 
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' }); 
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    // Handle potential validation errors (e.g., email uniqueness)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});


  

//DEL User
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' }); 
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

///POST images and videos
const upload = multer({
  dest: 'uploads/', // Folder to store uploaded files
});
app.use(cors()); 
app.post('/upload', upload.single('file'),(req, res)=>{
  const uploadedFile= req.file;
  if(!uploadedFile){
    return res.status(400).json({message: "No file uploaded"});
  }
  console.log(`File uploaded: ${uploadedFile.originalname}`);
  console.log(`File path: ${uploadedFile.path}`);

  res.json({ message: 'File uploaded successfully!' });
});


// Nodemailer configuration for forgot password API
const transporter = nodemailer.createTransport({
  service: 'gmail', // Gmail, Yahoo, Yopmail etc.
  auth: {
     user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_APP_PASSWORD,
    },
});

// Forgot Password API endpoint
app.post('/forgot-password', async (req, res) => {
  console.log('Request Body:', req.body);
  const { email } = req.body;
  console.log('Email:', email);

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a random 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = Date.now() + 3600000; // OTP expires in 1 hour

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'Forgot Password OTP',
      text: `Your OTP for resetting password is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      console.log('info:', mailOptions);
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Failed to send OTP via email' });
      }
      console.log('Email sent:', info.response);
      res.json({ message: 'OTP sent successfully' });
    });
  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//OTP verification API
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
   console.log(req.body);
   
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or email' });
    }
    console.log('Stored OTP:', user.otp);
    console.log('Provided OTP:', otp);

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Change Password API endpoint
app.post('/change-password', async (req, res) => {
  const { newPassword, confirmPassword, email } = req.body;

  if (!newPassword || !confirmPassword || !email) {
    return res.status(400).json({ message: 'Email, new password, and confirm password are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and confirm password do not match' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});





app.get('/', (req, res) => {
    res.render('form'); 
  });

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });