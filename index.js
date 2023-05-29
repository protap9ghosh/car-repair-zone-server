const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
   res.send("Car Doctor is running...");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vrk8jch.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

// verify JWT Token
const verifyJWT = (req, res, next) => {
   console.log('hitting verify JWT');
   console.log(req.headers.authorization)
   const authorization = req.headers.authorization;
   if (!authorization) {
      return res.status(401).send({error: true, message: 'unauthorized access'});
   }
   const token = authorization.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
      if (error) { 
         return res.status(403).send({error: true, message: 'unauthorized access'});
      }
      req.decoded = decode;
      next();
   })
} 

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();

      const serviceCollection = client.db("carDoctor").collection("services");
      const bookingCollection = client.db("carDoctor").collection("bookings");

      // JWT
      app.post('/jwt', (req, res) => {
         const user = req.body;
         console.log(user);
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
         console.log(token);
         res.send({token});
      })

      // Services Routes
      app.get("/services", async (req, res) => {
         const sort = req.query.sort;
         const search = req.query.search;
         // console.log(search);
         // const query = {};
         // const query = { price: { $gt: 50, $lte: 200 } };
         // db.InspirationalWomen.find({ first_name: { $regex: /Harriet/i } });

         const query = { title: { $regex: search, $options: "i" } };
         const options = {
            sort: {
               price: sort === "ascending" ? 1 : -1,
            },
         };
         const cursor = serviceCollection.find(query, options);
         const result = await cursor.toArray();
         res.send(result);
         // console.log(result);
      });

      app.get("/services/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };

         const options = {
            // Include only the `title` and `imdb` fields in the returned document
            projection: { title: 1, price: 1, service_id: 1, img: 1 },
         };
         const result = await serviceCollection.findOne(query, options);
         res.send(result);
      });

      // Booking Routes
      app.get("/bookings", verifyJWT, async (req, res) => {
         // console.log(req.headers.authorization);
         let query = {};
         if (req.query?.email) {
            query = { email: req.query.email };
         }
         const result = await bookingCollection.find().toArray();
         res.send(result);
      });

      app.post("/bookings", async (req, res) => {
         const booking = req.body;
         // console.log(booking);
         const result = await bookingCollection.insertOne(booking);
         res.send(result);
      });

      // update booking
      app.patch("booking/:id", async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const updatedBooking = req.body;
         // console.log(updatedBooking);
         const updateDoc = {
            $set: {
               status: updatedBooking.status,
            },
         };
         const result = await bookingCollection.updateOne(filter, updateDoc);
         res.send(result);
      });

      // delete booking
      app.delete("/bookings/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await bookingCollection.deleteOne(query);
         res.send(result);
      });

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log(
         "Pinged your deployment. You successfully connected to MongoDB!"
      );
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);

app.listen(port, () => {
   console.log(`Car Doctor Server is running on port ${port}`);
});
