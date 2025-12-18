const express = require("express")
const router = express.Router();
const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");
const productModel = require("../models/product-model");

async function isLoggedin(req, res, next) {
    if (!req.cookies.token) {
        req.flash("error", "You are not logged in, please login first")
        res.redirect("/")
    }

    try {
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY)
        let user = await userModel.findOne({ email: decoded.email }).select("-password")
        req.user = user;
        next();

    } catch (err) {
        req.flash("error", "You are not logged in, please login first")
        res.redirect("/")
    }
}



router.get("/", (req, res) => {
    let error = req.flash("error");
    const form = req.query.form || 'login';
    res.render("index", { error, loggedin: false, form });
})

router.get("/users/auth", (req, res) => {
    let error = req.flash("error");
    const form = req.query.form || 'login';
    res.render("auth", { error, loggedin: false, form });
})


router.get("/addtocart/:id", isLoggedin, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });

        // Check if the product is already in the cart
        if (!user.cart.includes(req.params.id)) {
            user.cart.push(req.params.id);  // Add to cart
            await user.save();             // Save updated user
        }
        else {
            let product = await productModel.findOne({ _id: req.params.id })
            product.quantity += 1
            await product.save()
        }

        req.flash("success", "Product added to cart successfully");
        res.redirect("/users/shop");
    } catch (err) {
        console.error("Error adding to cart:", err);
        req.flash("error", "Something went wrong!");
        res.redirect("/users/shop");
    }
});


router.get("/cart", isLoggedin, async (req, res) => {
    let users = await userModel.findOne({ email: req.user.email }).populate("cart")
    function sumNumbers(numbers) {
        let sum = 0;
        numbers.forEach(product => {
            sum += ((product.price * product.quantity) - product.dicount + 20);
        });
        return sum;
    }
    const total = sumNumbers(users.cart);
    // let quantity=1;

    res.render("carts", {
        users,
        total,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
})

router.get("/increase/:id", async (req, res) => {
    let product = await productModel.findOne({ _id: req.params.id })
    product.quantity += 1
    await product.save()
    res.redirect("/cart")
})

router.get("/decrease/:id", async (req, res) => {
    let product = await productModel.findOne({ _id: req.params.id })
    product.quantity -= 1
    await product.save()
    res.redirect("/cart")
})

router.get("/profile", isLoggedin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("cart")
    function sumNumbers(numbers) {
        let sum = 0;
        for (let index = 0; index < numbers.length; index++) {
            const element = numbers[index];
            sum += element.quantity
        }
        return sum;
    }
    let total = sumNumbers(user.cart);
    res.render("profile", { user, total })
})


router.get("/logout", isLoggedin, (req, res) => {
    res.cookie("token", "")
    res.redirect("/");
})

module.exports = router;