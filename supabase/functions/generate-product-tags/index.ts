import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts';

console.log("Function started");

serve(async (req) => {
  try {
    const { product_id, name, description } = await req.json();
    
    console.log(`Generating tags for product ${product_id}`);
    
    // Get OpenAI API key from environment variables
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Generate tags using GPT model
    const chatCompletion = await openai.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Generate 5-10 relevant tags for this product. Return only a JSON array of tags.
        
Product name: ${name}
Product description: ${description}

Example response format:
["tag1", "tag2", "tag3"]`
      }],
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
    });
    
    const tagsResponse = chatCompletion.choices[0].message.content;
    let tags;
    
    try {
      tags = JSON.parse(tagsResponse);
    } catch (parseError) {
      console.error('Error parsing tags response:', tagsResponse);
      throw new Error('Failed to parse tags from AI response');
    }
    
    // Update the product with the generated tags
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    // First, get the current product to preserve existing metadata
    const getProductResponse = await fetch(`${supabaseUrl}/rest/v1/opencart_products?id=eq.${product_id}&select=metadata`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getProductResponse.ok) {
      throw new Error(`Failed to get product: ${getProductResponse.statusText}`);
    }
    
    const productData = await getProductResponse.json();
    const currentMetadata = productData[0]?.metadata || {};
    
    // Update metadata with new tags
    const updatedMetadata = {
      ...currentMetadata,
      tags: tags
    };
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/opencart_products?id=eq.${product_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        metadata: updatedMetadata
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update product: ${updateResponse.statusText}`);
    }
    
    console.log(`Successfully generated tags for product ${product_id}:`, tags);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully generated tags for product ${product_id}`,
        tags: tags
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error('Error in generate-product-tags function:', error);
    
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