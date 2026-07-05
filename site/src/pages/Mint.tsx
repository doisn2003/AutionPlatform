import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { uploadToIPFS } from '../services/ipfsApi';
import { useMintNFT } from '../hooks/useContractActions';
import CollectionGrid from '../components/mint/CollectionGrid';
import Layout from '../components/layout/Layout';
import '../styles/style.css';

const Mint: React.FC = () => {
  const { isConnected } = useAccount();
  const { mint, isPending: isMinting, isConfirmed: isMintConfirmed } = useMintNFT();
  
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<{ trait_type: string; value: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const updateAttribute = (index: number, key: 'trait_type' | 'value', val: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][key] = val;
    setAttributes(newAttrs);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !isConnected || !name) {
      alert("Vui lòng kết nối ví và điền đầy đủ thông tin.");
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadToIPFS(files, { name, description, attributes });
      
      if (res.tokenURI) {
        mint(res.tokenURI);
      }
    } catch (error: any) {
      console.error(error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isMintConfirmed) {
      alert('✨ Đúc vật phẩm thành công! Đang đồng bộ bộ sưu tập...');
      setFiles([]);
      setPreviewUrls([]);
      setName('');
      setDescription('');
      setAttributes([]);
      
      setRefreshKey(prev => prev + 1);
      
      let count = 0;
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
        count++;
        if (count >= 5) clearInterval(interval); 
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isMintConfirmed]);

  return (
    <Layout>
      <div className="container">
        <section className="mint-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '120px', marginBottom: '80px' }}>
          
          {/* Left Column: Mint Form */}
          <div className="mint-form-container glass-panel gold-border glow-gold" style={{ padding: '40px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 200 }} className="text-gradient">Đúc NFT Mới</h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 300 }}>Đưa các kiệt tác nghệ thuật của bạn lên Blockchain.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="form-group">
                <label className="form-label">Tải tệp vật phẩm lên <span className="text-gold">*</span></label>
                <div className="upload-dropzone" onClick={() => document.getElementById('fileInput')?.click()} style={{ position: 'relative', cursor: 'pointer', border: '1px dashed var(--outline)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                  <input type="file" id="fileInput" accept="image/*,video/*,audio/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                  
                  {previewUrls.length === 0 ? (
                    <div className="upload-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined upload-icon" style={{ fontSize: '2rem', color: 'var(--primary)' }}>cloud_upload</span>
                      <div className="upload-title" style={{ fontWeight: 600 }}>Kéo thả tệp hoặc click để chọn</div>
                      <div className="upload-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ nhiều ảnh PNG, JPG, GIF. Tối đa 100MB.</div>
                    </div>
                  ) : (
                    <div className="upload-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                      {previewUrls.map((url, index) => (
                        <div key={index} className="upload-preview-item" style={{ position: 'relative' }} onClick={(e) => { e.stopPropagation(); setEnlargedImage(url); }}>
                          <img src={url} alt={`Preview ${index}`} style={{ borderRadius: 'var(--radius-md)', width: '100%', height: '80px', objectFit: 'cover' }} />
                          <button type="button" onClick={(e) => removeFile(e, index)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                        </div>
                      ))}
                      <div className="add-more-btn" style={{ border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'var(--text-muted)' }}>
                        <span className="material-symbols-outlined">add</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal for enlarged image */}
                {enlargedImage && (
                  <div className="image-modal" onClick={() => setEnlargedImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                     <img src={enlargedImage} alt="Enlarged" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} onClick={(e) => e.stopPropagation()} />
                     <button type="button" onClick={() => setEnlargedImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>×</button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="nftName" className="form-label">Tên vật phẩm <span className="text-gold">*</span></label>
                <input type="text" id="nftName" className="form-input" placeholder="Ví dụ: Đại Lộ Tương Lai #10" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label htmlFor="nftDesc" className="form-label">Mô tả chi tiết</label>
                <textarea id="nftDesc" rows={4} className="form-textarea" placeholder="Mô tả các khía cạnh độc đáo..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>

              <div className="form-group">
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Thuộc tính (Properties)</label>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addAttribute} style={{ padding: '6px 14px' }}>+ Thêm</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {attributes.map((attr, index) => (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} key={index}>
                      <input type="text" placeholder="Loại (VD: Màu sắc)" className="form-input" value={attr.trait_type} onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)} required style={{ flex: 1 }} />
                      <input type="text" placeholder="Giá trị (VD: Vàng)" className="form-input" value={attr.value} onChange={(e) => updateAttribute(index, 'value', e.target.value)} required style={{ flex: 1 }} />
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => removeAttribute(index)} style={{ border: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <button type="submit" className="btn btn-gradient w-full" disabled={isUploading || isMinting || !isConnected} style={{ padding: '14px 28px' }}>
                  {isUploading ? 'Đang Upload IPFS...' : isMinting ? 'Đang Ký Transaction...' : 'Đúc NFT'}
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: User's Collection */}
          <CollectionGrid refreshKey={refreshKey} />

        </section>
      </div>
    </Layout>
  );
};

export default Mint;
