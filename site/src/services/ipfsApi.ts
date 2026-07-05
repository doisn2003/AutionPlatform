const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

export interface NFTMetadata {
  name: string;
  description: string;
  attributes: { trait_type: string; value: string }[];
}

export const uploadToIPFS = async (files: File[], metadata: NFTMetadata) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  formData.append('name', metadata.name);
  formData.append('description', metadata.description);
  formData.append('attributes', JSON.stringify(metadata.attributes));

  const response = await fetch(`${API_BASE_URL}/ipfs/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload to IPFS');
  }

  return response.json(); // { success: true, tokenURI: "ipfs://...", metadata: {...} }
};
