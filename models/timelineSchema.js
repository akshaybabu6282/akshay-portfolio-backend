import mongoose from "mongoose";

const timelineScheema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title Required!"]
    },
    description: {
        type: String,
        required: [true, "Description Required!"]
    },
    timeline: {
        from: String,
        to: String,
    }
});

export const Timeline = mongoose.model("Timeline", timelineScheema);