const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, "backend-pfe-main", "backend-pfe-main", ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pfe"; // Fallback if .env not found

const UserSchema = new mongoose.Schema({
    role: String
});

const User = mongoose.model("User", UserSchema);

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected.");

        const result = await User.updateMany({ role: "CLIENT" }, { $set: { role: "VISITEUR" } });
        console.log(`Migration successful. Updated ${result.nModified || result.modifiedCount} users.`);

        await mongoose.connection.close();
        console.log("Connection closed.");
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
