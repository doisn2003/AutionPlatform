import { Request, Response } from 'express';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

export const uploadToIPFS = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { name, description, attributes } = req.body;

    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      return res.status(500).json({ error: 'Pinata keys are not configured' });
    }

    // 1. Upload All Files to Pinata
    const imageURIs: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));

      const fileRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      });

      imageURIs.push(`ipfs://${fileRes.data.IpfsHash}`);

      // 1b. Cache Image in Supabase Storage
      try {
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
        if (SUPABASE_ANON_KEY) {
          const fileBuffer = fs.readFileSync(file.path);
          const filename = `${fileRes.data.IpfsHash}.png`;
          const supabaseUrl = `https://xoddvzoyvzkrhjcjwsfw.supabase.co/storage/v1/object/nft-images/${filename}`;
          
          await axios.post(supabaseUrl, fileBuffer, {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apiKey': SUPABASE_ANON_KEY,
              'Content-Type': file.mimetype || 'image/png'
            }
          });
          console.log(`Successfully cached image to Supabase Storage: ${filename}`);
        }
      } catch (err: any) {
        console.error('Failed to cache image to Supabase Storage:', err.response?.data || err.message);
      }

      fs.unlinkSync(file.path); // Clean up local file immediately
    }

    // 2. Upload Metadata JSON to Pinata
    let parsedAttributes = [];
    if (attributes) {
        try {
            parsedAttributes = JSON.parse(attributes);
        } catch (e) {
            console.error("Failed to parse attributes:", e);
        }
    }

    const metadata = {
      name: name || 'Obsidian NFT',
      description: description || '',
      image: imageURIs[0],
      images: imageURIs,
      attributes: parsedAttributes,
    };

    const jsonRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    // 2b. Cache Metadata JSON in Supabase Storage
    try {
      const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
      if (SUPABASE_ANON_KEY) {
        const metadataHash = jsonRes.data.IpfsHash;
        const supabaseUrl = `https://xoddvzoyvzkrhjcjwsfw.supabase.co/storage/v1/object/nft-metadata/${metadataHash}.json`;
        
        await axios.post(supabaseUrl, metadata, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apiKey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Successfully cached metadata JSON to Supabase Storage: ${metadataHash}.json`);
      }
    } catch (err: any) {
      console.error('Failed to cache metadata JSON to Supabase Storage:', err.response?.data || err.message);
    }

    const tokenURI = `ipfs://${jsonRes.data.IpfsHash}`;

    res.status(200).json({ success: true, tokenURI, metadata });
  } catch (error: any) {
    console.error('IPFS Upload Error:', error.response?.data || error.message);
    // Cleanup on error if files exist
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    res.status(500).json({ error: error.message });
  }
};
