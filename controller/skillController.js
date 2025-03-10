import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Skill } from "../models/skillSchema.js";
import { v2 as cloudinary } from 'cloudinary';

export const addNewSkill = catchAsyncErrors(async (req, res, next) => {

    if (!req.files || !req.files.svg) {
        return next(new ErrorHandler("Skills SVG is required", 400));
    }

    const { svg } = req.files;
    const { title, proficiency } = req.body;

    if (!title || !proficiency) {
        return next(new ErrorHandler("Please fill the full form!", 400));
    }

    let cloudinaryResponse;
    try {
        cloudinaryResponse = await cloudinary.uploader.upload(svg.tempFilePath || svg.data, {
            folder: "PORTFOLIO_SKILLS_SVGS",
            resource_type: "image",
        });
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return next(new ErrorHandler("Failed to upload image to Cloudinary", 500));
    }

    const skill = await Skill.create({
        title,
        proficiency,
        svg: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        },
    });

    res.status(201).json({
        success: true,
        message: "New Skill Added Successfully",
        skill,
    });
});



export const deleteSkill = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const skill = await Skill.findById(id);
    if (!skill) {
        return next(new ErrorHandler("Skills Not Found", 404));
    }
    const skillSvgId = skill.svg.public_id;
    await cloudinary.uploader.destroy(skillSvgId);
    await skill.deleteOne();
    res.status(200).json({
        success: true,
        message: "Skill Deleted!",
    });
});

export const updateSkill = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    let skill = await Skill.findById(id); 

    if (!skill) {
        return next(new ErrorHandler("Skill Not Found", 404));
    }

    const { proficiency } = req.body;

    skill = await Skill.findByIdAndUpdate(id, { proficiency }, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        success: true,
        message: "Skill Updated Successfully",
        skill
    });
});


export const getallSkill = catchAsyncErrors(async (req, res, next) => {
    const skills = await Skill.find();
        res.status(200).json({
            success: true,
            skills
        })
 });