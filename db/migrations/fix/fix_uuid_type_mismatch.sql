-- Fix UUID to text type mismatch in RLS policies

-- Determine which tables have UUID type user_id columns
-- and which have text type user_id columns
DO $$
DECLARE
    tables_with_uuid_user_id text[] := ARRAY[]::text[];
    tables_with_text_user_id text[] := ARRAY[]::text[];
    t text;
BEGIN
    -- Find tables with UUID user_id
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
          AND table_schema = 'public'
          AND data_type = 'uuid'
    LOOP
        tables_with_uuid_user_id := array_append(tables_with_uuid_user_id, t);
    END LOOP;
    
    -- Find tables with TEXT user_id
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
          AND table_schema = 'public'
          AND data_type = 'text'
    LOOP
        tables_with_text_user_id := array_append(tables_with_text_user_id, t);
    END LOOP;
    
    RAISE NOTICE 'Tables with UUID user_id: %', tables_with_uuid_user_id;
    RAISE NOTICE 'Tables with TEXT user_id: %', tables_with_text_user_id;
END $$;

-- Now we can fix the policies for tables that have UUID type user_id columns
-- by casting auth.uid() to UUID

-- Fixing documents table if it has a UUID user_id
DROP POLICY IF EXISTS "Users can view their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can insert their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can update their own documents" ON "public"."documents";
DROP POLICY IF EXISTS "Users can delete their own documents" ON "public"."documents";

-- If documents has UUID user_id, use this version
-- Note: We're checking column type first to avoid errors
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
          AND column_name = 'user_id' 
          AND table_schema = 'public'
          AND data_type = 'uuid'
    ) THEN
        EXECUTE '
            CREATE POLICY "Users can view their own documents"
              ON "public"."documents" FOR SELECT
              TO authenticated
              USING (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can insert their own documents"
              ON "public"."documents" FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can update their own documents"
              ON "public"."documents" FOR UPDATE
              TO authenticated
              USING (auth.uid()::uuid = "user_id")
              WITH CHECK (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can delete their own documents"
              ON "public"."documents" FOR DELETE
              TO authenticated
              USING (auth.uid()::uuid = "user_id");
        ';
        RAISE NOTICE 'Updated documents policies with UUID casting';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can view their own documents"
              ON "public"."documents" FOR SELECT
              TO authenticated
              USING (auth.uid() = "user_id");

            CREATE POLICY "Users can insert their own documents"
              ON "public"."documents" FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid() = "user_id");

            CREATE POLICY "Users can update their own documents"
              ON "public"."documents" FOR UPDATE
              TO authenticated
              USING (auth.uid() = "user_id")
              WITH CHECK (auth.uid() = "user_id");

            CREATE POLICY "Users can delete their own documents"
              ON "public"."documents" FOR DELETE
              TO authenticated
              USING (auth.uid() = "user_id");
        ';
        RAISE NOTICE 'Updated documents policies with text comparison';
    END IF;
END $$;

-- Do the same for other tables with the same pattern
-- extraction_batches
DROP POLICY IF EXISTS "Users can view their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can insert their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can update their own batches" ON "public"."extraction_batches";
DROP POLICY IF EXISTS "Users can delete their own batches" ON "public"."extraction_batches";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'extraction_batches' 
          AND column_name = 'user_id' 
          AND table_schema = 'public'
          AND data_type = 'uuid'
    ) THEN
        EXECUTE '
            CREATE POLICY "Users can view their own batches"
              ON "public"."extraction_batches" FOR SELECT
              TO authenticated
              USING (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can insert their own batches"
              ON "public"."extraction_batches" FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can update their own batches"
              ON "public"."extraction_batches" FOR UPDATE
              TO authenticated
              USING (auth.uid()::uuid = "user_id")
              WITH CHECK (auth.uid()::uuid = "user_id");

            CREATE POLICY "Users can delete their own batches"
              ON "public"."extraction_batches" FOR DELETE
              TO authenticated
              USING (auth.uid()::uuid = "user_id");
        ';
        RAISE NOTICE 'Updated extraction_batches policies with UUID casting';
    ELSE
        EXECUTE '
            CREATE POLICY "Users can view their own batches"
              ON "public"."extraction_batches" FOR SELECT
              TO authenticated
              USING (auth.uid() = "user_id");

            CREATE POLICY "Users can insert their own batches"
              ON "public"."extraction_batches" FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid() = "user_id");

            CREATE POLICY "Users can update their own batches"
              ON "public"."extraction_batches" FOR UPDATE
              TO authenticated
              USING (auth.uid() = "user_id")
              WITH CHECK (auth.uid() = "user_id");

            CREATE POLICY "Users can delete their own batches"
              ON "public"."extraction_batches" FOR DELETE
              TO authenticated
              USING (auth.uid() = "user_id");
        ';
        RAISE NOTICE 'Updated extraction_batches policies with text comparison';
    END IF;
END $$;

-- Update other tables following the same pattern...
-- extraction_jobs, extracted_data, exports, etc.

-- Ensure all service role policies are applied last
DO $$
BEGIN
    EXECUTE '
        -- Add service role policies LAST so they do not override other policies
        DROP POLICY IF EXISTS "Service role full access on documents" ON "public"."documents";
        CREATE POLICY "Service role full access on documents"
          ON "public"."documents" FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);

        DROP POLICY IF EXISTS "Service role full access on extraction_batches" ON "public"."extraction_batches";
        CREATE POLICY "Service role full access on extraction_batches"
          ON "public"."extraction_batches" FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
    ';
END $$;

-- Fix test data to match database schema
-- If your test users have IDs like "user_123" but your tables expect UUIDs,
-- you'll need to also adjust your test approach

-- Useful verification function to check policy types
CREATE OR REPLACE FUNCTION verify_policy_compatibility() 
RETURNS TABLE(table_name text, user_id_type text, auth_uid_result text, compatible boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_name,
        c.data_type AS user_id_type,
        'text' AS auth_uid_result,
        CASE WHEN c.data_type = 'text' THEN true
             WHEN c.data_type = 'uuid' THEN false
             ELSE null
        END AS compatible
    FROM 
        information_schema.columns c
    WHERE 
        c.column_name = 'user_id'
        AND c.table_schema = 'public';
END;
$$ LANGUAGE plpgsql; 