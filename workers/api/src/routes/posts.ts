import { Hono } from 'hono';
import { Env, SessionPayload } from '../../../shared/types.js';
import { ERROR_CODES } from '../../../shared/constants.js';
import { CreatePostSchema, CreatePostInput, CreateCommentSchema, CreateCommentInput, ChangeReactionSchema, ChangeReactionInput } from '../lib/validation.js';
import { authMiddleware, getSession } from '../middleware/auth.js';

type AuthEnv = { Bindings: Env; Variables: { session: SessionPayload } };

export const roomPostsRouter = new Hono<{ Bindings: Env }>();

roomPostsRouter.get('/:roomId/posts', authMiddleware, async (c) => {
  const { roomId } = c.req.param();
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = `SELECT p.*, m.username, m.display_name, m.avatar_r2_key
                FROM posts p
                JOIN members m ON p.author_id = m.id
                WHERE p.room_id = ? AND p.deleted_at IS NULL AND p.id > ?
                ORDER BY p.id ASC LIMIT ?`;
    bindParams = [roomId, cursor, actualLimit];
  } else {
    queryStr = `SELECT p.*, m.username, m.display_name, m.avatar_r2_key
                FROM posts p
                JOIN members m ON p.author_id = m.id
                WHERE p.room_id = ? AND p.deleted_at IS NULL
                ORDER BY p.id ASC LIMIT ?`;
    bindParams = [roomId, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).id : null,
      has_more: hasMore,
      limit,
    },
  });
});

roomPostsRouter.post('/:roomId/posts', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { roomId } = c.req.param();
  const body = await c.req.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data as CreatePostInput;
  const now = new Date().toISOString();
  const postId = crypto.randomUUID();
  const member = await c.env.DB.prepare(
    'SELECT primary_house, chapter_id FROM members WHERE id = ? AND deleted_at IS NULL'
  ).bind(session.member_id).first<{ primary_house: string; chapter_id: string | null }>();

  if (!member) {
    return c.json({ error: 'Member not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'INSERT INTO posts (id, room_id, author_id, chapter_id, house, content, post_type, media_r2_keys, reaction_count, comment_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)'
  ).bind(postId, roomId, session.member_id, member.chapter_id, member.primary_house, input.content, input.post_type, input.media_r2_keys?.length ? JSON.stringify(input.media_r2_keys) : null, now, now).run();

  await c.env.DB.prepare(
    'UPDATE member_stats SET total_points = total_points + 2, posts_authored = posts_authored + 1, updated_at = ? WHERE member_id = ?'
  ).bind(now, session.member_id).run();

  const post = await c.env.DB.prepare(
    `SELECT p.*, m.username, m.display_name, m.avatar_r2_key
     FROM posts p
     JOIN members m ON p.author_id = m.id
     WHERE p.id = ?`
  ).bind(postId).first();

  return c.json(post, 201);
});

export const postsRouter = new Hono<{ Bindings: Env }>();

postsRouter.get('/:postId', authMiddleware, async (c) => {
  const { postId } = c.req.param();

  const post = await c.env.DB.prepare(
    `SELECT p.*, m.username, m.display_name, m.avatar_r2_key
     FROM posts p
     JOIN members m ON p.author_id = m.id
     WHERE p.id = ? AND p.deleted_at IS NULL`
  ).bind(postId).first();

  if (!post) {
    return c.json({ error: 'Post not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const comments = await c.env.DB.prepare(
    `SELECT c.*, m.username, m.display_name, m.avatar_r2_key
     FROM comments c
     JOIN members m ON c.author_id = m.id
     WHERE c.post_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC
     LIMIT 3`
  ).bind(postId).all();

  return c.json({ ...post as any, comments: comments.results });
});

postsRouter.delete('/:postId', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { postId } = c.req.param();

  const post = await c.env.DB.prepare(
    'SELECT author_id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(postId).first<{ author_id: string }>();

  if (!post) {
    return c.json({ error: 'Post not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  if (post.author_id !== session.member_id && session.role !== 'admin' && session.role !== 'moderator' && session.role !== 'founder') {
    return c.json({ error: 'Not authorized', code: ERROR_CODES.FORBIDDEN }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(postId).run();

  return c.json({ success: true });
});

postsRouter.post('/:postId/reactions', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { postId } = c.req.param();
  const body = await c.req.json();
  const parsed = ChangeReactionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { emoji } = parsed.data as ChangeReactionInput;
  const now = new Date().toISOString();

  const post = await c.env.DB.prepare(
    'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(postId).first();

  if (!post) {
    return c.json({ error: 'Post not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM reactions WHERE target_type = \'post\' AND target_id = ? AND member_id = ?'
  ).bind(postId, session.member_id).first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM reactions WHERE id = ?'
    ).bind(existing.id).run();

    await c.env.DB.prepare(
      'UPDATE posts SET reaction_count = MAX(0, reaction_count - 1) WHERE id = ?'
    ).bind(postId).run();

    return c.json({ action: 'removed', reaction_count: Math.max(0, (post as any).reaction_count - 1) });
  } else {
    await c.env.DB.prepare(
      'INSERT INTO reactions (id, target_type, target_id, member_id, emoji, created_at) VALUES (?, \'post\', ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), postId, session.member_id, emoji, now).run();

    await c.env.DB.prepare(
      'UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = ?'
    ).bind(postId).run();

    return c.json({ action: 'added', reaction_count: (post as any).reaction_count + 1 });
  }
});

postsRouter.get('/:postId/comments', authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const actualLimit = limit + 1;

  const post = await c.env.DB.prepare(
    'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(postId).first();

  if (!post) {
    return c.json({ error: 'Post not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  let queryStr: string;
  let bindParams: any[];

  if (cursor) {
    queryStr = `SELECT c.*, m.username, m.display_name, m.avatar_r2_key
                FROM comments c
                JOIN members m ON c.author_id = m.id
                WHERE c.post_id = ? AND c.deleted_at IS NULL AND c.id > ?
                ORDER BY c.id ASC LIMIT ?`;
    bindParams = [postId, cursor, actualLimit];
  } else {
    queryStr = `SELECT c.*, m.username, m.display_name, m.avatar_r2_key
                FROM comments c
                JOIN members m ON c.author_id = m.id
                WHERE c.post_id = ? AND c.deleted_at IS NULL
                ORDER BY c.id ASC LIMIT ?`;
    bindParams = [postId, actualLimit];
  }

  const result = await c.env.DB.prepare(queryStr).bind(...bindParams).all();
  const hasMore = result.results.length > limit;
  const data = hasMore ? result.results.slice(0, limit) : result.results;
  const lastItem = data[data.length - 1];

  return c.json({
    data,
    pagination: {
      next_cursor: hasMore && lastItem ? (lastItem as any).id : null,
      has_more: hasMore,
      limit,
    },
  });
});

postsRouter.post('/:postId/comments', authMiddleware, async (c) => {
  const session = getSession(c as any);
  const { postId } = c.req.param();
  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', code: ERROR_CODES.VALIDATION_ERROR, details: parsed.error.flatten() }, 400);
  }
  const { content, parent_id } = parsed.data as CreateCommentInput;
  const now = new Date().toISOString();
  const commentId = crypto.randomUUID();

  const post = await c.env.DB.prepare(
    'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL'
  ).bind(postId).first();

  if (!post) {
    return c.json({ error: 'Post not found', code: ERROR_CODES.NOT_FOUND }, 404);
  }

  await c.env.DB.prepare(
    'INSERT INTO comments (id, post_id, author_id, parent_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(commentId, postId, session.member_id, parent_id ?? null, content, now, now).run();

  await c.env.DB.prepare(
    'UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?'
  ).bind(postId).run();

  await c.env.DB.prepare(
    'UPDATE member_stats SET total_points = total_points + 1, connection_score = connection_score + 1, updated_at = ? WHERE member_id = ?'
  ).bind(now, session.member_id).run();

  const comment = await c.env.DB.prepare(
    `SELECT c.*, m.username, m.display_name, m.avatar_r2_key
     FROM comments c
     JOIN members m ON c.author_id = m.id
     WHERE c.id = ?`
  ).bind(commentId).first();

  return c.json(comment, 201);
});
