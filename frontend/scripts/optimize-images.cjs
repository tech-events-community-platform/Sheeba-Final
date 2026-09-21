const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BADGES_DIR = path.join(PUBLIC_DIR, 'badges');

async function optimizeFile(inputPath, outputPath, options = {}) {
  const { width = null, height = null, quality = 80 } = options;
  const originalSize = fs.statSync(inputPath).size;

  let pipeline = sharp(inputPath);
  if (width || height) {
    pipeline = pipeline.resize({
      width,
      height,
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  pipeline = pipeline.webp({ quality, effort: 6 });
  await pipeline.toFile(outputPath);

  const newSize = fs.statSync(outputPath).size;
  const reduction = (((originalSize - newSize) / originalSize) * 100).toFixed(1);

  return {
    file: path.relative(PUBLIC_DIR, outputPath),
    originalKB: (originalSize / 1024).toFixed(1),
    newKB: (newSize / 1024).toFixed(1),
    reduction: `${reduction}%`,
  };
}

async function run() {
  console.log('🚀 Starting Image Optimization & WebP Conversion...');
  const results = [];

  // 1. Hero image (Target max 1600px width, quality 75)
  if (fs.existsSync(path.join(PUBLIC_DIR, 'hero.jpg'))) {
    results.push(
      await optimizeFile(
        path.join(PUBLIC_DIR, 'hero.jpg'),
        path.join(PUBLIC_DIR, 'hero.webp'),
        { width: 1600, quality: 75 }
      )
    );
  }

  // 2. Badges in badges/
  const badgeFiles = fs.readdirSync(BADGES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  for (const file of badgeFiles) {
    const input = path.join(BADGES_DIR, file);
    const output = path.join(BADGES_DIR, file.replace(/\.(jpg|jpeg|png)$/, '.webp'));
    results.push(await optimizeFile(input, output, { width: 400, height: 400, quality: 80 }));
  }

  // Also create fallbacks hackathon-badge.webp and other.webp if referenced in code
  const hackathonWinner = path.join(BADGES_DIR, 'hackathon-winner-badge.webp');
  const hackathonBadge = path.join(BADGES_DIR, 'hackathon-badge.webp');
  if (fs.existsSync(hackathonWinner) && !fs.existsSync(hackathonBadge)) {
    fs.copyFileSync(hackathonWinner, hackathonBadge);
  }
  const attendedBadge = path.join(BADGES_DIR, 'attended-badge.webp');
  const otherBadge = path.join(BADGES_DIR, 'other.webp');
  if (fs.existsSync(attendedBadge) && !fs.existsSync(otherBadge)) {
    fs.copyFileSync(attendedBadge, otherBadge);
  }

  // 3. Landing page images and UI assets
  const landingImages = [
    { name: 'landing-attendee.jpg', width: 800, quality: 80 },
    { name: 'landing-organizers.jpg', width: 800, quality: 80 },
    { name: 'landing-sponsor.jpg', width: 800, quality: 80 },
    { name: 'register-bg.png', width: 1600, quality: 75 },
    { name: 'sponsor-sidebar.jpg', width: 600, quality: 80 },
    { name: 'coming-soon.jpg', width: 600, quality: 80 },
    { name: 'logo.jpg', width: 400, quality: 90 },
    { name: 'calendar.png', width: 128, quality: 80 },
    { name: 'location.png', width: 128, quality: 80 },
    { name: 'tick.png', width: 128, quality: 80 },
    { name: 'mail-icon.jpg', width: 128, quality: 80 },
    { name: 'phone-icon.jpg', width: 128, quality: 80 },
  ];

  for (const img of landingImages) {
    const input = path.join(PUBLIC_DIR, img.name);
    if (fs.existsSync(input)) {
      const output = path.join(PUBLIC_DIR, img.name.replace(/\.(jpg|jpeg|png)$/, '.webp'));
      results.push(await optimizeFile(input, output, { width: img.width, quality: img.quality }));
    }
  }

  console.table(results);
  console.log('✅ All images successfully converted to WebP!');
}

run().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
