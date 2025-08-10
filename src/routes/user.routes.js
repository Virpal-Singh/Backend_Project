import { Router } from "express";
import { logoutUser,
         registerUser,
         loginUser,
         refreshAccessToken,
         changeCurrentPassword,
         getCurrentUser,
         updateUserProfile,
         updateAvatar, 
         updateCoverImage, 
         getUserChannelProfile, 
         getUserWatchHistory } from "../controllers/user.controller.js";
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
userRouter.route('/refresh-token').post(refreshAccessToken)

userRouter.route('/change-password').post(verifyJwt,changeCurrentPassword)
userRouter.route('/current-user').get(verifyJwt,getCurrentUser)
userRouter.route('/update-profile').patch(verifyJwt,updateUserProfile)

userRouter.route('/update-avatar').patch(verifyJwt,upload.single("avatar"),updateAvatar)

userRouter.route('/update-coverimage').patch(verifyJwt,upload.single("coverImage"),updateCoverImage)
userRouter.route('/get-user-profile/:username').get(verifyJwt,getUserChannelProfile)
userRouter.route('/watch-history').get(verifyJwt,getUserWatchHistory)


export default userRouter