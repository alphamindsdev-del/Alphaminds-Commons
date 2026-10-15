-- Optional link target for a journey step: YouTube URL (embedded for members),
-- a path into The Commons (/library/<id>, /challenges/<id>, /rel-fi, ...),
-- or any external resource the member must open before completing the step.
ALTER TABLE journey_activities ADD COLUMN link_url TEXT;
