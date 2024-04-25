import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import { db } from "@vercel/postgres";
import pg from "pg";
import path from "path"; 
import cors from "cors";
const app = express();
const port = 5000;
const saltRounds = 10;
const { Pool } = pg;
env.config();
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL ,
  })
  const db1= await db.connect();
app.use(cors({
    origin:"http://localhost:3000",
    methods:"GET,POST,PUT,DELETE",
    credentials:true,

}));
app.use(express.json());

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30,
      },
    })
  );
  
  
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static("public"));
  app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      // callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: ["profile", "email"], scope: ["profile", "email"],
      
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db1.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          console.log("new user");
          const newUser = await db1.query(
            "INSERT INTO users (email,image) VALUES ($1,$2)",
            [profile.email,profile.picture]
          );
          return cb(null, newUser.rows[0]);
        } else {
           console.log("old user");
          return cb(null, result.rows[0]);
         

        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000/",
    failureRedirect: "http://localhost:3000/login",
  })
);
//app.get login and register dono ka bana na hoga login pe normal register pe add form then normal
app.get("/login/success",async(req,res)=>{
 

  if(req.isAuthenticated()){
    const result = await db1.query("SELECT * FROM users WHERE email = $1",[req.user.email]);
    const users = result.rows[0];
    const userDetails ={
      name : users.name,
      email : users.email,
      contact : users.contact,
      address:users.address,
      image : users.image,
    }
    res.status(200).json({message:"user login",user:userDetails})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
})
app.get("/storedetail",async(req,res)=>{
 

  if(req.isAuthenticated()){
    const result = await db1.query("SELECT * FROM store");
    const stores = result.rows;
    res.status(200).json({message:"stores",user:stores})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
})
app.get("/productdetail",async(req,res)=>{
 

  if(req.isAuthenticated()){
    const id = req.query.id;
    const result = await db1.query("SELECT * FROM products WHERE store_id = $1",[id]);
    const products = result.rows;
    console.log(products,id);

    res.status(200).json({message:"products",user:products})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
})
app.get("/cart",async(req,res)=>{
  if(req.isAuthenticated()){
    res.status(200).json({message:"logged in",user:req.user})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
})
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
import twilio from 'twilio';

const client = twilio(accountSid, authToken);


app.get("/getorder",async(req,res)=>{
  if(req.isAuthenticated()){
    const result = await db1.query("SELECT * FROM users WHERE email = $1",[req.user.email]);
    const users = result.rows[0];
    const result2 = await db1.query("SELECT * FROM store WHERE id=$1",[req.query.store_id]);
    console.log(req.query.store_id)
    const stores = result2.rows[0];
    const orderItemsString = req.query.orderItems;
    const orderItems = JSON.parse(decodeURIComponent(orderItemsString));
    const orderString = orderItems.map(item => {
      return `${item.quantity} * ${item.product_name} (${item.product_price}, ${item.product_quantity})`;
  }).join(', ');
  console.log(orderString);
    console.log(orderItems,req.query.totalPrice);
    const date= new Date();
    // const result1 = await db1.query("INSERT INTO orders (ordered_by_name, ordered_by_contact, ordered_by_address, ordered_items, ordered_to_name, ordered_to_contact, date_time)VALUES ($1, $2, $3, $4, $5, $6, $7)",[users.name,users.contact,users.address,orderString,stores.store_name,stores.owner_contact,date]);
    // client.messages
    // .create({
    //     body: `order from ${users.name}, ${users.contact} items : ${orderString} at ${users.address}, ${date}`,
    //     from: '+12562978627',
    //     to: `+91${stores.owner_contact}`,
    //     to: '+919827257180'
    // })
    // .then(message => console.log(message.sid))
    // .catch(error => console.error(error));
    res.status(200).json({message:"logged in",user:req.user})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
})
app.get("/userData",async (req,res)=>{
  const email = req.user.email;
  const name = req.query.name;
  const contact = req.query.contact;
  const address = req.query.address;
  console.log(name,contact,address,email);
  const result = await db1.query("UPDATE users SET (name,contact,address) = ($1,$2,$3) WHERE email = $4",[name,contact,address,email] );

})

app.get("/logout",(req,res,next)=>{
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("http://localhost:3000");
  });
})
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
