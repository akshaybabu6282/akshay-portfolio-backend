import { catchAsyncErrors } from '../middlewares/catchAsyncErrors.js';
import ErrorHandler from '../middlewares/error.js';
import { User } from '../models/userSchema.js';
import { v2 as cloudinary } from 'cloudinary';
import { generateToken } from '../utils/jwtTokens.js';
import { sendEmail } from '../utils/sendEmail.js';
import crypto from 'crypto'

export const register = catchAsyncErrors(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandler("Avatar And Resume Required!", 400))
    }
    const { avatar, resume } = req.files;

    const cloudinaryResponseForAvatar = await cloudinary.uploader.upload(avatar.tempFilePath,
        { folder: "AVATARS" }
    );
    if (!cloudinaryResponseForAvatar || cloudinaryResponseForAvatar.error) {
        console.error(
            "Cloudinary Error:",
            cloudinaryResponseForAvatar.error || "Unknow Cloudinary Error");
    };

    const cloudinaryResponseForResume = await cloudinary.uploader.upload(resume.tempFilePath,
        { folder: "MY_RESUME" }
    );
    if (!cloudinaryResponseForResume || cloudinaryResponseForResume.error) {
        console.error(
            "Cloudinary Error:",
            cloudinaryResponseForResume.error || "Unknow Cloudinary Error");
    };

    const {
        fullName,
        email,
        phone,
        aboutMe,
        password,
        portfolioURL,
        githubURL,
        instagramURL,
        twitterURL,
        linkedInURL,
    } = req.body;
    const user = await User.create({
        fullName,
        email,
        phone,
        aboutMe,
        password,
        portfolioURL,
        githubURL,
        instagramURL,
        twitterURL,
        linkedInURL,
        avatar: {
            public_id: cloudinaryResponseForAvatar.public_id,
            url: cloudinaryResponseForAvatar.secure_url,
        },
        resume: {
            public_id: cloudinaryResponseForResume.public_id,
            url: cloudinaryResponseForResume.secure_url,
        },
    });
    generateToken(user, "User Registered!", 201,)


});

export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body
    if (!email || !password) {
        return next(new ErrorHandler("Email And Password Are Required"))
    }
    const user = await User.findOne({ email }).select("password");
    if (!user.password) {
        return next(new ErrorHandler("User password not found in the database"));
    }
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Email Or Password"))
    }
    generateToken(user, "Logged In", 200, res);
})

export const logout = catchAsyncErrors(async (req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite:"None",
        secure:true
    }).json({
        success: true,
        message: "Logged Out"
    });
});

export const getUser = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        user,
    })
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserdata = {
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
        aboutMe: req.body.aboutMe,
        portfolioURL: req.body.portfolioURL,
        githubURL: req.body.githubURL,
        instagramURL: req.body.instagramURL,
        twitterURL: req.body.twitterURL,
        linkedInURL: req.body.linkedInURL,
    }
    if (req.files && req.files.avatar) {
        const avatar = req.files.avatar
        const user = await User.findById(req.user.id);
        const profileImageId = user.avatar.public_id
        await cloudinary.uploader.destroy(profileImageId);
        const cloudinaryResponse = await cloudinary.uploader.upload(
            avatar.tempFilePath,
            { folder: "AVATARS" }
        )
        newUserdata.avatar = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
        }
    }

    if (req.files && req.files.resume) {
        const resume = req.files.resume
        const user = await User.findById(req.user.id);
        const resumeId = user.resume.public_id
        await cloudinary.uploader.destroy(resumeId);
        const cloudinaryResponse = await cloudinary.uploader.upload(
            resume.tempFilePath,
            { folder: "MY_RESUME" }
        )
        newUserdata.resume = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
        }
    }
    const user = await User.findByIdAndUpdate(req.user.id, newUserdata, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    })
    res.status(200).json({
        success: true,
        message: "Profile Updated!",
        user,
    })
});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please Fill All Fields", 400))
    }
    const user = await User.findById(req.user.id).select("+password");
    const isPasswordMatch = await user.comparePassword(currentPassword)
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Incorrect Current Password", 400))
    }
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New Password And Confirm New Password Do Not Match", 400))
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password Updated"
    })
})

export const getUserForPortfolio = catchAsyncErrors(async (req, res, next) => {
    const id = "6797723bdb457fb39fa24cb1";
    const user = await User.findById(id);
    res.status(200).json({
        success: true,
        user,
    })
})

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false })
    const resetPasswordUrl = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
    const message = `Your Reset Password Token Is :- \n\n ${resetPasswordUrl} \n\n If You'r Not Request For This Pleaase Ignore It.`

    try {
        await sendEmail({
            email: user.email,
            subject: "Personal Portfolio Dashboard Recovery Password",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully!`,
        })
    } catch (error) {
        user.resetPasswordExpire = undefined;
        user.resetPasswordToken = undefined;
        await user.save();
        return next(new ErrorHandler(error.message, 500));
    }
})

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken, 
        resetPasswordExpire: { $gt: Date.now() },
    });
    
    if (!user) {
        return next(new ErrorHandler("Reset Password Token Is Invalid Or Has Been Expired "))
    };
    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password & Confirm Password Do Not Match."));
    }
    
    user.password = req.body.password;
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save();
    generateToken(user, "Reset Password Successfully!", 200, res)
});