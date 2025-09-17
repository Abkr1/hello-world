import express from "express";
import fetch from "node-fetch";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";

const app = express();
app.use(express.json());

const RPC_URL = "https://ancient-twilight-reel.solana-mainnet.quiknode.pro/"; // your QuickNode RPC
const TIP_ADDRESS = "CHJPZWYoHMkTFtDq75Jmy6FLFcHD5kJhGziBgiNSfmLE"; // replace with your tip wallet
const TIP_AMOUNT_SOL = 0.002;

// Vercel injects env secrets via process.env
const secret = JSON.parse(process.env.TIPPER_SECRET);
const tipper = Keypair.fromSecretKey(Uint8Array.from(secret));
const connection = new Connection(RPC_URL);

app.post("/", async (req, res) => {
  const { method, params, id } = req.body;

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

    // 2. Build + send tip tx
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

    const tipSig = await connection.sendTransaction(tipTx, [tipper]);

    res.json({
      jsonrpc: "2.0",
      id,
      result: forwardJson.result,
      tipSig,
    });
  } catch (err) {
    console.error("Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
