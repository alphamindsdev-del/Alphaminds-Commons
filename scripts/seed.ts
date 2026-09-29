import bcrypt from 'bcryptjs';

interface Env {
  DB: D1Database;
}

export async function seedDatabase(env: Env): Promise<void> {
  const passwordHash = await bcrypt.hash('admin123', 12);

  // Houses (5 rows)
  await env.DB.prepare(`
    INSERT OR IGNORE INTO houses (id, name, tagline, description, icon_emoji, color_hex, weekly_theme, sort_order)
    VALUES
      ('becoming',   'House of Becoming',   'Grow Well.',   'Career, leadership, purpose, transformation, personal growth.', '🏔', '#6366F1', 'monday',    1),
      ('connection', 'House of Connection', 'Love Well.',   'Friendships, relationships, family, community.',                '🤝', '#EC4899', 'wednesday', 2),
      ('wellness',   'House of Wellness',   'Live Well.',   'Physical health, mental health, recovery, fitness.',            '🌱', '#10B981', 'thursday',  3),
      ('fun',        'House of Fun',        'Enjoy Well.',  'Music, dance, games, adventures, and creative expression.',    '🎭', '#F59E0B', 'friday',    4),
      ('humanity',   'House of Humanity',   'Serve Well.',  'Volunteering, service, mentoring, humanitarian impact.',       '💚', '#EF4444', 'sunday',    5)
  `).run();

  // Global chapter
  await env.DB.prepare(`
    INSERT OR IGNORE INTO chapters (id, slug, name, type, timezone)
    VALUES ('global', 'global', 'AlphaMinds Global', 'global', 'UTC')
  `).run();

  // 8 rooms (covering all 5 houses, at least 1 per house)
  const rooms = [
    { house: 'becoming',   name: 'Vision Board Room',       slug: 'vision-board-room',       chapter_id: 'global' },
    { house: 'becoming',   name: 'Goal Crushers',           slug: 'goal-crushers',           chapter_id: 'global' },
    { house: 'connection', name: 'Circle of Trust',         slug: 'circle-of-trust',         chapter_id: 'global' },
    { house: 'connection', name: 'Book Club',               slug: 'book-club',               chapter_id: 'global' },
    { house: 'wellness',   name: 'BeatLift Room',           slug: 'beatlift-room',           chapter_id: 'global' },
    { house: 'wellness',   name: 'Mindful Mornings',        slug: 'mindful-mornings',        chapter_id: 'global' },
    { house: 'fun',        name: 'Adventure Squad',         slug: 'adventure-squad',         chapter_id: 'global' },
    { house: 'humanity',   name: 'Volunteer Hub',           slug: 'volunteer-hub',           chapter_id: 'global' },
  ];

  for (const room of rooms) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO rooms (chapter_id, house, name, slug, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(room.chapter_id, room.house, room.name, room.slug, `The ${room.name} for ${room.house} house.`).run();
  }

  // 3 challenges
  const challenges = [
    { house: 'wellness', title: 'Walking Challenge', slug: 'walking-challenge', challenge_type: 'daily', metric_type: 'steps', target_value: 5000, points_reward: 10, min_tier: 'free' },
    { house: 'becoming', title: 'Reading Challenge', slug: 'reading-challenge', challenge_type: 'daily', metric_type: 'pages', target_value: 10, points_reward: 10, min_tier: 'free' },
    { house: 'connection', title: 'Gratitude Challenge', slug: 'gratitude-challenge', challenge_type: 'daily', metric_type: 'entries', target_value: 1, points_reward: 10, min_tier: 'free' },
  ];

  for (const c of challenges) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO challenges (house, title, slug, description, challenge_type, metric_type, target_value, points_reward, min_tier, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(c.house, c.title, c.slug, `Complete the ${c.title} daily.`, c.challenge_type, c.metric_type, c.target_value, c.points_reward, c.min_tier).run();
  }

  // 7 daily content items (one per day of week matching weekly themes)
  const dailyContentItems = [
    { house: 'becoming',   content_type: 'insight',       title: 'Monday Motivation',      body: 'Start your week with purpose. Set one intention that aligns with your long-term vision.',                    day_of_week: 'monday' },
    { house: 'global',     content_type: 'challenge',     title: 'Learning Tuesday',       body: 'Learn something new today. Read an article, watch a TED talk, or take an online course.',                   day_of_week: 'tuesday' },
    { house: 'connection', content_type: 'question',      title: 'Connection Wednesday',   body: 'Reach out to someone you care about. Send a message, make a call, or plan a meetup.',                     day_of_week: 'wednesday' },
    { house: 'wellness',   content_type: 'wellness_tip',  title: 'Wellness Thursday',      body: 'Prioritize your health today. Take a walk, stretch, meditate, or prepare a healthy meal.',               day_of_week: 'thursday' },
    { house: 'fun',        content_type: 'challenge',     title: 'Fun Friday',             body: 'Do something fun today. Play a game, try a new hobby, laugh with friends, or explore somewhere new.',  day_of_week: 'friday' },
    { house: 'global',     content_type: 'insight',       title: 'Saturday Reflection',    body: 'Reflect on your week. What went well? What did you learn? What are you grateful for?',                    day_of_week: 'saturday' },
    { house: 'humanity',   content_type: 'humanity_action', title: 'Serve Sunday',         body: 'Make a difference today. Volunteer, help a neighbor, donate, or simply show kindness to a stranger.',   day_of_week: 'sunday' },
  ];

  for (const dc of dailyContentItems) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO daily_content (house, content_type, title, body, day_of_week, is_published)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(dc.house, dc.content_type, dc.title, dc.body, dc.day_of_week).run();
  }

  // Admin member
  const adminId = 'admin-0000-0000-0000-000000000001';
  await env.DB.prepare(`
    INSERT OR IGNORE INTO members (id, email, username, display_name, password_hash, primary_house, role, is_active, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
  `).bind(adminId, 'admin@alphaminds.com', 'admin', 'AlphaMinds Admin', passwordHash, 'becoming', 'admin').run();

  // Admin stats
  await env.DB.prepare(`
    INSERT OR IGNORE INTO member_stats (member_id) VALUES (?)
  `).bind(adminId).run();

  // Admin house selection
  await env.DB.prepare(`
    INSERT OR IGNORE INTO member_house_selections (member_id, house, is_primary)
    VALUES (?, 'becoming', 1)
  `).bind(adminId).run();

  // Admin subscription
  await env.DB.prepare(`
    INSERT OR IGNORE INTO subscriptions (member_id, tier, status)
    VALUES (?, 'free', 'active')
  `).bind(adminId).run();

  console.log('Database seeded successfully.');
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  console.log('Seed script needs D1 binding. Run via: npx wrangler d1 execute alphaminds-commons-preview --local --file=scripts/seed.sql');
}

main().catch(console.error);
