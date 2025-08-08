import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'


export const verifyJwt = asyncHandler( async(req,res,next)=>{

    try {
        const Token= req.cookies?.accessToken || req.header("Authorization")?.replace('Bearer ','')
        if(!Token){
            throw new ApiError(401, 'unathorized request')
        }
        const data= await jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)
    
        const user= await User.findById(data?._id).select('-password -refreshToken')
    
        if(!user){
            throw new ApiError(401,'wrong jwt')
        }
        req.user=user
        next()
    } catch (error) {
        throw new ApiError(500,error?.message || 'invalid Token')
    }
})