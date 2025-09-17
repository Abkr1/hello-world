import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";

export default async function handler(req, res) {
  try {
    // Parse request JSON safely
    const body = req.body;
    if (!body) {
      return res.status(400).json({ error: "Missing request body" });
    }

    // Load secret safely
    let tipperKeypair;
    try {
      const secretArray = JSON.parse(process.env.TIPPER_SECRET || "[]");
      tipperKeypair = Keypair.fromSecretKey(Uint8Array.from(secretArray));
    } catch (e) {
      console.warn("⚠️ Invalid or missing TIPPER_SECRET, forwarding without tip");
      tipperKeypair = null;
    }

    // Connect to Solana
    const connection = new Connection(process.env.RPC_URL, "confirmed");

    // Handle transaction forwarding
    if (body.method === "sendTransaction" && tipperKeypair) {
      // Decode transaction
      const tx = Transaction.from(Buffer.from(body.params[0], "base64"));

      // Add tip instruction
      const tipIx = SystemProgram.transfer({
        fromPubkey: tipperKeypair.publicKey,
        toPubkey: new PublicKey(process.env.TIP_DESTINATION),
        lamports: 10000, // adjust tip size
      });
      tx.add(tipIx);
      tx.sign(tipperKeypair);

      const sig = await connection.sendRawTransaction(tx.serialize());
      return res.json({ result: sig });
    }

    // Default: forward to RPC
    const response = await fetch(process.env.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ error: "Proxy crashed", details: err.message });
  }
}
