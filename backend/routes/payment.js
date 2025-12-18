const express = require("express");
const router = express.Router();
const isLoggedin = require("../middlewares/isLoggedin");
const Stripe = require("stripe");
const User = require("../models/user-model");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", isLoggedin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cart");

    if (!user || user.cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let total = 0;
    user.cart.forEach(item => {
      total += (item.price * item.quantity) - item.dicount + 20;
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Portavia Cart Items",
            },
            unit_amount: total * 100,
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.redirect(session.url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/success", isLoggedin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();
    res.render("success");
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

router.get("/cancel", (req, res) => {
  res.render("cancel");
});

module.exports = router;