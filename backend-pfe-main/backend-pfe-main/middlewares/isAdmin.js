const jwt = require("jsonwebtoken");
const User = require("../models/User");

//to check if the user with the provided jwt token has admin role

function isAdmin(req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) {
    return res
      .status(401)
      .json({ msg: "No token, authorization denied", message: "No token, authorization denied" });
  }

  const checkAdminByUserId = (userId) => {
    User.findById({ _id: userId }, (err, user) => {
      if (err || !user) {
        return res.status(401).json({ msg: "user is not exist", message: "user is not exist" });
      }

      if (user.role === "ADMIN") return next();

      return res.status(403).json({ msg: "you are not admin !", message: "you are not admin !" });
    });
  };

  // Preferred path: use decoded user set by `isauth` middleware.
  if (req.user?.id) {
    return checkAdminByUserId(req.user.id);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return checkAdminByUserId(decoded.id);
  } catch (e) {
    return res.status(401).json({ msg: e.message, message: e.message });
  }
}

module.exports = isAdmin;
