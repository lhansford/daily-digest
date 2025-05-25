
import { epub } from "percollate";
import dotenv from "dotenv";

import { DropboxClient } from "./dropbox-client.js";
import { RaindropClient } from "./raindrop-client.js";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Get the API tokens from environment variables
  const token = process.env.RAINDROP_TOKEN;
  const dropboxToken = process.env.DROPBOX_TOKEN;

  if (!token) {
    console.error("Error: RAINDROP_TOKEN environment variable is required");
    process.exit(1);
  }

  if (!dropboxToken) {
    console.error("Error: DROPBOX_TOKEN environment variable is required");
    process.exit(1);
  }


  const client = new RaindropClient({ token });
  const dropboxClient = new DropboxClient({ accessToken: dropboxToken });

  try {
    // Get 5 URLs from the "For Daily Digest" collection
    console.log('Fetching bookmarks from "For Daily Digest" collection...');
    const urls = await client.getBookmarkUrls("For Daily Digest", 5);

    if (urls.length === 0) {
      console.log('No bookmarks found in the "For Daily Digest" collection.');
      return;
    }

    console.log(`\nFound ${urls.length} bookmark(s):\n`);
    urls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const epubFilename = `output/daily-digest-${timestamp}.epub`;

    let epubGenerated = false;
    let uploadSuccessful = false;

    try {
      // Generate EPUB
      console.log("\nGenerating EPUB...");
      await epub(urls, {
        output: epubFilename,
        "no-amp": true,
        "bundle-images": true,
        timeout: 60000,
        headless: true,
        sandbox: false,
        title: `Daily Digest ${timestamp}`,
      });

      console.log(`✅ EPUB saved: ${epubFilename}`);
      epubGenerated = true;

      // Upload EPUB to Dropbox with separate error handling
      try {
        console.log("\nUploading EPUB to Dropbox...");
        const dropboxPath = await dropboxClient.uploadEpub(epubFilename);

        console.log(`\n🎉 Successfully created and uploaded epub:`);
        console.log(`   📖 Local: ${epubFilename}`);
        console.log(`   ☁️  Dropbox: ${dropboxPath}`);
        uploadSuccessful = true;
      } catch (dropboxError) {
        console.error("\n❌ Failed to upload EPUB to Dropbox:", dropboxError);
        console.log(`\n📖 EPUB was still created successfully: ${epubFilename}`);
        console.log("You can manually upload the file or check your Dropbox configuration.");
      }
    } catch (percollateError) {
      console.error("Error generating files with percollate:", percollateError);
      console.log("URLs were still fetched successfully from Raindrop.io");
    }

    // Move bookmarks to "In Daily Digest" collection after successful upload
    if (uploadSuccessful) {
      try {
        console.log('\nMoving bookmarks to "In Daily Digest" collection...');
        const movedBookmarks = await client.moveBookmarksToCollection(
          "For Daily Digest",
          "In Daily Digest",
          urls.length
        );

        if (movedBookmarks.length > 0) {
          console.log(`\n✅ Successfully moved ${movedBookmarks.length} bookmark(s) to "In Daily Digest" collection.`);
        }
      } catch (moveError) {
        console.error("\n❌ Failed to move bookmarks:", moveError);
        console.log("The EPUB was still created and uploaded successfully.");
      }
    } else if (epubGenerated) {
      console.log('\nSkipping bookmark move since upload was not successful.');
      console.log('Bookmarks remain in "For Daily Digest" collection.');
    }
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    process.exit(1);
  }
}

main().catch(console.error);
