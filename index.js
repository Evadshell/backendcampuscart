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
          const newUser = await db1.query(
            "INSERT INTO users (email,image) VALUES ($1,$2)",
            [profile.email,profile.picture]
          );
          return cb(null, newUser.rows[0]);
        } else {
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
  console.log("req",req.user);
  if(req.isAuthenticated()){
    res.status(200).json({message:"user login",user:req.user})
  }
  else {
    res.status(400).json({message:"not logged in "})
  }
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
