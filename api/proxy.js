const express = require("express");
const { Connection, Keypair, SystemProgram, Transaction, PublicKey } = require("@solana/web3.js");

const app = express();
app.use(express.json());

const RPC_URL = "https://ancient-twilight-reel.solana-mainnet.quiknode.pro/";
const TIP_ADDRESS = new PublicKey("CHJPZWYoHMkTFtDq75Jmy6FLFcHD5kJhGziBgiNSfmLE");
const TIP_AMOUNT_SOL = 0.002;

let tipper;
let connection;

try {
  if (process.env.TIPPER_SECRET) {
    const secret = JSON.parse(process.env.TIPPER_SECRET);
    tipper = Keypair.fromSecretKey(Uint8Array.from(secret));
    connection = new Connection(RPC_URL);
  } else {
    console.warn("TIPPER_SECRET environment variable not set");
    connection = new Connection(RPC_URL);
  }
} catch (error) {
  console.error("Error initializing keypair:", error);
  connection = new Connection(RPC_URL);
}

// Use dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

app.post("/", async (req, res) => {
  // ...rest of your code, using fetch as a function (await fetch(...))
});

module.exports = app;
