const fs = require('fs');
require('dotenv').config();
const mongoose = require("mongoose");
mongoose.connect(process.env.dbConn, { useNewUrlParser: true, useUnifiedTopology: true });

const UserModel = require("../models/userModel");
const IndustryModel = require("../models/jobIndustryModel");
const PostModel = require("../models/postModel");

module.exports.getPostsByIndustry = function(ind){
    return new Promise((resolve, reject) => {
        PostModel.find({category_name:ind})
        .lean()
        .exec()
        .then((posts) => {
            console.log("Posts Obtained")
            resolve(posts)
        }).catch((err) => {
            console.log("No posts Obtained")
            reject(err);
        })

    })
}

module.exports.getPost = function (postId) {
    console.log("getPost called for postId:", postId);
    return new Promise((resolve, reject) => {
        PostModel.find({ _id: postId })
            .lean()
            .exec()
            .then((post) => {
                resolve(post);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

module.exports.deletePost = function(postId) {
    return new Promise((resolve, reject) => {
        PostModel.findByIdAndDelete(postId)
        .exec()
        .then(() => {
            console.log("Post Deleted");
            resolve();
        }).catch((err) => {
            console.log("Failed to Delete Post");
            reject(err);
        });
    });
}
