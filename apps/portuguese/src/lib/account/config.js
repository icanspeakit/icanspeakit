// The one icanspeak.it account project (Supabase, Frankfurt), shared by every course.
//
// The publishable key is meant for the browser: it only identifies the project. What a
// signed-in learner may read or write is decided by row-level security in the database
// (supabase/migrations/*_course_progress.sql), never by this key.
//
// The same file in every course app.
export const SUPABASE_URL = "https://ycyijcukokgmgkrxcbga.supabase.co";
export const SUPABASE_KEY = "sb_publishable_2CMlAI-Krx2T0Xis36XB9Q_qGQ8lcvu";

/** Where supabase-js keeps the session. "sb-" is a shared prefix (src/lib/courseStorage.js),
 *  so one sign-in counts for every course on icanspeak.it. */
export const SESSION_KEY = "sb-ycyijcukokgmgkrxcbga-auth-token";
