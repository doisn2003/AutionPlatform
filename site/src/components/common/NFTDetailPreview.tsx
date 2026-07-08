import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNFTImage, resolveIPFS } from '../../hooks/useNFTImage';
import styles from './NFTDetailPreview.module.css';

export interface NFT {
  token_id: number;
  owner: string;
  name: string;
  image: string;
  token_uri: string;
  attributes?: string | { trait_type: string; value: string }[];
  description?: string;
  images?: string | string[];
}

interface NFTDetailPreviewProps {
  nft: NFT;
  children?: React.ReactNode;
}

export const NFTDetailPreview: React.FC<NFTDetailPreviewProps> = ({ nft, children }) => {
  const { imageUrl } = useNFTImage(nft.token_id, nft.image);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [onChainImages, setOnChainImages] = useState<string[]>([]);
  
  // Image URL state with self-healing fallback
  const [imgSrc, setImgSrc] = useState<string>('');

  // Reset index and fetch metadata on NFT change
  useEffect(() => {
    setCurrentIndex(0);
    setOnChainImages([]);

    if (nft.images) return; // DB already has images array
    if (!nft.token_uri) return;

    const fetchIPFSMetadata = async () => {
      try {
        // Prioritize loading metadata JSON from Supabase CDN first
        const httpUrl = resolveIPFS(nft.token_uri, 0, 'metadata');
        const res = await fetch(httpUrl);
        if (res.ok) {
          const metadata = await res.json();
          if (metadata && Array.isArray(metadata.images)) {
            setOnChainImages(metadata.images);
          }
        }
      } catch (err) {
        console.error('Failed to fetch metadata from IPFS:', err);
      }
    };

    fetchIPFSMetadata();
  }, [nft.token_id, nft.token_uri, nft.images]);

  // Resolve images array
  let rawImages: string[] = [];
  if (nft.images) {
    if (typeof nft.images === 'string') {
      try {
        rawImages = JSON.parse(nft.images);
      } catch (e) {
        console.error('Failed to parse images list:', e);
      }
    } else if (Array.isArray(nft.images)) {
      rawImages = nft.images;
    }
  } else if (onChainImages.length > 0) {
    rawImages = onChainImages;
  }

  // Fallback to single nft.image
  if (rawImages.length === 0 && nft.image) {
    rawImages = [nft.image];
  }

  const resolvedImages = rawImages.map((img) => resolveIPFS(img));

  // Sync on-chain resolved main image if available
  if (imageUrl && resolvedImages.length > 0 && resolvedImages[0] !== imageUrl) {
    resolvedImages[0] = imageUrl;
  }

  const activeImage = resolvedImages[currentIndex] || '';

  // Synchronize active image src state
  useEffect(() => {
    setImgSrc(activeImage);
  }, [activeImage]);

  // Self-healing: if loading image from Supabase CDN fails, fallback to Pinata Gateway
  const handleImageError = () => {
    if (imgSrc.includes('xoddvzoyvzkrhjcjwsfw.supabase.co')) {
      const parts = activeImage.split('/');
      const filename = parts[parts.length - 1]; // e.g. "QmT31n...png"
      const cid = filename.replace('.png', '');
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.warn(`Supabase CDN image load failed. Falling back to IPFS Gateway: ${fallbackUrl}`);
      setImgSrc(fallbackUrl);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % resolvedImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + resolvedImages.length) % resolvedImages.length);
  };

  const ownerShort = nft.owner ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}` : '';

  // Parse attributes
  let attributesList: { trait_type: string; value: string }[] = [];
  if (nft.attributes) {
    if (typeof nft.attributes === 'string') {
      try {
        attributesList = JSON.parse(nft.attributes);
      } catch (e) {
        console.error('Failed to parse attributes:', e);
      }
    } else if (Array.isArray(nft.attributes)) {
      attributesList = nft.attributes;
    }
  }

  return (
    <div className={styles.reviewContent}>
      {/* 1. Image Container with Slider Navigation */}
      <div 
        className={styles.reviewImageContainer}
        onClick={() => setIsFullscreen(true)}
        style={{ cursor: 'zoom-in' }}
      >
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={nft.name} 
            className={styles.reviewImage} 
            onError={handleImageError}
          />
        ) : (
          <div className="placeholder-image-large" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            Không có hình ảnh
          </div>
        )}

        {/* Navigation Arrows for Multiple Images */}
        {resolvedImages.length > 1 && (
          <>
            <button 
              type="button" 
              className={`${styles.arrowButton} ${styles.arrowLeft}`}
              onClick={handlePrev}
              title="Ảnh trước"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button 
              type="button" 
              className={`${styles.arrowButton} ${styles.arrowRight}`}
              onClick={handleNext}
              title="Ảnh tiếp theo"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>

            {/* Slider Index Badge */}
            <div className={styles.imageIndexBadge}>
              {currentIndex + 1} / {resolvedImages.length}
            </div>
          </>
        )}
      </div>

      {/* 2. Scrollable Detail Metadata */}
      <div className={styles.reviewDetailsScroll}>
        <div className={styles.reviewMetaHeader}>
          <h3 className={styles.reviewTitleText}>{nft.name || `Vật phẩm #${nft.token_id}`}</h3>
          {nft.owner && (
            <span className={styles.reviewOwner}>
              Chủ sở hữu: <strong className="font-mono">{ownerShort}</strong>
            </span>
          )}
        </div>

        {nft.description && (
          <p className={styles.reviewDescText}>{nft.description}</p>
        )}

        {attributesList.length > 0 && (
          <div>
            <div className={styles.attributesHeader}>Thuộc tính</div>
            <div className={styles.reviewAttributes}>
              {attributesList.map((attr, idx) => (
                <div key={idx} className={styles.attributeBadge}>
                  <span className={styles.attrLabel}>{attr.trait_type}</span>
                  <span className={styles.attrVal}>{attr.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Button Slot */}
      {children && (
        <div style={{ marginTop: 'auto', width: '100%' }}>
          {children}
        </div>
      )}

      {/* 4. Fullscreen Lightbox Overlay (Rendered directly in document.body via Portal) */}
      {isFullscreen && imgSrc && createPortal(
        <div 
          className={styles.lightboxOverlay} 
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close Button */}
          <button 
            type="button" 
            className={styles.lightboxClose}
            onClick={() => setIsFullscreen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Lightbox Navigation Arrows */}
          {resolvedImages.length > 1 && (
            <>
              <button 
                type="button" 
                className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
                onClick={handlePrev}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button 
                type="button" 
                className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
                onClick={handleNext}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>

              <div className={styles.lightboxIndexBadge}>
                {currentIndex + 1} / {resolvedImages.length}
              </div>
            </>
          )}

          {/* Lightbox Image */}
          <img 
            src={imgSrc} 
            alt={nft.name} 
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()} 
            onError={handleImageError}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default NFTDetailPreview;
