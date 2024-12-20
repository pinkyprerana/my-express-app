const jwt = require('jsonwebtoken');


const generateToken = (userId) => {
  return jwt.sign({ userId }, 'your_secret_key', { expiresIn: '1h' });
};

module.exports = generateToken; 
