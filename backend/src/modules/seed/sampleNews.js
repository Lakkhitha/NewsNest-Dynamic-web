const categories = [
  "world",
  "politics",
  "technology",
  "sports",
  "health",
  "business",
  "science",
  "climate",
];

const pexelsImages = [
  "https://images.pexels.com/photos/261949/pexels-photo-261949.jpeg",
  "https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg",
  "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg",
  "https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg",
  "https://images.pexels.com/photos/4427611/pexels-photo-4427611.jpeg",
  "https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg",
  "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg",
  "https://images.pexels.com/photos/7567537/pexels-photo-7567537.jpeg",
  "https://images.pexels.com/photos/2570063/pexels-photo-2570063.jpeg",
  "https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg",
];

const headlinePartsA = [
  "Regional council approves",
  "Researchers publish",
  "Emergency teams coordinate",
  "Startup alliance launches",
  "Public health officers announce",
  "Education board confirms",
  "Energy ministry outlines",
  "Community leaders debate",
  "Transport authority expands",
  "Global summit highlights",
];

const headlinePartsB = [
  "new accountability framework",
  "rapid response policy",
  "cross-border data initiative",
  "citizen safety protocol",
  "mobile-first digital rollout",
  "sustainable finance package",
  "critical infrastructure review",
  "youth innovation challenge",
  "early warning dashboard",
  "climate adaptation roadmap",
];

function randomFrom(list, seed) {
  return list[seed % list.length];
}

export function generateSampleNews(total = 120) {
  const rows = [];

  for (let i = 1; i <= total; i += 1) {
    const category = randomFrom(categories, i * 13);
    const hoursAgo = i % 72;
    const imageUrl = pexelsImages[i % pexelsImages.length];
    const title = `${randomFrom(headlinePartsA, i * 7)} ${randomFrom(headlinePartsB, i * 11)}`;

    rows.push({
      title: `${title} #${i}`,
      body: `Detailed update ${i}: This report summarizes verified developments, context from local sources, and why the event matters to the public right now.`,
      source_url: `https://source.unsplash.com/featured/1200x800/?${category},news&sig=${i}`,
      image_url: imageUrl,
      category,
      quality_score: 55 + (i % 40),
      created_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });
  }

  return rows;
}
