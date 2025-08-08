import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { User } from "../models/user.model.js";
import { emailRegex } from "../costants.js";
import {uploadOnCloudinary,deletOnCloudinary} from "../utils/cloudinary.js"
import jwt from 'jsonwebtoken'
import { use } from "bcrypt/promises.js";



//genarate a tokens for user
const genarateRefreshToken_genarateAccessToken=async(userid)=>{

    try {
        const user=await User.findById(userid)
        console.log('user fetched in ling function')
        const accessToken=await user.generateAccessToken()
        console.log('accessToken done')
        const refreshToken=await user.generateRefreshToken()
        console.log('refreshToken done')
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        console.log('user saved with refreshtoken',user)
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,'Something went wrong while genrating usertokens')
    }
    
}




//register User
const registerUser=asyncHandler(async(req,res)=>{
    const {username,password, email,fullName}=req.body;

    //cheak all fields have data
    if([username,password,email,fullName].some((field)=>(
                field?.trim()===''))
        ){
            throw new ApiError(400,'All fields are required..')
        }
    
    //cheak if the email is in right format
    if(!emailRegex.test(email)){
        throw new ApiError(400,'Email is not valid...')
    }

    //cheak if the given username or email alredy exist in database
    const exitedUser= await User.findOne({
        $or:[{username},{email}]
    })
    if(exitedUser){
        throw new ApiError(409,'User already exist with this email or username...')
    }

    //take file from loacal temp storage
    let coverImageLocalpath
    let avatarLocalpath
    
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
         coverImageLocalpath=req.files.coverImage[0].path
    }
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
         avatarLocalpath= req.files.avatar[0].path;
    }
    

    //cheak is avatar is avaiable
    if(!avatarLocalpath){
        throw new ApiError(400,'Avatar is required...')
    }

    let coverImageCloud
    //send files to the cloudinary
    const avatarCloud=await uploadOnCloudinary(avatarLocalpath)
    if(coverImageLocalpath){
        coverImageCloud=await uploadOnCloudinary(coverImageLocalpath)
    }
 

    //cheak if avatar is successfully return 
    if(!avatarCloud){
        throw new ApiError(400,'Avatar is not get from cloudinary...')
    }

    //create user
   const user= await User.create({
        fullName,
        avatar:avatarCloud.url,
        coverImage:coverImageCloud?.url || '',
        username:username.toLowerCase(),
        email,
        password
    })

    //see if user succesfullly registred and remove the conffeditial data from user
    const createdUser=await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,'server error...')
    }

    //return responce
    return res.status(201).json(
        new ApiResponce(201,'User registered',createdUser)
    )
})


//login User
const loginUser=asyncHandler(async(req,res)=>{

    //take data from frontend
    const {username,email,password}=req.body;

    if(!(username || email) || !password){
        throw new ApiError(400,'Username and password are required...')
    }
    console.log('try to login with :')
    console.log('email ',email)
    console.log('username ',username)
    console.log('password ',password)
    //cheak is user is registerd
    const user=await User.findOne({
        $or:[{email},{username}]
    })
    
    if(!user){
        throw new ApiError(404,'User Not Found')
    }


    //cheak is password is correct
    const ispasswordValid=await user.isPasswordCorrect(password)
    if(!ispasswordValid){
        throw new ApiError(401,'Password is not correct...')
    }
    
    //genrate token for user
    const {accessToken,refreshToken}=await genarateRefreshToken_genarateAccessToken(user._id)

    //return user
    const loggedInUser=await User.findById(user._id).select('-password -refreshToken')

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponce(200,"Login Successfull",{user:loggedInUser,accessToken,refreshToken})
        )

})



//logout user
const logoutUser=asyncHandler(async(req,res)=>{
    
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {new:true}
    )
     const options={
        httpOnly:true,
        secure:true
    }
    return res.status(400)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponce(200,{},'user LoggedOut'))
     
})


//refresh access token
const refreshAccessToken=asyncHandler(async(req,res)=>{
    //take refreshToken from request
    const incomingRefreshToken=req.cookies?.refreshToken || req.body?.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,'no incoming refreshToken')
    }
   
   try {

     //decode data from it
    const data= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
     //use id to fetch the user
     const user=await User.findById(data?._id)
 
     if(!user){
         throw new ApiError(401,'invalid refreshToken')
     }
 
     //cheak if the user have same refreshToken or not
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,'refreshToken dosent match')
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
     const {newAccessToken,newRefreshToken}=await genarateRefreshToken_genarateAccessToken(user._id)
 
     return res.status(401)
         .cookie("accessToken",newAccessToken,options)
         .cookie("refreshToken",newRefreshToken,options)
         .json(new ApiResponce(401,'Token refresh successfully',{
             user,
             accessToken:newAccessToken,
             refreshToken:newRefreshToken
         }))
   } catch (error) {
        throw new ApiError(500,error?.message||'Invalid refreshToken')
   }
})



//change Password
const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    if(!oldPassword || !newPassword){
        throw new ApiError(401,'Both field are required (passwords)')
    }
  
    const user= await User.findById(req.user?._id)
   
    if(!user){
        throw new ApiError(401, "loggedIn first to change password")
    }
    const ispasswordValid= await user.isPasswordCorrect(oldPassword)

    if(!ispasswordValid){
        throw new ApiError(401,"password should correct")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200).json(new ApiResponce(200,'password change successfully...',{}))
})


//get current user
const getCurrentUser=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user?._id).select('-password -refreshToken')
    if(!user){
        throw new ApiError(404,'User not found')
    }
    return res.status(200).json(new ApiResponce(200,'Current user fetched successfully',user))
})


// update user avatar
const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalpath=req.file?.path
    if(!path){
        throw new ApiError(400,'path not found')
    }
    
    //upload avatar to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocalpath)
    if(!avatar.url){
        throw new ApiError(500,'Error while uploding on cloudinary')
    }
    //delete old avatar from cloudinary
    const oldAvatar=req.user?.avatar
    if(oldAvatar){
        await deletOnCloudinary(oldAvatar)
    }
    const user=User.findOneAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
    },
        {new:true}
    ).select('-password -refreshToken')

    return res.status(200).json(new ApiResponce(200,'avatar changed',user))
})

//update user coverImage
const updateCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalpath=req.file?.path
    if(!coverImageLocalpath){
        throw new ApiError(400,'coverImage not found')
    }
    //upload coverImage to cloudinary
    const coverImage=await uploadOnCloudinary(coverImageLocalpath)
    if(!coverImage.url){
        throw new ApiError(400,'error while uploading coverImage on cloudinary')
    }
    //delete old coverImage from cloudinary
    const oldCoverImage=req.user?.coverImage
    if(oldCoverImage){
        await deletOnCloudinary(oldCoverImage)
    }

    const user=await User.findOneAndUpdate(req.user?._id,{
        $set:{coverImage:coverImage.url}
    },{new:true}).select('-password -refreshToken')

    return res.status(200).json(new ApiResponce(200,'coverImage changed',user))
})


// update user profile
const updateUserProfile=asyncHandler(async(req,res)=>{

    const {fullName,username,email}=req.body
    if(!fullName || !username || !email){
        throw new ApiError(400,'All fields are required')
    }

    const user=await User.findOneAndUpdate(req.user?._id,{
        fullName,
        username:username.toLowerCase(),
        email
    },{
        new:true,
    }).select('-password -refreshToken')

    return res.status(200).json(new ApiResponce(200,'User profile updated successfully',user))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAvatar,
    updateCoverImage,
    updateUserProfile,
    getCurrentUser}