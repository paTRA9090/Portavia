const express = require("express")
const router = express.Router()
const userModel = require("../models/user-model")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const productModel = require("../models/product-model")


async function isLoggedin(req, res, next) {
    if (!req.cookies.token) {
        req.flash("error", "You are not logged in, please login first")
        return res.redirect("/")
    }

    try {
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY)
        let user = await userModel.findOne({ email: decoded.email }).select("-password")
        req.user = user;
        next();
    } catch (err) {
        req.flash("error", "You are not logged in, please login first")
        return res.redirect("/")
    }
}

router.get("/shop", isLoggedin, async (req, res) => {
    let products = await productModel.find({})
    let success = req.flash("success")
    res.render("shops", { products, success });
})


router.post("/register", async (req, res) => {
    try {
        const { email, fullname, password } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash("error", "Please enter a valid email address");
            return res.redirect("/users/auth?form=register");
        }

        const user = await userModel.findOne({ email });
        if (user) {
            req.flash("error", "You already have an account, please login");
            return res.redirect("/users/auth?form=login");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const createdUser = await userModel.create({
            email,
            fullname,
            password: hash,
        });

        let token = jwt.sign({ email: createdUser.email, id: createdUser._id }, process.env.JWT_KEY)
        res.cookie("token", token);
        return res.redirect("/users/shop");
    } catch (err) {
        req.flash("error", err.message);
        return res.redirect("/users/auth?form=register");
    }
});


router.post("/login", async (req, res) => {
    let { email, password } = req.body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        req.flash("error", "Please enter a valid email address");
        return res.redirect("/users/auth?form=login");
    }

    let user = await userModel.findOne({ email })
    if (!user) {
        req.flash("error", "You don't have an account, please register");
        return res.redirect("/users/auth?form=register");
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_KEY)
            res.cookie("token", token)
            return res.redirect("/users/shop")
        }
        else {
            req.flash("error", "Invalid password")
            return res.redirect("/users/auth?form=login")
        }
    })

});


router.get("/logout", (req, res) => {
    res.cookie("token", "")
    res.redirect("/")
});

module.exports = router;