import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, password } = req.body;

    const endpoint = `${process.env.API_URL}/userLoginFunction`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
    
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
}
