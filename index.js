import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import bcrypt from "bcrypt";
import { Strategy } from "passport-local";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import { db } from "@vercel/postgres";
import pg from "pg";
import path from "path";
import multer from 'multer';
import cors from "cors";
const app = express();
const port = 5000;
const saltRounds = 10;
const { Pool } = pg;

const router = express.Router();
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
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db1.query("SELECT * FROM owners WHERE owner_email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err); // Pass the error to the callback
          } else {
            if (valid) {
              return cb(null, user); // Pass the user to the callback
            } else {
              return cb(null, false, { message: "Incorrect password" }); // Password is incorrect
            }
          }
        });
      } else {
        return cb(null, false, { message: "User not found" }); // User not found
      }
    } catch (err) {
      console.log("Database error:", err);
      return cb(err); // Pass database error to the callback
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
app.use('/images', express.static(path.join(__dirname, 'images')));
passport.deserializeUser((user, cb) => {
  cb(null, user);
});
app.post('/merchantlogin', passport.authenticate('local'), async (req, res) => {

    
  if (req.isAuthenticated()) {
    const username = req.query.username;
    console.log(username);
    const result = await db1.query("SELECT * FROM owners WHERE owner_email = $1",[username]);
    console.log(result);
    const user1 = result.rows[0];
    console.log('Login successful:', user1);
  
    res.json({ message: 'Login successful', user: user1});
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});
app.get("/merchantorders", async (req, res) => {
  console.log("Request Query:", req.query);
const username = req.query.username;

  console.log(username);
  const result1 = await db1.query("SELECT * FROM orders WHERE ordered_to_name = $1 ORDER BY id DESC;",[username]);
  const orders = result1.rows;
  console.log(orders);
  res.status(200).json({message:"user login",order:orders})
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
app.get("/products",async(req,res)=>{
  console.log(req.query.store_name);
  const result = await db1.query("SELECT * FROM products WHERE store_name = $1",[req.query.store_name]);
  const products = result.rows;
  console.log(products);
  res.status(200).json({message:"products",products:products})

})
app.get("/updateproducts",async(req,res)=>{
  const {
    id,
    store_id,
    product_name,
    product_price,
    product_quantity,
    product_image,
    stock,
    product_category,
    store_name,
  } = req.query;
  console.log(req.query);
  try{
    const result = db1.query("UPDATE products SET(product_name,product_price,product_quantity,stock,product_category) = ($1,$2,$3,$4,$5) WHERE id = $6",[product_name,product_price,product_quantity,stock,product_category,id])

  }
  catch(err){
    console.log(err);
  }
})
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static('uploads'));

app.post('/addproduct', upload.single('productImage'), (req, res) => {
  const { productName, StoreName,
    StoreId, productPrice, productQuantity, productCategory } = req.body;
    console.log( StoreName,
      StoreId)
 let productImage = req.file ? req.file.path : null; 
  console.log(productName, productImage);
  try{
    const result = db1.query( "INSERT INTO products (product_name, product_price, product_quantity, product_image, product_category,store_id,store_name) VALUES ($1, $2, $3, $4, $5,$6,$7)",[productName,productPrice,productQuantity,productImage,productCategory,4,StoreName])

  }
  catch(err){
    console.log(err);
  }
  res.status(200).json({ message: 'Product added successfully' });
});
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
    const result1 = await db1.query("INSERT INTO orders (ordered_by_name, ordered_by_contact, ordered_by_address, ordered_items, ordered_to_name, ordered_to_contact, date_time,total_price)VALUES ($1, $2, $3, $4, $5, $6, $7,$8)",[users.name,users.contact,users.address,orderString,stores.store_name,stores.owner_contact,date,req.query.totalPrice]);

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
  // console.log(name,contact,address,email);
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
