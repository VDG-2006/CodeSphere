const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

const COURSE_PATH = path.join(__dirname, '..', 'content');
const CATEGORY = "WebDev";
const THUMBNAIL = "https://images.unsplash.com/photo-1498050108023-c5249f4df085";

async function seedExternalVideos() {
  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codesphere-dev');
    console.log('[Seeder] Connected.');

    const files = fs.readdirSync(COURSE_PATH);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));

    console.log(`[Seeder] Found ${mp4Files.length} MP4 files.`);

    const operations = mp4Files.map(file => {
      // 1. Remove Prefix
      let cleanName = file.replace('Sigma Web Development Course - ', '');
      
      // 2. Remove Extension
      cleanName = cleanName.replace('.mp4', '');

      // 3. Format Title: "Tutorial #1 - Intro" -> "Intro | Tutorial #1"
      let title = cleanName;
      if (cleanName.includes(' - ')) {
        const parts = cleanName.split(' - ');
        if (parts.length >= 2) {
          title = `${parts[1]} | ${parts[0]}`;
        }
      }

      // 4. Encode URL for the static route
      const videoUrl = `/api/content/${encodeURIComponent(file)}`;

      return {
        updateOne: {
          filter: { videoUrl },
          update: {
            $set: {
              title,
              description: `Part of the Sigma Web Development Course: ${title}`,
              thumbnailUrl: THUMBNAIL,
              videoUrl,
              category: CATEGORY,
              duration: '10:00', // Placeholder as fs doesn't easily give duration
              views: Math.floor(Math.random() * 10000),
              likes: Math.floor(Math.random() * 500)
            }
          },
          upsert: true
        }
      };
    });

    console.log('[Seeder] Starting Upsert Operations...');
    const result = await Video.bulkWrite(operations);
    console.log(`[Seeder] Success! Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error:', error);
    process.exit(1);
  }
}

seedExternalVideos();
