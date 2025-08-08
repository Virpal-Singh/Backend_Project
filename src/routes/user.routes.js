import { Router } from "express";
import { logoutUser, registerUser,loginUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUserProfile } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; 
import { verifyJwt } from "../middlewares/auth.middleware.js";
const userRouter=Router()

userRouter.route('/register').post(
    upload.fields([
        {
            name:'avatar',
            maxCount:1
        },
        {
            name:'coverImage',
            maxCount:1
        }
    ]),
    registerUser)

userRouter.route('/login').post(loginUser)

//secure routes
userRouter.route('/logout').post(
    verifyJwt,logoutUser
)
userRouter.route('/refresh').post(refreshAccessToken)

userRouter.route('/password').post(verifyJwt,changeCurrentPassword)
userRouter.route('/current').post(verifyJwt,getCurrentUser)
userRouter.route('/update').post(verifyJwt,updateUserProfile)






export default userRouter