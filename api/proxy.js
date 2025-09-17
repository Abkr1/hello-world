import fetch from "node-fetch";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { method, params, id } = req.body;

    const RPC_URL = "https://ancient-twilight-reel.solana-mainnet.quiknode.pro/";
    const TIP_ADDRESS = "CHJPZWYoHMkTFtDq75Jmy6FLFcHD5kJhGziBgiNSfmLE";
    const TIP_AMOUNT_SOL = 0.002;

    // ✅ Parse secret from env
    if (!process.env.TIPPER_SECRET) {
      throw new Error("Missing TIPPER_SECRET env");
    }
    const secret = JSON.parse(process.env.TIPPER_SECRET);
    const tipper = Keypair.fromSecretKey(Uint8Array.from(secret));
    const connection = new Connection(RPC_URL);

    // Forward all non-sendTransaction calls
    if (method !== "sendTransaction") {
      const resp = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await resp.json();
      return res.json(data);
    }

    // 1. Forward the signed tx
    const forwardResp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    const forwardJson = await forwardResp.json();

    // 2. Send tip transaction
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

    return res.json({
      jsonrpc: "2.0",
      id,
      result: forwardJson.result,
      tipSig,
    });
  } catch (err) {
    console.error("Proxy Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
