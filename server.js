
//#region Server Setup
var tool = require("./module/tools.js")
var postTool = require("./module/postsTool.js")
var express = require("express");
var app = express();
const expressHbs = require("express-handlebars");
var HTTP_PORT = process.env.PORT || 8080;
require('dotenv').config();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("views"));
app.use(express.static("public"));



const { engine } = require("express-handlebars");
app.use(async (req, res, next) => {
    try {
        const industries = await JobIndustryModel.find().lean();
        res.locals.industries = industries;
        next();
    } catch (error) {
        console.error("Error fetching industries for navbar:", error);
        res.locals.industries = [];
        next();
    }
});

const hbs = expressHbs.create({
    extname: ".hbs",
    layoutsDir: "views/layouts/",
    helpers: {
        eq: function (a, b) {
            return a === b;
        },
        or: function (a, b) {
            return a || b;
        },
    },
});

app.engine("hbs", hbs.engine);

app.set('view engine', '.hbs');


var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

const clientSession = require("client-sessions");
app.use(clientSession({
    cookieName: "Cap805Session",
    secret: "cap805_week8_mongodbDemo",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60
}));

// Mongoose
const mongoose = require("mongoose");
mongoose.connect(process.env.dbConn, { useNewUrlParser: true, useUnifiedTopology: true });

const UserModel = require("./models/userModel");
const JobIndustryModel = require("./models/jobIndustryModel.js");
const PostModel = require("./models/postModel.js");



//#endregion


//#region Custom Server Functions
function OnHttpStart() {
    console.log("Express server started successfully on port: " + HTTP_PORT);
}

function ensureLogin(req, res, next) {
    if (!req.Cap805Session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

function ensureAdmin(req, res, next) {
    try {
        if (!req.Cap805Session.user.isAdmin) {
            res.render("login", { errorMsg: "You do not have permissions for the page requested!" });
        } else {
            next();
        }
    } catch (err) {
        console.log("admin variable does not exist therefore no access")
        res.render("login", { errorMsg: "You do not have permissions for the page requested!" });
    }
}


//#endregion

//#region ROUTES
app.get("/", (req, res) => {
    res.render("home", { user: req.Cap805Session.user })
});
app.get("/about", (req, res) => {
    res.render("about", { user: req.Cap805Session.user })
});
app.get("/contact", (req, res) => {
    res.render("contact", { user: req.Cap805Session.user })
});

//#region USER ROUTES
app.get("/login", (req, res) => {
    req.Cap805Session.reset();
    res.render("login", { user: req.Cap805Session.user })
});


app.get("/logout", (req, res) => {
    req.Cap805Session.reset();
    res.redirect("/")
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(password+" was entered")

    if (username === "" || password === "") {
        res.render("login", { errorMsg: "Both the login and password are required fields" });
    } else {

        //auto authentication 
        tool.loginFieldCheck(username, password).then((resolve) => { //FUNCTION FOR TESTING --------------------

            req.Cap805Session.user = {
                username: resolve.user.username,
                email: resolve.user.email,
                isAdmin: resolve.user.isAdmin,
                firstname: resolve.user.firstname,
                lastname: resolve.user.lastname,
                blacklisted: resolve.user.blacklisted,
            };

            res.redirect(resolve.nav);

        }).catch((reject) => {
            if (reject.errbol) {
                res.render("login", { errorMsg: reject.errstring });
            } else {
                console.log("Something went wrong!")
            }
        })

    }
})

//auto  register
app.get("/register", (req, res) => {
    req.Cap805Session.reset();
    res.render("register", {});
});

app.post("/register", (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    const firstname = req.body.fname;
    const lastname = req.body.lname;
    const email = req.body.email;

    var user = { username, password, firstname, lastname, email }

    if (username === "" || password === "" || firstname === "" || lastname === "" || email === "") {
        res.render("register", { errorMsg: "Cridentials are missing please fill all fields" });
    } else {
        tool.registerCred(user)
            .then(() => {
                tool.registration(user)
                    .then((resolve) => {
                        console.log(resolve);
                        res.redirect("/login");
                    })
                    .catch((reject) => {
                        console.log(reject);
                        if (reject.message === "already registered") {
                            res.render("register", {
                                errorMsg: "User is already registered!",

                            });
                        } else {
                            res.render("register", {
                                errorMsg: "Something went wrong!",

                            });
                        }
                    });
            })
            .catch((reject) => {
                res.render("register", { errorMsg: reject });
            });

    }

});


//#endregion

//#region USER Pages
//auto dashboard
app.get("/dashboard", ensureLogin, (req, res) => {
    res.render("dashboard", { user: req.Cap805Session.user })
});
//auto profile
app.get("/profile", ensureLogin, (req, res) => {
    console.log(req.Cap805Session.user)
    res.render("profile", { user: req.Cap805Session.user })
});

//auto edituser
app.get("/profile/edit", ensureLogin, (req, res) => {
    res.render("profileedit", { user: req.Cap805Session.user })
});


//auto edituser
app.post("/profile/edit", ensureLogin, (req, res) => {
    const username = req.body.username;
    const firstname = req.body.fname;
    const lastname = req.body.lname;
    const email = req.body.email;

    tool.profileEditCred(username, firstname, lastname, email).then((resolve) => { //FUNCTION FOR TESTING --------------------------------------

        tool.profileEdit(username, firstname, lastname, email).then((resolve) => {//FUNCTION FOR TESTING ---------------------------------------------
            console.log(resolve);
            req.Cap805Session.user = {
                username: username,
                email: email,
                firstname: firstname,
                lastname: lastname
            };
            res.redirect("/Profile");
        }).catch((reject) => {
            console.log(reject);
        })



    }).catch((reject) => {


        res.render("profileedit", { user: req.Cap805Session.user, errorMsg: reject });

    })
})
//#endregion

//#region ADMIN Pages
app.get("/admin/dashboard", ensureAdmin, (req, res) => {
    res.render("adminDashboard", {
        user: req.Cap805Session.user,

    })
});

app.get("/admin/users", ensureAdmin, (req, res) => {

    tool.getAllUsers().then((resolve) => { //FUNCTION FOR TESTING -------------------
        res.render("adminUserManager", {
            user: req.Cap805Session.user,
            hasUsers: !!resolve.length,
            users: resolve,

        })

    }).catch((reject) => {
        console.log(reject);
    })

})

app.get("/admin/industries", ensureAdmin, (req, res) => {

    tool.getAllIndustries().then((resolve) => {
        res.render("adminIndustryManager", {

            hasIndustries: !!resolve.length,
            industries: resolve,

        })

    }).catch((reject) => {
        console.log(reject);
    })

})

app.get("/admin/users/add", ensureAdmin, (req, res) => {
    res.render("adminUserEditor", {
        user: req.Cap805Session.user

    })
})

app.get("/admin/industries/add", ensureAdmin, (req, res) => {
    res.render("adminIndustryEditor", {
        user: req.Cap805Session.user
    })
})

app.get("/admin/users/edit", ensureAdmin, (req, res) => {
    res.render("adminUserEditor", {
        user: req.Cap805Session.user

    })
})


app.get("/admin/users/edit/:usrname", ensureAdmin, (req, res) => {
    const uname = req.params.usrname;

    tool.getUser(uname).then((resolve) => {//FUNCTION FOR TESTING -----------------------------
        res.render("adminUserEditor", {
            user: req.Cap805Session.user,
            usr: resolve,

        })
    }).catch((reject) => {
        console.log(reject);

    })

})


app.post("/admin/industries/add", ensureAdmin, (req, res) => {
    console.log("Add industry handler called");
    const industry = new JobIndustryModel({
        industry: req.body.industry,
    });

    industry.save((err) => {
        if (err) {
            console.log("An error occurred adding a new industry: " + industry.industry);
            console.log("Error details:", err); // <-- Add this line to log the error object
        } else {
            res.redirect("/admin/industries");
        }
    });
});



app.post("/admin/user/edit", ensureAdmin, (req, res) => {
    const usr = new UserModel({
        username: req.body.username,
        password: req.body.password,
        firstname: req.body.fname,
        lastname: req.body.lname,
        email: req.body.email,
        isAdmin: (req.body.isAdmin == "on"),
        blacklisted: (req.body.blacklisted == "on")
    })


    // editing
    if (req.body.edit == "1") {
        UserModel.updateOne({ username: usr.username }, {
            $set: {
                username: usr.username,
                firstname: usr.firstname,
                lastname: usr.lastname,
                email: usr.email,
                isAdmin: usr.isAdmin,
                blacklisted: usr.blacklisted
            }
        })
            .exec().then((err) => {
                if (err) console.log("An error occurred editing a user: " + usr.username);
            })
    }
    else // adding
    {
        usr.save((err) => {
            if (err) console.log("An error occurred adding a new user: " + usr.username)
        })
    }
    res.redirect("/admin/users");
})

// delete user
app.get("/admin/users/delete/:usrname", ensureAdmin, (req, res) => {
    const uname = req.params.usrname;
    UserModel.deleteOne({ username: uname })
        .then((err) => {
            if (err) console.log("An error occurred deleting user: " + uname);
            res.redirect("/admin/users");
        })
})

app.get("/admin/industries/delete/:indname", ensureAdmin, (req, res) => {
    const iname = req.params.indname;
    JobIndustryModel.deleteOne({ industry: iname })
        .then(() => {
            res.redirect("/admin/industries");
            console.log("successful");
        })
        .catch((err) => {
            console.log("An error occurred deleting industry: " + iname);
            res.redirect("/admin/industries");
        });
});

app.get("/industry", (req, res) => {
    res.render("industry", { user: req.Cap805Session.user })
});

app.get("/industry/:ind", (req, res) => {
    //console.log(typeof(req.params.ind)+req.params.ind);
    postTool.getPostsByIndustry(req.params.ind).then((resolve) => {
        //console.log(resolve);

        res.render("industry", {
            industry: req.params.ind,
            posts: resolve,
            user: req.Cap805Session.user
        })

    }).catch((reject) => {
        console.log(reject)
    })

});

function toggleBlacklist(userId, adminUser) {
    if (adminUser.isAdmin) {
      UserModel.findById(userId, (err, user) => {
        if (err) {
          console.log('Error finding user:', err);
          return;
        }
        if (user) {
          user.blacklisted = !user.blacklisted;
          user.save((err) => {
            if (err) {
              console.log('Error updating user:', err);
              return;
            }
            console.log(
              `${user.blacklisted ? 'Blacklisted' : 'Unblacklisted'} user ${user.username}`
            );
          });
        } else {
          console.log('User not found');
        }
      });
    } else {
      console.log('You do not have permission to perform this action');
    }
  }
  
app.get("/industry/:ind/addpost", ensureLogin, (req, res) => {

    res.render("createPost", {
        industry: req.params.ind,
        user: req.Cap805Session.user
    })
});

app.post("/industry/addpost", ensureLogin, (req, res) => {

    console.log("Add post called");
    if (req.Cap805Session.user.blacklisted) {
        console.log('You are blacklisted and cannot create posts');
        return res.status(403).send("You are blacklisted and cannot create posts.");
      }
    const post = new PostModel({
        user_name: req.body.user_name,
        category_name: req.body.category_name,
        comments: [],
        title: req.body.title,
        description: req.body.description
    });
    
     
    post.save()
        .then(() => {
            res.redirect("/industry/" + req.body.category_name);
        })
        .catch(err => {
            console.log("An error occurred adding a new post: ");
            console.log("Error details:", err);
            res.status(500).send("An error occurred while adding the new post.");
        });
});
app.get("/industry/:ind/:postId([a-fA-F0-9]{24})", (req, res) => {
    try {
        let postId = req.params.postId;
        console.log("postId:", postId);
        if (!mongoose.isValidObjectId(postId)) {
            const validObjectId = mongoose.Types.ObjectId(); // Creates a new ObjectId instance
            console.log(`New valid ObjectId: ${validObjectId}`);
            postId = validObjectId; // Assigns the new valid ObjectId to postId
        }
        // Fetch the post, user, and other relevant data
        postTool.getPost(postId)
            .then((resolve) => {
                if (!resolve || !resolve[0]) {
                    console.error("No post found with ID:", postId);
                    return res.status(404).send("Post not found.");
                }

                var isPosterUser = false;
                var user = req.Cap805Session.user;
                console.log("User object:", user);
                if (user && resolve[0].user_name === user.username) {
                    isPosterUser = true;
                }

                // Modify the comments in the post object
                let modifiedComments = [];
                if (Array.isArray(resolve[0].comments)) {
                    modifiedComments = resolve[0].comments.map(comment => {
                        return {
                            ...comment,
                            isAuthor: user && comment.user_id && user._id.toString() === comment.user_id.toString()
                        };
                    });
                }

                // Check if the logged-in user is the author of any comment in the post's comments array
                let canDeleteComment = false;
                if (Array.isArray(modifiedComments)) {
                    for (let i = 0; i < modifiedComments.length; i++) {
                        if (modifiedComments[i].isAuthor) {
                            canDeleteComment = true;
                            break;
                        }
                    }
                }

                // Replace the original comments with the modified comments
                resolve[0].comments = modifiedComments;

                res.render("post", {
                    industry: req.params.ind,
                    post: resolve[0],
                    user: user,
                    isPosterUser: isPosterUser,
                    showDeleteButton: user && (user.isAdmin || isPosterUser),
                    canDeleteComment: user && (user.isAdmin || canDeleteComment)
                });

            })
            .catch((error) => {
                console.error("Error fetching post:", error);
                res.status(500).send("An error occurred while fetching the post.");
            });

    } catch (error) {
        console.error("Error in /industry/:ind/:postid route:", error);
        res.status(500).send("An error occurred while processing the request.");
    }
});




app.get("/industry/:ind/:postId/delete", ensureLogin, (req, res) => {
    const user_name = req.Cap805Session.user.username;
    const postId = req.params.postId;

    postTool.getPost(postId)
        .then((resolve) => {
            if (!resolve || !resolve[0]) {
                console.error("No post found with ID:", postId);
                return res.status(404).send("Post not found");
            }

            const post = resolve[0];

            if (req.Cap805Session.user.isAdmin || post.user_name === user_name) {
                postTool.deletePost(postId)
                    .then(() => {
                        console.log("Post deleted successfully");
                        return res.redirect(`/industry/${req.params.ind}`);
                    })
                    .catch((err) => {
                        console.error("Error deleting post:", err);
                        return res.status(500).send("Internal Server Error");
                    });
            } else {
                console.error("User is not authorized to delete this post");
                return res.status(401).send("Unauthorized");
            }
        })
        .catch((err) => {
            console.error("Error getting post:", err);
            return res.status(500).send("Internal Server Error");
        });
});


app.post("/add-comment/:postId", ensureLogin, (req, res) => {
    const user_name = req.Cap805Session.user.username;
    const comment = req.body.comment;
    const date = new Date();
    if (req.Cap805Session.user.blacklisted) {
        console.log('You are blacklisted and cannot add comments');
        return res.status(403).send("You are blacklisted and cannot add comments.");
      }
    const commentDoc = {
        user_name,
        comment,
        date,
    };

    PostModel.findByIdAndUpdate(
        req.params.postId,
        {
            $push: {
                comments: commentDoc,
            },
        },
        { new: true }
    )
        .exec()
        .then((post) => {
            res.redirect(`/industry/${req.params.industry}/${post._id}`);
        })
        .catch((err) => {
            console.error(`Error adding comment to post with ID: ${req.params.postId}`, err);
            res.status(500).send("An error occurred while adding the comment.");
        });
});

app.post("/delete-comment/:postId/:commentId", ensureLogin, (req, res) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const userName = req.Cap805Session.user.username;

    postTool.getPost(postId)
        .then((resolve) => {
            if (!resolve || !resolve[0]) {
                console.error("No post found with ID:", postId);
                return res.status(404).send("Post not found");
            }

            const post = resolve[0];
            const comment = post.comments.find((c) => c._id == commentId);

            if (!comment) {
                console.error("No comment found with ID:", commentId);
                return res.status(404).send("Comment not found");
            }

            if (req.Cap805Session.user.isAdmin || comment.user_name === userName) {
                PostModel.updateOne(
                    { _id: postId, "comments._id": commentId },
                    { $pull: { comments: { _id: commentId } } }
                )
                    .exec()
                    .then(() => {
                        console.log("Comment deleted successfully");
                        return res.redirect(`/industry/${req.params.ind}/${postId}`);
                    })
                    .catch((err) => {
                        console.error(`Error deleting comment with ID: ${commentId} from post with ID: ${postId}`, err);
                        return res.status(500).send("Internal Server Error");
                    });
            } else {
                console.error("User is not authorized to delete this comment");
                return res.status(401).send("Unauthorized");
            }
        })
        .catch((err) => {
            console.error(`Error getting post with ID: ${postId}`, err);
            return res.status(500).send("Internal Server Error");
        });
});


  

app.listen(HTTP_PORT, OnHttpStart)
module.exports = { app };

