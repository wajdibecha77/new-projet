const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String ,
        required : true
    },
    role : {
        type : String,
        required : true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    loginOtp: {
        type: String,
        required: false
    },
    loginOtpExpires: {
        type: Date,
        required: false
    },
    service :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    passwordResetOtp: {
        type: String,
        required: false
    },
    passwordResetOtpExpiresAt: {
        type: Date,
        required: false
    },
    passwordResetToken: {
        type: String,
        required: false
    },
    passwordResetTokenExpiresAt: {
        type: Date,
        required: false
    }
});

module.exports = mongoose.model("User", UserSchema);
