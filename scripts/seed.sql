-- AlphaMinds Commons Seed Data

-- Houses
INSERT OR IGNORE INTO houses (id, name, tagline, description, icon_emoji, color_hex, weekly_theme, sort_order)
VALUES
  ('becoming',   'House of Becoming',   'Grow Well.',   'Career, leadership, purpose, transformation, personal growth.', '🏔', '#6366F1', 'monday',    1),
  ('connection', 'House of Connection', 'Love Well.',   'Friendships, relationships, family, community.',                '🤝', '#EC4899', 'wednesday', 2),
  ('wellness',   'House of Wellness',   'Live Well.',   'Physical health, mental health, recovery, fitness.',            '🌱', '#10B981', 'thursday',  3),
  ('fun',        'House of Fun',        'Enjoy Well.',  'Music, dance, games, adventures, and creative expression.',    '🎭', '#F59E0B', 'friday',    4),
  ('humanity',   'House of Humanity',   'Serve Well.',  'Volunteering, service, mentoring, humanitarian impact.',       '💚', '#EF4444', 'sunday',    5);

-- Global chapter
INSERT OR IGNORE INTO chapters (id, slug, name, type, timezone)
VALUES ('global', 'global', 'AlphaMinds Global', 'global', 'UTC');

-- Rooms
INSERT OR IGNORE INTO rooms (chapter_id, house, name, slug, description, is_active)
VALUES
  ('global', 'becoming',   'Vision Board Room',       'vision-board-room',       'The Vision Board Room for becoming house.', 1),
  ('global', 'becoming',   'Goal Crushers',           'goal-crushers',           'The Goal Crushers for becoming house.', 1),
  ('global', 'connection', 'Circle of Trust',         'circle-of-trust',         'The Circle of Trust for connection house.', 1),
  ('global', 'connection', 'Book Club',               'book-club',               'The Book Club for connection house.', 1),
  ('global', 'wellness',   'BeatLift Room',           'beatlift-room',           'The BeatLift Room for wellness house.', 1),
  ('global', 'wellness',   'Mindful Mornings',        'mindful-mornings',        'The Mindful Mornings for wellness house.', 1),
  ('global', 'fun',        'Adventure Squad',         'adventure-squad',         'The Adventure Squad for fun house.', 1),
  ('global', 'humanity',   'Volunteer Hub',           'volunteer-hub',           'The Volunteer Hub for humanity house.', 1);

-- Challenges
INSERT OR IGNORE INTO challenges (house, title, slug, description, challenge_type, metric_type, target_value, points_reward, min_tier, is_active)
VALUES
  ('wellness', 'Walking Challenge', 'walking-challenge', 'Complete the Walking Challenge daily.', 'daily', 'steps', 5000, 10, 'free', 1),
  ('becoming', 'Reading Challenge', 'reading-challenge', 'Complete the Reading Challenge daily.', 'daily', 'pages', 10, 10, 'free', 1),
  ('connection', 'Gratitude Challenge', 'gratitude-challenge', 'Complete the Gratitude Challenge daily.', 'daily', 'entries', 1, 10, 'free', 1);

-- Admin member (password: Test12345)
INSERT OR IGNORE INTO members (id, email, username, display_name, password_hash, primary_house, role, is_active, email_verified)
VALUES ('admin-0000-0000-0000-000000000001', 'admin@alphaminds.com', 'admin', 'AlphaMinds Admin', '$2a$12$bkNKxfI1SmPRx45XVxOjN.ZJbEYkCdzGQTHkgbXczd6f7kr2PUIiC', 'becoming', 'admin', 1, 1);

-- Admin stats
INSERT OR IGNORE INTO member_stats (member_id) VALUES ('admin-0000-0000-0000-000000000001');

-- Admin house selection
INSERT OR IGNORE INTO member_house_selections (member_id, house, is_primary)
VALUES ('admin-0000-0000-0000-000000000001', 'becoming', 1);

-- Admin subscription
INSERT OR IGNORE INTO subscriptions (member_id, tier, status)
VALUES ('admin-0000-0000-0000-000000000001', 'free', 'active');
