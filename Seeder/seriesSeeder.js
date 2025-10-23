const mongoose = require('mongoose');
const Series = require('../src/models/seriesModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/silsila';

const seriesData = [
  {
    id: 'poets',
    title: 'Poets Series',
    tagline: 'Verses, voices, and enduring resonance.',
    description: 'Featuring inspirations and visual homages to the greats — typography, ink, and rhythm.',
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-stone-900/90 to-stone-600/10',
    subitems: [
      { title: 'Ghalib' },
      { title: 'Faiz Ahmed Faiz' },
      { title: 'John Elia' },
      { title: 'Habib Jalib' },
      { title: 'Muneer Niazi' }
    ],
    gallery: [
      { title: 'Ink & Verse', image: 'https://images.unsplash.com/photo-1493236296276-d17357e28875?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Margins & Notes', image: 'https://images.unsplash.com/photo-1514846326710-096e4a8035e1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Quiet Reading', image: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Type & Texture', image: 'https://images.unsplash.com/photo-1520975922284-c0d7a98f3f6b?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Neon Alley', image: 'https://images.unsplash.com/photo-1518544801976-3e188ea222e7?auto=format&fit=crop&w=1200&q=80' },
      { title: 'City Lights', image: 'https://images.unsplash.com/photo-1536335550880-118d3d624d07?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Arcade Glow', image: 'https://images.unsplash.com/photo-1544551763-5df28357f0a1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Night Run', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=1200&q=80' }
    ],
    isActive: true,
    order: 0
  },
  {
    id: 'alphabets',
    title: 'Alphabets Series',
    tagline: 'Scripts, strokes, and calligraphic form.',
    description: 'A celebration of letterforms — Alif, Bay, Pay, and beyond. Composition, motion, and balance.',
    cover: 'https://images.unsplash.com/photo-1520975659191-5bb8826e8f76?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-fuchsia-900/90 to-fuchsia-500/10',
    subitems: [
      { title: 'Alif' },
      { title: 'Bay' },
      { title: 'Pay' },
      { title: 'Tay' },
      { title: 'Jeem' }
    ],
    gallery: [
      { title: 'Script Study', image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Ink Flow', image: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Letter Rhythm', image: 'https://images.unsplash.com/photo-1494319827402-c4b9b83f5741?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Grid & Form', image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Neon Alley', image: 'https://images.unsplash.com/photo-1518544801976-3e188ea222e7?auto=format&fit=crop&w=1200&q=80' },
      { title: 'City Lights', image: 'https://images.unsplash.com/photo-1536335550880-118d3d624d07?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Arcade Glow', image: 'https://images.unsplash.com/photo-1544551763-5df28357f0a1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Night Run', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=1200&q=80' }
    ],
    isActive: true,
    order: 1
  },
  {
    id: 'cinema',
    title: 'Cinema Series',
    tagline: 'Frames, light, and iconic moments.',
    description: 'From poster composition to reel textures — an ode to film language across eras.',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-rose-900/90 to-rose-500/10',
    subitems: [],
    gallery: [
      { title: 'Projection Glow', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963f?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Reel Grain', image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Poster Walls', image: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Velvet Seats', image: 'https://images.unsplash.com/photo-1499013819532-e4ff41b00669?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Neon Alley', image: 'https://images.unsplash.com/photo-1518544801976-3e188ea222e7?auto=format&fit=crop&w=1200&q=80' },
      { title: 'City Lights', image: 'https://images.unsplash.com/photo-1536335550880-118d3d624d07?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Arcade Glow', image: 'https://images.unsplash.com/photo-1544551763-5df28357f0a1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Night Run', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=1200&q=80' }
    ],
    isActive: true,
    order: 2
  },
  {
    id: 'anime',
    title: 'Anime Series',
    tagline: 'Neon, motion, and character-driven worlds.',
    description: 'A visual salute to anime aesthetics — speed lines, glow, and emotional silhouettes.',
    cover: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-violet-900/90 to-violet-500/10',
    subitems: [],
    gallery: [
      { title: 'Neon Alley', image: 'https://images.unsplash.com/photo-1518544801976-3e188ea222e7?auto=format&fit=crop&w=1200&q=80' },
      { title: 'City Lights', image: 'https://images.unsplash.com/photo-1536335550880-118d3d624d07?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Arcade Glow', image: 'https://images.unsplash.com/photo-1544551763-5df28357f0a1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Night Run', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Neon Alley 2', image: 'https://images.unsplash.com/photo-1518544801976-3e188ea222e7?auto=format&fit=crop&w=1200&q=80' },
      { title: 'City Lights 2', image: 'https://images.unsplash.com/photo-1536335550880-118d3d624d07?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Arcade Glow 2', image: 'https://images.unsplash.com/photo-1544551763-5df28357f0a1?auto=format&fit=crop&w=1200&q=80' },
      { title: 'Night Run 2', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&w=1200&q=80' }
    ],
    isActive: true,
    order: 3
  }
];

async function seedSeries() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing series...');
    await Series.deleteMany({});
    console.log('✅ Cleared existing series');

    console.log('🌱 Seeding series...');
    const createdSeries = await Series.insertMany(seriesData);
    console.log(`✅ Successfully seeded ${createdSeries.length} series\n`);

    console.log('📋 Seeded series:');
    createdSeries.forEach((series, index) => {
      console.log(`${index + 1}. ${series.title} (${series.id})`);
      console.log(`   - Gallery: ${series.gallery.length} images`);
      console.log(`   - Subitems: ${series.subitems.length} items`);
      console.log(`   - Status: ${series.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n🎉 Series seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding series:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Disconnected from MongoDB');
    await mongoose.disconnect();
  }
}

seedSeries();
