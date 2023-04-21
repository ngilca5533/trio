const mongoose = require('mongoose');
const Schema = mongoose.Schema;




const postSchema = new mongoose.Schema({
    "user_name": String,
    "category_name": String,
    "comments": [{"comment": String,
        "date": Date,
        "user_name": String}],
    "title": String,
    "description": String
    
});


module.exports = mongoose.model('posts', postSchema);



//Post = mongoose.model('post', postSchema);

//var testPost = 