const Admin = require("../models/Technicien");
const User = require("../models/User");
const bcrypt = require("bcrypt");

module.exports = {
  createadmin: async (req, res) => {
    const { name, email, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }
    try {
      const user = await User.findOne({ email: email });
      if (user) throw Error("User already exists");

      const salt = await bcrypt.genSalt(10);
      if (!salt) throw Error("Something went wrong with bcrypt");

      const hash = await bcrypt.hash(password, salt);
      if (!hash) throw Error("Something went wrong hashing the password");

      const newUser = new Admin({
        name,
        email,
        password: hash,
      });

      const savedUser = await newUser.save();
      if (!savedUser) throw Error("Something went wrong saving the user");

      res.status(200).json({
        message: "user successfuly registred",
        user: savedUser,
      });

    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
};
