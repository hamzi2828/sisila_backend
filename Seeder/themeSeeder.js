const mongoose = require('mongoose');
const Theme = require('../src/models/themeModel');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://zextonsAdmin:12345@zextons.y1to4og.mongodb.net/silsila';

const themes = [
  {
    id: 'southeastern-hymns',
    title: 'Southeastern Hymns',
    tagline: 'Regional heritage, harmony, and timeless song.',
    description: 'A warm tribute to Southern roots — stringed textures, woodgrain warmth, and chorus-like graphic rhythm.',
    cover: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-amber-900/90 to-amber-500/10',
    gallery: [
      {
        title: 'Acoustic Heritage',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Studio Warmth',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Country Road',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Sunday Harmony',
        image: 'https://images.unsplash.com/photo-1520975922284-c0d7a98f3f6b?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Folk Gathering',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Vintage Microphone',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Rural Landscape',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Gospel Spirit',
        image: 'https://images.unsplash.com/photo-1520975922284-c0d7a98f3f6b?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    isActive: true,
    order: 1
  },
  {
    id: 'artistic-passion',
    title: 'Artistic Passion',
    tagline: 'Color-forward, expressive, and unapologetically creative.',
    description: 'Celebrating self-expression with bold compositions, painterly motion, and gallery-inspired detail.',
    cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-rose-900/90 to-rose-500/10',
    gallery: [
      {
        title: 'Pigments',
        image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Brush Strokes',
        image: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Canvas Motion',
        image: 'https://images.unsplash.com/photo-1494319827402-c4b9b83f5741?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Studio Light',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Color Palette',
        image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Abstract Expression',
        image: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Creative Flow',
        image: 'https://images.unsplash.com/photo-1494319827402-c4b9b83f5741?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Artistic Workspace',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    isActive: true,
    order: 2
  },
  {
    id: 'echoes-of-the-winds',
    title: 'Echoes of the Winds',
    tagline: 'Freedom, movement, and the poetry of nature.',
    description: 'Air, dunes, and flowing fabric — a sense of motion that drifts across compositions and silhouettes.',
    cover: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-sky-900/90 to-sky-500/10',
    gallery: [
      {
        title: 'Ocean Breath',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Forest Mist',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Dune Lines',
        image: 'https://images.unsplash.com/photo-1520975659191-5bb8826e8f76?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Wind Textures',
        image: 'https://images.unsplash.com/photo-1514846326710-096e4a8035e1?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Coastal Breeze',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Mountain Air',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Desert Sands',
        image: 'https://images.unsplash.com/photo-1520975659191-5bb8826e8f76?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Nature Flow',
        image: 'https://images.unsplash.com/photo-1514846326710-096e4a8035e1?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    isActive: true,
    order: 3
  },
  {
    id: 'uplifting-culture',
    title: 'Uplifting Culture',
    tagline: 'Joy, community, and positive narratives.',
    description: 'Vivid tones and welcoming forms — celebrating connection, optimism, and shared stories.',
    cover: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1600&q=80',
    accent: 'from-violet-900/90 to-violet-500/10',
    gallery: [
      {
        title: 'Smiles',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Festival Energy',
        image: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Neighborhood Light',
        image: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68a?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Togetherness',
        image: 'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Happy Moments',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Community Celebration',
        image: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Urban Joy',
        image: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68a?auto=format&fit=crop&w=1200&q=80'
      },
      {
        title: 'Unity',
        image: 'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    isActive: true,
    order: 4
  }
];

async function seedThemes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing themes...');
    await Theme.deleteMany({});
    console.log('✅ Cleared existing themes');

    console.log('🌱 Seeding themes...');
    const createdThemes = await Theme.insertMany(themes);
    console.log(`✅ Successfully seeded ${createdThemes.length} themes`);

    console.log('\n📋 Seeded themes:');
    createdThemes.forEach((theme, index) => {
      console.log(`${index + 1}. ${theme.title} (${theme.id})`);
      console.log(`   - Gallery: ${theme.gallery.length} images`);
      console.log(`   - Status: ${theme.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n🎉 Theme seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding themes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeder
seedThemes();
