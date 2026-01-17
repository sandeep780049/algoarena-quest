import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Allowed origins for CORS - restrict to production and preview domains
const ALLOWED_ORIGINS = [
  "https://algoarena-quest.lovable.app",
  "https://id-preview--d15d2ffc-5aac-4e82-a2bd-2f07b8fb09a7.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

// Simple in-memory rate limiting for brute force protection
const rateLimitMap = new Map<string, { count: number; resetTime: number; lockoutUntil?: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 attempts per email
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minute lockout after max attempts

function checkRateLimit(email: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const record = rateLimitMap.get(email);
  
  // Check if locked out
  if (record?.lockoutUntil && now < record.lockoutUntil) {
    const remainingMinutes = Math.ceil((record.lockoutUntil - now) / 60000);
    return { allowed: false, message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` };
  }
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    return { allowed: false, message: "Too many failed attempts. Account temporarily locked for 30 minutes." };
  }
  
  record.count++;
  return { allowed: true };
}

function resetRateLimit(email: string): void {
  rateLimitMap.delete(email);
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate OTP format (6 digits only)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check rate limit for brute force protection
    const rateLimitResult = checkRateLimit(email.toLowerCase());
    if (!rateLimitResult.allowed) {
      console.log("Rate limit/lockout for:", email);
      return new Response(
        JSON.stringify({ error: rateLimitResult.message }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_verification_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log("OTP verification failed:", fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired OTP. Please request a new one." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("email_verification_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Clean up old OTPs for this email
    await supabase
      .from("email_verification_otps")
      .delete()
      .eq("email", email)
      .neq("id", otpRecord.id);

    // Reset rate limit on successful verification
    resetRateLimit(email.toLowerCase());
    
    console.log("OTP verified successfully for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
