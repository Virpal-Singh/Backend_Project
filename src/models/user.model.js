import mongoose, { mongo }  from "mongoose";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { PASSWORD_BCRYPT_ROUNDS } from "../costants.js";

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowecase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowecase:true,
        trim:true
    },
    password:{
        type:String,
        required:true
    },
    fullName:{
        type:String,
        required:true,
        trim:true
    },
    avatar:{
        type:String, //cloudinary url
        required:true
    },
    coverImage:{
        type:String //cloudinary url
    },
    watchHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Video'
    }],
    refreshToken:{
        type:String
    }

},{timestamps:true})

//make pre funcion that encrypt password while registerd and update
userSchema.pre('save', async function(next){
    if(!this.isModified("password")) return next()
    this.password= await bcrypt.hash(this.password,PASSWORD_BCRYPT_ROUNDS)
    next()
})

//add method for user to cheak password
userSchema.methods.isPasswordCorrect= async function(password) {
    return await bcrypt.compare(password,this.password)
}

//add method for user to generateaccesstoken
userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY || '1d'
        }
    )
}

//add method for user to generatereffreshtoken
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY || '7d'
        }
    )
}

export const User=mongoose.model('User',userSchema)