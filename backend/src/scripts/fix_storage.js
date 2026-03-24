require('dotenv').config();
const { supabase } = require('../config/supabase');

async function initStorage() {
    console.log('🚀 Initializing Supabase Storage...');
    
    const BUCKET_NAME = 'task-attachments';
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
        console.error('❌ Error listing buckets:', listError.message);
        return;
    }
    
    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
        console.log(`📦 Creating bucket: ${BUCKET_NAME}...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
            console.error('❌ Error creating bucket:', createError.message);
        } else {
            console.log('✅ Bucket created successfully!');
        }
    } else {
        console.log('✅ Bucket already exists.');
    }
    
    console.log('✨ Storage setup complete.');
}

initStorage();
