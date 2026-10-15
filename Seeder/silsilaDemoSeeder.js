// silsilaDemoSeeder.js - Seed the full Silsila demo store from the project planner:
// hero banners, the 5 planner categories, 4 themes, 4 series, 60 products (10 per series,
// 5 per theme, 12 per category), journal (10 posts), blog hero and site settings.
//
// Images are copied from Unsplash into Vercel Blob (seed/ folder) so the site serves them from
// our own storage. Re-running reuses blobs that already exist.
//
// Clears hero slides, categories, colors, sizes, themes, series, products, blog categories,
// authors, blogs and blog heroes before inserting. Users, orders, carts and wishlists are never touched.
// Run: node Seeder/silsilaDemoSeeder.js   (add --dry-run to only print what would be cleared)

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { put, head } = require('@vercel/blob');
const HeroSlide = require('../src/models/heroSlideModel');
const Category = require('../src/models/category');
const Color = require('../src/models/color');
const Size = require('../src/models/size');
const Theme = require('../src/models/themeModel');
const Series = require('../src/models/seriesModel');
const Product = require('../src/models/product');
const BlogCategory = require('../src/models/BlogCategory');
const Author = require('../src/models/authorModel');
const Blog = require('../src/models/blogModel');
const BlogHero = require('../src/models/blogHero');
const Settings = require('../src/models/settings');

const MONGO_URI = process.env.MONGO_URI;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

// Real Silsila product mockup already uploaded through the admin panel.
const SIGNATURE_TEE = 'https://m0h3837ewnvf8tzp.public.blob.vercel-storage.com/1791812632537-792843981-Untitled-design.png';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

// ---------- images -> Vercel Blob ----------
const blobCache = new Map();

// Copy an Unsplash photo into Blob once; returns the public Blob URL.
async function img(id, width = 1400) {
  const key = `${id}@${width}`;
  if (!blobCache.has(key)) blobCache.set(key, uploadPhoto(id, width));
  return blobCache.get(key);
}

async function uploadPhoto(id, width) {
  const pathname = `seed/${id}-w${width}.jpg`;
  try {
    const existing = await head(pathname, { token: BLOB_TOKEN });
    return existing.url;
  } catch {
    // not uploaded yet
  }
  const src = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80&fm=jpg`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(src);
    if (res.ok) {
      const body = Buffer.from(await res.arrayBuffer());
      const blob = await put(pathname, body, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: BLOB_TOKEN,
      });
      return blob.url;
    }
    if (attempt === 3) throw new Error(`Image ${id} failed to download: HTTP ${res.status}`);
  }
}

// ---------- image pools (Unsplash photo ids, all checked by hand) ----------
const POOL = {
  tee: ['1521572163474-6864f9cf17ab', '1529374255404-311a2a4f1fd9', '1562157873-818bc0726f68', '1564584217132-2271feaeb3c5',
    '1581655353564-df123a1eb820', '1586790170083-2f9ceadc732d', '1622445275463-afa2ab738c34', '1622519407650-3df9883f76a5',
    '1503341504253-dff4815485f1', '1503342217505-b0a15ec3261c', '1618354691373-d851c5c3a990', '1613852348851-df1739db8201',
    '1618517351616-38fb9c5210c6', '1554568218-0f1715e72254', '1588117305388-c2631a279f82', '1576871337622-98d48d1cf531',
    '1576566588028-4147f3842f27', '1489987707025-afc232f7ea0f', '1523381210434-271e8be1f52b'],
  hoodie: ['1556821840-3a63f95609a7', '1620799140408-edc6dcb6d633', '1578587018452-892bacefd3f2', '1517841905240-472988babdf9',
    '1515886657613-9f3515b0c78f', '1580331451062-99ff652288d7', '1475180098004-ca77a66827be'],
  shirt: ['1598032895397-b9472444bf93', '1558171813-4c088753af8f', '1596755094514-f87e34085b2c', '1602810318383-e386cc2a3ccf',
    '1603252109303-2751441dd157', '1620012253295-c15cc3e65df4'],
  jacket: ['1551028719-00167b16eac5', '1591047139829-d91aecb6caea', '1611312449408-fcece27cdbb7', '1617114919297-3c8ddb01f599',
    '1608234808654-2a8875faa7fd', '1552374196-1ab2a1c593e8', '1488426862026-3ee34a7d66df'],
  knit: ['1434389677669-e08b4cac3105', '1556905055-8f358a7a47b2', '1558769132-cb1aea458c5e', '1516762689617-e1cffcef479d'],
  lifestyle: ['1490481651871-ab68de25d43d', '1445205170230-053b83016050', '1512436991641-6745cdb1723f', '1467043237213-65f2da53396f',
    '1525507119028-ed4c629a60a3', '1544441893-675973e31985', '1495121605193-b116b5b9c5fe', '1551232864-3f0890e580d9',
    '1509631179647-0177331693ae', '1488161628813-04466f872be2'],
};
POOL.sweat = POOL.hoodie;

const GARMENT = {
  tee: { label: 'tee', price: 3299, variant: true },
  hoodie: { label: 'hoodie', price: 6499, variant: true },
  sweat: { label: 'sweatshirt', price: 4999, variant: true },
  shirt: { label: 'shirt', price: 4799, variant: false },
  jacket: { label: 'jacket', price: 9999, variant: false },
  knit: { label: 'knit', price: 6999, variant: false },
};

// ---------- planner data ----------
const categories = [
  { name: 'Poetry', description: 'Inspired by literary works and emotional expression.', image: '1455390582262-044cdead277a', featured: true },
  { name: 'Witty', description: 'Playful, humorous, and thought-provoking designs.', image: '1529374255404-311a2a4f1fd9', featured: true },
  { name: 'Fun', description: 'Lighthearted, casual, and trend-driven creations.', image: '1489987707025-afc232f7ea0f', featured: true },
  { name: 'Artistic', description: 'Experimental designs showcasing visual aesthetics.', image: '1460661419201-fd4cecdf8a8b', featured: false },
  { name: 'Creative', description: 'Innovative pieces combining cultural references with modern fashion.', image: '1490481651871-ab68de25d43d', featured: false },
];

const themes = [
  {
    id: 'southeastern-hymns', title: 'Southeastern Hymns', tagline: 'Regional heritage, harmony, and timeless song.',
    description: 'Celebrating regional heritage and musical traditions — qawwali nights, folk melodies and the instruments that carried them.',
    accent: 'from-amber-900/90 to-amber-500/10', cover: '1511671782779-c97d3d27a1d4',
    gallery: [['Mehfil Mic', '1511671782779-c97d3d27a1d4'], ['Strings', '1511379938547-c1f69419868d'], ['Vinyl Archive', '1511735111819-9a3f7709049c'],
      ['Gathering', '1472653816316-3ad6f10a6592'], ['Keys & Notes', '1497032205916-ac775f0649ae'], ['Joy', '1488521787991-ed7bbaae773c']],
  },
  {
    id: 'artistic-passion', title: 'Artistic Passion', tagline: 'Color-forward, expressive, and unapologetically creative.',
    description: 'Emphasizing self-expression and creativity — brushwork, bold palettes and truck-art energy translated into everyday wear.',
    accent: 'from-rose-900/90 to-rose-500/10', cover: '1460661419201-fd4cecdf8a8b',
    gallery: [['Brushwork', '1460661419201-fd4cecdf8a8b'], ['Abstract', '1541961017774-22349e4a1262'], ['Painted Face', '1547891654-e66ed7ebb968'],
      ['Still Life', '1579783902614-a3fb3927b6a5'], ['Colour Rack', '1489987707025-afc232f7ea0f'], ['Studio', '1513001900722-370f803f498d']],
  },
  {
    id: 'echoes-of-the-winds', title: 'Echoes of the Winds', tagline: 'Freedom, movement, and the poetry of nature.',
    description: 'Reflecting freedom, movement, and inspiration from nature — northern peaks, monsoon skies and the open road.',
    accent: 'from-sky-900/90 to-sky-500/10', cover: '1470071459604-3b5ec3a7fe05',
    gallery: [['Peaks', '1470071459604-3b5ec3a7fe05'], ['Falls', '1476610182048-b716b8518aae'], ['Lake House', '1470770841072-f978cf4d019e'],
      ['Haze', '1500534314209-a25ddb2bd429'], ['Dusk', '1495567720989-cebdbdd97913'], ['Night Sky', '1519681393784-d120267933ba']],
  },
  {
    id: 'uplifting-culture', title: 'Uplifting Culture', tagline: 'Joy, community, and positive narratives.',
    description: 'Highlighting positive cultural narratives and emotions — chai conversations, festivals and the warmth of togetherness.',
    accent: 'from-violet-900/90 to-violet-500/10', cover: '1511988617509-a57c8a288659',
    gallery: [['Together', '1511988617509-a57c8a288659'], ['Festival', '1472653816316-3ad6f10a6592'], ['Smiles', '1488521787991-ed7bbaae773c'],
      ['Records', '1511735111819-9a3f7709049c'], ['In Red', '1550614000-4895a10e1bfd'], ['The Rack', '1490481651871-ab68de25d43d']],
  },
];

const series = [
  {
    id: 'poets', title: 'Poets Series', tagline: 'Verses, voices, and enduring resonance.',
    description: 'Featuring works and inspirations from Ghalib, Faiz Ahmed Faiz, John Elia, Habib Jalib and Muneer Niazi — typography, ink and rhythm.',
    accent: 'from-stone-900/90 to-stone-600/10', cover: '1455390582262-044cdead277a',
    subitems: ['Ghalib', 'Faiz Ahmed Faiz', 'John Elia', 'Habib Jalib', 'Muneer Niazi'],
    gallery: [['Ink & Verse', '1455390582262-044cdead277a'], ['Notebook', '1471107340929-a87cd0f5b5f3'], ['Pages', '1457369804613-52c61a468e7d'],
      ['Quiet Reading', '1506880018603-83d5b814b5a6'], ['Library', '1481627834876-b7833e8f5570'], ['Heartbreak', '1516822003754-cca485356ecb']],
  },
  {
    id: 'alphabets', title: 'Alphabets Series', tagline: 'Scripts, strokes, and calligraphic form.',
    description: 'Showcasing scripts and calligraphy — Alif, Bay, Pay and beyond. Composition, motion and balance in every letterform.',
    accent: 'from-fuchsia-900/90 to-fuchsia-500/10', cover: '1457369804613-52c61a468e7d',
    subitems: ['Alif', 'Bay', 'Pay', 'Tay', 'Jeem'],
    gallery: [['Script Study', '1471107340929-a87cd0f5b5f3'], ['Qalam', '1455390582262-044cdead277a'], ['Letter Tee', '1521572163474-6864f9cf17ab'],
      ['Folded Forms', '1562157873-818bc0726f68'], ['Mark', '1618354691373-d851c5c3a990'], ['Hanging Type', '1581655353564-df123a1eb820']],
  },
  {
    id: 'cinema', title: 'Cinema Series', tagline: 'Frames, light, and iconic moments.',
    description: 'Inspired by iconic films and cinematic moments — from Lollywood posters to reel textures and the glow of the projector.',
    accent: 'from-rose-900/90 to-rose-500/10', cover: '1489599849927-2ee91cede3ba',
    subitems: ['Lollywood Classics', 'Golden Era', 'Noir', 'Poster Art'],
    gallery: [['Reels', '1440404653325-ab127d49abc1'], ['Projection', '1478720568477-152d9b164e26'], ['Take One', '1485846234645-a62644f84728'],
      ['Audience', '1524985069026-dd778a71c7b4'], ['Marquee', '1536440136628-849c177e76a1'], ['Velvet Seats', '1489599849927-2ee91cede3ba']],
  },
  {
    id: 'anime', title: 'Anime Series', tagline: 'Neon, motion, and character-driven worlds.',
    description: 'Celebrating characters, themes and aesthetics from anime culture — speed lines, glow and emotional silhouettes.',
    accent: 'from-violet-900/90 to-violet-500/10', cover: '1607604276583-eef5d076aa5f',
    subitems: ['Shonen', 'Studio Dreams', 'Mecha', 'Chibi'],
    gallery: [['Sketching', '1607604276583-eef5d076aa5f'], ['Cosplay', '1578632767115-351597cf2477'], ['Fuji', '1528164344705-47542687000d'],
      ['Painted', '1547891654-e66ed7ebb968'], ['Lucky Cat Tee', '1576566588028-4147f3842f27'], ['Bones Tee', '1503341504253-dff4815485f1']],
  },
];

// [name, category, garment, collectionType, collectionId, story]
const designs = [
  // Poets Series
  ['Ghalib "Hazaron Khwahishen" Tee', 'Poetry', 'tee', 'series', 'poets', 'A thousand desires, each worth dying for — Ghalib\'s most quoted line set in hand-drawn Nastaliq.'],
  ['Ghalib Ink Portrait Hoodie', 'Poetry', 'hoodie', 'series', 'poets', 'A brush-ink portrait of the master of the ghazal across a heavyweight hoodie.'],
  ['Faiz "Bol" Tee', 'Poetry', 'tee', 'series', 'poets', '"Bol ke lab azaad hain tere" — Faiz\'s call to speak, printed bold on the chest.'],
  ['Faiz Verse Oversized Sweatshirt', 'Poetry', 'sweat', 'series', 'poets', 'Stanzas from Faiz running down the sleeve of a relaxed crewneck.'],
  ['John Elia "Shayad" Tee', 'Poetry', 'tee', 'series', 'poets', 'Inspired by John Elia\'s debut collection — restless, tender and a little rebellious.'],
  ['John Elia Night Notes Hoodie', 'Poetry', 'hoodie', 'series', 'poets', 'Handwritten couplets scattered like late-night notes in a diary.'],
  ['Habib Jalib "Dastoor" Tee', 'Witty', 'tee', 'series', 'poets', 'Jalib\'s fearless verse on rules worth questioning, in stark black and white.'],
  ['Habib Jalib Protest Print Shirt', 'Creative', 'shirt', 'series', 'poets', 'An all-over print of hand-lettered placard type on a crisp overshirt.'],
  ['Muneer Niazi "Hamesha Der" Tee', 'Poetry', 'tee', 'series', 'poets', 'For everyone who is always a little late — Muneer Niazi\'s gentle confession.'],
  ['Muneer Niazi Dusk Verse Crewneck', 'Poetry', 'sweat', 'series', 'poets', 'A dusky gradient with Niazi\'s imagery of evenings and empty streets.'],
  // Alphabets Series
  ['Alif Calligraphy Tee', 'Artistic', 'tee', 'series', 'alphabets', 'The first letter, the first stroke — a single towering Alif in sumi ink.'],
  ['Bay Brushstroke Tee', 'Artistic', 'tee', 'series', 'alphabets', 'A sweeping Bay drawn in one confident brushstroke.'],
  ['Pay Script Hoodie', 'Creative', 'hoodie', 'series', 'alphabets', 'Pay repeated in rhythm across the back, like practice sheets from a khattati class.'],
  ['Tay Monogram Tee', 'Creative', 'tee', 'series', 'alphabets', 'A minimal Tay monogram embroidered at the chest.'],
  ['Jeem Swirl Sweatshirt', 'Artistic', 'sweat', 'series', 'alphabets', 'Jeem unfurled into a spiral of motion and balance.'],
  ['Noon Ghunna Tee', 'Fun', 'tee', 'series', 'alphabets', 'The nasal Noon gets its moment — playful, round and dotted.'],
  ['Meem Minimal Tee', 'Creative', 'tee', 'series', 'alphabets', 'Clean Meem letterform with generous negative space.'],
  ['Huroof Grid Overshirt', 'Creative', 'shirt', 'series', 'alphabets', 'The full Urdu alphabet laid out on a woven grid.'],
  ['Abjad Pocket Tee', 'Witty', 'tee', 'series', 'alphabets', 'A tiny Abjad chart peeking out of the pocket.'],
  ['Qalam Ink Denim Jacket', 'Artistic', 'jacket', 'series', 'alphabets', 'Denim jacket with a hand-painted qalam and ink-splash back panel.'],
  // Cinema Series
  ['Reel Frame Oversized Tee', 'Fun', 'tee', 'series', 'cinema', 'Film-strip frames wrapping around an oversized fit.'],
  ['Clapperboard Tee', 'Witty', 'tee', 'series', 'cinema', 'Scene one, take one — a clapperboard graphic for the everyday director.'],
  ['Matinee Show Hoodie', 'Fun', 'hoodie', 'series', 'cinema', 'Retro matinee ticket typography on a cosy hoodie.'],
  ['Silver Screen Bomber', 'Creative', 'jacket', 'series', 'cinema', 'A satin-finish bomber with marquee-light embroidery.'],
  ['Intermission Tee', 'Witty', 'tee', 'series', 'cinema', '"Interval" in old-cinema lettering — for the chai and samosa break.'],
  ['Director\'s Cut Tee', 'Witty', 'tee', 'series', 'cinema', 'For those who always have notes on the ending.'],
  ['Projector Light Sweatshirt', 'Artistic', 'sweat', 'series', 'cinema', 'A beam of projector light cutting across a dark crewneck.'],
  ['Cinema Ticket Tee', 'Fun', 'tee', 'series', 'cinema', 'A vintage admit-one ticket, row and seat included.'],
  ['Black & White Classics Shirt', 'Artistic', 'shirt', 'series', 'cinema', 'Monochrome stills from the golden era printed on a camp-collar shirt.'],
  ['Lollywood Poster Tee', 'Fun', 'tee', 'series', 'cinema', 'Hand-painted Lollywood poster style, loud and loving.'],
  // Anime Series
  ['Speed Lines Tee', 'Fun', 'tee', 'series', 'anime', 'Action-panel speed lines bursting from the centre.'],
  ['Chibi Chai Tee', 'Witty', 'tee', 'series', 'anime', 'A chibi character who refuses to start the day without chai.'],
  ['Neon Ronin Hoodie', 'Artistic', 'hoodie', 'series', 'anime', 'A lone wanderer under neon rain, screen-printed in glow ink.'],
  ['Sakura Wind Tee', 'Artistic', 'tee', 'series', 'anime', 'Cherry blossoms caught mid-gust across the shoulder.'],
  ['Mecha Sketch Sweatshirt', 'Creative', 'sweat', 'series', 'anime', 'Blueprint-style mecha line art with annotation details.'],
  ['Ramen Run Tee', 'Fun', 'tee', 'series', 'anime', 'Midnight ramen runs, drawn in classic manga style.'],
  ['Kawaii Karachi Tee', 'Witty', 'tee', 'series', 'anime', 'Karachi street life reimagined with kawaii characters.'],
  ['Shonen Spirit Hoodie', 'Fun', 'hoodie', 'series', 'anime', 'Never-give-up energy with bold shonen-style lettering.'],
  ['Manga Panel Shirt', 'Creative', 'shirt', 'series', 'anime', 'All-over manga panels on a relaxed button-down.'],
  ['Spirit Lantern Tee', 'Artistic', 'tee', 'series', 'anime', 'Floating paper lanterns guiding lost spirits home.'],
  // Southeastern Hymns
  ['Qawwali Nights Tee', 'Poetry', 'tee', 'theme', 'southeastern-hymns', 'Clapping hands and harmonium keys from a night-long mehfil.'],
  ['Harmonium Hoodie', 'Artistic', 'hoodie', 'theme', 'southeastern-hymns', 'A detailed line drawing of the harmonium, heart of every mehfil.'],
  ['Raag Bhairavi Shirt', 'Creative', 'shirt', 'theme', 'southeastern-hymns', 'Morning raag notation woven into a subtle tonal print.'],
  ['Sufi Whirl Sweatshirt', 'Poetry', 'sweat', 'theme', 'southeastern-hymns', 'The whirling dervish in motion, rendered in a single continuous line.'],
  ['Folk Tappay Tee', 'Fun', 'tee', 'theme', 'southeastern-hymns', 'Punjabi tappay verses with folk-art borders.'],
  // Artistic Passion
  ['Truck Art Tee', 'Artistic', 'tee', 'theme', 'artistic-passion', 'Pakistani truck-art florals and mirrorwork, straight off the GT Road.'],
  ['Paint Splash Hoodie', 'Fun', 'hoodie', 'theme', 'artistic-passion', 'Every hoodie is splash-dyed, so no two are the same.'],
  ['Canvas Utility Jacket', 'Creative', 'jacket', 'theme', 'artistic-passion', 'A canvas work jacket built for the studio, with brush-loop pockets.'],
  ['Sketchbook Tee', 'Witty', 'tee', 'theme', 'artistic-passion', 'Doodles from the margins of a well-loved sketchbook.'],
  ['Palette Knit Sweater', 'Artistic', 'knit', 'theme', 'artistic-passion', 'Colour-blocked knit inspired by a painter\'s palette.'],
  // Echoes of the Winds
  ['Mountain Breeze Tee', 'Poetry', 'tee', 'theme', 'echoes-of-the-winds', 'Northern peaks with a line of verse carried on the wind.'],
  ['Monsoon Hoodie', 'Creative', 'hoodie', 'theme', 'echoes-of-the-winds', 'Rain-streak print for the season everyone waits for.'],
  ['Hawa Hawa Overshirt', 'Witty', 'shirt', 'theme', 'echoes-of-the-winds', 'A breezy overshirt with a wink to the classic pop anthem.'],
  ['Basant Kite Tee', 'Fun', 'tee', 'theme', 'echoes-of-the-winds', 'Kites and strings from a Lahori Basant afternoon.'],
  ['Northern Trails Jacket', 'Creative', 'jacket', 'theme', 'echoes-of-the-winds', 'A trail-ready jacket with a topographic lining.'],
  // Uplifting Culture
  ['Chai Pe Charcha Tee', 'Witty', 'tee', 'theme', 'uplifting-culture', 'Every great conversation starts over chai.'],
  ['Dhol Beat Tee', 'Fun', 'tee', 'theme', 'uplifting-culture', 'The dhol that turns any gathering into a celebration.'],
  ['Rang Barangi Hoodie', 'Witty', 'hoodie', 'theme', 'uplifting-culture', 'A riot of colour for people who refuse to be beige.'],
  ['Mehfil Sweatshirt', 'Poetry', 'sweat', 'theme', 'uplifting-culture', 'Friends, verse and late nights — the mehfil in one print.'],
  ['Apna Culture Tee', 'Witty', 'tee', 'theme', 'uplifting-culture', 'Proud, playful and unmistakably ours.'],
];

const COLORS = [
  { name: 'Black', hex: '#111111' }, { name: 'White', hex: '#F5F5F5' }, { name: 'Navy', hex: '#1F2A44' },
  { name: 'Olive', hex: '#6B6B3A' }, { name: 'Maroon', hex: '#6D1A2A' }, { name: 'Beige', hex: '#D9C7A7' },
];
const SIZES = ['S', 'M', 'L', 'XL'];

const pick = (arr, i) => arr[i % arr.length];

async function buildProduct([name, category, garment, collectionType, collectionId, story], i) {
  const g = GARMENT[garment];
  const pool = POOL[garment];
  const imageIds = [pick(pool, i), pick(pool, i + 3), pick(POOL.lifestyle, i)];
  if (pick(pool, i + 3) === imageIds[0]) imageIds[1] = pick(pool, i + 1);
  const bannerUrls = await Promise.all(imageIds.map((id) => img(id, 1200)));
  const price = g.price + (i % 3) * 200;
  const discountedPrice = i % 4 === 1 ? Math.round((price * 0.85) / 10) * 10 : undefined;
  const code = slugify(name).split('-').map((w) => w[0]).join('').toUpperCase().slice(0, 5);

  const base = {
    name,
    slug: slugify(name),
    category,
    price,
    discountedPrice,
    status: 'published',
    featured: i % 5 === 0,
    thumbnailUrl: bannerUrls[0],
    bannerUrls,
    collectionType,
    collectionId,
    shortDescription: story,
    description: `<p>${story}</p><p>Designed in-house by the Silsila studio and printed in small batches. Pre-washed for a soft hand-feel and a fit that stays true after every wash.</p>`,
    features: 'Premium combed cotton; Pre-washed and pre-shrunk; Small-batch screen print; Designed and made in Pakistan',
    metaTitle: `${name} | Silsila`.slice(0, 120),
    metaDescription: `${story} Shop the ${name} from Silsila.`.slice(0, 320),
    metaKeywords: `silsila, ${category.toLowerCase()}, ${g.label}, ${collectionId}`,
  };
  if (!g.variant) return { ...base, productType: 'single', stock: 15 + (i % 20), variants: [] };

  const colors = [pick(COLORS, i), pick(COLORS, i + 2), pick(COLORS, i + 4)];
  const variants = [];
  colors.forEach((c) => SIZES.forEach((size, si) => {
    const extra = size === 'XL' ? 200 : 0;
    variants.push({
      variantId: `${code}-${c.name.slice(0, 3).toUpperCase()}-${size}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      sku: `${code}-${c.name.slice(0, 3).toUpperCase()}-${size}`,
      color: c.name,
      size,
      price: price + extra,
      discountedPrice: discountedPrice ? discountedPrice + extra : undefined,
      stock: 3 + ((i + si) % 9),
    });
  }));
  return { ...base, productType: 'variant', stock: variants.reduce((n, v) => n + v.stock, 0), variants };
}

const heroSlides = [
  { title: 'Wear the Story', description: 'A casual clothing line woven with cultural roots, values and emotions — creativity that uplifts your vibe, aura and style.',
    image: '1490481651871-ab68de25d43d', buttonText: 'Shop Now', buttonLink: '/shop', secondButtonText: 'Explore Themes', secondButtonLink: '/themes', ariaLabel: 'Silsila collection on a rail' },
  { title: 'The Poets Series', description: 'Ghalib, Faiz, John Elia, Habib Jalib and Muneer Niazi — verses you can wear.',
    image: '1455390582262-044cdead277a', buttonText: 'Shop the Series', buttonLink: '/shop?collection=series&collectionId=poets', secondButtonText: 'All Series', secondButtonLink: '/series', ariaLabel: 'Fountain pen writing verse' },
  { title: 'Alphabets in Motion', description: 'Alif, Bay, Pay and beyond — calligraphy reimagined as everyday streetwear.',
    image: '1471107340929-a87cd0f5b5f3', buttonText: 'Shop Alphabets', buttonLink: '/shop?collection=series&collectionId=alphabets', secondButtonText: 'Lookbook', secondButtonLink: '/lookbook', ariaLabel: 'Notebook and pen' },
  { title: 'The First Drop Is Here', description: 'Free shipping across Pakistan on orders over Rs 5,000. Cash on delivery available.',
    image: '1445205170230-053b83016050', buttonText: 'New Arrivals', buttonLink: '/new-arrivals', secondButtonText: 'Trending', secondButtonLink: '/trending', ariaLabel: 'Silsila store rail' },
];

const blogCategories = [
  { name: 'Culture', description: 'Heritage, music and the stories behind our prints.' },
  { name: 'Poetry', description: 'The poets and verses that shape Silsila.' },
  { name: 'Craft', description: 'How Silsila pieces are designed and made.' },
  { name: 'Style', description: 'Styling notes and lookbook edits.' },
];

// The planner's 10 blog/content ideas.
const blogPosts = [
  ['Why We Print Poetry on Cotton', 'Poetry', '1455390582262-044cdead277a', ['poetry', 'brand', 'story'],
    'Silsila began with a simple question: what if the verses we grew up with could be worn, not just recited? This is the story of why poetry sits at the heart of our first collection.'],
  ['Ghalib for Beginners: Five Couplets to Know', 'Poetry', '1457369804613-52c61a468e7d', ['ghalib', 'poets-series', 'urdu'],
    'Mirza Ghalib wrote about longing, wit and the absurdity of life with a lightness that still feels modern. Here are five couplets that inspired our Poets Series.'],
  ['Inside the Alphabets Series', 'Craft', '1471107340929-a87cd0f5b5f3', ['calligraphy', 'alphabets', 'design'],
    'From Alif to Yay, each letter carries centuries of calligraphic tradition. We sat down with our design team to talk about turning letterforms into prints.'],
  ['From Sketch to Screen Print', 'Craft', '1460661419201-fd4cecdf8a8b', ['process', 'printing', 'craft'],
    'Every Silsila design goes through sketching, line art, colour mockups and tech packs before it reaches the screen-printing table. Here is the full journey.'],
  ['The Sounds Behind Southeastern Hymns', 'Culture', '1511671782779-c97d3d27a1d4', ['music', 'qawwali', 'themes'],
    'Qawwali, folk tappay and the harmonium — the music of our region shaped the first of our four themes. A listening guide to go with the collection.'],
  ['Five Ways to Style an Oversized Tee', 'Style', '1483985988355-763728e1935b', ['styling', 'tees', 'lookbook'],
    'Tucked, layered, under an overshirt or with a shalwar — the oversized tee is the most versatile piece in your wardrobe. Five looks to try this season.'],
  ['Lollywood Posters and the Cinema Series', 'Culture', '1489599849927-2ee91cede3ba', ['cinema', 'lollywood', 'series'],
    'Hand-painted cinema posters were Pakistan\'s first street art. Our Cinema Series pays tribute to the painters, the marquees and the golden era of film.'],
  ['Layering for Lahore Winters', 'Style', '1509631179647-0177331693ae', ['winter', 'layering', 'hoodies'],
    'Lahore winters are short but sharp. How to layer hoodies, knits and overshirts so you are warm in the morning and comfortable by afternoon.'],
  ['Caring for Your Printed Tees', 'Craft', '1523381210434-271e8be1f52b', ['care', 'guide', 'tees'],
    'Wash inside out, skip the tumble dryer and never iron directly on the print. A short guide to keeping your Silsila pieces looking new for years.'],
  ['Uplifting Culture: Stories from Our Community', 'Culture', '1511988617509-a57c8a288659', ['community', 'culture', 'themes'],
    'Chai conversations, Basant kites and Sunday dhol — we asked our community what culture means to them. Their answers shaped our Uplifting Culture theme.'],
];

async function seed() {
  if (!MONGO_URI) throw new Error('MONGO_URI is not set');
  if (!BLOB_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  console.log(`✅ Connected to MongoDB Database: ${mongoose.connection.name}`);

  const models = { HeroSlide, Category, Color, Size, Theme, Series, Product, BlogCategory, Author, Blog, BlogHero };
  const counts = {};
  for (const [name, M] of Object.entries(models)) counts[name] = await M.countDocuments();
  console.log('📋 Existing documents that will be replaced:', counts);
  if (DRY_RUN) return;

  console.log('☁️  Uploading images to Vercel Blob...');
  const [heroImages, categoryImages, themeDocs, seriesDocs] = await Promise.all([
    Promise.all(heroSlides.map((s) => img(s.image, 1920))),
    Promise.all(categories.map((c) => img(c.image, 1200))),
    Promise.all(themes.map(async (t) => ({
      id: t.id, title: t.title, tagline: t.tagline, description: t.description, accent: t.accent,
      cover: await img(t.cover, 1600),
      gallery: await Promise.all(t.gallery.map(async ([title, id]) => ({ title, image: await img(id, 1200) }))),
    }))),
    Promise.all(series.map(async (s) => ({
      id: s.id, title: s.title, tagline: s.tagline, description: s.description, accent: s.accent,
      cover: await img(s.cover, 1600),
      subitems: s.subitems.map((title) => ({ title, href: `/shop?collection=series&collectionId=${s.id}` })),
      gallery: await Promise.all(s.gallery.map(async ([title, id]) => ({ title, image: await img(id, 1200) }))),
    }))),
  ]);
  const products = [];
  for (let i = 0; i < designs.length; i += 10) {
    products.push(...await Promise.all(designs.slice(i, i + 10).map((d, j) => buildProduct(d, i + j))));
  }
  const blogImages = await Promise.all(blogPosts.map(([, , id]) => Promise.all([img(id, 1600), img(id, 600)])));
  const authorAvatar = await img('1488161628813-04466f872be2', 300);
  const blogHeroImage = await img('1457369804613-52c61a468e7d', 1920);
  console.log(`☁️  ${blobCache.size} images ready in Blob`);

  // Real product mockup uploaded by the client: lead the catalogue with it.
  products.unshift({
    name: 'Silsila Signature Tee', slug: 'silsila-signature-tee', category: 'Creative', price: 3999, status: 'published', featured: true,
    thumbnailUrl: SIGNATURE_TEE, bannerUrls: [SIGNATURE_TEE], collectionType: 'theme', collectionId: 'uplifting-culture',
    shortDescription: 'The tee that started it all — the Silsila mark in gold calligraphy on a washed charcoal oversized fit.',
    description: '<p>The tee that started it all — the Silsila mark in gold calligraphy on a washed charcoal oversized fit.</p><p>Heavyweight cotton, dropped shoulders and a print that ages beautifully.</p>',
    features: 'Heavyweight cotton; Oversized fit; Gold calligraphy print; Designed and made in Pakistan',
    metaTitle: 'Silsila Signature Tee | Silsila', metaDescription: 'The Silsila mark in gold calligraphy on a washed charcoal oversized tee.', metaKeywords: 'silsila, signature, tee',
    productType: 'variant',
    variants: SIZES.map((size, si) => ({ variantId: `SST-BLA-${size}`, sku: `SST-BLA-${size}`, color: 'Black', size, price: 3999, stock: 10 + si })),
    stock: 46,
  });

  for (const M of Object.values(models)) await M.deleteMany({});
  console.log('🗑️  Cleared previous demo content');

  await HeroSlide.insertMany(heroSlides.map(({ image, ...s }, i) => ({ ...s, imageUrl: heroImages[i], isActive: true, order: i + 1 })));
  await Category.insertMany(categories.map(({ image, ...c }, i) => ({ ...c, slug: slugify(c.name), thumbnailUrl: categoryImages[i], bannerUrl: categoryImages[i], active: true })));
  await Color.insertMany(COLORS.map((c) => ({ ...c, slug: slugify(c.name), active: true })));
  await Size.insertMany(SIZES.map((name) => ({ name, slug: slugify(name), active: true })));
  await Theme.insertMany(themeDocs.map((t, i) => ({ ...t, isActive: true, order: i + 1 })));
  await Series.insertMany(seriesDocs.map((s, i) => ({ ...s, isActive: true, order: i + 1 })));
  // Stagger createdAt so "latest" ordering is stable and the signature tee is newest.
  const now = Date.now();
  await Product.insertMany(products.map((p, i) => ({ ...p, createdAt: new Date(now - i * 60000), updatedAt: new Date(now - i * 60000) })));

  const cats = await BlogCategory.insertMany(blogCategories.map((c) => ({ ...c, slug: slugify(c.name), active: true })));
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c]));
  const author = await Author.create({ name: 'Silsila Studio', email: 'studio@silsilla.pk', bio: 'The design team behind Silsila.', avatar: authorAvatar, active: true });
  // insertMany keeps our clean slugs (Blog's save hook would append a timestamp).
  await Blog.insertMany(blogPosts.map(([title, catName, , tags, intro], i) => ({
    title,
    slug: slugify(title),
    content: `<p>${intro}</p><h2>Where it started</h2><p>Every Silsila piece starts with a story — a verse, a letterform, a frame from a film — and ends as something you can wear every day. We dig through archives, family albums and old bookshops to find references that feel personal and timeless.</p><h2>How it comes together</h2><p>Our designs move from rough sketches to refined line art, then colour mockups in the brand palette, typography and calligraphy, and finally tech packs for production. Each step is reviewed by the whole studio.</p><blockquote>Clothing woven with cultural roots, values and emotions.</blockquote><h2>Wear it your way</h2><p>Pair it with denim, layer it under an overshirt, or wear it with a shalwar for a look that is unmistakably yours. Explore the full collection in the <a href="/shop">shop</a>.</p>`,
    categoryId: catByName[catName]._id,
    status: 'published',
    featured: i < 3,
    image: blogImages[i][0],
    thumbnail: blogImages[i][1],
    author: author._id,
    tags,
    views: 120 + i * 37,
    metaTitle: `${title} | Silsila Journal`.slice(0, 120),
    metaDescription: intro.slice(0, 320),
    metaKeywords: tags.join(', '),
    createdAt: new Date(now - i * 86400000),
    updatedAt: new Date(now - i * 86400000),
  })));
  await Author.updateOne({ _id: author._id }, { blogCount: blogPosts.length });
  await BlogHero.create({
    title: 'The Silsila Journal', subtitle: 'Culture, craft and the making of Silsila — behind the prints, palettes and fits.',
    backgroundImage: blogHeroImage, primaryButtonText: 'Shop the Collection', primaryButtonLink: '/shop',
    secondaryButtonText: 'Our Story', secondaryButtonLink: '/about', isActive: true, sortOrder: 1,
  });

  await Settings.findOneAndUpdate({}, {
    siteName: 'Silsila', siteUrl: 'https://www.silsilla.pk', logoUrl: '/images/silsila-logo.png', timezone: 'UTC+05:00',
    dateFormat: 'DD/MM/YYYY', currency: 'PKR', paymentMethods: ['credit_card', 'stripe'],
    instagramUrl: 'https://instagram.com/silsila.pk', facebookUrl: 'https://facebook.com/silsila.pk', youtubeUrl: 'https://youtube.com/@silsila.pk',
    isActive: true,
  }, { upsert: true, setDefaultsOnInsert: true, runValidators: true });

  const perCategory = {};
  products.forEach((p) => { perCategory[p.category] = (perCategory[p.category] || 0) + 1; });
  console.log(`🌱 Seeded ${heroSlides.length} hero slides, ${categories.length} categories, ${themes.length} themes, ${series.length} series, ${products.length} products, ${blogPosts.length} blogs, 1 blog hero, settings`);
  console.log('   Products per category:', perCategory);
}

seed()
  .catch((e) => { console.error('❌ Seeding failed:', e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
