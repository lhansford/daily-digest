import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.DROPBOX_CLIENT_ID!;
const CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost/finish"; // Set this in your Dropbox app settings

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&token_access_type=offline`;

  console.log(`Open in your browser to authorize the app: ${authUrl}`);

  const code = await prompt("Paste the code from the redirected URL here: ");

  const tokenRes = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Failed to get tokens:", await tokenRes.text());
    process.exit(1);
  }

  const tokens: any = await tokenRes.json();
  console.log("Your refresh token is:", tokens.refresh_token);
}

main().catch(console.error);
