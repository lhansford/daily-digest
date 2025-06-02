import { epub } from "percollate";
import dotenv from "dotenv";

import { DropboxClient } from "./dropbox-client.js";
import { RaindropClient } from "./raindrop-client.js";
import { Raindrop } from "./types.js";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Get the API tokens from environment variables
  const token = process.env.RAINDROP_TOKEN;
  const dropboxClientId = process.env.DROPBOX_CLIENT_ID;
  const dropboxClientSecret = process.env.DROPBOX_CLIENT_SECRET;
  const dropboxRefreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!token) {
    console.error("Error: RAINDROP_TOKEN environment variable is required");
    process.exit(1);
  }

  if (!dropboxClientId || !dropboxClientSecret || !dropboxRefreshToken) {
    console.error(
      "Error: DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET, and DROPBOX_REFRESH_TOKEN environment variables are required"
    );
    process.exit(1);
  }

  const client = new RaindropClient({ token });
  const dropboxClient = new DropboxClient({
    clientId: dropboxClientId,
    clientSecret: dropboxClientSecret,
    refreshToken: dropboxRefreshToken,
  });

  let raindrops = [];

  try {
    // Get 5 URLs from the "For Daily Digest" collection
    console.log('Fetching bookmarks from "For Daily Digest" collection...');
    raindrops = await client.getBookmarkUrls("For Daily Digest", 5);
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    process.exit(1);
  }

  if (raindrops.length === 0) {
    console.log('No bookmarks found in the "For Daily Digest" collection.');
    return;
  }

  console.log(`\nFound ${raindrops.length} bookmark(s):\n`);
  raindrops.forEach((raindrop, index) => {
    console.log(`${index + 1}. ${raindrop.link}`);
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const epubFilename = `output/daily-digest-${timestamp}.kepub.epub`;

  let successfulUrls: Raindrop[] = [];

  try {
    // Generate EPUB
    console.log("\nGenerating EPUB...");
    const result = await epub(
      raindrops.map((r) => r.link),
      {
        output: epubFilename,
        "no-amp": true,
        "bundle-images": true,
        timeout: 60000,
        headless: true,
        sandbox: false,
        title: `Daily Digest ${timestamp}`,
        style: "index.css",
      }
    );

    for (const item of result.items) {
      const raindrop = raindrops.find((r) => r.link === item.url);
      if (!raindrop) {
        console.error("Error: URL not found in original bookmarks:", item.url);
        process.exit(1);
      }
      successfulUrls.push(raindrop);
    }

    console.log(`✅ EPUB saved: ${epubFilename}`);
    successfulUrls.forEach((item, index) => {
      console.log(`${index + 1}. ${item.link}`);
    });
  } catch (percollateError) {
    console.error("Error generating files with percollate:", percollateError);
    process.exit(1);
  }

  if (successfulUrls.length === 0) {
    console.error("All URLs failed during EPUB generation.");
    process.exit(1);
  }

  try {
    console.log("\nUploading EPUB to Dropbox...");
    const dropboxPath = await dropboxClient.uploadEpub(epubFilename);

    console.log(`\n🎉 Successfully created and uploaded epub:`);
    console.log(`   📖 Local: ${epubFilename}`);
    console.log(`   ☁️  Dropbox: ${dropboxPath}`);
  } catch (dropboxError) {
    console.error("\n❌ Failed to upload EPUB to Dropbox:", dropboxError);
    console.log(`\n📖 EPUB was still created successfully: ${epubFilename}`);
    console.log(
      "You can manually upload the file or check your Dropbox configuration."
    );
    process.exit(1);
  }

  try {
    console.log('\nMoving bookmarks to "In Daily Digest" collection...');
    const movedBookmarks = await client.moveBookmarksToCollection(
      "In Daily Digest",
      successfulUrls
    );

    if (movedBookmarks.length > 0) {
      console.log(
        `\n✅ Successfully moved ${movedBookmarks.length} bookmark(s) to "In Daily Digest" collection.`
      );
    }
  } catch (moveError) {
    console.error("\n❌ Failed to move bookmarks:", moveError);
    console.log("The EPUB was still created and uploaded successfully.");
    process.exit(1);
  }
}

main().catch(console.error);
