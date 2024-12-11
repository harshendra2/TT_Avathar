require("dotenv").config();
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const secret = process.env.JWT_SECRET || "default";
const generateToken = (username, id) => {
  const token = jwt.sign(
    {
      username,
      userId: id
    },
    secret,
    { expiresIn: "24h" }
  );
  return token;
}; 

  
module.exports = {
  generateToken
};
