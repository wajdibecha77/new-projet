const jwt = require("jsonwebtoken");

function isauth(req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({
      msg: "Aucun token, autorisation refusée",
      message: "Aucun token, autorisation refusée",
    });
  }

  try {
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    console.log("Utilisateur décodé depuis le token :", decoded);

    next();
  } catch (e) {
    return res.status(401).json({
      msg: "Token invalide ou expiré",
      message: "Token invalide ou expiré",
    });
  }
}

module.exports = isauth;