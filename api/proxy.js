import express from "express";
import fetch from "node-fetch";
import { Connection, Keypair, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";

const app = express();
app.use(express.json());

const RPC_URL = "https://ancient-twilight-reel.solana-mainnet.quiknode.pro/"; // your QuickNode RPC
const TIP_ADDRESS = new PublicKey("CHJPZWYoHMkTFtDq75Jmy6FLFcHD5kJhGziBgiNSfmLE"); // replace with your tip wallet
const TIP_AMOUNT_SOL = 0.002;

// Vercel injects env secrets via process.env
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

// Add a GET handler for root to avoid "Cannot GET /" error
app.get("/", (req, res) => {
  res.send("Hello! This endpoint only accepts POST requests.");
});

app.post("/", async (req, res) => {
  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { method, params, id } = req.body;

  // Validate required fields
  if (!method || !id) {
    return res.status(400).json({ error: "Missing required fields in request" });
  }

  try {
    // Forward everything except sendTransaction
    if (method !== "sendTransaction") {
      const resp = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      return res.json(data);
    }

    // 1. Forward original signed tx
    const forwardResp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    const forwardJson = await forwardResp.json();

    // Check if the transaction was successful
    if (forwardJson.error) {
      return res.json(forwardJson);
    }

    // 2. Build + send tip tx (only if tipper is configured)
    let tipSig = null;
    if (tipper) {
      try {
        const blockhash = await connection.getLatestBlockhash();
        const tipTx = new Transaction({
          feePayer: tipper.publicKey,
          recentBlockhash: blockhash.blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: tipper.publicKey,
            toPubkey: TIP_ADDRESS,
            lamports: TIP_AMOUNT_SOL * 1e9,
          })
        );

        tipSig = await connection.sendTransaction(tipTx, [tipper]);
      } catch (tipError) {
        console.error("Tip transaction error:", tipError);
        // Continue even if tip fails - the main transaction succeeded
      }
    }

    res.json({
      jsonrpc: "2.0",
      id,
      result: forwardJson.result,
      ...(tipSig && { tipSig }),
    });
  } catch (err) {
    console.error("Proxy Error:", err);
    res.status(500).json({ 
      error: "Internal server error", 
      details: err.message,
      code: "FUNCTION_INVOCATION_FAILED"
    });
  }
});

export default app;
