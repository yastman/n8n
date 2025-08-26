import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts';

console.log("Function started");

serve(async (req) => {
  try {
    const { product_id, name, description } = await req.json();
    
    console.log(`Generating embedding for product ${product_id}`);
    
    // Get OpenAI API key from environment variables
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Generate embedding using text-embedding-3-small model
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${name} ${description}`,
      dimensions: 1536,
    });
    
    const embedding = response.data[0].embedding;
    
    // Update the product with the generated embedding
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/opencart_products?id=eq.${product_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        embedding: embedding
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update product: ${updateResponse.statusText}`);
    }
    
    console.log(`Successfully generated embedding for product ${product_id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully generated embedding for product ${product_id}`,
        embedding: embedding
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error('Error in generate-product-embedding function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      },
    );
  }
});