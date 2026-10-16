CREATE POLICY "Public can read habwa media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'habwa-media');

CREATE POLICY "Public can upload habwa media"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'habwa-media');

CREATE POLICY "Public can update habwa media"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'habwa-media')
WITH CHECK (bucket_id = 'habwa-media');

CREATE POLICY "Public can delete habwa media"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'habwa-media');